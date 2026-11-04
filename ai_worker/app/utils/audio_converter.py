import subprocess
import os

def convert_to_wav(input_path: str) -> str:
    """
    Converte arquivos .ogg ou outros formatos para .wav usando FFmpeg.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Arquivo não encontrado: {input_path}")

    base_path = os.path.splitext(input_path)[0]
    output_path = f"{base_path}_converted.wav"

    try:
        # Comando: ffmpeg -i input.ogg -ar 16000 -ac 1 output.wav
        # -ar 16000: Sample rate de 16kHz (ideal para Whisper)
        # -ac 1: Mono channel
        command = [
            'ffmpeg', '-y', '-i', input_path,
            '-ar', '16000', '-ac', '1',
            output_path
        ]
        
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return output_path
    except subprocess.CalledProcessError as e:
        print(f"Erro na conversão FFmpeg: {e.stderr.decode()}")
        raise Exception("Falha ao converter áudio via FFmpeg.")
