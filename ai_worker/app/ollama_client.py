import requests
import json
import os

# TENTA CARREGAR DO BANCO SE NÃO ESTIVER NO ENV
def get_ai_config(supabase, organization_id):
    """
    Busca as chaves de API configuradas pelo cliente no painel.
    """
    try:
        result = supabase.table("site_settings") \
            .select("integrations") \
            .eq("organization_id", organization_id) \
            .maybeSingle() \
            .execute()
        
        if result.data and result.data.get("integrations"):
            return result.data["integrations"]
    except Exception as e:
        print(f"⚠️ Erro ao carregar config do banco: {e}")
    return {}

def analisar_com_ai(texto: str, config: dict):
    """
    Decide usar Groq (se tiver chave) ou Ollama local.
    """
    groq_key = config.get("groq", {}).get("apiKey")
    
    if groq_key:
        return analisar_com_groq(texto, groq_key)
    else:
        return analisar_com_ollama(texto)

def analisar_com_groq(texto: str, api_key: str):
    """
    Usa a API da Groq (Ultra rápida e gratuita no beta).
    """
    print("🚀 Usando Groq Cloud (API do Cliente)...")
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    prompt = f"Analise este áudio de cliente imobiliário e retorne APENAS JSON: '{texto}'. Categorias: visita, negociacao, atendimento, perdido."
    
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "Retorne APENAS um JSON válido com campos: lead_status, intencao, acao_kanban, resposta_cliente."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"}
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"❌ Erro Groq: {e}")
        return None

def analisar_com_ollama(texto: str):
    """
    Fallback para Ollama Local.
    """
    # ... (mesma lógica do arquivo anterior)
    return "{}"
