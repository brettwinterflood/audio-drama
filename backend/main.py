from fastapi import FastAPI, UploadFile, File
from llm_config import Provider, ModelConfig
from pydantic import BaseModel
from audio_generation.music import create_music
from audio_generation.sfx import create_sfx
from audio_generation.dialogue import create_dialogue
from timing import analyze_script_timing
from llm_parsing import parse_script_with_llm
from io import BytesIO
import sqlite3
from database.constants import TABLE_NAME, DB_FILE
import json
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import datetime
from fastapi.responses import StreamingResponse
from audio_generation.create_audio import create_audio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)


class ScriptRequest(BaseModel):
    script_text: str
    model: str = "llama3"


@app.post("/process/{show_id}")
async def process_show_script(
    show_id: int,
    dummy: int = Query(0),
    provider: Provider = Query(Provider.OPENAI),
    model: Optional[str] = Query(None)
):
    # Use centralized model configuration
    if model is None:
        model = ModelConfig.get_default_model(provider)
    elif not ModelConfig.is_valid_model(provider, model):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model for provider {provider}. Available models: {ModelConfig.AVAILABLE_MODELS[provider]}"
        )

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    print(f'starting {show_id} with {provider} model {model}')

    try:
        # Fetch the script for the given show_id
        cursor.execute(f"SELECT id, original_script FROM {TABLE_NAME} WHERE id = ?", (show_id,))
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Show not found")
        
        script_id, original_script = row

        # Process the script with specified provider and model
        processed_script = parse_script_with_llm(
            original_script,
            dummy=bool(dummy),
            provider=provider.value,
            model=model
        )

        # Store the processed script along with metadata about the provider and model used
        metadata = {
            **processed_script,
            "processing_metadata": {
                "provider": provider.value,
                "model": model,
                "processed_at": str(datetime.datetime.now())
            }
        }

        # Update the database with the processed script and metadata
        cursor.execute(
            f"UPDATE {TABLE_NAME} SET parsed_script = ? WHERE id = ?",
            (json.dumps(metadata), script_id)
        )
        
        conn.commit()
        
        return {
            "message": "Script processed successfully",
            "show_id": script_id,
            "provider": provider.value,
            "model": model,
            "processed_script": processed_script
        }

    except Exception as e:
        # Log the error for debugging
        print(f"Error processing script: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing script: {str(e)}")
    
    finally:
        conn.close()

@app.post("/analyze-timing/{show_id}")
async def analyze_timing(show_id: int):
    """Analyze timing for dialogue and sound effects for a show and store in database."""
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    try:
        # Fetch the parsed script for the given show_id
        cursor.execute(f"SELECT parsed_script FROM {TABLE_NAME} WHERE id = ?", (show_id,))
        row = cursor.fetchone()
        
        if not row or not row[0]:
            raise HTTPException(status_code=404, detail="Parsed script not found for this show_id")

        parsed_script = json.loads(row[0])

        # Generate timing analysis
        timing_report = analyze_script_timing(parsed_script)

        # Update the database with the timing report
        cursor.execute(
            f"UPDATE {TABLE_NAME} SET event_timing = ? WHERE id = ?",
            (json.dumps(timing_report), show_id)
        )
        conn.commit()

        return {
            "message": "Timing analysis completed successfully",
            "show_id": show_id,
            "timing_report": timing_report
        }

    except Exception as e:
        print(f"Error analyzing timing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing timing: {str(e)}")
    
    finally:
        conn.close()

@app.post("/generate-audio/{show_id}")
async def generate_audio(background_tasks: BackgroundTasks, show_id: int, type: str = Query("dialogue")):
    if type not in ["dialogue", "music", "sfx"]:
        raise HTTPException(status_code=400, detail="Invalid audio type. Choose from dialogue, music, or sfx.")

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Retrieve script for given show_id
    cursor.execute(f"SELECT parsed_script FROM {TABLE_NAME} WHERE id = ?", (show_id,))
    row = cursor.fetchone()
    conn.close()

    if not row or not row[0]:
        raise HTTPException(status_code=404, detail="Parsed script not found for this show_id")

    parsed_script = json.loads(row[0])  # Convert from JSON string to dict

    # Run audio generation as a background task
    background_tasks.add_task(create_audio, show_id, type)

    return {"message": f"{type} generation started", "show_id": show_id}


@app.get("/get-audio/{show_id}")
async def get_audio(show_id: int, type: str = Query("dialogue")):
    """Endpoint to retrieve the MP3 audio for a show (dialogue, music, sfx)."""
    if type not in ["dialogue", "music", "sfx"]:
        raise HTTPException(status_code=400, detail="Invalid audio type. Choose from dialogue, music, or sfx.")

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    column_name = f"{type}_audio"  # Fetch from dynamic column name

    cursor.execute(f"SELECT {column_name} FROM {TABLE_NAME} WHERE id = ?", (show_id,))
    row = cursor.fetchone()
    conn.close()

    if not row or not row[0]:
        raise HTTPException(status_code=404, detail=f"{type} audio not found for this show_id")

    # Convert BLOB data back to an MP3 file stream
    audio_stream = BytesIO(row[0])
    
    return StreamingResponse(audio_stream, media_type="audio/mpeg", headers={"Content-Disposition": f'inline; filename="show_{show_id}_{type}.mp3"'})


@app.get("/llm-config")
async def get_llm_config():
    """Return available providers and their models"""
    return {
        "providers": [
            {
                "value": provider.value,
                "label": provider.value.title(),
                "models": ModelConfig.AVAILABLE_MODELS[provider],
                "defaultModel": ModelConfig.DEFAULT_MODELS[provider]
            }
            for provider in Provider
        ]
    }
