from yt_dlp import YoutubeDL
from urllib.parse import quote
from collections import defaultdict

# ── Enhanced Emotion → Keyword Mapping ─────────────────────────────
EMOTION_KEYWORDS = {
    "sadness": ["soothing", "emotional", "healing", "soft melody", "comforting"],
    "fear": ["calm", "peaceful", "gentle", "reassuring"],
    "anger": ["relaxing", "stress relief", "calming", "release"],
    "disgust": ["fresh", "uplifting", "positive"],
    "pessimism": ["hopeful", "motivational", "comforting"],
    "joy": ["happy", "uplifting", "celebration", "cheerful"],
    "trust": ["warm", "inspiring", "acoustic"],
    "anticipation": ["focus", "motivational", "energetic"],
    "surprise": ["exciting", "vibrant"],
    "love": ["romantic", "emotional", "beautiful"],
    "optimism": ["uplifting", "positive", "hopeful"],
}

def get_language_name(lang_code: str) -> str:
    lang_map = {
        "te": "telugu",
        "hi": "hindi",
        "ml": "malayalam",
        "en": "english"
    }
    return lang_map.get(lang_code, "english")


def build_search_queries(
    dominant_emotion: str,
    favorite_artists: list,
    music_genres: list,
    music_languages: list,
    stress_music: list = None,
    count: int = 8
):
    """Build smart, personalized search queries"""
    stress_music = stress_music or []
    keywords = EMOTION_KEYWORDS.get(dominant_emotion, ["soothing", "melody"])
    
    queries = []
    seen = set()

    # 1. Priority: Favorite Artists + Emotion
    for artist in favorite_artists[:4]:
        for kw in keywords[:3]:
            for lang in music_languages:
                q = f"{artist} {kw} {get_language_name(lang)}"
                if q not in seen:
                    seen.add(q)
                    queries.append(q)

    # 2. Genres + Stress Music + Emotion
    for genre in music_genres[:3]:
        for kw in keywords[:2]:
            for stress in stress_music[:2]:
                q = f"{genre} {stress} {kw} music"
                if q not in seen:
                    seen.add(q)
                    queries.append(q)
            # Fallback without stress
            q = f"{genre} {kw} music"
            if q not in seen:
                seen.add(q)
                queries.append(q)

    # 3. Language + Mood fallback
    for lang in music_languages:
        for kw in keywords[:3]:
            q = f"{get_language_name(lang)} {kw} songs"
            if q not in seen:
                seen.add(q)
                queries.append(q)

    return queries[:count * 2]  # Generate more queries for better selection


def search_youtube(query: str, limit: int = 6):
    """Search YouTube using yt-dlp"""
    ydl_opts = {
        "quiet": True,
        "extract_flat": True,
        "skip_download": True,
    }
    try:
        with YoutubeDL(ydl_opts) as ydl:
            results = ydl.extract_info(f"ytsearch{limit}:{query}", download=False)
            
            videos = []
            for entry in results.get("entries", []):
                if not entry or not entry.get("id"):
                    continue
                video_id = entry.get("id")
                videos.append({
                    "title": entry.get("title"),
                    "thumbnail": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
                    "youtube_url": f"https://www.youtube.com/watch?v={video_id}",
                    "video_id": video_id,
                })
            return videos
    except Exception as e:
        print(f"YouTube search error for '{query}':", e)
        return []


def score_track(track_title: str, artists: list, genres: list, stress_music: list, emotion: str):
    """Simple but effective scoring"""
    score = 0
    title_lower = track_title.lower()
    
    # Artist match (highest weight)
    for artist in artists:
        if artist.lower() in title_lower:
            score += 45
    
    # Genre / Mood match
    for genre in genres:
        if genre.lower() in title_lower:
            score += 20
    
    for stress in stress_music:
        if stress.lower() in title_lower:
            score += 15
    
    # Emotion keywords
    keywords = EMOTION_KEYWORDS.get(emotion, [])
    for kw in keywords:
        if kw.lower() in title_lower:
            score += 12

    return score


def get_music_recommendations(
    dominant_emotion: str,
    interest_profile: dict = None,
    count: int = 5
):
    """
    Main improved recommendation engine with scoring
    """
    interest_profile = interest_profile or {}

    favorite_artists = interest_profile.get(
        "artists", []
    )

    music_genres = interest_profile.get(
        "music", []
    )

    music_languages = interest_profile.get(
        "music_languages",
        ["English"]
    )

    stress_music = interest_profile.get(
        "stress_music",
        []
    )

    queries = build_search_queries(
        dominant_emotion,
        favorite_artists,
        music_genres,
        music_languages,
        stress_music
    )

    all_tracks = []
    seen = set()

    for query in queries:
        if len(all_tracks) >= count * 3:  # Get extra for scoring
            break
            
        results = search_youtube(query, limit=5)
        
        for track in results:
            if track["youtube_url"] in seen:
                continue
            seen.add(track["youtube_url"])
            
            # Add metadata for scoring
            track["score"] = score_track(
                track["title"],
                favorite_artists,
                music_genres,
                stress_music,
                dominant_emotion
            )
            all_tracks.append(track)

    # Sort by score and return top results
    all_tracks.sort(key=lambda x: x["score"], reverse=True)

    return {
        "tracks": all_tracks[:count],
        "query_used": queries[0] if queries else "",
        "total_found": len(all_tracks)
    }