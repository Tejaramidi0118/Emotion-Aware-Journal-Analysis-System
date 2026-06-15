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

# Emotion-based music recommendation using curated song catalogue
SONG_CATALOGUE = {
    "Telugu": {
        "sad": [
            {"title": "Ye Maya Chesave", "artist": "Sid Sriram", "youtube_url": "https://www.youtube.com/results?search_query=Ye+Maya+Chesave+Sid+Sriram", "genres": ["Tollywood Melody", "Soft Melodies"]},
            {"title": "Inkem Inkem", "artist": "Gopi Sundar", "youtube_url": "https://www.youtube.com/results?search_query=Inkem+Inkem+Gopi+Sundar", "genres": ["Tollywood Melody", "Soft Melodies"]},
            {"title": "Manasa Sancharare", "artist": "KJ Yesudas", "youtube_url": "https://www.youtube.com/results?search_query=Manasa+Sancharare+KJ+Yesudas", "genres": ["Carnatic", "Devotional"]},
            {"title": "Marupu Raaledu", "artist": "SP Balasubrahmanyam", "youtube_url": "https://www.youtube.com/results?search_query=Marupu+Raaledu+SPB", "genres": ["Tollywood Melody", "Soft Melodies"]},
            {"title": "Nuvvu Nuvvu", "artist": "Sid Sriram", "youtube_url": "https://www.youtube.com/results?search_query=Nuvvu+Nuvvu+Sid+Sriram", "genres": ["Tollywood Melody", "Soft Melodies"]},
        ],
        "happy": [
            {"title": "Buttabomma", "artist": "Armaan Malik", "youtube_url": "https://www.youtube.com/results?search_query=Buttabomma+Armaan+Malik", "genres": ["Tollywood Melody", "Mass Songs"]},
            {"title": "Srivalli", "artist": "Sid Sriram", "youtube_url": "https://www.youtube.com/results?search_query=Srivalli+Sid+Sriram", "genres": ["Tollywood Melody", "Soft Melodies"]},
            {"title": "Neetho", "artist": "Sid Sriram", "youtube_url": "https://www.youtube.com/results?search_query=Neetho+Sid+Sriram", "genres": ["Tollywood Melody", "Soft Melodies"]},
            {"title": "Entharo Mahanubhavulu", "artist": "MS Subbulakshmi", "youtube_url": "https://www.youtube.com/results?search_query=Entharo+Mahanubhavulu+MS+Subbulakshmi", "genres": ["Carnatic", "Devotional"]},
            {"title": "Ramulo Ramula", "artist": "Anurag Kulkarni", "youtube_url": "https://www.youtube.com/results?search_query=Ramulo+Ramula+Anurag+Kulkarni", "genres": ["Tollywood Melody", "Mass Songs"]},
        ],
        "calm": [
            {"title": "Nagumomu", "artist": "MS Subbulakshmi", "youtube_url": "https://www.youtube.com/results?search_query=Nagumomu+MS+Subbulakshmi", "genres": ["Carnatic", "Devotional"]},
            {"title": "Raghuvamsha Sudha", "artist": "SP Balasubrahmanyam", "youtube_url": "https://www.youtube.com/results?search_query=Raghuvamsha+Sudha+SPB", "genres": ["Carnatic", "Devotional"]},
            {"title": "Vathapi Ganapathim", "artist": "MS Subbulakshmi", "youtube_url": "https://www.youtube.com/results?search_query=Vathapi+Ganapathim+MS+Subbulakshmi", "genres": ["Carnatic", "Devotional"]},
            {"title": "Kannaane Kannaane", "artist": "Sid Sriram", "youtube_url": "https://www.youtube.com/results?search_query=Kannaane+Kannaane+Sid+Sriram", "genres": ["Tollywood Melody", "Soft Melodies"]},
        ],
        "angry": [
            {"title": "Jai Balayya", "artist": "Devi Sri Prasad", "youtube_url": "https://www.youtube.com/results?search_query=Jai+Balayya+DSP", "genres": ["Mass Songs", "Tollywood Melody"]},
            {"title": "Seeti Maar", "artist": "Rahul Nambiar", "youtube_url": "https://www.youtube.com/results?search_query=Seeti+Maar+Rahul+Nambiar", "genres": ["Mass Songs", "Tollywood Melody"]},
            {"title": "Saami Saami", "artist": "Mounika Yadav", "youtube_url": "https://www.youtube.com/results?search_query=Saami+Saami+Mounika+Yadav", "genres": ["Tollywood Melody", "Mass Songs", "Telugu Folk"]},
        ],
    },
    "Hindi": {
        "sad": [
            {"title": "Tum Hi Ho", "artist": "Arijit Singh", "youtube_url": "https://www.youtube.com/results?search_query=Tum+Hi+Ho+Arijit+Singh", "genres": ["Bollywood", "Romantic", "Sad Songs"]},
            {"title": "Channa Mereya", "artist": "Arijit Singh", "youtube_url": "https://www.youtube.com/results?search_query=Channa+Mereya+Arijit+Singh", "genres": ["Bollywood", "Sad Songs", "Romantic"]},
            {"title": "Agar Tum Saath Ho", "artist": "Arijit Singh", "youtube_url": "https://www.youtube.com/results?search_query=Agar+Tum+Saath+Ho+Arijit+Singh", "genres": ["Bollywood", "Sad Songs", "Romantic"]},
            {"title": "Kabhi Jo Baadal Barse", "artist": "Arijit Singh", "youtube_url": "https://www.youtube.com/results?search_query=Kabhi+Jo+Baadal+Barse+Arijit+Singh", "genres": ["Bollywood", "Romantic"]},
            {"title": "Phir Bhi Tumko Chaahunga", "artist": "Arijit Singh", "youtube_url": "https://www.youtube.com/results?search_query=Phir+Bhi+Tumko+Chaahunga+Arijit+Singh", "genres": ["Bollywood", "Romantic", "Sad Songs"]},
        ],
        "happy": [
            {"title": "Badtameez Dil", "artist": "Benny Dayal", "youtube_url": "https://www.youtube.com/results?search_query=Badtameez+Dil+Benny+Dayal", "genres": ["Bollywood", "Romantic"]},
            {"title": "London Thumakda", "artist": "Labh Janjua", "youtube_url": "https://www.youtube.com/results?search_query=London+Thumakda+Labh+Janjua", "genres": ["Bollywood"]},
            {"title": "Gallan Goodiyaan", "artist": "Various", "youtube_url": "https://www.youtube.com/results?search_query=Gallan+Goodiyaan+Dil+Dhadakne+Do", "genres": ["Bollywood"]},
            {"title": "Amplifier", "artist": "Imran Khan", "youtube_url": "https://www.youtube.com/results?search_query=Amplifier+Imran+Khan", "genres": ["Hindi Indie"]},
            {"title": "Zinda", "artist": "Siddharth Mahadevan", "youtube_url": "https://www.youtube.com/results?search_query=Zinda+Bhaag+song", "genres": ["Bollywood"]},
        ],
        "calm": [
            {"title": "Kun Faya Kun", "artist": "AR Rahman", "youtube_url": "https://www.youtube.com/results?search_query=Kun+Faya+Kun+AR+Rahman", "genres": ["Sufi", "Devotional", "Ghazal"]},
            {"title": "Tujh Mein Rab Dikhta Hai", "artist": "Roop Kumar Rathod", "youtube_url": "https://www.youtube.com/results?search_query=Tujh+Mein+Rab+Dikhta+Hai", "genres": ["Bollywood", "Romantic"]},
            {"title": "Raabta", "artist": "Arijit Singh", "youtube_url": "https://www.youtube.com/results?search_query=Raabta+Arijit+Singh", "genres": ["Bollywood", "Romantic"]},
            {"title": "Iktara", "artist": "Kavita Seth", "youtube_url": "https://www.youtube.com/results?search_query=Iktara+Kavita+Seth+Wake+Up+Sid", "genres": ["Bollywood", "Sufi", "Hindi Indie"]},
        ],
        "angry": [
            {"title": "Dangal Title Track", "artist": "Daler Mehndi", "youtube_url": "https://www.youtube.com/results?search_query=Dangal+Title+Track+Daler+Mehndi", "genres": ["Bollywood"]},
            {"title": "Sultan Title Track", "artist": "Sukhwinder Singh", "youtube_url": "https://www.youtube.com/results?search_query=Sultan+Title+Track+Sukhwinder", "genres": ["Bollywood"]},
            {"title": "Rocky Title Track", "artist": "Shravan", "youtube_url": "https://www.youtube.com/results?search_query=Rocky+Title+Track+Hindi", "genres": ["Bollywood"]},
        ],
    },
    "Malayalam": {
        "sad": [
            {"title": "Piriyadha Varam Vendum", "artist": "KJ Yesudas", "youtube_url": "https://www.youtube.com/results?search_query=Piriyadha+Varam+Vendum+KJ+Yesudas", "genres": ["Malayalam Melody", "Classical"]},
            {"title": "Mizhiyoram", "artist": "KJ Yesudas", "youtube_url": "https://www.youtube.com/results?search_query=Mizhiyoram+KJ+Yesudas", "genres": ["Malayalam Melody", "Classical"]},
            {"title": "Mazhaye Mazhaye", "artist": "Sujatha", "youtube_url": "https://www.youtube.com/results?search_query=Mazhaye+Mazhaye+Malayalam", "genres": ["Malayalam Melody"]},
        ],
        "happy": [
            {"title": "Entammede Jimikki Kammal", "artist": "Shehnaz Akhtar", "youtube_url": "https://www.youtube.com/results?search_query=Entammede+Jimikki+Kammal", "genres": ["Malayalam Melody", "Mappila Songs"]},
            {"title": "Manikya Malaraya Poovi", "artist": "Vineeth Sreenivasan", "youtube_url": "https://www.youtube.com/results?search_query=Manikya+Malaraya+Poovi+Vineeth", "genres": ["Malayalam Melody", "Mappila Songs"]},
            {"title": "Thaniye", "artist": "Sid Sriram", "youtube_url": "https://www.youtube.com/results?search_query=Thaniye+Sid+Sriram+Malayalam", "genres": ["Malayalam Melody", "Soft Melodies"]},
        ],
        "calm": [
            {"title": "Oru Murai Vanthu Paarthaya", "artist": "KJ Yesudas", "youtube_url": "https://www.youtube.com/results?search_query=Oru+Murai+Vanthu+Paarthaya+KJ+Yesudas", "genres": ["Malayalam Melody", "Classical", "Devotional"]},
            {"title": "Thumbi Vaa", "artist": "Sid Sriram", "youtube_url": "https://www.youtube.com/results?search_query=Thumbi+Vaa+Sid+Sriram", "genres": ["Malayalam Melody", "Classical"]},
        ],
        "angry": [
            {"title": "Aadhi Bhagavan", "artist": "Vijay Yesudas", "youtube_url": "https://www.youtube.com/results?search_query=Aadhi+Bhagavan+Malayalam", "genres": ["Malayalam Melody"]},
        ],
    },
    "English": {
        "sad": [
            {"title": "Fix You", "artist": "Coldplay", "youtube_url": "https://www.youtube.com/results?search_query=Fix+You+Coldplay", "genres": ["Rock", "Indie"]},
            {"title": "Someone Like You", "artist": "Adele", "youtube_url": "https://www.youtube.com/results?search_query=Someone+Like+You+Adele", "genres": ["Indie"]},
            {"title": "The Night We Met", "artist": "Lord Huron", "youtube_url": "https://www.youtube.com/results?search_query=The+Night+We+Met+Lord+Huron", "genres": ["Indie"]},
            {"title": "Skinny Love", "artist": "Bon Iver", "youtube_url": "https://www.youtube.com/results?search_query=Skinny+Love+Bon+Iver", "genres": ["Indie"]},
            {"title": "Lofi Sad Beats", "artist": "Various", "youtube_url": "https://www.youtube.com/results?search_query=lofi+sad+beats+study", "genres": ["Lo-fi", "Ambient", "Focus Music"]},
        ],
        "happy": [
            {"title": "Happy", "artist": "Pharrell Williams", "youtube_url": "https://www.youtube.com/results?search_query=Happy+Pharrell+Williams", "genres": ["EDM", "Rock"]},
            {"title": "Can't Stop the Feeling", "artist": "Justin Timberlake", "youtube_url": "https://www.youtube.com/results?search_query=Cant+Stop+The+Feeling+Justin+Timberlake", "genres": ["EDM"]},
            {"title": "Yellow", "artist": "Coldplay", "youtube_url": "https://www.youtube.com/results?search_query=Yellow+Coldplay", "genres": ["Rock", "Indie"]},
            {"title": "Good as Hell", "artist": "Lizzo", "youtube_url": "https://www.youtube.com/results?search_query=Good+As+Hell+Lizzo", "genres": ["EDM"]},
            {"title": "Uptown Funk", "artist": "Bruno Mars", "youtube_url": "https://www.youtube.com/results?search_query=Uptown+Funk+Bruno+Mars", "genres": ["EDM"]},
        ],
        "calm": [
            {"title": "Weightless", "artist": "Marconi Union", "youtube_url": "https://www.youtube.com/results?search_query=Weightless+Marconi+Union", "genres": ["Ambient", "Focus Music", "Lo-fi"]},
            {"title": "Clair de Lune", "artist": "Debussy", "youtube_url": "https://www.youtube.com/results?search_query=Clair+de+Lune+Debussy", "genres": ["Ambient", "Focus Music", "Classical"]},
            {"title": "Lofi Hip Hop Radio", "artist": "Various", "youtube_url": "https://www.youtube.com/results?search_query=lofi+hip+hop+radio+beats+to+study", "genres": ["Lo-fi", "Focus Music", "Ambient"]},
            {"title": "The Scientist", "artist": "Coldplay", "youtube_url": "https://www.youtube.com/results?search_query=The+Scientist+Coldplay", "genres": ["Rock", "Indie"]},
        ],
        "angry": [
            {"title": "Eye of the Tiger", "artist": "Survivor", "youtube_url": "https://www.youtube.com/results?search_query=Eye+of+the+Tiger+Survivor", "genres": ["Rock"]},
            {"title": "Lose Yourself", "artist": "Eminem", "youtube_url": "https://www.youtube.com/results?search_query=Lose+Yourself+Eminem", "genres": ["Rock"]},
            {"title": "Harder Better Faster", "artist": "Daft Punk", "youtube_url": "https://www.youtube.com/results?search_query=Harder+Better+Faster+Stronger+Daft+Punk", "genres": ["EDM"]},
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
    - User's preferred music genres (boost matching songs)
    No external API, no CSV, no pretrained model needed.
    """
    mood             = EMOTION_TO_MOOD.get(dominant_emotion, "calm")
    music_languages  = [l.strip() for l in interest_profile.get("music_languages", []) if l.strip()]
    favorite_artists = [a.lower().strip() for a in interest_profile.get("artists", []) if a.strip()]
    music_genres     = [g.lower().strip() for g in interest_profile.get("music", []) if g.strip()]

    # If no language preference set — use English as default
    if not music_languages:
        music_languages = ["English"]

    collected = []

    # Score ALL songs in the catalog for the matched mood across all languages
    for lang, moods in SONG_CATALOGUE.items():
        songs = moods.get(mood, [])
        for song in songs:
            song_copy = dict(song)
            song_copy["language"] = lang
            
            # Base score
            score = 1.0
            
            # 1. Language Boost: If the song's language is in preferred languages
            for preferred_lang in music_languages:
                if preferred_lang.lower() == lang.lower():
                    score += 15.0
                    break
            
            # 2. Genre Boost: Give +12 points for each matching genre
            song_genres = [sg.lower().strip() for sg in song.get("genres", [])]
            matching_genres = set(song_genres).intersection(music_genres)
            if matching_genres:
                score += len(matching_genres) * 12.0
            
            # 3. Artist Boost: Give +8 points if the artist is in user's favorites
            if song["artist"].lower().strip() in favorite_artists:
                score += 8.0
                
            song_copy["_score"] = score
            collected.append(song_copy)

    # Sort by score (descending) and deduplicate by title
    seen   = set()
    unique = []
    for s in sorted(collected, key=lambda x: -x["_score"]):
        key = s["title"].lower().strip()
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