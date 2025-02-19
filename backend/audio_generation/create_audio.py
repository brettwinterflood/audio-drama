from audio_generation.dialogue import create_dialogue
from audio_generation.sfx import create_sfx
from audio_generation.music import create_music
from fastapi import HTTPException

def create_audio(show_id, audio_type):
    """Generates MP3 for dialogue, music, or SFX and stores as BLOB."""
    print(f"\n🎙️ Creating {audio_type} audio for show_id: {show_id}")

    if audio_type == "dialogue":
        return create_dialogue(show_id)
    elif audio_type == "sfx":
        return create_sfx(show_id)
    elif audio_type == "music":
        return create_music(show_id)

    raise HTTPException(status_code=400, detail=f"Audio type '{audio_type}' is not supported")