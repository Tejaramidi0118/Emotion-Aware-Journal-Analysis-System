import requests
import os

HF_API_KEY = os.getenv("HF_API_KEY")

HF_HEADERS = {
    "Authorization": f"Bearer {HF_API_KEY}"
}


def classify_with_hf(text: str):
    API_URL = (
        "https://api-inference.huggingface.co/models/"
        "j-hartmann/emotion-english-distilroberta-base"
    )

    response = requests.post(
        API_URL,
        headers=HF_HEADERS,
        json={"inputs": text},
        timeout=30
    )

    if response.status_code != 200:
        print("HF Emotion Error:", response.text)
        return None

    return response.json()


def detect_language_hf(text: str):
    API_URL = (
        "https://api-inference.huggingface.co/models/"
        "papluca/xlm-roberta-base-language-detection"
    )

    response = requests.post(
        API_URL,
        headers=HF_HEADERS,
        json={"inputs": text},
        timeout=10
    )

    if response.status_code != 200:
        print("HF Language Error:", response.text)
        return "en"

    result = response.json()

    if not result:
        return "en"

    return result[0][0]["label"]