import {
  LandingPageTemplate,
  defaultPremiumTheme,
  templateBlock,
} from './shared';
import { BlockType } from '../../types/landingPage';

import { mareTemplate } from './brands/mare';
import { novoLarTemplate } from './brands/novoLar';
import { nexoTemplate } from './brands/nexo';
import { entreTemplate } from './brands/entre';
const buildBrandTemplate = (
  id: string,
  name: string,
  description: string,
  htmlContent: string,
  cssContent: string,
  palette: any
): LandingPageTemplate => {
  return {
    id,
    name,
    description,
    thumbnail:
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'Custom Brand',
    group: 'Premium',
    objective: 'Capturar Leads',
    style: 'Moderno',
    resources: ['Imóveis', 'Depoimentos', 'Formulário'],
    themeConfig: {
      ...defaultPremiumTheme,
      primaryColor: palette.primary,
      secondaryColor: palette.secondary,
      backgroundColor: palette.background,
      textColor: palette.text,
    },
    blocks: [
      templateBlock(
        BlockType.CUSTOM_HTML,
        0,
        {
          code: `<style>\n${cssContent}\n</style>\n<div class="${id}-container">\n${htmlContent}\n</div>`,
        },
        {},
        'full'
      ),
    ],
  };
};

const vivaeHtml = `
  <header class="vivae-header">
    <div class="vivae-logo">VIVAÊ</div>
    <nav>
      <a href="#">Alugar</a><a href="#">Como funciona</a><a href="#">Bairros</a><a href="#">Favoritos</a><a href="#">Ajuda</a>
    </nav>
    <div class="vivae-auth">
      <button class="vivae-btn-outline">Entrar</button>
      <button class="vivae-btn-primary">Cadastrar</button>
    </div>
  </header>
  
  <section class="vivae-hero">
    <div class="vivae-hero-content">
      <h1>Alugar ficou<br/>do <span>seu jeito.</span></h1>
      <p>Imóveis que combinam com sua rotina, seu bolso e seus planos.</p>
      
      <div class="vivae-search-bar">
        <div class="vivae-search-input">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" placeholder="Onde você quer morar?" />
        </div>
        <div class="vivae-search-select">
          <small>Entrada</small>
          <strong>Quando?</strong>
        </div>
        <div class="vivae-search-select">
          <small>Faixa de preço</small>
          <strong>Até R$ 3.000</strong>
        </div>
        <button class="vivae-btn-primary">Encontrar meu apê</button>
      </div>

      <div class="vivae-tags">
        <span>📍 Perto do trabalho</span>
        <span>🐶 Aceita pet</span>
        <span>⚡ Sem fiador</span>
        <span>🛋️ Mobiliado</span>
      </div>
    </div>
    <div class="vivae-hero-images">
      <div class="vivae-image-grid">
        <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80" style="border-radius: 40px 100px 40px 40px;" />
        <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80" style="border-radius: 40px 40px 100px 40px;" />
        <img src="https://images.unsplash.com/photo-1537726235470-daa00d5f2a6f?auto=format&fit=crop&w=400&q=80" style="border-radius: 40px;" />
      </div>
      <div class="vivae-verified-badge">
        <strong>+ de 8 mil</strong>
        <p>imóveis<br/>verificados</p>
      </div>
    </div>
  </section>

  <section class="vivae-properties">
    <div class="vivae-section-header">
      <h2>Escolhas rápidas</h2>
      <a href="#">Ver todos os imóveis &rarr;</a>
    </div>
    <div class="vivae-grid">
      <div class="vivae-card">
        <div class="vivae-card-img"><img src="https://images.unsplash.com/photo-1502672260266-1c1cd2cb449c?auto=format&fit=crop&w=400&q=80"/><span class="badge yellow">Perto do trabalho</span></div>
        <div class="vivae-card-content">
          <h3>Vila Madalena</h3><p>Studio | 35 m² | Mobiliado</p>
          <strong>R$ 2.100</strong><small>Condomínio incluso</small>
        </div>
      </div>
      <div class="vivae-card">
        <div class="vivae-card-img"><img src="https://images.unsplash.com/photo-1522771731478-44fb8fa5c512?auto=format&fit=crop&w=400&q=80"/><span class="badge orange">Aceita pet</span></div>
        <div class="vivae-card-content">
          <h3>Pinheiros</h3><p>1 quarto | 35 m²</p>
          <strong>R$ 2.400</strong><small>Condomínio incluso</small>
        </div>
      </div>
      <div class="vivae-card">
        <div class="vivae-card-img"><img src="https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=400&q=80"/><span class="badge blue">Sem fiador</span></div>
        <div class="vivae-card-content">
          <h3>Bela Vista</h3><p>1 quarto | 40 m²</p>
          <strong>R$ 1.900</strong><small>Condomínio incluso</small>
        </div>
      </div>
      <div class="vivae-card">
        <div class="vivae-card-img"><img src="https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=400&q=80"/><span class="badge yellow">Mobiliado</span></div>
        <div class="vivae-card-content">
          <h3>Moema</h3><p>1 quarto | 30 m²</p>
          <strong>R$ 2.600</strong><small>Condomínio incluso</small>
        </div>
      </div>
    </div>
  </section>
`;

const vivaeCss = `
  .vivae-jovem-container { font-family: 'Inter', sans-serif; color: #1a1a1a; background: #fffcf8; }
  .vivae-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 60px; background: #fff; }
  .vivae-logo { font-size: 28px; font-weight: 900; color: #0044ff; letter-spacing: -1px; }
  .vivae-header nav { display: flex; gap: 30px; }
  .vivae-header nav a { text-decoration: none; color: #1a1a1a; font-weight: 600; font-size: 14px; }
  .vivae-auth { display: flex; gap: 15px; }
  .vivae-btn-outline { border: 2px solid #0044ff; color: #0044ff; padding: 10px 24px; border-radius: 99px; font-weight: 700; background: transparent; cursor: pointer; }
  .vivae-btn-primary { background: #0044ff; color: #fff; border: none; padding: 12px 28px; border-radius: 99px; font-weight: 700; cursor: pointer; }
  
  .vivae-hero { display: grid; grid-template-columns: 1.2fr 1fr; gap: 60px; padding: 60px; max-width: 1400px; margin: 0 auto; align-items: center; }
  .vivae-hero h1 { font-size: 72px; line-height: 1; font-weight: 900; margin: 0 0 20px 0; letter-spacing: -2px; }
  .vivae-hero h1 span { color: #0044ff; position: relative; }
  .vivae-hero h1 span::after { content: ''; position: absolute; bottom: 8px; left: 0; width: 100%; height: 12px; background: #d4ff00; z-index: -1; border-radius: 10px; }
  .vivae-hero p { font-size: 20px; color: #4a4a4a; margin-bottom: 40px; }
  
  .vivae-search-bar { background: #fff; padding: 10px; border-radius: 99px; display: flex; align-items: center; box-shadow: 0 10px 40px rgba(0,0,0,0.08); margin-bottom: 30px; }
  .vivae-search-input { flex: 1; display: flex; align-items: center; padding: 0 20px; border-right: 1px solid #eee; }
  .vivae-search-input svg { width: 20px; color: #888; margin-right: 10px; }
  .vivae-search-input input { border: none; outline: none; font-size: 16px; width: 100%; font-weight: 500; }
  .vivae-search-select { padding: 0 20px; border-right: 1px solid #eee; display: flex; flex-direction: column; }
  .vivae-search-select small { font-size: 11px; color: #888; font-weight: 600; text-transform: uppercase; }
  .vivae-search-select strong { font-size: 15px; }
  
  .vivae-tags { display: flex; gap: 15px; flex-wrap: wrap; }
  .vivae-tags span { background: #fff; border: 1px solid #eee; padding: 8px 16px; border-radius: 99px; font-size: 13px; font-weight: 600; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
  
  .vivae-image-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; position: relative; }
  .vivae-image-grid img { width: 100%; height: 220px; object-fit: cover; }
  .vivae-image-grid img:first-child { grid-column: span 2; height: 300px; }
  
  .vivae-verified-badge { position: absolute; right: 20px; bottom: 80px; background: #d4ff00; width: 140px; height: 140px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-shadow: 0 10px 30px rgba(212,255,0,0.4); transform: rotate(-5deg); }
  .vivae-verified-badge strong { font-size: 24px; font-weight: 900; line-height: 1; }
  .vivae-verified-badge p { font-size: 12px; font-weight: 700; margin: 0; }
  
  .vivae-properties { padding: 80px 60px; background: #f9f7f4; }
  .vivae-section-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
  .vivae-section-header h2 { font-size: 36px; font-weight: 900; margin: 0; letter-spacing: -1px; }
  .vivae-section-header a { color: #0044ff; font-weight: 700; text-decoration: none; }
  
  .vivae-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
  .vivae-card { background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.04); transition: transform 0.3s; }
  .vivae-card:hover { transform: translateY(-5px); }
  .vivae-card-img { position: relative; height: 200px; }
  .vivae-card-img img { width: 100%; height: 100%; object-fit: cover; }
  .vivae-card-img .badge { position: absolute; bottom: 15px; left: 15px; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
  .badge.yellow { background: #d4ff00; color: #1a1a1a; }
  .badge.orange { background: #ff7700; color: #fff; }
  .badge.blue { background: #0044ff; color: #fff; }
  
  .vivae-card-content { padding: 20px; }
  .vivae-card-content h3 { font-size: 18px; margin: 0 0 5px 0; font-weight: 800; }
  .vivae-card-content p { font-size: 13px; color: #666; margin: 0 0 15px 0; }
  .vivae-card-content strong { font-size: 20px; font-weight: 900; display: block; }
  .vivae-card-content small { font-size: 12px; color: #888; }
`;

const neroHtml = `
  <header class="nero-header">
    <div class="nero-logo">N E R O<br/><span>L I V I N G</span></div>
    <nav>
      <a href="#">Residências</a><a href="#">Destinos</a><a href="#">Experiência</a><a href="#">Anuncie seu imóvel</a>
    </nav>
    <button class="nero-btn">Explorar</button>
  </header>

  <section class="nero-hero">
    <div class="nero-hero-overlay"></div>
    <div class="nero-hero-content">
      <h1>Viva em um<br/>endereço<br/><span>extraordinário.</span></h1>
      <p>Residências selecionadas para<br/>uma vida sem concessões.</p>
      
      <div class="nero-search">
        <div class="nero-field">
          <small>DESTINO OU BAIRRO</small>
          <span>Ex: Ipanema, Trancoso, Itaim</span>
        </div>
        <div class="nero-field">
          <small>CHECK-IN</small>
          <span>Adicionar datas</span>
        </div>
        <div class="nero-field">
          <small>CHECK-OUT</small>
          <span>Adicionar datas</span>
        </div>
        <div class="nero-field">
          <small>HÓSPEDES</small>
          <span>2 hóspedes</span>
        </div>
        <button class="nero-submit">Explorar imóveis &rarr;</button>
      </div>
    </div>
  </section>

  <section class="nero-collection">
    <div class="nero-header-flex">
      <h2>Coleção em destaque</h2>
      <p>Curadoria, conforto e exclusividade.</p>
    </div>
    
    <div class="nero-grid">
      <div class="nero-card big">
        <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80" />
        <div class="nero-card-info">
          <small>IPANEMA</small>
          <h3>Cobertura Frente Mar</h3>
          <div class="nero-features"><span>4 suítes</span><span>5 banheiros</span><span>420 m²</span></div>
          <a href="#">Ver detalhes &rarr;</a>
        </div>
      </div>
      <div class="nero-card">
        <img src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=400&q=80" />
        <div class="nero-card-info">
          <small>ITAIM BIBI</small>
          <h3>Penthouse Design<br/>Contemporâneo</h3>
          <div class="nero-features"><span>3 suítes</span><span>310 m²</span></div>
          <a href="#">Ver detalhes &rarr;</a>
        </div>
      </div>
      <div class="nero-card">
        <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80" />
        <div class="nero-card-info">
          <small>TRANCOSO</small>
          <h3>Villa Exclusiva<br/>em Trancoso</h3>
          <div class="nero-features"><span>5 suítes</span><span>600 m²</span></div>
          <a href="#">Ver detalhes &rarr;</a>
        </div>
      </div>
    </div>
  </section>
`;

const neroCss = `
  .nero-living-container { font-family: 'Inter', sans-serif; background: #080808; color: #fff; }
  .nero-header { position: absolute; top: 0; left: 0; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 30px 80px; z-index: 10; }
  .nero-logo { font-family: 'Playfair Display', serif; font-size: 24px; letter-spacing: 4px; line-height: 1.2; text-align: center; }
  .nero-logo span { font-size: 11px; letter-spacing: 8px; color: #a98d5f; font-family: 'Inter', sans-serif; }
  .nero-header nav { display: flex; gap: 40px; }
  .nero-header nav a { color: #fff; text-decoration: none; font-size: 13px; font-weight: 300; letter-spacing: 1px; text-transform: uppercase; opacity: 0.8; transition: opacity 0.3s; }
  .nero-header nav a:hover { opacity: 1; color: #c3a370; }
  .nero-btn { background: transparent; border: 1px solid rgba(255,255,255,0.3); color: #fff; padding: 12px 32px; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; transition: all 0.3s; }
  .nero-btn:hover { border-color: #c3a370; color: #c3a370; }
  
  .nero-hero { height: 100vh; min-height: 800px; position: relative; background: url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80') center/cover no-repeat; display: flex; align-items: center; padding: 0 80px; }
  .nero-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%); }
  .nero-hero-content { position: relative; z-index: 2; max-width: 1200px; width: 100%; margin-top: 50px; }
  .nero-hero h1 { font-family: 'Playfair Display', serif; font-size: 72px; font-weight: 400; line-height: 1.1; margin: 0 0 20px 0; color: #fff; }
  .nero-hero h1 span { font-style: italic; color: #c3a370; }
  .nero-hero p { font-size: 18px; color: rgba(255,255,255,0.7); font-weight: 300; line-height: 1.6; margin-bottom: 60px; }
  
  .nero-search { background: rgba(20,20,20,0.8); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); display: flex; max-width: 1000px; }
  .nero-field { padding: 24px 32px; border-right: 1px solid rgba(255,255,255,0.1); flex: 1; display: flex; flex-direction: column; gap: 8px; }
  .nero-field small { font-size: 11px; color: rgba(255,255,255,0.5); letter-spacing: 1px; }
  .nero-field span { font-size: 15px; color: #fff; }
  .nero-submit { background: #c3a370; color: #000; border: none; padding: 0 40px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; transition: background 0.3s; }
  .nero-submit:hover { background: #d4b481; }
  
  .nero-collection { padding: 100px 80px; background: #0a0a0a; }
  .nero-header-flex { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 50px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; }
  .nero-header-flex h2 { font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 400; color: #fff; margin: 0; }
  .nero-header-flex p { font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 300; }
  
  .nero-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 20px; height: 500px; }
  .nero-card { position: relative; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; background: #111; }
  .nero-card img { width: 100%; height: 100%; object-fit: cover; opacity: 0.7; transition: opacity 0.5s, transform 0.5s; }
  .nero-card:hover img { opacity: 1; transform: scale(1.03); }
  .nero-card-info { position: absolute; bottom: 0; left: 0; width: 100%; padding: 40px 30px; background: linear-gradient(transparent, rgba(0,0,0,0.9)); }
  .nero-card-info small { color: #c3a370; font-size: 11px; letter-spacing: 2px; }
  .nero-card-info h3 { font-family: 'Playfair Display', serif; font-size: 24px; margin: 10px 0 15px; font-weight: 400; }
  .nero-features { display: flex; gap: 15px; margin-bottom: 20px; }
  .nero-features span { font-size: 12px; color: rgba(255,255,255,0.6); }
  .nero-card-info a { color: #c3a370; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
`;

const morarHtml = `
  <header class="morar-header">
    <div class="morar-logo">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1956E3" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
      <span>Morar</span>
    </div>
    <nav>
      <a href="#">Alugar</a><a href="#">Imóveis</a><a href="#">Bairros</a><a href="#">Para proprietários</a>
    </nav>
    <button class="morar-btn">Entrar</button>
  </header>

  <section class="morar-hero">
    <div class="morar-hero-text">
      <h1>Seu próximo lar começa aqui</h1>
      <p>Encontre imóveis para alugar sem complicação.</p>
    </div>
    <div class="morar-hero-image">
      <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80" />
    </div>
    
    <div class="morar-search">
      <div class="morar-search-inner">
        <div class="morar-field">
          <small>Onde você quer morar?</small>
          <input type="text" placeholder="Bairro ou cidade" />
        </div>
        <div class="morar-field">
          <small>Tipo de imóvel</small>
          <select><option>Qualquer tipo</option></select>
        </div>
        <div class="morar-field">
          <small>Faixa de preço</small>
          <select><option>Qualquer faixa</option></select>
        </div>
        <button class="morar-search-btn">Buscar imóveis</button>
      </div>
    </div>
    
    <div class="morar-stats">
      <div class="morar-stat"><div class="morar-icon">✓</div><strong>+12 anos</strong><p>Conectando pessoas<br/>a novos lares</p></div>
      <div class="morar-stat"><div class="morar-icon">⌂</div><strong>+35 mil</strong><p>Imóveis disponíveis<br/>para aluguel</p></div>
      <div class="morar-stat"><div class="morar-icon">👥</div><strong>+250 mil</strong><p>Pessoas já encontraram<br/>seu novo lar</p></div>
      <div class="morar-stat"><div class="morar-icon">⭐</div><strong>4,8/5</strong><p>Avaliação média dos<br/>nossos clientes</p></div>
    </div>
  </section>

  <section class="morar-properties">
    <div class="morar-section-top">
      <h2>Imóveis em destaque</h2>
      <a href="#">Ver todos os imóveis &rarr;</a>
    </div>
    <div class="morar-grid">
      <div class="morar-card">
        <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80" />
        <div class="morar-card-body">
          <small>Vila Madalena, São Paulo - SP</small>
          <h3>Apartamento 2 quartos</h3>
          <p>62 m² • 2 quartos • 1 vaga</p>
          <strong>R$ 3.200 <span>/mês</span></strong>
        </div>
      </div>
      <div class="morar-card">
        <img src="https://images.unsplash.com/photo-1502672260266-1c1cd2cb449c?auto=format&fit=crop&w=400&q=80" />
        <div class="morar-card-body">
          <small>Barra da Tijuca, Rio de Janeiro - RJ</small>
          <h3>Apartamento 3 quartos</h3>
          <p>85 m² • 3 quartos • 2 vagas</p>
          <strong>R$ 4.500 <span>/mês</span></strong>
        </div>
      </div>
      <div class="morar-card">
        <img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=80" />
        <div class="morar-card-body">
          <small>Savassi, Belo Horizonte - MG</small>
          <h3>Apartamento 2 quartos</h3>
          <p>70 m² • 2 quartos • 1 vaga</p>
          <strong>R$ 2.900 <span>/mês</span></strong>
        </div>
      </div>
      <div class="morar-card">
        <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80" />
        <div class="morar-card-body">
          <small>Aldeota, Fortaleza - CE</small>
          <h3>Apartamento 3 quartos</h3>
          <p>90 m² • 3 quartos • 2 vagas</p>
          <strong>R$ 5.200 <span>/mês</span></strong>
        </div>
      </div>
    </div>
  </section>
`;

const morarCss = `
  .morar-clean-container { font-family: 'Inter', sans-serif; background: #fff; color: #1a202c; }
  .morar-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 80px; max-width: 1400px; margin: 0 auto; }
  .morar-logo { display: flex; align-items: center; gap: 8px; font-size: 24px; font-weight: 800; color: #1956E3; }
  .morar-header nav { display: flex; gap: 32px; }
  .morar-header nav a { text-decoration: none; color: #4a5568; font-weight: 600; font-size: 15px; }
  .morar-btn { background: #1956E3; color: #fff; border: none; padding: 10px 24px; border-radius: 6px; font-weight: 600; font-size: 15px; cursor: pointer; }
  
  .morar-hero { max-width: 1240px; margin: 40px auto 80px; position: relative; padding: 0 20px; }
  .morar-hero-text { max-width: 500px; padding-top: 60px; position: relative; z-index: 2; }
  .morar-hero-text h1 { font-size: 56px; font-weight: 800; color: #0f172a; line-height: 1.1; margin: 0 0 20px; letter-spacing: -1px; }
  .morar-hero-text p { font-size: 20px; color: #475569; margin-bottom: 40px; }
  .morar-hero-text::after { content: ''; display: block; width: 60px; height: 4px; background: #ef4444; margin-top: 40px; }
  
  .morar-hero-image { position: absolute; right: 0; top: 0; width: 65%; height: 500px; z-index: 1; }
  .morar-hero-image img { width: 100%; height: 100%; object-fit: cover; border-radius: 24px 0 0 24px; mask-image: linear-gradient(to left, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%); -webkit-mask-image: linear-gradient(to left, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%); }
  
  .morar-search { position: relative; z-index: 10; max-width: 1000px; margin: 40px auto 0; background: #fff; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
  .morar-search-inner { display: flex; padding: 12px; }
  .morar-field { flex: 1; padding: 12px 24px; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 4px; }
  .morar-field small { font-size: 13px; font-weight: 600; color: #64748b; }
  .morar-field input, .morar-field select { border: none; font-size: 15px; color: #0f172a; outline: none; background: transparent; font-weight: 500; }
  .morar-search-btn { background: #1956E3; color: #fff; border: none; padding: 0 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-left: 12px; cursor: pointer; }
  
  .morar-stats { display: flex; justify-content: space-around; max-width: 1000px; margin: 60px auto 0; text-align: center; }
  .morar-stat { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .morar-icon { width: 48px; height: 48px; border-radius: 50%; background: #eff6ff; color: #1956E3; display: flex; justify-content: center; align-items: center; font-size: 20px; margin-bottom: 8px; }
  .morar-stat strong { font-size: 24px; font-weight: 800; color: #0f172a; }
  .morar-stat p { font-size: 14px; color: #64748b; line-height: 1.4; margin: 0; }
  
  .morar-properties { max-width: 1240px; margin: 100px auto; padding: 0 20px; }
  .morar-section-top { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
  .morar-section-top h2 { font-size: 32px; font-weight: 800; color: #0f172a; margin: 0; }
  .morar-section-top a { color: #1956E3; font-weight: 600; text-decoration: none; }
  
  .morar-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
  .morar-card { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; transition: box-shadow 0.3s; }
  .morar-card:hover { box-shadow: 0 10px 30px rgba(0,0,0,0.06); }
  .morar-card img { width: 100%; height: 200px; object-fit: cover; }
  .morar-card-body { padding: 20px; }
  .morar-card-body small { color: #64748b; font-size: 12px; font-weight: 500; }
  .morar-card-body h3 { font-size: 18px; font-weight: 700; color: #0f172a; margin: 8px 0; }
  .morar-card-body p { font-size: 13px; color: #475569; margin-bottom: 16px; }
  .morar-card-body strong { font-size: 20px; font-weight: 800; color: #1956E3; display: block; }
  .morar-card-body strong span { font-size: 14px; font-weight: 500; color: #64748b; }
`;

export const CUSTOM_BRANDS_TEMPLATES: LandingPageTemplate[] = [
  buildBrandTemplate(
    'vivae-jovem',
    'Vivaê - Aluguel Jovem',
    'Design vibrante, moderno e focado na jornada do aluguel jovem e descomplicado.',
    vivaeHtml,
    vivaeCss,
    {
      primary: '#0044FF',
      secondary: '#D4FF00',
      background: '#FFFCF8',
      text: '#1A1A1A',
    }
  ),
  buildBrandTemplate(
    'nero-living',
    'Nero Living - Luxo',
    'Layout de altíssimo padrão com paleta dark e dourada, evocando exclusividade.',
    neroHtml,
    neroCss,
    {
      primary: '#C3A370',
      secondary: '#0F0F0F',
      background: '#080808',
      text: '#FFFFFF',
    }
  ),
  buildBrandTemplate(
    'morar-clean',
    'Morar - Clean e Seguro',
    'Layout corporativo focado em usabilidade, segurança e volume de portfólio.',
    morarHtml,
    morarCss,
    {
      primary: '#1956E3',
      secondary: '#EF4444',
      background: '#FFFFFF',
      text: '#0F172A',
    }
  ),
  mareTemplate,
  novoLarTemplate,
  nexoTemplate,
  entreTemplate,
];
