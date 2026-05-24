# Emotion-Aware Journal Analysis & Adaptive Workload Management System

> **Course:** 22AIE315 — Natural Language Processing  
> **Institution:** Amrita Vishwa Vidyapeetham, Amritapuri  
> **Team:** D Surya | K Bruhadesh Varma | R Teja

---

## Overview

A privacy-preserving, multilingual AI-powered journal analysis system that reads what users write and speak, extracts their emotional state, tracks trends over time, and delivers personalised wellness suggestions — learning from feedback to improve with every session.

---

## Novel Contributions

| # | Contribution |
|---|---|
| NC1 | **Indic-Aug-Emotion Dataset** — First journal-style emotion dataset for Telugu & Malayalam (~36K entries, 4 languages) |
| NC2 | **Emotional Momentum Score (EMS)** — Novel temporal metric tracking stress trajectory over 7/14-day windows |
| NC3 | **Plutchik Ontology Recommender** — Psychologically grounded wellness activity mapping |
| NC4 | **Text vs Voice Divergence Study** — Cosine distance between linguistic and acoustic emotion vectors |
| NC5 | **Adaptive Feedback Loop** — In-context learning via -5 to +5 feedback without model retraining |
| NC6 | **Longitudinal Trigger Detection** — Identifies recurring stress patterns across 7/30-day history |

---

## System Architecture

```
User Journal (text / voice)
        ↓
EMOTION DETECTION
  Text  → fastText language detection → First-person filter
        → XLM-RoBERTa (primary) + Groq LLM (fallback) → Hybrid emotion vector
  Voice → Whisper STT → XLM-RoBERTa (linguistic)
        → 2D-CNN on MFCC features (acoustic)
        → Mismatch detection → Final emotion
        ↓
AGENT LAYER
  EMS Agent       → 7/14-day weighted emotional trend
  Burnout Agent   → Risk score (0–100)
  Workload Agent  → 6 time-aware scenarios
        ↓
RECOMMENDATION
  LangChain + Groq → Personalised suggestion
  sentence-transformers → YouTube music recommendation
        ↓
FEEDBACK LOOP
  -5 to +5 rating → preference_scores → better next suggestions
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, Python 3.10 |
| Relational DB | PostgreSQL 15 |
| Document Store | MongoDB 7 |
| Text Emotion | XLM-RoBERTa (fine-tuned, 125M params) |
| LLM Fallback | Groq API (Llama 3.1 8B) via LangChain |
| Speech STT | OpenAI Whisper large-v3 |
| Acoustic Emotion | 2D-CNN trained on RAVDESS |
| Music Recommendation | sentence-transformers/all-MiniLM-L6-v2 |
| Language Detection | fastText lid.176 |
| Frontend | React.js |
| Authentication | JWT + bcrypt |

---

## Model Results

| Model | Metric | Value |
|---|---|---|
| XLM-RoBERTa v2 (first-person filter) | Val Micro-F1 | 0.6717 |
| XLM-RoBERTa v2 | Test Micro-F1 (threshold 0.75) | 0.6603 |
| XLM-RoBERTa v2 | Test Macro-F1 | 0.6326 |
| 2D-CNN Speech (RAVDESS) | Test Accuracy | 63.89% |

---

## Project Structure

```
Emotion-Aware-Journal-Analysis-System/
├── app/
│   ├── main.py                  # FastAPI entry point
│   ├── config.py                # Environment config
│   ├── database.py              # PostgreSQL + MongoDB connections
│   ├── models/                  # SQLAlchemy models
│   ├── routers/                 # API endpoints
│   │   ├── auth.py              # Signup, login, profile
│   │   ├── journal_text.py      # POST /journal/text
│   │   ├── journal_voice.py     # POST /journal/voice
│   │   └── feedback.py          # Feedback, history, streak, prompts
│   └── services/
│       ├── text_pipeline.py     # fastText + XLM-RoBERTa + Groq hybrid
│       ├── speech_pipeline.py   # Whisper + CNN acoustic
│       ├── agent_service.py     # EMS, Burnout, Workload agents
│       ├── langchain_service.py # LangChain chains (Groq)
│       └── youtube_music_service.py  # sentence-transformers music
├── data/
│   └── song_catalogue.csv       # 50 curated songs with emotion tags
├── models_trained/
│   ├── best_model.pth           # XLM-RoBERTa checkpoint
│   ├── best_speech_model.pth    # 2D-CNN checkpoint
│   └── lid.176.bin              # fastText language detection
├── frontend/                    # React application
│   └── src/
│       ├── pages/               # Login, Signup, Dashboard, Journal, Feedback, Analytics, Profile
│       └── components/          # StreakCard
├── notebooks/
│   ├── 1.DatasetPreprocessing.ipynb
│   ├── 2.DatasetTranslation.ipynb
│   ├── 3_train_xlm_roberta.ipynb
│   ├── 4_speech_pipeline.ipynb
│   └── 5_retrain_speech.ipynb
├── .env                         # Environment variables (not committed)
├── requirements.txt
└── run.py                       # Start server
```

---

## Setup & Installation

### Prerequisites
- Python 3.10+
- PostgreSQL 15
- MongoDB 7
- Node.js 18+
- ffmpeg (`brew install ffmpeg` on Mac)

### 1. Clone the repository
```bash
git clone https://github.com/Tejaramidi0118/Emotion-Aware-Journal-Analysis-System.git
cd Emotion-Aware-Journal-Analysis-System
```

### 2. Create virtual environment
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Set up databases
```bash
# PostgreSQL
psql postgres -c "CREATE USER journal_user WITH PASSWORD 'journal_pass';"
psql postgres -c "CREATE DATABASE emotion_journal OWNER journal_user;"

# MongoDB starts automatically
```

### 4. Configure environment
Create `.env` file:
```env
DATABASE_URL=postgresql://journal_user:journal_pass@localhost:5432/emotion_journal
MONGO_URL=mongodb://localhost:27017
MONGO_DB=emotion_journal
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
XLM_MODEL_PATH=models_trained/best_model.pth
CNN_MODEL_PATH=models_trained/best_speech_model.pth
XLM_BASE_MODEL=xlm-roberta-base
GROQ_API_KEY=your-groq-api-key
```

### 5. Download required models
```bash
# fastText language detection model
wget -P models_trained/ https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.bin
```

### 6. Start backend
```bash
python run.py
```
Backend runs at `http://localhost:8001`

### 7. Start frontend
```bash
cd frontend
npm install
npm start
```
Frontend runs at `http://localhost:3000`

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup` | Create account with interest profile |
| POST | `/auth/login` | Login, returns JWT token |
| GET | `/profile/{user_id}` | Get user profile |
| PUT | `/profile/{user_id}` | Update interests/preferences |
| POST | `/journal/text` | Submit text journal entry |
| POST | `/journal/voice` | Submit voice journal entry |
| GET | `/journal/history/{user_id}` | Get journal history |
| GET | `/journal/streak/{user_id}` | Get journaling streak |
| GET | `/journal/prompts/{user_id}` | Get mood-based writing prompts |
| GET | `/journal/feedback/pending/{user_id}` | Check pending feedback |
| POST | `/journal/feedback` | Submit feedback (-5 to +5) |
| GET | `/journal/feedback/stats/{user_id}` | Feedback effectiveness stats |

---

## Dataset

The **Indic-Aug-Emotion Dataset** was constructed by:
1. Combining SemEval-2018 Task 1 and GoEmotions (~15,000 English entries)
2. Applying first-person sentence filter
3. Translating to Telugu, Hindi, Malayalam using AI4Bharat IndicTrans2
4. Quality filtering via back-translation BLEU ≥ 0.60
5. Final size: ~36,000 entries across 4 languages, 11 emotion classes

**Emotion Classes:** joy, trust, fear, surprise, sadness, disgust, anger, anticipation, love, optimism, pessimism

---

## Features

- **Multimodal Input** — Text and voice journal entries
- **Multilingual** — Telugu, Hindi, Malayalam, English
- **Hybrid Emotion Detection** — XLM-RoBERTa + Groq LLM combined
- **Verbal-Vocal Mismatch** — Detects when words say positive but voice says negative
- **6 Time-Aware Scenarios** — Different suggestions for morning/afternoon/evening/night
- **Personalised Music** — Songs matched to emotion + user's music preferences
- **Journaling Streak** — Daily streak tracking with badges
- **Analytics Dashboard** — 4 charts: EMS trend, emotion timeline, distribution, daily stress
- **Profile Management** — Update interests, tone preference, work context

---

## License

This project is developed for academic purposes as part of the NLP course at Amrita Vishwa Vidyapeetham.

---

## Acknowledgements

- [HuggingFace Transformers](https://huggingface.co/transformers/)
- [AI4Bharat IndicTrans2](https://github.com/AI4Bharat/IndicTrans2)
- [OpenAI Whisper](https://github.com/openai/whisper)
- [Groq API](https://groq.com)
- [LangChain](https://langchain.com)
