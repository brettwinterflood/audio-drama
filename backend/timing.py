from pydub import AudioSegment
import json
import os
from audio_generation.tts import generate_tts_files
import datetime

def analyze_script_timing(script_data: dict) -> dict:
    """
    Analyze the script timing and generate a report of dialogue and sound effect timings.
    Returns a dictionary containing timing information for both dialogue and sound effects.
    """
    # First generate all TTS files for dialogue
    generated_files = generate_tts_files(script_data)
    
    events = script_data.get("events", [])
    
    # Track dialogue timing
    dialogue_audio = AudioSegment.empty()
    dialogue_timestamps = []
    current_time_ms = 0

    print("\nAnalyzing dialogue timing...")
    for file_data in generated_files:
        file_path = file_data["file"]
        if os.path.exists(file_path):
            audio_segment = AudioSegment.from_mp3(file_path)
            start_time = current_time_ms / 1000
            duration = len(audio_segment) / 1000
            end_time = start_time + duration

            dialogue_timestamps.append({
                "file": file_path,
                "start_time": start_time,
                "duration": duration,
                "end_time": end_time,
                "character": file_data["character"],
                "line": file_data["line"],
                "emotion": file_data["emotion"],
            })

            print(f"Dialogue: {os.path.basename(file_path)}")
            print(f"  Character: {file_data['character']}")
            print(f"  Line: {file_data['line']}")
            print(f"  Emotion: {file_data['emotion']}")
            print(
                f"  Start: {start_time:.2f}s, Duration: {duration:.2f}s, End: {end_time:.2f}s"
            )

            dialogue_audio += audio_segment
            current_time_ms += len(audio_segment)

    # Calculate total duration now
    total_duration = current_time_ms / 1000

    # Get all events in order
    events = script_data.get("events", [])

    # Separate dialogue and sound effects while maintaining their relative order
    dialogue_events = []
    sound_effects = []
    for event in events:
        if event["type"] == "dialogue":
            dialogue_events.append(event)
        else:  # soundeffect
            sound_effects.append(event)

    # Now analyze sound effects timing based on their position between dialogue
    sound_effect_timing = []
    print("\nAnalyzing sound effects timing...")

    for i, effect in enumerate(sound_effects):
        # Find the surrounding dialogue events
        effect_index = events.index(effect)

        # Find the previous and next dialogue events
        prev_dialogue = None
        next_dialogue = None

        # Look backwards for previous dialogue
        for j in range(effect_index - 1, -1, -1):
            if j >= 0 and events[j]["type"] == "dialogue":
                prev_dialogue_index = dialogue_events.index(events[j])
                if prev_dialogue_index < len(dialogue_timestamps):
                    prev_dialogue = dialogue_timestamps[prev_dialogue_index]
                break

        # Look forwards for next dialogue
        for j in range(effect_index + 1, len(events)):
            if events[j]["type"] == "dialogue":
                next_dialogue_index = dialogue_events.index(events[j])
                if next_dialogue_index < len(dialogue_timestamps):
                    next_dialogue = dialogue_timestamps[next_dialogue_index]
                break

        # Find the next sound effect in the events list
        next_sound_effect = None
        next_sound_effect_index = None
        for j in range(effect_index + 1, len(events)):
            if events[j]["type"] == "soundeffect":
                next_sound_effect = events[j]
                next_sound_effect_index = j
                break

        # Calculate start time based on previous dialogue
        if prev_dialogue:
            start_time = prev_dialogue["end_time"]
        else:
            # If this is the first sound effect, start at 0
            start_time = 0.0

        # Calculate end time based on next sound effect
        if next_sound_effect:
            # Find when the next sound effect starts
            # First, look for any dialogue that starts after current effect but before next effect
            last_dialogue_before_next = None
            for j in range(effect_index + 1, next_sound_effect_index):
                if events[j]["type"] == "dialogue":
                    dialogue_index = dialogue_events.index(events[j])
                    if dialogue_index < len(dialogue_timestamps):
                        last_dialogue_before_next = dialogue_timestamps[dialogue_index]

            # The current effect continues until the next effect starts
            # If there's dialogue before the next effect, use that dialogue's end time
            if last_dialogue_before_next:
                end_time = last_dialogue_before_next["end_time"]
            else:
                # If no dialogue before next effect, use the first dialogue after current effect
                for j in range(effect_index + 1, len(events)):
                    if events[j]["type"] == "dialogue":
                        dialogue_index = dialogue_events.index(events[j])
                        if dialogue_index < len(dialogue_timestamps):
                            end_time = dialogue_timestamps[dialogue_index]["end_time"]
                            break
                else:
                    # If no dialogue found, continue until the end
                    end_time = total_duration
        else:
            # If this is the last sound effect, continue until the end
            end_time = total_duration

        duration = end_time - start_time
        position = "intro" if not prev_dialogue else "continuous"

        # Calculate crossfade duration - 2 seconds or half the effect duration, whichever is shorter
        crossfade_duration = min(2.0, duration / 2) if next_sound_effect else 0.0

        sound_effect_timing.append(
            {
                "effect": effect["effect"],
                "description": effect.get("description", ""),
                "start_time": start_time,
                "end_time": end_time,
                "duration": duration,
                "position": position,
                "crossfade_duration": crossfade_duration,
                "prev_dialogue": prev_dialogue["file"] if prev_dialogue else None,
                "next_dialogue": next_dialogue["file"] if next_dialogue else None,
            }
        )

        print(f"Sound Effect: {effect['effect']}")
        print(
            f"  Start: {start_time:.2f}s, Duration: {duration:.2f}s, End: {end_time:.2f}s"
        )
        print(f"  Description: {effect.get('description', '')}")
        if prev_dialogue:
            print(f"  After: {os.path.basename(prev_dialogue['file'])}")
        if next_dialogue:
            print(f"  Before: {os.path.basename(next_dialogue['file'])}")


    timing_report = {
        "dialogue_timing": dialogue_timestamps,
        "sound_effect_timing": sound_effect_timing,
        "total_dialogue_duration": current_time_ms / 1000,
        "analysis_timestamp": datetime.datetime.now().isoformat()
    }

    # Comment out or remove the JSON file writing section since we'll store in DB
    # output_dir = "data/shows"
    # os.makedirs(output_dir, exist_ok=True)
    # report_path = os.path.join(output_dir, "timing_analysis.json")
    # with open(report_path, "w") as f:
    #     json.dump(timing_report, f, indent=2)

    print(f"Total dialogue duration: {current_time_ms/1000:.2f} seconds")

    return timing_report