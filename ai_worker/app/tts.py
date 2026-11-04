import torch
from transformers import VitsModel, AutoTokenizer
import scipy.io.wavfile
import os

# Singleton para carregar o modelo TTS
_tts_model = None
_tts_tokenizer = None

def load_tts_resources():
    global _tts_model, _tts_tokenizer
    if _tts_model is None:
        print("🔊 Carregando modelo TTS (facebook/mms-tts-por)...")
        model_id = "facebook/mms-tts-por"
        _tts_tokenizer = AutoTokenizer.from_pretrained(model_id)
        _tts_model = VitsModel.from_pretrained(model_id)

def gerar_audio_resposta(texto: str) -> str:
    """
    Gera um arquivo de áudio WAV a partir do texto de resposta.
    """
    load_tts_resources()
    
    inputs = _tts_tokenizer(texto, return_tensors="pt")
    
    with torch.no_grad():
        output = _tts_model(**inputs).waveform
    
    output_path = "resposta.wav"
    sampling_rate = _tts_model.config.sampling_rate
    
    scipy.io.wavfile.write(output_path, rate=sampling_rate, data=output[0].cpu().numpy())
    
    print(f"🎵 Resposta em áudio gerada: {output_path}")
    return os.path.abspath(output_path)
