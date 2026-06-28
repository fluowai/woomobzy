import requests


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
        print(f"Erro ao carregar config do banco: {e}")
    return {}


def analisar_com_ai(texto: str, config: dict):
    """
    Usa provedores externos configurados para analisar o atendimento.
    """
    groq_key = config.get("groq", {}).get("apiKey")

    if not groq_key:
        raise RuntimeError("Nenhuma chave Groq configurada para analisar o atendimento.")

    return analisar_com_groq(texto, groq_key)


def analisar_com_groq(texto: str, api_key: str):
    """
    Usa a API da Groq para classificar o atendimento.
    """
    print("Usando Groq Cloud (API do Cliente)...")
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    prompt = f"Analise este audio de cliente imobiliario e retorne APENAS JSON: '{texto}'. Categorias: visita, negociacao, atendimento, perdido."

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "Retorne APENAS um JSON valido com campos: lead_status, intencao, acao_kanban, resposta_cliente."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"}
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Erro Groq: {e}")
        return None
