import os

IS_PRODUCTION = os.getenv("ENVIRONMENT") == "production"

if not IS_PRODUCTION:
    import torch
    import torch.nn as nn
    from transformers import AutoTokenizer, AutoModel

import fasttext
import re
import unicodedata
import numpy as np
from app.config import settings
from app.services.langchain_service import classify_with_groq

TARGET_EMOTIONS = [
    "joy", "trust", "fear", "surprise", "sadness",
    "disgust", "anger", "anticipation", "love", "optimism", "pessimism"
]
THRESHOLD = 0.75
MAX_LEN   = 128
if not IS_PRODUCTION:
    DEVICE = (
        "cuda"
        if torch.cuda.is_available()
        else "mps"
        if torch.backends.mps.is_available()
        else "cpu"
    )
else:
    DEVICE = "cpu"

# ── First person patterns (English + Indic) ────────────────
FIRST_PERSON_PATTERNS = [
    # English explicit
    r'\bi\b', r'\bi\'m\b', r'\bi\'ve\b', r'\bi\'d\b', r'\bi\'ll\b',
    r'\bi was\b', r'\bi am\b', r'\bi feel\b', r'\bi felt\b',
    r'\bi got\b', r'\bi had\b', r'\bi went\b',
    r'\bi couldn\'t\b', r'\bi didn\'t\b', r'\bi can\'t\b',
    r'\bi don\'t\b', r'\bi need\b', r'\bi wish\b', r'\bi hate\b',
    r'\bi love\b', r'\bi miss\b', r'\bi want\b', r'\bi hope\b',
    r'\bmy\b', r'\bme\b', r'\bmyself\b', r'\bmine\b',
    r'\bwe\b', r'\bour\b', r'\bus\b', r'\bwe\'re\b', r'\bwe\'ve\b',
    # English implied subject
    r'\bfeeling\b', r'\bfelt\b',
    r'\bcouldn\'t\b', r'\bcan\'t\b', r'\bwon\'t\b', r'\bwasn\'t\b',
    r'\bhaven\'t\b', r'\bhadn\'t\b', r'\bdidn\'t\b', r'\bdon\'t\b',
    r'\bwoke\b', r'\bslept\b', r'\bcried\b', r'\blaughed\b',
    # Temporal markers — common in journals
    r'\btoday\b', r'\btonight\b', r'\byesterday\b',
    r'\blately\b', r'\brecently\b', r'\bthis morning\b',
    r'\bthis evening\b', r'\bthis week\b', r'\bthis month\b',
    # Hindi
    r'\bमैं\b', r'\bमुझे\b', r'\bमेरा\b', r'\bमेरी\b', r'\bमेरे\b',
    r'\bहमें\b', r'\bहमारा\b', r'\bमुझको\b', r'\bमैंने\b', r'\bहम\b',
    # Telugu
    r'\bనేను\b', r'\bనాకు\b', r'\bనా\b', r'\bమనం\b',
    r'\bమాకు\b', r'\bమేము\b', r'\bనన్ను\b', r'\bనాతో\b',
    # Malayalam
    r'\bഞാൻ\b', r'\bഎനിക്ക്\b', r'\bഎന്റെ\b',
    r'\bഞങ്ങൾ\b', r'\bനമ്മൾ\b', r'\bഎന്നെ\b',
]

# ── Model definition ───────────────────────────────────────
if not IS_PRODUCTION:
    class EmotionClassifier(nn.Module):
        def __init__(self, model_name, num_labels, dropout=0.1):
            super().__init__()
            self.encoder    = AutoModel.from_pretrained(model_name)
            self.dropout    = nn.Dropout(dropout)
            self.classifier = nn.Linear(self.encoder.config.hidden_size, num_labels)

        def forward(self, input_ids, attention_mask):
            outputs    = self.encoder(input_ids=input_ids, attention_mask=attention_mask)
            cls_output = outputs.last_hidden_state[:, 0, :]
            cls_output = self.dropout(cls_output)
            return self.classifier(cls_output)

# ── Load models once at startup ────────────────────────────
if not IS_PRODUCTION:

    print("Loading XLM-RoBERTa...")

    tokenizer = AutoTokenizer.from_pretrained(
        settings.XLM_BASE_MODEL
    )

    xlm_model = EmotionClassifier(
        settings.XLM_BASE_MODEL,
        len(TARGET_EMOTIONS)
    )

    checkpoint = torch.load(
        settings.XLM_MODEL_PATH,
        map_location=DEVICE
    )

    xlm_model.load_state_dict(
        checkpoint["model_state_dict"]
    )

    xlm_model = xlm_model.to(DEVICE)
    xlm_model.eval()

    print("XLM-RoBERTa loaded.")

FASTTEXT_PATH = "models_trained/lid.176.bin"

if not IS_PRODUCTION:
    print("Loading fastText...")

    if not os.path.exists(FASTTEXT_PATH):
        raise FileNotFoundError(
            f"FastText model not found: {FASTTEXT_PATH}"
        )

    ft_model = fasttext.load_model(FASTTEXT_PATH)

    print("fastText loaded.")

# ── Language detection ─────────────────────────────────────
def detect_language(text: str):
    text_clean  = text.replace("\n", " ")
    predictions = ft_model.predict(text_clean, k=1)
    lang_code   = predictions[0][0].replace("__label__", "")
    confidence  = float(predictions[1][0])
    low_conf    = confidence < 0.70
    if low_conf:
        lang_code = "en"
    return lang_code, confidence, low_conf

# ── Basic text cleaning ────────────────────────────────────
def clean_text(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"<.*?>", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

# ── First person sentence filter ───────────────────────────
def filter_to_writer_sentences(text: str) -> str:
    """
    Splits text into sentences.
    Keeps only sentences with first-person/writer signal.
    Same logic used during retraining — must match exactly.
    Returns empty string if no writer sentences found.
    """
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    sentences = [s.strip() for s in sentences if len(s.strip()) > 4]

    writer_sentences = [
        s for s in sentences
        if any(re.search(p, s.lower()) for p in FIRST_PERSON_PATTERNS)
    ]

    return " ".join(writer_sentences)

# ── XLM-RoBERTa inference ──────────────────────────────────
if not IS_PRODUCTION:
    def classify_emotion(text: str):
        encoding = tokenizer(
            text,
            max_length=MAX_LEN,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        )
        input_ids      = encoding["input_ids"].to(DEVICE)
        attention_mask = encoding["attention_mask"].to(DEVICE)

        with torch.no_grad():
            logits = xlm_model(input_ids, attention_mask)
            probs  = torch.sigmoid(logits).cpu().numpy()[0]

        scores     = {e: round(float(probs[i]), 4) for i, e in enumerate(TARGET_EMOTIONS)}
        dominant   = TARGET_EMOTIONS[int(probs.argmax())]
        active     = [e for e, s in scores.items() if s >= THRESHOLD]
        confidence = float(probs.max())
        low_conf   = confidence < 0.50  # raised from 0.40 — stricter fallback trigger

        return scores, dominant, active, round(confidence, 4), low_conf

def run_text_pipeline(text: str) -> dict:

    if IS_PRODUCTION:
        from app.services.hf_inference import (
            classify_with_hf,
            detect_language_hf
        )

        lang_code = detect_language_hf(text)
        low_lang = False
    else:
        lang_code, lang_conf, low_lang = detect_language(text)
    cleaned     = clean_text(text)
    writer_text = filter_to_writer_sentences(cleaned)

    # ── Step 1: XLM-RoBERTa on filtered text ──────────────
    xlm_scores = xlm_dominant = xlm_active = xlm_conf = xlm_low = None
    if IS_PRODUCTION:
        xlm_scores = None
        xlm_dominant = None
        xlm_active = None
        xlm_conf = None
        xlm_low = True

        # We'll map HF output later

    else:
        if writer_text:
            xlm_scores, xlm_dominant, xlm_active, xlm_conf, xlm_low = classify_emotion(writer_text)
        else:
            xlm_low = True

    # ── Step 2: Always run Groq for second opinion ─────────
    groq_result = None
    try:
        groq_result = classify_with_groq(text)
    except Exception as e:
        print(f"Groq classify failed: {e}")

    # ── Step 3: Combine scores ─────────────────────────────
    if xlm_scores and groq_result:
        # Weighted average: 40% XLM + 60% Groq
        # Groq weighted higher because it understands narrative journals better
        combined = {}
        for e in TARGET_EMOTIONS:
            xlm_val  = xlm_scores.get(e, 0.0)
            groq_val = groq_result["emotion_scores"].get(e, 0.0)
            combined[e] = round(xlm_val * 0.4 + groq_val * 0.6, 4)

        dominant   = max(combined, key=combined.get)
        active     = [e for e, s in combined.items() if s >= THRESHOLD]
        confidence = round(max(combined.values()), 4)
        low_conf   = confidence < 0.40
        source     = "hybrid"

    elif groq_result:
        # Only Groq available
        combined   = groq_result["emotion_scores"]
        dominant   = groq_result["dominant_emotion"]
        active     = groq_result["active_emotions"]
        confidence = groq_result["confidence"]
        low_conf   = groq_result["low_confidence_emotion"]
        source     = "groq"

    elif xlm_scores:
        # Only XLM available
        combined   = xlm_scores
        dominant   = xlm_dominant
        active     = xlm_active
        confidence = xlm_conf
        low_conf   = xlm_low
        source     = "xlm-roberta"

    else:
        # Both failed
        return {
            "detected_language":      lang_code,
            "low_confidence_lang":    low_lang,
            "emotion_scores":         {e: 0.0 for e in TARGET_EMOTIONS},
            "dominant_emotion":       "neutral",
            "active_emotions":        [],
            "confidence":             0.0,
            "low_confidence_emotion": True,
            "writer_attributed":      False,
            "source":                 "failed"
        }

    return {
        "detected_language":      lang_code,
        "low_confidence_lang":    low_lang,
        "emotion_scores":         combined,
        "dominant_emotion":       dominant,
        "active_emotions":        active,
        "confidence":             confidence,
        "low_confidence_emotion": low_conf,
        "writer_attributed":      bool(writer_text),
        "source":                 source
    }