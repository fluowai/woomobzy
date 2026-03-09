import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERRO CRÍTICO: Variáveis de ambiente do Supabase não encontradas!");
  console.error("Certifique-se de que VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão definidas no arquivo .env");
  console.error("Exemplo:");
  console.error("VITE_SUPABASE_URL=https://seu-projeto.supabase.co");
  console.error("VITE_SUPABASE_ANON_KEY=sua-chave-aqui");
  
  // Criar cliente mock para evitar crash total
  if (typeof window !== 'undefined') {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#dc2626;color:white;display:flex;align-items:center;justify-content:center;font-family:sans-serif;z-index:999999;padding:2rem;text-align:center;';
    errorDiv.innerHTML = `
      <div>
        <h1 style="font-size:2rem;margin-bottom:1rem;">⚠️ Erro de Configuração</h1>
        <p style="font-size:1.2rem;margin-bottom:1rem;">As variáveis de ambiente do Supabase não foram encontradas.</p>
        <p style="opacity:0.9;">Verifique o console (F12) para mais detalhes.</p>
      </div>
    `;
    setTimeout(() => document.body?.appendChild(errorDiv), 100);
  }
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co", 
  supabaseAnonKey || "placeholder-key"
);
