import torch
from transformers import pipeline
import requests
import os

# Singleton para local
_stt_pipeline = None

def transcrever_audio(path: str, config: dict) -> str:
    """
    Tenta usar Groq Whisper (Nuvem) se houver chave, senão usa local.
    """
    groq_key = config.get("groq", {}).get("apiKey")
    
    if groq_key:
        return transcrever_com_groq(path, groq_key)
    
    return transcrever_local(path)

def transcrever_com_groq(path: str, api_key: str) -> str:
    """
    Transcrição via Groq Whisper (Extremamente rápida).
    """
    print("🎙️ Transcrevendo via Groq Cloud...")
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {api_key}"}
    
    with open(path, "rb") as f:
        files = {
            "file": (os.path.basename(path), f),
            "model": (None, "whisper-large-v3"),
            "language": (None, "pt"),
            "response_format": (None, "json")
        }
        response = requests.post(url, headers=headers, files=files)
        response.raise_for_status()
        return response.json().get("text", "")

def transcrever_local(path: str) -> str:
    global _stt_pipeline
    if _stt_pipeline is None:
        _stt_pipeline = pipeline(
            "automatic-speech-recognition",
            model="openai/whisper-tiny",
            device="cuda:0" if torch.cuda.is_available() else "cpu"
        )
    result = _stt_pipeline(path, generate_kwargs={"language": "portuguese"})
    return result["text"].strip()
