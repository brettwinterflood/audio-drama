import requests
import os


def test_regenerate_music():
    # URL of your FastAPI application
    url = "http://localhost:8000/generate-audio/"

    # Path to your test script file
    # script_path = "data/scripts/script_1.json"
    script_path = "data/shows/script_1.json"

    # Ensure the test script file exists
    if not os.path.exists(script_path):
        print(f"Error: Test script file '{script_path}' not found.")
        return

    print("giong to post")
    # Open the file and send it as part of the request
    with open(script_path, "rb") as script_file:
        files = {"script": ("test_script.txt", script_file, "text/plain")}
        print("about to post")
        response = requests.post(url, files=files)
        print("posting")

    # Check the response
    if response.status_code == 200:
        result = response.json()
        print("Audio generation successful!")
        print(f"Full show path: {result['full_show']}")
    else:
        print(f"Error: Received status code {response.status_code}")
        print(f"Response: {response.text}")


if __name__ == "__main__":
    test_regenerate_music()
