import hashlib
import requests

from app.config import settings


HF_URL = (
    "https://router.huggingface.co/hf-inference/models/"
    "sentence-transformers/all-MiniLM-L6-v2/"
    "pipeline/feature-extraction"
)

HEADERS = {
    "Authorization": f"Bearer {settings.HF_API_KEY}"
}


def embed_text(text: str) -> list:

    response = requests.post(
        HF_URL,
        headers=HEADERS,
        json={
            "inputs": [text]
        },
        timeout=60
    )

    response.raise_for_status()

    return response.json()[0]


def embed_batch(texts: list) -> list:

    response = requests.post(
        HF_URL,
        headers=HEADERS,
        json={
            "inputs": texts
        },
        timeout=120
    )

    response.raise_for_status()

    return response.json()


def text_hash(text: str) -> str:

    return hashlib.md5(
        text.encode()
    ).hexdigest()