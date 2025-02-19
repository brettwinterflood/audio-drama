import os
import sqlite3
import json
import re
from pydub import AudioSegment
from database.constants import DB_FILE, TABLE_NAME
from io import BytesIO
from audiocraft.models import AudioGen
from audiocraft.data.audio import audio_write
from enum import Enum
import io
from elevenlabs import ElevenLabs
from dotenv import load_dotenv

CROSSFADE_DURATION = 1000  # 1 second crossfade
DEBUG_AUDIO_FOLDER = "debug_audio"  # Define debug folder

class SFXModel(Enum):
    ELEVENLABS_API = "elevenlabs_api"
    AUDIOCRAFT_LOCAL = "audiocraft_local"

def is_background_noise(duration, effect_name):
    return duration > 5.0

def validate_sound_effects(events):
    """
    Validate that all required sound effects exist.
    Returns a list of missing effects.
    """
    missing_effects = []
    for event in events:
        # Check for both MP3 and WAV files
        sfx_mp3 = f"data/sfx/{event['effect']}.mp3"
        sfx_wav = f"data/sfx/{event['effect']}.wav"
        if not os.path.exists(sfx_mp3) and not os.path.exists(sfx_wav):
            missing_effects.append(event['effect'])
    
    if missing_effects:
        print("\n⚠️ Missing sound effects:")
        for effect in sorted(set(missing_effects)):  # Remove duplicates and sort
            print(f"  - {effect}")
    
    return list(set(missing_effects))  # Return unique missing effects

def generate_ai_sound_effect_audiocraft(effect_name):
    """
    Use Meta's Audiocraft to generate a single sound effect.
    """
    try:
        model = AudioGen.get_pretrained('facebook/audiogen-medium')
        model.set_generation_params(duration=3)  # 3 seconds default duration
        
        # Convert effect name to description (replace underscores with spaces)
        description = effect_name.replace('_', ' ')
        print(f"Generating with Audiocraft: {description}")
        
        wav = model.generate([description])
        
        os.makedirs('data/sfx', exist_ok=True)
        
        # Save the generated audio
        save_path = f"data/sfx/{effect_name}"
        audio_write(save_path, wav[0].cpu(), model.sample_rate, 
                   strategy="loudness", loudness_compressor=True)
        
        print(f"✅ Generated with Audiocraft: {effect_name}")
        return True
    except Exception as e:
        print(f"❌ Audiocraft generation failed for {effect_name}: {str(e)}")
        return False

def generate_ai_sound_effect_elevenlabs(effect_name):
    """
    Use ElevenLabs to generate a single sound effect.

    https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert
    """
    try:
        load_dotenv()
        
        client = ElevenLabs(
            api_key=os.getenv("ELEVENLABS_API_KEY"),
        )
        
        description = effect_name.replace('_', ' ')
        print(f"Generating with ElevenLabs: {description}")
        
        # Get generator response
        audio_generator = client.text_to_sound_effects.convert(
            text=description,
            duration_seconds=10 
        )
        
        # Convert generator to bytes
        audio_data = io.BytesIO()
        for chunk in audio_generator:
            audio_data.write(chunk)
        audio_data = audio_data.getvalue()
        
        # Ensure data/sfx directory exists
        os.makedirs('data/sfx', exist_ok=True)
        
        # Save as MP3 since that's what ElevenLabs returns
        output_path = f"data/sfx/{effect_name}.mp3"
        with open(output_path, 'wb') as f:
            f.write(audio_data)
            
        print(f"✅ Generated with ElevenLabs: {effect_name}")
        return True
    except Exception as e:
        print(f"❌ ElevenLabs generation failed for {effect_name}: {str(e)}")
        return False

def generate_ai_sfx(missing_effects, sfx_model):
    """
    Generate missing sound effects using specified AI model.
    Args:
        missing_effects: List of effect names to generate
        sfx_model: SFXModel enum specifying which AI model to use
    """
    print(f"\n🤖 Generating sound effects using {sfx_model.value}...")
    
    for effect in missing_effects:
        if sfx_model == SFXModel.ELEVENLABS_API:
            success = generate_ai_sound_effect_elevenlabs(effect)
            if not success:
                # Fallback to Audiocraft if ElevenLabs fails
                print("Falling back to Audiocraft...")
                generate_ai_sound_effect_audiocraft(effect)
        else:
            generate_ai_sound_effect_audiocraft(effect)

def apply_crossfading(sfx_audio, event, effect_audio, active_backgrounds, start_ms):
    """
    Apply crossfading logic for background sounds.
    Returns the modified sfx_audio and updated active_backgrounds list.
    """
    # Check for overlapping background sounds
    current_time = start_ms
    
    # Fade out any overlapping background sounds
    for bg in active_backgrounds[:]:
        if bg['end_time'] > current_time:
            # Calculate fadeout position
            fadeout_start = max(current_time - CROSSFADE_DURATION, bg['start_time'])
            original_end = bg['end_time']
            
            # Apply fadeout
            remaining_duration = original_end - fadeout_start
            if remaining_duration > CROSSFADE_DURATION:
                sfx_audio = sfx_audio.fade(
                    start=fadeout_start,
                    duration=CROSSFADE_DURATION,
                    to_gain=-120.0  # Fade to silence
                )
            active_backgrounds.remove(bg)
            print(f"Faded out background: {bg['effect']} at {fadeout_start}ms")
    
    # Add new background sound with fadein
    effect_audio = effect_audio.fade_in(CROSSFADE_DURATION)
    sfx_audio = sfx_audio.overlay(effect_audio, position=start_ms)
    
    # Track this background sound
    active_backgrounds.append({
        'effect': event['effect'],
        'start_time': start_ms,
        'end_time': start_ms + len(effect_audio),
    })
    print(f"Added background: {event['effect']} at {start_ms}ms")
    
    return sfx_audio, active_backgrounds

def calculate_average_volume(events):
    """
    Calculate the average volume of all sound effects.
    Returns tuple of (average_volume, valid_effects_count)
    """
    total_volume = 0
    valid_effects = 0

    for event in events:
        sfx_mp3 = f"data/sfx/{event['effect']}.mp3"
        sfx_wav = f"data/sfx/{event['effect']}.wav"
        sfx_path = sfx_mp3 if os.path.exists(sfx_mp3) else sfx_wav
        
        try:
            if os.path.exists(sfx_path):
                effect_audio = AudioSegment.from_file(sfx_path)
                total_volume += effect_audio.dBFS
                valid_effects += 1
                print(f"Original volume for {event['effect']}: {effect_audio.dBFS:.1f} dBFS")
        except Exception as e:
            print(f"Error analyzing sound effect {event['effect']}: {str(e)}")
    
    if valid_effects > 0:
        average_volume = total_volume / valid_effects
        print(f"\nAverage effect volume: {average_volume:.1f} dBFS")
        return average_volume, valid_effects
    return 0, 0

def normalize_audio(effect_audio, target_dbfs):
    """
    Normalize audio to target dBFS level.
    Returns normalized audio segment.
    """
    volume_change = target_dbfs - effect_audio.dBFS
    return effect_audio.apply_gain(volume_change), volume_change

def create_sfx(show_id, sfx_model=SFXModel.ELEVENLABS_API):
    print("\nCreating sound effects for show:", show_id)

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

    # Initialize empty audio
    sfx_audio = AudioSegment.silent(duration=total_duration * 1000)

    # Set target volume level for normalization
    target_dbfs = -40

    events = event_timing.get("sound_effect_timing", [])
    
    # Validate and generate missing sound effects
    missing_effects = validate_sound_effects(events)
    if missing_effects:
        generate_ai_sfx(missing_effects, sfx_model=sfx_model)
    
    # Calculate average volume
    target_dbfs = -40
    average_volume, valid_effects = calculate_average_volume(events)
    if valid_effects > 0:
        print(f"Target volume: {target_dbfs} dBFS")

    # Process and position effects
    active_backgrounds = []

    for event in events:
        sfx_mp3 = f"data/sfx/{event['effect']}.mp3"
        sfx_wav = f"data/sfx/{event['effect']}.wav"
        sfx_path = sfx_mp3 if os.path.exists(sfx_mp3) else sfx_wav
        
        try:
            if os.path.exists(sfx_path):
                effect_audio = AudioSegment.from_file(sfx_path)
                duration = len(effect_audio) / 1000.0  # Convert to seconds
                
                # Normalize the audio
                effect_audio, volume_change = normalize_audio(effect_audio, target_dbfs)
                print(f"Normalized {event['effect']}: {volume_change:.1f}dB adjustment")

                start_ms = int(event["start_time"] * 1000)
                
                if is_background_noise(duration, event['effect']):
                    sfx_audio, active_backgrounds = apply_crossfading(
                        sfx_audio, event, effect_audio, active_backgrounds, start_ms
                    )
                else:
                    sfx_audio = sfx_audio.overlay(effect_audio, position=start_ms)
                    print(f"Added sound effect: {event['effect']} at {start_ms}ms")
            else:
                print(f"Sound effect file not found: {sfx_path}")
        except Exception as e:
            print(f"Error processing sound effect {event['effect']}: {str(e)}")

    # Convert MP3 to binary data
    mp3_buffer = BytesIO()
    sfx_audio.export(mp3_buffer, format="mp3")
    mp3_binary = mp3_buffer.getvalue()

    # Save for debugging
    debug_mp3_path = os.path.join(DEBUG_AUDIO_FOLDER, f"{show_id}_sfx.mp3")
    sfx_audio.export(debug_mp3_path, format="mp3")
    print(f"🔍 Debug MP3 saved: {debug_mp3_path}")

    try:
        cursor.execute(f"UPDATE {TABLE_NAME} SET sfx_audio = ? WHERE id = ?", (mp3_binary, show_id))
        conn.commit()
        print(f"✅ Database updated: show_id {show_id} → (BLOB data stored)")
    except Exception as e:
        print(f"❌ Database update failed: {str(e)}")
    finally:
        conn.close()

    return f"SFX stored as BLOB for show_id {show_id}, and saved to {debug_mp3_path}"
