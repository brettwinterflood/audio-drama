from server import generate_full_show
import json
import os
import sys

sys.path.append(os.path.dirname(os.path.realpath(__file__)))

script_data = json.loads(open("data/scripts/script_1.json", "r").read())

generate_full_show(script_data)
