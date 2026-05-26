# from yt_dlp import YoutubeDL
# from urllib.parse import quote
# from collections import defaultdict

# # ── Enhanced Emotion → Keyword Mapping ─────────────────────────────
# EMOTION_KEYWORDS = {
#     "sadness": ["soothing", "emotional", "healing", "soft melody", "comforting"],
#     "fear": ["calm", "peaceful", "gentle", "reassuring"],
#     "anger": ["relaxing", "stress relief", "calming", "release"],
#     "disgust": ["fresh", "uplifting", "positive"],
#     "pessimism": ["hopeful", "motivational", "comforting"],
#     "joy": ["happy", "uplifting", "celebration", "cheerful"],
#     "trust": ["warm", "inspiring", "acoustic"],
#     "anticipation": ["focus", "motivational", "energetic"],
#     "surprise": ["exciting", "vibrant"],
#     "love": ["romantic", "emotional", "beautiful"],
#     "optimism": ["uplifting", "positive", "hopeful"],
# }

# def get_language_name(lang_code: str) -> str:
#     lang_map = {
#         "te": "telugu",
#         "hi": "hindi",
#         "ml": "malayalam",
#         "en": "english"
#     }
#     return lang_map.get(lang_code, "english")


# def build_search_queries(
#     dominant_emotion: str,
#     favorite_artists: list,
#     music_genres: list,
#     music_languages: list,
#     stress_music: list = None,
#     count: int = 8
# ):
#     """Build smart, personalized search queries"""
#     stress_music = stress_music or []
#     keywords = EMOTION_KEYWORDS.get(dominant_emotion, ["soothing", "melody"])
    
#     queries = []
#     seen = set()

#     # 1. Priority: Favorite Artists + Emotion
#     for artist in favorite_artists[:4]:
#         for kw in keywords[:3]:
#             for lang in music_languages:
#                 q = f"{artist} {kw} {get_language_name(lang)}"
#                 if q not in seen:
#                     seen.add(q)
#                     queries.append(q)

#     # 2. Genres + Stress Music + Emotion
#     for genre in music_genres[:3]:
#         for kw in keywords[:2]:
#             for stress in stress_music[:2]:
#                 q = f"{genre} {stress} {kw} music"
#                 if q not in seen:
#                     seen.add(q)
#                     queries.append(q)
#             # Fallback without stress
#             q = f"{genre} {kw} music"
#             if q not in seen:
#                 seen.add(q)
#                 queries.append(q)

#     # 3. Language + Mood fallback
#     for lang in music_languages:
#         for kw in keywords[:3]:
#             q = f"{get_language_name(lang)} {kw} songs"
#             if q not in seen:
#                 seen.add(q)
#                 queries.append(q)

#     return queries[:count * 2]  # Generate more queries for better selection


# def search_youtube(query: str, limit: int = 6):
#     """Search YouTube using yt-dlp"""
#     ydl_opts = {
#         "quiet": True,
#         "extract_flat": True,
#         "skip_download": True,
#     }
#     try:
#         with YoutubeDL(ydl_opts) as ydl:
#             results = ydl.extract_info(f"ytsearch{limit}:{query}", download=False)
            
#             videos = []
#             for entry in results.get("entries", []):
#                 if not entry or not entry.get("id"):
#                     continue
#                 video_id = entry.get("id")
#                 videos.append({
#                     "title": entry.get("title"),
#                     "thumbnail": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
#                     "youtube_url": f"https://www.youtube.com/watch?v={video_id}",
#                     "video_id": video_id,
#                 })
#             return videos
#     except Exception as e:
#         print(f"YouTube search error for '{query}':", e)
#         return []


# def score_track(track_title: str, artists: list, genres: list, stress_music: list, emotion: str):
#     """Simple but effective scoring"""
#     score = 0
#     title_lower = track_title.lower()
    
#     # Artist match (highest weight)
#     for artist in artists:
#         if artist.lower() in title_lower:
#             score += 45
    
#     # Genre / Mood match
#     for genre in genres:
#         if genre.lower() in title_lower:
#             score += 20
    
#     for stress in stress_music:
#         if stress.lower() in title_lower:
#             score += 15
    
#     # Emotion keywords
#     keywords = EMOTION_KEYWORDS.get(emotion, [])
#     for kw in keywords:
#         if kw.lower() in title_lower:
#             score += 12

#     return score


# def get_music_recommendations(
#     dominant_emotion: str,
#     interest_profile: dict = None,
#     count: int = 5
# ):
#     """
#     Main improved recommendation engine with scoring
#     """
#     interest_profile = interest_profile or {}

#     favorite_artists = interest_profile.get(
#         "artists", []
#     )

#     music_genres = interest_profile.get(
#         "music", []
#     )

#     music_languages = interest_profile.get(
#         "music_languages",
#         ["English"]
#     )

#     stress_music = interest_profile.get(
#         "stress_music",
#         []
#     )

#     queries = build_search_queries(
#         dominant_emotion,
#         favorite_artists,
#         music_genres,
#         music_languages,
#         stress_music
#     )

#     all_tracks = []
#     seen = set()

#     for query in queries:
#         if len(all_tracks) >= count * 3:  # Get extra for scoring
#             break
            
#         results = search_youtube(query, limit=5)
        
#         for track in results:
#             if track["youtube_url"] in seen:
#                 continue
#             seen.add(track["youtube_url"])
            
#             # Add metadata for scoring
#             track["score"] = score_track(
#                 track["title"],
#                 favorite_artists,
#                 music_genres,
#                 stress_music,
#                 dominant_emotion
#             )
#             all_tracks.append(track)

#     # Sort by score and return top results
#     all_tracks.sort(key=lambda x: x["score"], reverse=True)
#     # print(all_tracks)
#     return {
#         "tracks": all_tracks[:count],
#         "query_used": queries[0] if queries else "",
#         "total_found": len(all_tracks)
#     }

# app/services/youtube_music_service.py
# Emotion-based music recommendation using curated song catalogue
# Filtered by user's language and genre preferences

SONG_CATALOGUE = {
    "Telugu": {
        "sad": [
            {"title": "Ye Maya Chesave", "artist": "Sid Sriram", "youtube_url": "https://www.youtube.com/results?search_query=Ye+Maya+Chesave+Sid+Sriram"},
            {"title": "Inkem Inkem", "artist": "Gopi Sundar", "youtube_url": "https://www.youtube.com/results?search_query=Inkem+Inkem+Gopi+Sundar"},
            {"title": "Manasa Sancharare", "artist": "KJ Yesudas", "youtube_url": "https://www.youtube.com/results?search_query=Manasa+Sancharare+KJ+Yesudas"},
            {"title": "Marupu Raaledu", "artist": "SP Balasubrahmanyam", "youtube_url": "https://www.youtube.com/results?search_query=Marupu+Raaledu+SPB"},
            {"title": "Nuvvu Nuvvu", "artist": "Sid Sriram", "youtube_url": "https://www.youtube.com/results?search_query=Nuvvu+Nuvvu+Sid+Sriram"},
        ],
        "happy": [
            {"title": "Buttabomma", "artist": "Armaan Malik", "youtube_url": "https://www.youtube.com/results?search_query=Buttabomma+Armaan+Malik"},
            {"title": "Srivalli", "artist": "Sid Sriram", "youtube_url": "https://www.youtube.com/results?search_query=Srivalli+Sid+Sriram"},
            {"title": "Neetho", "artist": "Sid Sriram", "youtube_url": "https://www.youtube.com/results?search_query=Neetho+Sid+Sriram"},
            {"title": "Entharo Mahanubhavulu", "artist": "MS Subbulakshmi", "youtube_url": "https://www.youtube.com/results?search_query=Entharo+Mahanubhavulu+MS+Subbulakshmi"},
            {"title": "Ramulo Ramula", "artist": "Anurag Kulkarni", "youtube_url": "https://www.youtube.com/results?search_query=Ramulo+Ramula+Anurag+Kulkarni"},
        ],
        "calm": [
            {"title": "Nagumomu", "artist": "MS Subbulakshmi", "youtube_url": "https://www.youtube.com/results?search_query=Nagumomu+MS+Subbulakshmi"},
            {"title": "Raghuvamsha Sudha", "artist": "SP Balasubrahmanyam", "youtube_url": "https://www.youtube.com/results?search_query=Raghuvamsha+Sudha+SPB"},
            {"title": "Vathapi Ganapathim", "artist": "MS Subbulakshmi", "youtube_url": "https://www.youtube.com/results?search_query=Vathapi+Ganapathim+MS+Subbulakshmi"},
            {"title": "Kannaane Kannaane", "artist": "Sid Sriram", "youtube_url": "https://www.youtube.com/results?search_query=Kannaane+Kannaane+Sid+Sriram"},
        ],
        "angry": [
            {"title": "Jai Balayya", "artist": "Devi Sri Prasad", "youtube_url": "https://www.youtube.com/results?search_query=Jai+Balayya+DSP"},
            {"title": "Seeti Maar", "artist": "Rahul Nambiar", "youtube_url": "https://www.youtube.com/results?search_query=Seeti+Maar+Rahul+Nambiar"},
            {"title": "Saami Saami", "artist": "Mounika Yadav", "youtube_url": "https://www.youtube.com/results?search_query=Saami+Saami+Mounika+Yadav"},
        ],
    },
    "Hindi": {
        "sad": [
            {"title": "Tum Hi Ho", "artist": "Arijit Singh", "youtube_url": "https://www.youtube.com/results?search_query=Tum+Hi+Ho+Arijit+Singh"},
            {"title": "Channa Mereya", "artist": "Arijit Singh", "youtube_url": "https://www.youtube.com/results?search_query=Channa+Mereya+Arijit+Singh"},
            {"title": "Agar Tum Saath Ho", "artist": "Arijit Singh", "youtube_url": "https://www.youtube.com/results?search_query=Agar+Tum+Saath+Ho+Arijit+Singh"},
            {"title": "Kabhi Jo Baadal Barse", "artist": "Arijit Singh", "youtube_url": "https://www.youtube.com/results?search_query=Kabhi+Jo+Baadal+Barse+Arijit+Singh"},
            {"title": "Phir Bhi Tumko Chaahunga", "artist": "Arijit Singh", "youtube_url": "https://www.youtube.com/results?search_query=Phir+Bhi+Tumko+Chaahunga+Arijit+Singh"},
        ],
        "happy": [
            {"title": "Badtameez Dil", "artist": "Benny Dayal", "youtube_url": "https://www.youtube.com/results?search_query=Badtameez+Dil+Benny+Dayal"},
            {"title": "London Thumakda", "artist": "Labh Janjua", "youtube_url": "https://www.youtube.com/results?search_query=London+Thumakda+Labh+Janjua"},
            {"title": "Gallan Goodiyaan", "artist": "Various", "youtube_url": "https://www.youtube.com/results?search_query=Gallan+Goodiyaan+Dil+Dhadakne+Do"},
            {"title": "Amplifier", "artist": "Imran Khan", "youtube_url": "https://www.youtube.com/results?search_query=Amplifier+Imran+Khan"},
            {"title": "Zinda", "artist": "Siddharth Mahadevan", "youtube_url": "https://www.youtube.com/results?search_query=Zinda+Bhaag+song"},
        ],
        "calm": [
            {"title": "Kun Faya Kun", "artist": "AR Rahman", "youtube_url": "https://www.youtube.com/results?search_query=Kun+Faya+Kun+AR+Rahman"},
            {"title": "Tujh Mein Rab Dikhta Hai", "artist": "Roop Kumar Rathod", "youtube_url": "https://www.youtube.com/results?search_query=Tujh+Mein+Rab+Dikhta+Hai"},
            {"title": "Raabta", "artist": "Arijit Singh", "youtube_url": "https://www.youtube.com/results?search_query=Raabta+Arijit+Singh"},
            {"title": "Iktara", "artist": "Kavita Seth", "youtube_url": "https://www.youtube.com/results?search_query=Iktara+Kavita+Seth+Wake+Up+Sid"},
        ],
        "angry": [
            {"title": "Dangal Title Track", "artist": "Daler Mehndi", "youtube_url": "https://www.youtube.com/results?search_query=Dangal+Title+Track+Daler+Mehndi"},
            {"title": "Sultan Title Track", "artist": "Sukhwinder Singh", "youtube_url": "https://www.youtube.com/results?search_query=Sultan+Title+Track+Sukhwinder"},
            {"title": "Rocky Title Track", "artist": "Shravan", "youtube_url": "https://www.youtube.com/results?search_query=Rocky+Title+Track+Hindi"},
        ],
    },
    "Malayalam": {
        "sad": [
            {"title": "Piriyadha Varam Vendum", "artist": "KJ Yesudas", "youtube_url": "https://www.youtube.com/results?search_query=Piriyadha+Varam+Vendum+KJ+Yesudas"},
            {"title": "Mizhiyoram", "artist": "KJ Yesudas", "youtube_url": "https://www.youtube.com/results?search_query=Mizhiyoram+KJ+Yesudas"},
            {"title": "Mazhaye Mazhaye", "artist": "Sujatha", "youtube_url": "https://www.youtube.com/results?search_query=Mazhaye+Mazhaye+Malayalam"},
        ],
        "happy": [
            {"title": "Entammede Jimikki Kammal", "artist": "Shehnaz Akhtar", "youtube_url": "https://www.youtube.com/results?search_query=Entammede+Jimikki+Kammal"},
            {"title": "Manikya Malaraya Poovi", "artist": "Vineeth Sreenivasan", "youtube_url": "https://www.youtube.com/results?search_query=Manikya+Malaraya+Poovi+Vineeth"},
            {"title": "Thaniye", "artist": "Sid Sriram", "youtube_url": "https://www.youtube.com/results?search_query=Thaniye+Sid+Sriram+Malayalam"},
        ],
        "calm": [
            {"title": "Oru Murai Vanthu Paarthaya", "artist": "KJ Yesudas", "youtube_url": "https://www.youtube.com/results?search_query=Oru+Murai+Vanthu+Paarthaya+KJ+Yesudas"},
            {"title": "Thumbi Vaa", "artist": "Sid Sriram", "youtube_url": "https://www.youtube.com/results?search_query=Thumbi+Vaa+Sid+Sriram"},
        ],
        "angry": [
            {"title": "Aadhi Bhagavan", "artist": "Vijay Yesudas", "youtube_url": "https://www.youtube.com/results?search_query=Aadhi+Bhagavan+Malayalam"},
        ],
    },
    "English": {
        "sad": [
            {"title": "Fix You", "artist": "Coldplay", "youtube_url": "https://www.youtube.com/results?search_query=Fix+You+Coldplay"},
            {"title": "Someone Like You", "artist": "Adele", "youtube_url": "https://www.youtube.com/results?search_query=Someone+Like+You+Adele"},
            {"title": "The Night We Met", "artist": "Lord Huron", "youtube_url": "https://www.youtube.com/results?search_query=The+Night+We+Met+Lord+Huron"},
            {"title": "Skinny Love", "artist": "Bon Iver", "youtube_url": "https://www.youtube.com/results?search_query=Skinny+Love+Bon+Iver"},
            {"title": "Lofi Sad Beats", "artist": "Various", "youtube_url": "https://www.youtube.com/results?search_query=lofi+sad+beats+study"},
        ],
        "happy": [
            {"title": "Happy", "artist": "Pharrell Williams", "youtube_url": "https://www.youtube.com/results?search_query=Happy+Pharrell+Williams"},
            {"title": "Can't Stop the Feeling", "artist": "Justin Timberlake", "youtube_url": "https://www.youtube.com/results?search_query=Cant+Stop+The+Feeling+Justin+Timberlake"},
            {"title": "Yellow", "artist": "Coldplay", "youtube_url": "https://www.youtube.com/results?search_query=Yellow+Coldplay"},
            {"title": "Good as Hell", "artist": "Lizzo", "youtube_url": "https://www.youtube.com/results?search_query=Good+As+Hell+Lizzo"},
            {"title": "Uptown Funk", "artist": "Bruno Mars", "youtube_url": "https://www.youtube.com/results?search_query=Uptown+Funk+Bruno+Mars"},
        ],
        "calm": [
            {"title": "Weightless", "artist": "Marconi Union", "youtube_url": "https://www.youtube.com/results?search_query=Weightless+Marconi+Union"},
            {"title": "Clair de Lune", "artist": "Debussy", "youtube_url": "https://www.youtube.com/results?search_query=Clair+de+Lune+Debussy"},
            {"title": "Lofi Hip Hop Radio", "artist": "Various", "youtube_url": "https://www.youtube.com/results?search_query=lofi+hip+hop+radio+beats+to+study"},
            {"title": "The Scientist", "artist": "Coldplay", "youtube_url": "https://www.youtube.com/results?search_query=The+Scientist+Coldplay"},
        ],
        "angry": [
            {"title": "Eye of the Tiger", "artist": "Survivor", "youtube_url": "https://www.youtube.com/results?search_query=Eye+of+the+Tiger+Survivor"},
            {"title": "Lose Yourself", "artist": "Eminem", "youtube_url": "https://www.youtube.com/results?search_query=Lose+Yourself+Eminem"},
            {"title": "Harder Better Faster", "artist": "Daft Punk", "youtube_url": "https://www.youtube.com/results?search_query=Harder+Better+Faster+Stronger+Daft+Punk"},
        ],
    }
}

# Map 11 emotions to 4 mood categories
EMOTION_TO_MOOD = {
    "sadness":     "sad",
    "fear":        "calm",
    "pessimism":   "sad",
    "disgust":     "calm",
    "anger":       "angry",
    "surprise":    "happy",
    "joy":         "happy",
    "trust":       "calm",
    "love":        "happy",
    "optimism":    "happy",
    "anticipation":"happy",
    "neutral":     "calm",
}


def get_music_recommendations(
    dominant_emotion: str,
    interest_profile: dict,
    count: int = 3
) -> list:
    """
    Returns personalised song recommendations based on:
    - User's dominant emotion
    - User's preferred music languages
    - User's favorite artists (boost matching songs)
    No external API, no CSV, no pretrained model needed.
    """
    mood             = EMOTION_TO_MOOD.get(dominant_emotion, "calm")
    music_languages  = interest_profile.get("music_languages", ["English"])
    favorite_artists = [a.lower() for a in interest_profile.get("artists", [])]

    # If no language preference set — use English as default
    if not music_languages:
        music_languages = ["English"]

    collected = []

    # Collect songs from preferred languages
    for lang in music_languages:
        songs = SONG_CATALOGUE.get(lang, {}).get(mood, [])
        for song in songs:
            song_copy = dict(song)
            song_copy["language"] = lang
            # Boost score if artist is in favorites
            song_copy["_score"] = 2 if song["artist"].lower() in favorite_artists else 1
            collected.append(song_copy)

    # If not enough songs — add from other languages
    if len(collected) < count:
        for lang, moods in SONG_CATALOGUE.items():
            if lang not in music_languages:
                for song in moods.get(mood, []):
                    song_copy = dict(song)
                    song_copy["language"] = lang
                    song_copy["_score"] = 0
                    collected.append(song_copy)

    # Sort by score (favorites first) and deduplicate
    seen   = set()
    unique = []
    for s in sorted(collected, key=lambda x: -x["_score"]):
        key = s["title"]
        if key not in seen:
            seen.add(key)
            unique.append(s)

    # Return top N — clean up internal score field
    result = []
    for s in unique[:count]:
        result.append({
            "title":       s["title"],
            "artist":      s["artist"],
            "language":    s["language"],
            "youtube_url": s["youtube_url"],
        })

    return result