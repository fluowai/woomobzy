import { LandingPageTemplate, templateBlock, defaultPremiumTheme } from '../shared';
import { BlockType } from '../../../types/landingPage';

const novoLarHtml = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600&display=swap');
    
    .novolar-container {
      font-family: 'Outfit', sans-serif;
      color: #333;
      background-color: #FDFBF7;
      width: 100%;
      overflow-x: hidden;
    }
    .novolar-container * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    .novolar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 5%;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      z-index: 10;
    }
    .novolar-logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-family: 'Lora', serif;
      font-size: 1.8rem;
      font-weight: 600;
      color: #6B2D26;
    }
    .novolar-logo svg {
      color: #6B2D26;
    }
    .novolar-logo-text {
      display: flex;
      flex-direction: column;
      line-height: 1;
    }
    .novolar-logo-text span {
      font-family: 'Outfit', sans-serif;
      font-size: 0.6rem;
      font-weight: 400;
      letter-spacing: 1px;
      color: #555;
      margin-top: 2px;
    }
    .novolar-nav {
      display: flex;
      gap: 2rem;
    }
    .novolar-nav a {
      color: #333;
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 500;
      transition: color 0.3s;
    }
    .novolar-nav a:hover {
      color: #6B2D26;
    }
    .novolar-btn-primary {
      background: #6B2D26;
      color: #FDFBF7;
      border: none;
      padding: 0.8rem 1.8rem;
      border-radius: 30px;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.3s;
    }
    .novolar-btn-primary:hover {
      background: #50211c;
    }
    
    .novolar-hero {
      position: relative;
      height: 100vh;
      min-height: 800px;
      padding: 0 5%;
      display: flex;
      align-items: center;
      background: url('https://images.unsplash.com/photo-1576941089067-2de3c901e126?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80') center/cover;
    }
    .novolar-hero::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(to right, rgba(253,251,247,0.95) 0%, rgba(253,251,247,0.7) 40%, transparent 100%);
    }
    .novolar-hero-content {
      position: relative;
      z-index: 2;
      max-width: 550px;
      margin-top: -100px;
    }
    .novolar-hero h1 {
      font-family: 'Lora', serif;
      font-size: 4.5rem;
      line-height: 1.1;
      color: #6B2D26;
      margin-bottom: 1.5rem;
    }
    .novolar-hero p {
      font-size: 1.1rem;
      color: #555;
      line-height: 1.6;
    }
    
    .novolar-search-wrapper {
      position: absolute;
      bottom: -60px;
      left: 5%;
      right: 5%;
      z-index: 10;
      display: flex;
      justify-content: center;
    }
    .novolar-search-box {
      background: #fff;
      border-radius: 20px;
      padding: 2.5rem;
      box-shadow: 0 20px 40px rgba(107,45,38,0.08);
      width: 100%;
      max-width: 1100px;
    }
    .novolar-search-box h3 {
      font-family: 'Lora', serif;
      color: #6B2D26;
      font-size: 1.8rem;
      margin-bottom: 1.5rem;
    }
    .novolar-search-form {
      display: grid;
      grid-template-columns: repeat(4, 1fr) auto;
      gap: 1rem;
      align-items: flex-end;
    }
    .novolar-search-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .novolar-search-field label {
      font-size: 0.85rem;
      font-weight: 500;
      color: #555;
    }
    .novolar-search-field select {
      padding: 1rem;
      border: 1px solid #E5E0D8;
      border-radius: 8px;
      background: #FDFBF7;
      font-family: 'Outfit', sans-serif;
      font-size: 0.95rem;
      color: #333;
      outline: none;
    }
    .novolar-search-btn {
      background: #6B2D26;
      color: #FDFBF7;
      border: none;
      padding: 1rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      height: 50px;
    }
    .novolar-search-tags {
      display: flex;
      gap: 2rem;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #F0EBE1;
    }
    .novolar-tag {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #555;
    }
    .novolar-tag svg {
      color: #6B2D26;
    }
    
    .novolar-fases {
      padding: 12rem 5% 6rem;
      background: #FDFBF7;
      text-align: center;
    }
    .novolar-fases h2 {
      font-family: 'Lora', serif;
      color: #6B2D26;
      font-size: 2.5rem;
      margin-bottom: 4rem;
    }
    .novolar-fases-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 2rem;
    }
    .novolar-fase-card {
      background: #fff;
      border-radius: 12px;
      padding: 1rem;
      text-align: left;
      border: 1px solid #F0EBE1;
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .novolar-fase-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 30px rgba(0,0,0,0.05);
    }
    .novolar-fase-img {
      width: 100%;
      height: 200px;
      border-radius: 8px;
      object-fit: cover;
      margin-bottom: 1.5rem;
    }
    .novolar-fase-card h4 {
      font-family: 'Lora', serif;
      color: #6B2D26;
      font-size: 1.3rem;
      margin-bottom: 0.8rem;
    }
    .novolar-fase-card p {
      font-size: 0.9rem;
      color: #666;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .novolar-fase-link {
      color: #6B2D26;
      font-size: 0.9rem;
      font-weight: 500;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    
    .novolar-bairros {
      background: #1A3E31;
      color: #FDFBF7;
      padding: 6rem 5%;
      text-align: center;
    }
    .novolar-bairros h2 {
      font-family: 'Lora', serif;
      font-size: 2.5rem;
      margin-bottom: 4rem;
      color: #FDFBF7;
    }
    .novolar-bairros-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 3rem;
    }
    .novolar-bairro-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .novolar-bairro-item svg {
      width: 48px;
      height: 48px;
      color: #C69C6D;
      margin-bottom: 0.5rem;
    }
    .novolar-bairro-item h4 {
      font-family: 'Lora', serif;
      font-size: 1.2rem;
      font-weight: 500;
    }
    .novolar-bairro-item p {
      font-size: 0.9rem;
      opacity: 0.8;
      line-height: 1.5;
    }
    .novolar-btn-gold {
      background: #C69C6D;
      color: #fff;
      border: none;
      padding: 1rem 2.5rem;
      border-radius: 30px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      margin-top: 4rem;
      display: inline-block;
      transition: background 0.3s;
    }
    .novolar-btn-gold:hover {
      background: #b58c5d;
    }
    
    .novolar-passos {
      padding: 6rem 5%;
      background: #FDFBF7;
    }
    .novolar-passos h2 {
      font-family: 'Lora', serif;
      color: #6B2D26;
      font-size: 2.5rem;
      margin-bottom: 4rem;
    }
    .novolar-passos-container {
      display: flex;
      gap: 4rem;
      align-items: flex-start;
    }
    .novolar-passos-list {
      flex: 1;
      display: flex;
      justify-content: space-between;
      position: relative;
    }
    .novolar-passos-list::before {
      content: '';
      position: absolute;
      top: 35px;
      left: 10%;
      right: 10%;
      border-top: 2px dotted #C69C6D;
      z-index: 1;
    }
    .novolar-passo {
      width: 22%;
      position: relative;
      z-index: 2;
    }
    .novolar-passo-num {
      width: 30px;
      height: 30px;
      background: #6B2D26;
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
    .novolar-passo-icon {
      width: 70px;
      height: 70px;
      background: #FDFBF7;
      border: 1px solid #F0EBE1;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
      color: #C69C6D;
    }
    .novolar-passo h4 {
      font-family: 'Lora', serif;
      color: #333;
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
      text-align: center;
    }
    .novolar-passo p {
      font-size: 0.85rem;
      color: #666;
      text-align: center;
      line-height: 1.4;
    }
    .novolar-mudanca-box {
      width: 300px;
      background: #6B2D26;
      color: #FDFBF7;
      padding: 2.5rem;
      border-radius: 16px;
      text-align: center;
    }
    .novolar-mudanca-box svg {
      width: 48px;
      height: 48px;
      color: #C69C6D;
      margin-bottom: 1rem;
    }
    .novolar-mudanca-box h3 {
      font-family: 'Lora', serif;
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }
    .novolar-mudanca-box p {
      font-size: 0.9rem;
      opacity: 0.9;
      margin-bottom: 2rem;
      line-height: 1.5;
    }
    
    .novolar-historias {
      padding: 4rem 5% 8rem;
      background: #FDFBF7;
    }
    .novolar-historias h2 {
      font-family: 'Lora', serif;
      color: #6B2D26;
      font-size: 2.5rem;
      text-align: center;
      margin-bottom: 4rem;
    }
    .novolar-historias-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
      align-items: center;
    }
    .novolar-historia-card {
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #F0EBE1;
      display: flex;
    }
    .novolar-historia-content {
      padding: 2rem;
      flex: 1;
    }
    .novolar-historia-quote {
      font-size: 3rem;
      color: #C69C6D;
      font-family: 'Lora', serif;
      line-height: 1;
      margin-bottom: 0.5rem;
    }
    .novolar-historia-content p {
      font-size: 0.95rem;
      color: #444;
      line-height: 1.6;
      margin-bottom: 2rem;
      font-style: italic;
    }
    .novolar-historia-author h5 {
      font-weight: 600;
      color: #333;
      margin-bottom: 0.2rem;
    }
    .novolar-historia-author span {
      font-size: 0.8rem;
      color: #888;
    }
    .novolar-historia-img {
      width: 40%;
      object-fit: cover;
    }
    
    .novolar-conteudos {
      padding: 0 5% 6rem;
      display: flex;
      gap: 4rem;
    }
    .novolar-cont-left {
      flex: 2;
    }
    .novolar-cont-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 2rem;
    }
    .novolar-cont-header h2 {
      font-family: 'Lora', serif;
      color: #6B2D26;
      font-size: 2.2rem;
    }
    .novolar-cont-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
    }
    .novolar-post {
      background: #fff;
      border-radius: 8px;
      border: 1px solid #F0EBE1;
      overflow: hidden;
    }
    .novolar-post img {
      width: 100%;
      height: 140px;
      object-fit: cover;
    }
    .novolar-post-content {
      padding: 1rem;
    }
    .novolar-post-tag {
      background: #1A3E31;
      color: #fff;
      font-size: 0.65rem;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 0.8rem;
      display: inline-block;
    }
    .novolar-post h4 {
      font-family: 'Lora', serif;
      color: #333;
      font-size: 1.1rem;
      line-height: 1.4;
      margin-bottom: 1rem;
    }
    .novolar-post-link {
      color: #6B2D26;
      font-size: 0.85rem;
      font-weight: 500;
      text-decoration: none;
    }
    
    .novolar-proprietarios {
      flex: 1;
      background: #C15B4C;
      border-radius: 16px;
      padding: 3rem;
      color: #FDFBF7;
    }
    .novolar-proprietarios h3 {
      font-family: 'Lora', serif;
      font-size: 2rem;
      margin-bottom: 1.5rem;
    }
    .novolar-prop-list {
      list-style: none;
      margin-bottom: 2.5rem;
    }
    .novolar-prop-list li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.8rem;
      font-size: 0.95rem;
    }
    .novolar-prop-list li svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
    
    .novolar-cta-footer {
      background: #6B2D26;
      color: #FDFBF7;
      padding: 3rem 5%;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .novolar-cta-footer h2 {
      font-family: 'Lora', serif;
      font-size: 1.8rem;
      margin-bottom: 0.5rem;
    }
    .novolar-cta-footer p {
      font-size: 1rem;
      opacity: 0.9;
    }
    
    .novolar-footer {
      background: #FDFBF7;
      padding: 4rem 5%;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr;
      gap: 2rem;
      border-top: 1px solid #E5E0D8;
    }
    .novolar-footer-logo p {
      font-size: 0.85rem;
      color: #666;
      margin-top: 1rem;
      line-height: 1.6;
    }
    .novolar-footer h4 {
      font-size: 0.95rem;
      color: #333;
      margin-bottom: 1.5rem;
    }
    .novolar-footer ul {
      list-style: none;
    }
    .novolar-footer ul li {
      margin-bottom: 0.8rem;
    }
    .novolar-footer ul li a {
      color: #666;
      text-decoration: none;
      font-size: 0.85rem;
    }
    .novolar-footer-contact li {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
      color: #666;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
    .novolar-footer-contact svg {
      color: #6B2D26;
      width: 16px;
      height: 16px;
      margin-top: 2px;
    }
    .novolar-footer-badge {
      background: #fff;
      border: 1px solid #E5E0D8;
      padding: 1.5rem;
      border-radius: 8px;
      text-align: center;
    }
    .novolar-footer-badge svg {
      color: #6B2D26;
      width: 24px;
      height: 24px;
      margin-bottom: 0.5rem;
    }
  </style>

  <div class="novolar-container">
    <header class="novolar-header">
      <div class="novolar-logo">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <div class="novolar-logo-text">
          NOVO LAR
          <span>ALUGUEL SEGURO, RELAÇÃO PRÓXIMA</span>
        </div>
      </div>
      <nav class="novolar-nav">
        <a href="#">Encontrar imóveis</a>
        <a href="#">Bairros</a>
        <a href="#">Como funciona</a>
        <a href="#">Conteúdos</a>
        <a href="#">Para proprietários</a>
      </nav>
      <button class="novolar-btn-primary">Falar com a gente</button>
    </header>

    <section class="novolar-hero">
      <div class="novolar-hero-content">
        <h1>O começo de<br>uma nova história.</h1>
        <p>Mais do que um imóvel: o lugar onde<br>sua família vai crescer.</p>
      </div>

      <div class="novolar-search-wrapper">
        <div class="novolar-search-box">
          <h3>Encontrar nosso novo lar</h3>
          <div class="novolar-search-form">
            <div class="novolar-search-field">
              <label>Tipo de imóvel</label>
              <select><option>Casa ou Apartamento</option></select>
            </div>
            <div class="novolar-search-field">
              <label>Cidade</label>
              <select><option>Selecione a cidade</option></select>
            </div>
            <div class="novolar-search-field">
              <label>Bairro</label>
              <select><option>Selecione o bairro</option></select>
            </div>
            <div class="novolar-search-field">
              <label>Faixa de aluguel</label>
              <select><option>Até R$ 4.000</option></select>
            </div>
            <button class="novolar-search-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> Buscar imóveis</button>
          </div>
          <div class="novolar-search-tags">
            <span class="novolar-tag"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Imóveis verificados</span>
            <span class="novolar-tag"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Contratos seguros</span>
            <span class="novolar-tag"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg> Atendimento próximo</span>
            <span class="novolar-tag"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Transparência em cada etapa</span>
          </div>
        </div>
      </div>
    </section>

    <section class="novolar-fases">
      <h2>Escolhas para cada fase da vida</h2>
      <div class="novolar-fases-grid">
        <div class="novolar-fase-card">
          <img src="https://images.unsplash.com/photo-1599427303058-f04cbbf5ea4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Começando juntos" class="novolar-fase-img">
          <h4>Começando juntos</h4>
          <p>Espaços práticos e acolhedores para construir seus primeiros capítulos.</p>
          <a href="#" class="novolar-fase-link">Ver opções <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg></a>
        </div>
        <div class="novolar-fase-card">
          <img src="https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Família" class="novolar-fase-img">
          <h4>Família em crescimento</h4>
          <p>Mais espaço, conforto e comodidades para acompanhar cada nova fase.</p>
          <a href="#" class="novolar-fase-link">Ver opções <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg></a>
        </div>
        <div class="novolar-fase-card">
          <img src="https://images.unsplash.com/photo-1529156069898-49953eb1f5ce?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Espaço" class="novolar-fase-img">
          <h4>Mais espaço, mais memórias</h4>
          <p>Casas e apartamentos ideais para quem valoriza conforto e momentos em família.</p>
          <a href="#" class="novolar-fase-link">Ver opções <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg></a>
        </div>
        <div class="novolar-fase-card">
          <img src="https://images.unsplash.com/photo-1448375240586-882707db888b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Novos começos" class="novolar-fase-img">
          <h4>Novos começos</h4>
          <p>Imóveis acessíveis e práticos para viver com tranquilidade e bem-estar.</p>
          <a href="#" class="novolar-fase-link">Ver opções <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg></a>
        </div>
      </div>
    </section>

    <section class="novolar-bairros">
      <h2>Bairros que combinam com o que importa</h2>
      <div class="novolar-bairros-grid">
        <div class="novolar-bairro-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19v-2c0-2.2 1.8-4 4-4h8c2.2 0 4 1.8 4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <h4>Boas escolas por perto</h4>
          <p>Facilidade no dia a dia e mais qualidade para a educação dos seus filhos.</p>
        </div>
        <div class="novolar-bairro-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <h4>Segurança que traz tranquilidade</h4>
          <p>Bairros monitorados e bem avaliados para você viver com mais proteção.</p>
        </div>
        <div class="novolar-bairro-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21h18"></path><path d="M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2-4h14l2 4"></path><line x1="4" y1="21" x2="4" y2="10"></line><line x1="20" y1="21" x2="20" y2="10"></line><path d="M8 21v-4a2 2 0 0 1 4 0v4"></path></svg>
          <h4>Lazer e natureza</h4>
          <p>Praças, parques e espaços ao ar livre para aproveitar momentos em família.</p>
        </div>
        <div class="novolar-bairro-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
          <h4>Comércio e serviços</h4>
          <p>Tudo o que sua família precisa, sempre por perto.</p>
        </div>
      </div>
      <button class="novolar-btn-gold">Ver bairros com esses critérios</button>
    </section>

    <section class="novolar-passos">
      <h2>Alugar com a NOVO LAR é simples</h2>
      <div class="novolar-passos-container">
        <div class="novolar-passos-list">
          <div class="novolar-passo">
            <div class="novolar-passo-num">1</div>
            <div class="novolar-passo-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <h4>Encontre o imóvel ideal</h4>
            <p>Busque com filtros inteligentes e receba sugestões personalizadas.</p>
          </div>
          <div class="novolar-passo">
            <div class="novolar-passo-num">2</div>
            <div class="novolar-passo-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            <h4>Proposta e análise</h4>
            <p>Enviamos sua proposta e avaliamos de forma rápida e segura.</p>
          </div>
          <div class="novolar-passo">
            <div class="novolar-passo-num">3</div>
            <div class="novolar-passo-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </div>
            <h4>Contrato transparente</h4>
            <p>Clareza em todas as cláusulas e acompanhamento do início ao fim.</p>
          </div>
          <div class="novolar-passo">
            <div class="novolar-passo-num">4</div>
            <div class="novolar-passo-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
            </div>
            <h4>Mudança tranquila</h4>
            <p>Tudo pronto para você e sua família viverem esse novo começo.</p>
          </div>
        </div>
        
        <div class="novolar-mudanca-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
          <h3>Apoio na mudança</h3>
          <p>Indicamos parceiros de confiança para facilitar sua mudança com mais praticidade e segurança.</p>
          <button class="novolar-btn-gold" style="margin-top: 0; padding: 0.8rem 1.5rem; width: 100%;">Quero ajuda para mudar</button>
        </div>
      </div>
    </section>

    <section class="novolar-historias">
      <h2>Histórias reais de famílias felizes</h2>
      <div class="novolar-historias-grid">
        <div class="novolar-historia-card">
          <div class="novolar-historia-content">
            <div class="novolar-historia-quote">“</div>
            <p>Encontramos um lar seguro, perto da escola das crianças e com tudo o que precisávamos. A NOVO LAR esteve com a gente em cada passo.</p>
            <div class="novolar-historia-author">
              <h5>Juliana, Ricardo e Sofia</h5>
              <span>São José dos Campos - SP</span>
            </div>
          </div>
          <img src="https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" alt="Família" class="novolar-historia-img">
        </div>
        <div class="novolar-historia-card">
          <div class="novolar-historia-content">
            <div class="novolar-historia-quote">“</div>
            <p>O atendimento é próximo e atencioso. Alugamos nossa casa com rapidez e tranquilidade.</p>
            <div class="novolar-historia-author">
              <h5>Mariana e Paulo</h5>
              <span>Campinas - SP</span>
            </div>
          </div>
          <img src="https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" alt="Casal" class="novolar-historia-img">
        </div>
        <div class="novolar-historia-card">
          <div class="novolar-historia-content">
            <div class="novolar-historia-quote">“</div>
            <p>Transparência e confiança fazem toda a diferença. Recomendamos!</p>
            <div class="novolar-historia-author">
              <h5>Carla e André</h5>
              <span>Sorocaba - SP</span>
            </div>
          </div>
          <img src="https://images.unsplash.com/photo-1595955684711-667794db9e31?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" alt="Família" class="novolar-historia-img">
        </div>
      </div>
    </section>

    <section class="novolar-conteudos">
      <div class="novolar-cont-left">
        <div class="novolar-cont-header">
          <h2>Conteúdos para tomar boas decisões</h2>
          <a href="#" style="color:#6B2D26; text-decoration:none; font-size:0.9rem; font-weight:500;">Ver todos os conteúdos &rarr;</a>
        </div>
        <div class="novolar-cont-grid">
          <div class="novolar-post">
            <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Dicas">
            <div class="novolar-post-content">
              <span class="novolar-post-tag">Dicas</span>
              <h4>Como escolher o bairro ideal para sua família</h4>
              <a href="#" class="novolar-post-link">Leia mais &rarr;</a>
            </div>
          </div>
          <div class="novolar-post">
            <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Guia">
            <div class="novolar-post-content">
              <span class="novolar-post-tag">Guia</span>
              <h4>Checklist para mudar de casa sem estresse</h4>
              <a href="#" class="novolar-post-link">Leia mais &rarr;</a>
            </div>
          </div>
          <div class="novolar-post">
            <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Finanças">
            <div class="novolar-post-content">
              <span class="novolar-post-tag">Finanças</span>
              <h4>Planejamento financeiro para o aluguel</h4>
              <a href="#" class="novolar-post-link">Leia mais &rarr;</a>
            </div>
          </div>
          <div class="novolar-post">
            <img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Escolas">
            <div class="novolar-post-content">
              <span class="novolar-post-tag">Escolas</span>
              <h4>Como avaliar escolas na hora da mudança</h4>
              <a href="#" class="novolar-post-link">Leia mais &rarr;</a>
            </div>
          </div>
        </div>
      </div>
      
      <div class="novolar-proprietarios">
        <h3>Para proprietários: alugue com segurança e tranquilidade.</h3>
        <ul class="novolar-prop-list">
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Inquilinos selecionados</li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Garantia de recebimento</li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Gestão completa do aluguel</li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Assessoria jurídica</li>
        </ul>
        <button class="novolar-btn-gold" style="margin-top:0; background:#fff; color:#C15B4C;">Quero alugar meu imóvel</button>
      </div>
    </section>

    <section class="novolar-cta-footer">
      <div>
        <h2>Mais do que um imóvel: o lugar onde sua família vai crescer.</h2>
        <p>Fale com a gente e encontre o lar certo para o seu próximo capítulo.</p>
      </div>
      <button class="novolar-btn-gold" style="margin-top:0;">Falar com um especialista</button>
    </section>

    <footer class="novolar-footer">
      <div class="novolar-footer-logo">
        <div class="novolar-logo" style="margin-bottom: 0;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          NOVO LAR
        </div>
        <p>Conectamos famílias a lares que oferecem segurança, conforto e estabilidade para novas histórias.</p>
      </div>
      <div>
        <h4>Navegação</h4>
        <ul>
          <li><a href="#">Encontrar imóveis</a></li>
          <li><a href="#">Bairros</a></li>
          <li><a href="#">Como funciona</a></li>
          <li><a href="#">Conteúdos</a></li>
          <li><a href="#">Para proprietários</a></li>
        </ul>
      </div>
      <div>
        <h4>Institucional</h4>
        <ul>
          <li><a href="#">Sobre a NOVO LAR</a></li>
          <li><a href="#">Nosso jeito de cuidar</a></li>
          <li><a href="#">Trabalhe conosco</a></li>
          <li><a href="#">Política de privacidade</a></li>
          <li><a href="#">Termos de uso</a></li>
        </ul>
      </div>
      <div>
        <h4>Fale com a gente</h4>
        <ul class="novolar-footer-contact">
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> (12) 3000-1234</li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> contato@novolar.com.br</li>
        </ul>
      </div>
      <div class="novolar-footer-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        <h4 style="margin-bottom:0.5rem; color:#6B2D26;">Atendimento próximo, sempre que precisar.</h4>
        <p style="font-size:0.8rem; color:#666;">Segunda a sexta: 8h às 18h<br>Sábado: 8h às 12h</p>
      </div>
    </footer>
  </div>
`;

export const novoLarTemplate: LandingPageTemplate = {
  id: 'tmpl-novolar-01',
  name: 'Novo Lar (Família)',
  description: 'Template focado em famílias, segurança e conforto, com tipografia calorosa e tons terrosos.',
  thumbnail: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?ixlib=rb-4.0.3&w=800&q=80',
  category: 'Residencial',
  group: 'Premium',
  objective: 'Capturar Leads Qualificados',
  style: 'Clássico / Caloroso',
  resources: ['Imóveis', 'Depoimentos', 'Blog', 'Passo a passo'],
  themeConfig: {
    ...defaultPremiumTheme,
    primaryColor: '#6B2D26',
    secondaryColor: '#1A3E31',
    backgroundColor: '#FDFBF7',
    textColor: '#333333',
    fontFamily: 'Outfit, sans-serif',
  },
  blocks: [
    templateBlock(
      BlockType.CUSTOM_HTML,
      0,
      { code: novoLarHtml },
      {},
      'full'
    ),
  ],
};
