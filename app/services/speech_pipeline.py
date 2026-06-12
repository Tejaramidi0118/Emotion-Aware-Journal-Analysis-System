import torch
import torch.nn as nn
import librosa
import numpy as np
import re
from app.services.text_pipeline import run_text_pipeline
from app.config import settings
from huggingface_hub import InferenceClient


DEVICE = "cpu"

# # Use smaller model
# whisper_model = whisper.load_model("base", device=WHISPER_DEVICE)
EMOTION_LABELS = ["neutral", "happy", "sad", "angry", "fear", "disgust", "surprise"]

# ── CNN model definition (same as training) ────────────────
class SpeechEmotionModel(nn.Module):
    def __init__(self, num_classes=8):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(1, 16, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(16, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
        )
        self.fc = nn.Sequential(
            nn.Flatten(),
            nn.Linear(32 * 30 * 50, 128),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        return self.fc(self.conv(x))


print("Loading Speech CNN...")
cnn_model = SpeechEmotionModel(num_classes=8).to(DEVICE)
cnn_model.load_state_dict(torch.load(settings.CNN_MODEL_PATH, map_location=DEVICE))
cnn_model.eval()
print("Speech CNN loaded.")

# ── Feature extraction ─────────────────────────────────────
def extract_features(file_path: str, max_len=200):
    y, sr = librosa.load(file_path, sr=22050)
    mfcc   = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
    delta  = librosa.feature.delta(mfcc)
    delta2 = librosa.feature.delta(mfcc, order=2)
    features = np.vstack([mfcc, delta, delta2])
    features = (features - np.mean(features)) / (np.std(features) + 1e-6)
    if features.shape[1] < max_len:
        features = np.pad(features, ((0, 0), (0, max_len - features.shape[1])))
    else:
        features = features[:, :max_len]
    return features

# ── Whisper STT ────────────────────────────────────────────
print("Initializing Hugging Face Whisper Client...")
client = InferenceClient(
    api_key=settings.HF_TOKEN
)

def transcribe_audio(file_path: str):


    with open(file_path, "rb") as audio:

        try:
            audio_bytes = audio.read()

            result = client.automatic_speech_recognition(
                audio_bytes,
                model="openai/whisper-large-v3"
            )

            print("HF Result:", result)

        except Exception as e:
            print("HF Whisper Error:", str(e))
            return "", "unknown", True

    transcript = result["text"].strip()
    stt_failure = len(transcript.split()) < 3

    return transcript, "unknown", stt_failure

# ── CNN acoustic emotion ────────────────────────────────────
def get_acoustic_emotion(file_path: str):
    features = extract_features(file_path)
    tensor   = torch.tensor(features, dtype=torch.float).unsqueeze(0).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        logits = cnn_model(tensor)
        probs  = torch.softmax(logits, dim=1).cpu().numpy()[0]
    scores   = {EMOTION_LABELS[i]: round(float(probs[i]), 4) for i in range(len(EMOTION_LABELS))}
    dominant = EMOTION_LABELS[int(probs.argmax())]
    confidence = float(probs.max())
    excluded = confidence < 0.50
    return scores, dominant, round(confidence, 4), excluded

# ── Full speech pipeline ───────────────────────────────────
def run_speech_pipeline(audio_path: str):
    # Step 1: Whisper STT
    transcript, language, stt_failure = transcribe_audio(audio_path)
    if stt_failure:
        return {"stt_failure": True, "transcript": transcript}

    # Step 2: XLM-RoBERTa on transcript (shared model)
    text_result = run_text_pipeline(transcript)

    # Step 3: CNN acoustic emotion on raw audio
    acoustic_scores, dominant_acoustic, acoustic_conf, acoustic_excluded = get_acoustic_emotion(audio_path)

    return {
        "transcript":         transcript,
        "detected_language":  language,
        "stt_failure":        False,
        "emotion_scores":     text_result["emotion_scores"],
        "dominant_emotion":   text_result["dominant_emotion"],
        "active_emotions":    text_result["active_emotions"],
        "confidence":         text_result["confidence"],
        "low_confidence_emotion": text_result["low_confidence_emotion"],
        "acoustic_scores":    acoustic_scores,
        "dominant_acoustic":  dominant_acoustic,
        "acoustic_confidence": acoustic_conf,
        "acoustic_excluded":  acoustic_excluded,
    }

