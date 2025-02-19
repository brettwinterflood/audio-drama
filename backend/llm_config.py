from enum import Enum
from typing import Dict, List

class Provider(str, Enum):
    OPENAI = "openai"
    CLAUDE = "claude"
    OLLAMA = "ollama"

class ModelConfig:
    DEFAULT_MODELS: Dict[Provider, str] = {
        Provider.OPENAI: "gpt-4-0125-preview",
        Provider.CLAUDE: "claude-3-opus-20240229",
        Provider.OLLAMA: "mistral"
    }

    AVAILABLE_MODELS: Dict[Provider, List[str]] = {
        Provider.OPENAI: ["gpt-4-0125-preview", "gpt-4", "gpt-3.5-turbo"],
        Provider.CLAUDE: ["claude-3-opus-20240229", "claude-3-sonnet-20240229"],
        Provider.OLLAMA: ["mistral:latest", "mistral-nemo", "llama2"]
    }

    @classmethod
    def get_default_model(cls, provider: Provider) -> str:
        return cls.DEFAULT_MODELS[provider]

    @classmethod
    def is_valid_model(cls, provider: Provider, model: str) -> bool:
        return model in cls.AVAILABLE_MODELS[provider]
