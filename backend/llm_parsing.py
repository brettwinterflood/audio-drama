from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Literal
import json
import os
from dotenv import load_dotenv
from openai import OpenAI
from langchain_anthropic import ChatAnthropic
from langchain_community.chat_models import ChatOpenAI
from langchain_ollama import OllamaLLM
from langchain.schema import HumanMessage, SystemMessage

class ScriptRequest(BaseModel):
    script_text: str
    provider: Literal["openai", "claude", "ollama"] = "openai"
    model: str = "gpt-4-0125-preview"

class GenerateAudioRequest(BaseModel):
    script: dict

def get_llm(provider: str, model: str):
    """Factory function to create the appropriate LLM client."""
    if provider == "openai":
        return ChatOpenAI(
            model=model,
            api_key=os.getenv("OPENAI_API_KEY")
        )
    elif provider == "claude":
        return ChatAnthropic(
            model=model,  # e.g. "claude-3-opus-20240229"
            anthropic_api_key=os.getenv("ANTHROPIC_API_KEY")
        )
    elif provider == "ollama":
        return OllamaLLM(
            model=model, 
            base_url="http://localhost:11434"
        )
    else:
        raise ValueError(f"Unsupported provider: {provider}")

def parse_script_with_llm(
    script_text: str, 
    dummy: bool = True, 
    provider: str = "openai",
    model: str = "gpt-4-0125-preview"
) -> dict:
    """
    Parse an unstructured film script with llms to json structured data.
    """
    if dummy:
        try:
            with open("data/scripts/script_1.json", "r", encoding="utf-8") as file:
                return json.load(file)
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=f"Dummy file not found: {str(e)}")
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail=f"Invalid JSON in dummy file: {str(e)}")

    system_prompt = "You are an AI that extracts structured data from show scripts."
    
    user_prompt = f"""
    Extract structured data from this film script.
    ### Output JSON format:
    {{
        "events": [
            {{"type": "soundeffect", "effect": "wind_blowing", "description": "A soft breeze rustles the trees"}},
            {{"type": "dialogue", "speaker": "Emma", "line": "What is this place?", "emotion": "curious"}}
        ],
        "scene_descriptions": [
            {{"time": 5, "description": "A mysterious old tree stands before them with a barely visible wooden door."}}
        ],
        "characters": {{
            "Emma": {{"description": "Skeptical but adventurous", "personality": "cautious", "elevenlabs_voice": "Emily", "Gender": "Female"}},
            "Leo": {{"description": "Enthusiastic and risk-taking", "personality": "adventurous", "elevenlabs_voice": "Charlie", "Gender": "Male"}}
        }}
    }}
    ### Script:
    {script_text}
    """

    try:
        load_dotenv()
        llm = get_llm(provider, model)
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]
        
        response = llm.invoke(messages)
        print(response)

        # OllamaLLM returns string directly, while others return a message with .content
        response_text = response if isinstance(response, str) else response.content

        return json.loads(response_text)
        
        
    except json.JSONDecodeError as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Invalid JSON in API response: {str(e)}")
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"LLM API error: {str(e)}")

