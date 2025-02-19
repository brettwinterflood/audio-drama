from server import generate_audio_files, generate_tts_files
import json
import os
import sys

sys.path.append(os.path.dirname(os.path.realpath(__file__)))

script_data = json.loads(open("data/scripts/script_1.json", "r").read())

generate_tts_files(script_data)
