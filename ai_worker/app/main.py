import os
import sys
import json
from utils.audio_converter import convert_to_wav
from stt import transcrever_audio
from ollama_client import analisar_com_ai, get_ai_config
from kanban import atualizar_status_kanban, get_supabase
from tts import gerar_audio_resposta

def pipeline_automacao_crm(audio_input_path: str, telefone_cliente: str, organization_id: str = None):
    """
    Pipeline com busca dinâmica de chaves de API do cliente.
    """
    print(f"\n--- 🚀 PIPELINE DINÂMICO (Org: {organization_id}) ---")
    
    supabase = get_supabase()
    
    # 1. Carregar configurações do banco (Groq, Gemini, etc)
    config = {}
    if organization_id and supabase:
        config = get_ai_config(supabase, organization_id)
        print(f"🔑 Configurações do cliente carregadas.")

    try:
        # 2. Conversão
        wav_path = convert_to_wav(audio_input_path)
        
        # 3. Transcrição (Groq ou Local)
        texto_cliente = transcrever_audio(wav_path, config)
        print(f"💬 Texto: {texto_cliente}")
        
        # 4. Inteligência (Groq ou Local)
        ai_raw = analisar_com_ai(texto_cliente, config)
        
        # Parse JSON flexível
        if isinstance(ai_raw, str):
            ai_data = json.loads(ai_raw.replace(/```json|```/g, ''))
        else:
            ai_data = ai_raw

        # 5. Atualização Kanban
        atualizar_status_kanban(telefone_cliente, ai_data['acao_kanban'])
        
        # 6. Geração de Resposta
        audio_resposta = gerar_audio_resposta(ai_data.get("resposta_cliente", "..."))
        
        return {
            "status": "success",
            "transcricao": texto_cliente,
            "acao": ai_data['acao_kanban'],
            "audio_url": audio_resposta
        }

    except Exception as e:
        print(f"🚨 Erro: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    # Exemplo: python main.py audio.ogg 5511999999999 <organization_id>
    if len(sys.argv) > 3:
        pipeline_automacao_crm(sys.argv[1], sys.argv[2], sys.argv[3])
