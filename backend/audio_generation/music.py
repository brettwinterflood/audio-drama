import os
import random
import sqlite3
import json
from pydub import AudioSegment
from database.constants import DB_FILE, TABLE_NAME
from io import BytesIO

DEBUG_AUDIO_FOLDER = "debug_audio"

def create_music(show_id):
    print("\nCreating background music for show:", show_id)

    os.makedirs(DEBUG_AUDIO_FOLDER, exist_ok=True)

    # Get show data from database
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(f"SELECT event_timing FROM {TABLE_NAME} WHERE id = ?", (show_id,))
    result = cursor.fetchone()
    
    if not result:
        raise ValueError(f"Show {show_id} not found")
        
    event_timing = json.loads(result[0])
    total_duration = event_timing['total_dialogue_duration']

    # Select and process music file
    music_dir = "data/music"
    music_files = [f for f in os.listdir(music_dir) if f.endswith((".mp3", ".wav"))]

    if not music_files:
        raise ValueError("No music files found in music directory")

    music_file = random.choice(music_files)
    music_path = os.path.join(music_dir, music_file)
    print(f"Selected background music: {music_file}")

    # Load and prepare the music
    music = AudioSegment.from_file(music_path)

    # Loop music to cover the full duration if needed
    if len(music) < total_duration * 1000:
        loops_needed = int((total_duration * 1000) / len(music)) + 1
        music = music * loops_needed
    music = music[:(total_duration * 1000)]

    # Lower the volume of the music
    music = music - 15

    # Convert to binary data
    mp3_buffer = BytesIO()
    music.export(mp3_buffer, format="mp3")
    mp3_binary = mp3_buffer.getvalue()

    # Save debug file
    debug_mp3_path = os.path.join(DEBUG_AUDIO_FOLDER, f"{show_id}_music.mp3")
    music.export(debug_mp3_path, format="mp3")
    print(f"🔍 Debug MP3 saved: {debug_mp3_path}")

    try:
        cursor.execute(f"UPDATE {TABLE_NAME} SET music_audio = ? WHERE id = ?", (mp3_binary, show_id))
        conn.commit()
        print(f"✅ Database updated: show_id {show_id} → (BLOB data stored)")
    except Exception as e:
        print(f"❌ Database update failed: {str(e)}")
    finally:
        conn.close()

    return f"Music stored as BLOB for show_id {show_id}, and saved to {debug_mp3_path}"
