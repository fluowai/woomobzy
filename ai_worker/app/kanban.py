import os
from supabase import create_client, Client

# Tenta carregar as variáveis de ambiente (as mesmas do projeto Node.js)
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

def get_supabase():
    if SUPABASE_URL and SUPABASE_KEY:
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    return None

def atualizar_status_kanban(telefone: str, acao: str):
    """
    Atualiza o lead no Supabase baseado na ação identificada pela IA.
    """
    
    # Mapeamento do JSON da IA para as colunas do seu Kanban real
    map_status = {
        "visita": "Visita",
        "negociacao": "Proposta",
        "atendimento": "Em Atendimento",
        "perdido": "Perdido"
    }
    
    novo_status = map_status.get(acao, "Em Atendimento")
    
    print(f"📊 [KANBAN] Movendo lead {telefone} para: {novo_status}")
    
    supabase = get_supabase()
    if not supabase:
        print("⚠️ Supabase não configurado. Simulação apenas.")
        return False

    try:
        # Busca o lead pelo telefone (tirando caracteres não numéricos)
        clean_phone = ''.join(filter(str.isdigit, telefone))
        
        result = supabase.table("leads") \
            .update({"status": novo_status}) \
            .ilike("phone", f"%{clean_phone}%") \
            .execute()
            
        if result.data:
            print(f"✅ Lead atualizado com sucesso no banco de dados.")
            return True
        else:
            print(f"❓ Nenhum lead encontrado com o telefone {telefone}")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao atualizar Supabase: {e}")
        return False
