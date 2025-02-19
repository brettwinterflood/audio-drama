
# Demos

![Parsing demo](1 Parsing.mp4)

![Full Show Audio demo](2 Full Show.mp4)

# Process steps

## 1. Script parsing 

Client calls `POST /api/upload` with the docx as form data
#### docx script upload
- the docx is is converted to text
- newlines are minimised
- a record in the `shows` table is inserted
#### Parsing docx to formatted json

Client calls `POST /process/{showId}?provider=openai&model=gpt-4-0125-preview`

- happens in [[backend/llm_parsing.py]]
- Uses an LLM to parse out the non-standard doc format into a json that the application can use

Properties extracted for the json:
- dialogue lines
	- The emotion that each line is spoken with - this can then be fed into the [[#3. Generative audio - TTS generation]] stage to give the correct emotion to a given line
- sound effects
	- a background sound 
		- can be mixed in whilst dialogue continues
	- transitory samples
		- that should occur in between speech lines 
- characters
	- names
	- voice characteristics that should be used for each

The best current LLM models can be used:
- OpenAI's chatGPT
- Mistral
- Deepseek
- xAI's grok

We can also execute this process locally with ollama:

`POST /process/{showId}?provider=ollama&model=mistral-nemo`

## 2. Script Timing Calculation

Client calls `POST /analyze-timing/{show_id}`

Adding timestamp data to the formatted JSON script
- TTS vocals are concatenated into a single audio file
- Time vocal lines, along with sound effects inserted in between them are given time positions
- this is so we can accurately place or mix in sound effect audio samples relative to their position in the script whilst preserving:
	- Background sounds / continuous ambience that should not 


> [!info] Improvement
> Timing of line delivery is important in drama and silence conveys it's own meaning, we could intelligently insert silence or make silence adjustable 

## 3. Generative audio - TTS generation 

Client calls `POST /generate-audio/{show_id}?type=dialogue`

- Generation happens in happens in [[backend/audio_generation/tts.py]]
- iterates over the lines, and using the character's chosen voice id renders the audio using TTS models 
- I've chosen ElevenLabs to rapidly build this but this but models such as fish-tts, and local generation with kokoro-82M TTS are other options. 


> [!info] Improvement
> For more fine grained and customisation, vocal actors could record only 10 seconds of audio and then style cloning or finetuning on existing tts models could be used. This could be taken further in order to convey an actor's happy,sad,angry voice even more efficiently

## 4. Generative audio - SFX generation 

Client calls `POST /generate-audio/{show_id}?type=sfx`

Logic in [[backend/audio_generation/sfx.py]]

Generative methods with text to audio models can generate infinite variations of a given sound effect referenced in the script. 

There is a distinction between transient audio effects (bangs, door close) and long running background ambience (environmental ambience, field recordings)

### Audio generation methods:
- Locally via Meta's Audiocraft - cheap but slow and generations are off the mark 
- Elevenlab's soundeffects api - best all around
- freesound.org - highest realism, commercial copyright sometimes applies 
### Audio Processing
- normalisation is applied
- crossfading for longrunning ambience samples 


## 5. Background music

Client calls `POST /generate-audio/{show_id}?type=music`

An optional ambience which can be subtly layered into the background
- right now from freesound.org but suno.ai could be used


## 6. Exporting

- Up till this stage we have been building each audio block in a modular fashion for robustness and editing granularity
- once the user it happy with the audio in the UI, we can call another endpoint in [[backend/main.py]] to stich all these audio components together into a single audiofile
- We can additionally write metadata to this file

## Other Improvements
- websockets for audio processing feedback - these are long running tasks
- goaudio fingerprint interested into the file so we can trace who is using the product in the wild and be secured against potential copyright issues
- custom ai model trained on a radioshow dataset
	- We could infer the sound effects, tone from the broader context of the show==
	- Right now the generative audio

# Tech Stack

##### sqlite for db
- simple, lightweight database 
- JSON columns used - as the product is MVP stage, but it would be better to move to a more thought out table relationship
- audio blobs used but disk folders and S3 would be another option
##### NextJS for frontend 
- Modern react framework with SSR
- Server endpoint extracts the docx to txt
- wavesurfer.js used for audio waveform rendering
- Shancn ui components
##### Python for backend 
- FastAPI
- Standard for ML
- Audio processing with `pydub`


---

# Todos
- [ ] use `previous_text, next_text` to improve [[#3. Generative audio - TTS generation]] tone / continuity / flow 
- [ ] parsing docx to timestamped json [[#1. Script parsing]]
	- [ ] Dialogue list 
	- [ ] Character list 
	- [ ] SFX list
	- [ ] cached LLM responses
- [ ] Changing character voices
	- [ ] multi language support - Choose language - English version
- [ ] Re-render each sound effect with audiocraft or elevenlabs 

#### Completed 
- [x] Re-render (long running task then UI update)
- [x] Re-render music button in UI chooses a different one 
- [x] AI generated sound effects [[AudioCraft by Meta (MusicGen)]]
- [x] use [[uv - built in rust]]
- [x] Audio TTS generation for each character line - list of .wav files 
	- [x] with elevenlabs api
- [x] Audio stichting
	- [x] TTS rendered in order
	- [x] Sound effects rendered in order 
	- [x] Background music