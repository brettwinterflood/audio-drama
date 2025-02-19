import os
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
from elevenlabs import save
import re


def generate_tts(text, speaker, voice, emotion="neutral"):
    load_dotenv()
    api_key = os.getenv("ELEVENLABS_API_KEY")
    client = ElevenLabs(api_key=api_key)

    filename = get_tts_filename(text, speaker, voice, emotion)
    directory = "data/dialogue"

    # Create directories if they don't exist
    os.makedirs(directory, exist_ok=True)

    # Check if file exists
    if os.path.exists(filename):
        print(f"File already exists: {filename}")
        return filename

    print(f"generating {filename}")
    audio = client.generate(text=text, voice=voice)
    save(audio, filename)
    print(f"Audio saved: {filename}")
    return filename


def generate_tts_files(script_data: dict) -> list:
    """Generate audio files from script data."""
    events = script_data.get("events", [])
    characters = script_data.get("characters", [])

    generated_files = []
    os.makedirs("data/dialogue", exist_ok=True)
    print(f"Generating TTS for events: {len(events)}")
    
    for event in events:
        print(event)
        if event["type"] != "dialogue":
            continue
        line = event
        speaker_name = line["speaker"]
        character = characters.get(speaker_name)

        if not character:
            continue

        voice = character["elevenlabs_voice"]
        text = line["line"]
        emotion = line["emotion"]

        filename = generate_tts(text, speaker_name, voice, emotion)
        if filename:
            generated_files.append({
                "file": filename,
                "character": speaker_name,
                "line": text,
                "emotion": emotion,
                "voice": voice
            })

    return generated_files


def get_tts_filename(text, speaker, voice, emotion):
    # Prepare filename
    words = text.split()[:5]
    filename_base = "_".join(words).lower()
    filename_base = re.sub(r"[^a-z0-9_]", "", filename_base)
    directory = "data/dialogue"
    filename = f"{directory}/{speaker}_{emotion}_{filename_base}_{voice}.mp3"
    return filename
