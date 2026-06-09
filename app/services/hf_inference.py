import requests
from app.config import settings

HF_HEADERS = {
    "Authorization": f"Bearer {settings.HF_API_KEY}"
}

# XLM-RoBERTa emotion classification
def classify_with_hf(text: str) -> dict:
    API_URL = "https://router.huggingface.co/hf-inference/models/j-hartmann/emotion-english-distilroberta-base"
    response = requests.post(
        API_URL,
        headers=HF_HEADERS,
        json={"inputs": text},
        timeout=30
    )
    
    if response.status_code != 200:
        return None
    
    # Map HF output to your 11 emotion classes
    results = response.json()
    return results

# Language detection via HuggingFace
def detect_language_hf(text: str) -> str:
    API_URL = "https://router.huggingface.co/hf-inference/models/papluca/xlm-roberta-base-language-detection"
    response = requests.post(
        API_URL,
        headers=HF_HEADERS,
        json={"inputs": text},
        timeout=10
    )
    
    if response.status_code != 200:
        return "en"
    
    result = response.json()
    return result[0][0]["label"] if result else "en"