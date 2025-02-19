import os
import sqlite3
import json
from pydub import AudioSegment
from database.constants import DB_FILE, TABLE_NAME
from io import BytesIO

DEBUG_AUDIO_FOLDER = "debug_audio"  # Define debug folder

def create_dialogue(show_id):
    print("\nCreating dialogue for show:", show_id)

    # Ensure the debug folder exists
    os.makedirs(DEBUG_AUDIO_FOLDER, exist_ok=True)

    # Get show data from database
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(f"SELECT event_timing FROM {TABLE_NAME} WHERE id = ?", (show_id,))
    result = cursor.fetchone()
    
    if not result:
        raise ValueError(f"Show {show_id} not found")
        
    event_timing = json.loads(result[0])
    dialogue_timing = event_timing['dialogue_timing']
    total_duration = event_timing['total_dialogue_duration']

    # Initialize empty audio
    dialogue_audio = AudioSegment.silent(duration=total_duration * 1000)  # Convert to milliseconds

    print(f"Total dialogue segments: {len(dialogue_timing)}")
    
    for segment in dialogue_timing:
        file_path = segment["file"]
        if os.path.exists(file_path):
            audio_segment = AudioSegment.from_mp3(file_path)
            start_ms = int(segment["start_time"] * 1000)  # Convert to milliseconds

            print(f"Overlayin dialogue: {os.path.basename(file_path)} at {segment['start_time']:.2f}s")
            dialogue_audio = dialogue_audio.overlay(audio_segment, position=start_ms)
        else:
            print(f"❌ Dialogue file not found: {file_path}")

    # Convert MP3 to binary data
    mp3_buffer = BytesIO()
    dialogue_audio.export(mp3_buffer, format="mp3")
    mp3_binary = mp3_buffer.getvalue()

    # Save for debugging
    debug_mp3_path = os.path.join(DEBUG_AUDIO_FOLDER, f"{show_id}.mp3")
    dialogue_audio.export(debug_mp3_path, format="mp3")
    print(f"🔍 Debug MP3 saved: {debug_mp3_path}")

    try:
        cursor.execute(f"UPDATE {TABLE_NAME} SET dialogue_audio = ? WHERE id = ?", (mp3_binary, show_id))
        conn.commit()
        print(f"✅ Database updated: show_id {show_id} → (BLOB data stored)")
    except Exception as e:
        print(f"❌ Database update failed: {str(e)}")
    finally:
        conn.close()

    return f"Dialogue stored as BLOB for show_id {show_id}, and saved to {debug_mp3_path}"