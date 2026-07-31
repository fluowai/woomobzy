import { LandingPageTemplate, templateBlock, defaultPremiumTheme } from '../shared';
import { BlockType } from '../../../types/landingPage';

const entreHtml = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap');
    
    .entre-container {
      font-family: 'Manrope', sans-serif;
      color: #111;
      background-color: #F9F9F9;
      width: 100%;
      overflow-x: hidden;
    }
    .entre-container * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    /* Navbar */
    .entre-nav-wrapper {
      position: absolute;
      top: 0; left: 0; right: 0;
      padding: 2rem 5%;
      z-index: 100;
    }
    .entre-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255,255,255,0.9);
      backdrop-filter: blur(10px);
      padding: 1rem 2rem;
      border-radius: 100px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
    }
    .entre-logo {
      font-family: 'Syne', sans-serif;
      font-size: 1.8rem;
      font-weight: 800;
      color: #111;
      letter-spacing: -1px;
    }
    .entre-logo span {
      color: #FF4B26;
    }
    .entre-nav {
      display: flex;
      gap: 2.5rem;
    }
    .entre-nav a {
      color: #444;
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 600;
      transition: color 0.3s;
    }
    .entre-nav a:hover {
      color: #FF4B26;
    }
    .entre-btn-outline {
      background: transparent;
      color: #111;
      border: 2px solid #111;
      padding: 0.7rem 1.8rem;
      border-radius: 100px;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
    }
    .entre-btn-outline:hover {
      background: #111;
      color: #fff;
    }
    
    /* Hero */
    .entre-hero {
      padding: 12rem 5% 6rem;
      min-height: 90vh;
      display: flex;
      align-items: center;
      position: relative;
    }
    .entre-hero-bg {
      position: absolute;
      top: 0; right: 0; bottom: 0;
      width: 50vw;
      background: url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80') center/cover;
      border-radius: 0 0 0 40px;
      z-index: 1;
    }
    .entre-hero-bg::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(to right, #F9F9F9 0%, transparent 100%);
    }
    .entre-hero-content {
      position: relative;
      z-index: 2;
      max-width: 650px;
    }
    .entre-badge {
      display: inline-block;
      background: #FF4B26;
      color: #fff;
      padding: 0.4rem 1rem;
      border-radius: 100px;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 2rem;
    }
    .entre-hero h1 {
      font-family: 'Syne', sans-serif;
      font-size: 5.5rem;
      line-height: 1.05;
      color: #111;
      margin-bottom: 1.5rem;
      letter-spacing: -2px;
    }
    .entre-hero p {
      font-size: 1.25rem;
      color: #555;
      line-height: 1.5;
      margin-bottom: 3rem;
      max-width: 500px;
    }
    .entre-hero-actions {
      display: flex;
      gap: 1rem;
    }
    .entre-btn-primary {
      background: #FF4B26;
      color: #fff;
      border: none;
      padding: 1.2rem 2.5rem;
      border-radius: 100px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .entre-btn-primary:hover {
      background: #e03a1a;
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(255,75,38,0.2);
    }
    .entre-btn-secondary {
      background: #fff;
      color: #111;
      border: none;
      padding: 1.2rem 2.5rem;
      border-radius: 100px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
      transition: all 0.3s;
    }
    .entre-btn-secondary:hover {
      background: #f0f0f0;
    }
    
    /* Search Bar */
    .entre-search {
      position: relative;
      z-index: 10;
      margin: -3rem 5% 4rem;
      background: #fff;
      border-radius: 24px;
      padding: 1.5rem;
      box-shadow: 0 20px 40px rgba(0,0,0,0.08);
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .entre-search-input {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0 1rem;
      border-right: 1px solid #EEE;
    }
    .entre-search-input:last-of-type {
      border-right: none;
    }
    .entre-search-input svg {
      color: #FF4B26;
      width: 24px;
      height: 24px;
    }
    .entre-search-input input, .entre-search-input select {
      border: none;
      background: transparent;
      font-size: 1.1rem;
      font-family: 'Manrope', sans-serif;
      color: #111;
      font-weight: 600;
      width: 100%;
      outline: none;
    }
    .entre-search-btn {
      background: #111;
      color: #fff;
      border: none;
      width: 60px;
      height: 60px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.3s;
    }
    .entre-search-btn:hover {
      background: #333;
    }
    
    /* Marquee */
    .entre-marquee {
      background: #111;
      color: #fff;
      padding: 1.5rem 0;
      overflow: hidden;
      display: flex;
      white-space: nowrap;
    }
    .entre-marquee-content {
      display: flex;
      animation: marquee 20s linear infinite;
    }
    .entre-marquee-item {
      font-family: 'Syne', sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 2rem;
      display: flex;
      align-items: center;
      gap: 2rem;
    }
    .entre-marquee-item svg {
      color: #FF4B26;
    }
    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    
    /* Categories */
    .entre-categories {
      padding: 6rem 5%;
    }
    .entre-section-title {
      font-family: 'Syne', sans-serif;
      font-size: 3rem;
      color: #111;
      margin-bottom: 3rem;
      letter-spacing: -1px;
    }
    .entre-cat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
    }
    .entre-cat-card {
      position: relative;
      height: 400px;
      border-radius: 24px;
      overflow: hidden;
      cursor: pointer;
    }
    .entre-cat-img {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      object-fit: cover;
      transition: transform 0.7s;
    }
    .entre-cat-overlay {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%);
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 2rem;
    }
    .entre-cat-card:hover .entre-cat-img {
      transform: scale(1.05);
    }
    .entre-cat-title {
      font-family: 'Syne', sans-serif;
      font-size: 1.8rem;
      color: #fff;
      margin-bottom: 0.5rem;
    }
    .entre-cat-count {
      background: #FF4B26;
      color: #fff;
      display: inline-block;
      padding: 0.2rem 0.8rem;
      border-radius: 100px;
      font-size: 0.8rem;
      font-weight: 700;
      align-self: flex-start;
    }
    
    /* Destaques */
    .entre-destaques {
      padding: 4rem 5% 8rem;
    }
    .entre-destaques-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 3rem;
    }
    .entre-link {
      font-weight: 700;
      color: #111;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .entre-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
    }
    .entre-card {
      background: #fff;
      border-radius: 24px;
      padding: 1rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.03);
      transition: transform 0.3s;
    }
    .entre-card:hover {
      transform: translateY(-10px);
    }
    .entre-card-img-wrapper {
      position: relative;
      height: 250px;
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 1.5rem;
    }
    .entre-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .entre-card-tag {
      position: absolute;
      top: 1rem; left: 1rem;
      background: #fff;
      color: #111;
      padding: 0.4rem 0.8rem;
      border-radius: 100px;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .entre-card-fav {
      position: absolute;
      top: 1rem; right: 1rem;
      background: rgba(255,255,255,0.9);
      width: 36px; height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #111;
      cursor: pointer;
    }
    .entre-card-price {
      font-family: 'Syne', sans-serif;
      font-size: 2rem;
      font-weight: 700;
      color: #111;
      margin-bottom: 0.5rem;
    }
    .entre-card-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #333;
      margin-bottom: 0.5rem;
    }
    .entre-card-address {
      font-size: 0.9rem;
      color: #666;
      margin-bottom: 1.5rem;
    }
    .entre-card-specs {
      display: flex;
      gap: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #EEE;
    }
    .entre-spec {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      font-size: 0.9rem;
      color: #444;
    }
    
    /* Venda seu imovel */
    .entre-banner {
      margin: 0 5%;
      background: #111;
      border-radius: 40px;
      display: flex;
      overflow: hidden;
    }
    .entre-banner-content {
      flex: 1;
      padding: 6rem;
      color: #fff;
    }
    .entre-banner-content h2 {
      font-family: 'Syne', sans-serif;
      font-size: 3.5rem;
      line-height: 1.1;
      margin-bottom: 1.5rem;
      letter-spacing: -1px;
    }
    .entre-banner-content p {
      font-size: 1.1rem;
      color: #CCC;
      margin-bottom: 3rem;
      max-width: 400px;
    }
    .entre-banner-img {
      flex: 1;
      background: url('https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80') center/cover;
    }
    
    /* Footer */
    .entre-footer {
      background: #F9F9F9;
      padding: 8rem 5% 2rem;
    }
    .entre-footer-top {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 4rem;
      margin-bottom: 4rem;
    }
    .entre-footer-brand h2 {
      font-family: 'Syne', sans-serif;
      font-size: 2.5rem;
      font-weight: 800;
      color: #111;
      margin-bottom: 1rem;
    }
    .entre-footer-brand h2 span { color: #FF4B26; }
    .entre-footer-brand p {
      font-size: 1rem;
      color: #555;
      line-height: 1.6;
      margin-bottom: 2rem;
      max-width: 300px;
    }
    .entre-socials {
      display: flex;
      gap: 1rem;
    }
    .entre-social-btn {
      width: 44px; height: 44px;
      border-radius: 50%;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #111;
      box-shadow: 0 5px 15px rgba(0,0,0,0.05);
      transition: all 0.3s;
    }
    .entre-social-btn:hover {
      background: #FF4B26;
      color: #fff;
    }
    .entre-footer-col h4 {
      font-family: 'Syne', sans-serif;
      font-size: 1.2rem;
      color: #111;
      margin-bottom: 1.5rem;
    }
    .entre-footer-col ul {
      list-style: none;
    }
    .entre-footer-col ul li {
      margin-bottom: 1rem;
    }
    .entre-footer-col ul li a {
      color: #666;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.3s;
    }
    .entre-footer-col ul li a:hover {
      color: #FF4B26;
    }
    .entre-footer-bottom {
      padding-top: 2rem;
      border-top: 1px solid #DDD;
      display: flex;
      justify-content: space-between;
      color: #888;
      font-size: 0.9rem;
      font-weight: 500;
    }
  </style>

  <div class="entre-container">
    <div class="entre-nav-wrapper">
      <header class="entre-header">
        <div class="entre-logo">ENTRE<span>.</span></div>
        <nav class="entre-nav">
          <a href="#">Comprar</a>
          <a href="#">Alugar</a>
          <a href="#">Lançamentos</a>
          <a href="#">Sobre nós</a>
        </nav>
        <div>
          <button class="entre-btn-outline" style="border:none;">Entrar</button>
          <button class="entre-btn-outline">Anunciar Imóvel</button>
        </div>
      </header>
    </div>

    <section class="entre-hero">
      <div class="entre-hero-bg"></div>
      <div class="entre-hero-content">
        <span class="entre-badge">Redefinindo o morar</span>
        <h1>Encontre o seu<br>próximo destino.</h1>
        <p>Curadoria exclusiva dos melhores imóveis para quem busca design, localização e qualidade de vida em um só lugar.</p>
        <div class="entre-hero-actions">
          <button class="entre-btn-primary">Explorar imóveis <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg></button>
          <button class="entre-btn-secondary">Ver mapa</button>
        </div>
      </div>
    </section>

    <div class="entre-search">
      <div class="entre-search-input">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        <input type="text" placeholder="Qual a sua localização?">
      </div>
      <div class="entre-search-input">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
        <select>
          <option>Tipo de imóvel</option>
          <option>Apartamento</option>
          <option>Casa</option>
          <option>Cobertura</option>
        </select>
      </div>
      <div class="entre-search-input">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        <select>
          <option>Faixa de preço</option>
          <option>Até R$ 500k</option>
          <option>R$ 500k - R$ 1M</option>
          <option>Acima de R$ 1M</option>
        </select>
      </div>
      <button class="entre-search-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      </button>
    </div>

    <div class="entre-marquee">
      <div class="entre-marquee-content">
        <div class="entre-marquee-item">ESTILO DE VIDA <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>
        <div class="entre-marquee-item">ARQUITETURA <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>
        <div class="entre-marquee-item">LOCALIZAÇÃO PREMIUM <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>
        <div class="entre-marquee-item">EXCLUSIVIDADE <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>
        
        <!-- Repeat for infinite effect -->
        <div class="entre-marquee-item">ESTILO DE VIDA <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>
        <div class="entre-marquee-item">ARQUITETURA <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>
        <div class="entre-marquee-item">LOCALIZAÇÃO PREMIUM <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>
        <div class="entre-marquee-item">EXCLUSIVIDADE <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>
      </div>
    </div>

    <section class="entre-categories">
      <h2 class="entre-section-title">Explore por estilo</h2>
      <div class="entre-cat-grid">
        <div class="entre-cat-card">
          <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" class="entre-cat-img" alt="Casas">
          <div class="entre-cat-overlay">
            <span class="entre-cat-count">124 imóveis</span>
            <h3 class="entre-cat-title">Casas de Luxo</h3>
          </div>
        </div>
        <div class="entre-cat-card">
          <img src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" class="entre-cat-img" alt="Aptos">
          <div class="entre-cat-overlay">
            <span class="entre-cat-count">86 imóveis</span>
            <h3 class="entre-cat-title">Aptos Modernos</h3>
          </div>
        </div>
        <div class="entre-cat-card">
          <img src="https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" class="entre-cat-img" alt="Coberturas">
          <div class="entre-cat-overlay">
            <span class="entre-cat-count">42 imóveis</span>
            <h3 class="entre-cat-title">Coberturas</h3>
          </div>
        </div>
        <div class="entre-cat-card">
          <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" class="entre-cat-img" alt="Campos">
          <div class="entre-cat-overlay">
            <span class="entre-cat-count">35 imóveis</span>
            <h3 class="entre-cat-title">Refúgios Naturais</h3>
          </div>
        </div>
      </div>
    </section>

    <section class="entre-destaques">
      <div class="entre-destaques-header">
        <h2 class="entre-section-title" style="margin-bottom:0;">Seleção especial</h2>
        <a href="#" class="entre-link">Ver todos os imóveis <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"></path></svg></a>
      </div>
      
      <div class="entre-grid">
        <div class="entre-card">
          <div class="entre-card-img-wrapper">
            <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" class="entre-card-img" alt="Imovel">
            <div class="entre-card-tag">VENDA</div>
            <div class="entre-card-fav"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div>
          </div>
          <div class="entre-card-price">R$ 2.450.000</div>
          <h3 class="entre-card-title">Casa Contemporânea</h3>
          <p class="entre-card-address">Jardim Europa, São Paulo</p>
          <div class="entre-card-specs">
            <div class="entre-spec"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4B26" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> 4 Quartos</div>
            <div class="entre-spec"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4B26" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect></svg> 4 Banheiros</div>
            <div class="entre-spec"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4B26" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> 350m²</div>
          </div>
        </div>
        
        <div class="entre-card">
          <div class="entre-card-img-wrapper">
            <img src="https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" class="entre-card-img" alt="Imovel">
            <div class="entre-card-tag">ALUGUEL</div>
            <div class="entre-card-fav"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div>
          </div>
          <div class="entre-card-price">R$ 15.000<span style="font-size:1rem; color:#666; font-weight:600;">/mês</span></div>
          <h3 class="entre-card-title">Apartamento Design</h3>
          <p class="entre-card-address">Itaim Bibi, São Paulo</p>
          <div class="entre-card-specs">
            <div class="entre-spec"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4B26" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> 3 Quartos</div>
            <div class="entre-spec"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4B26" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect></svg> 3 Banheiros</div>
            <div class="entre-spec"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4B26" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> 180m²</div>
          </div>
        </div>
        
        <div class="entre-card">
          <div class="entre-card-img-wrapper">
            <img src="https://images.unsplash.com/photo-1600607687644-a71715653805?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" class="entre-card-img" alt="Imovel">
            <div class="entre-card-tag">VENDA</div>
            <div class="entre-card-fav"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div>
          </div>
          <div class="entre-card-price">R$ 5.800.000</div>
          <h3 class="entre-card-title">Mansão Suspensas</h3>
          <p class="entre-card-address">Vila Nova Conceição, São Paulo</p>
          <div class="entre-card-specs">
            <div class="entre-spec"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4B26" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> 4 Quartos</div>
            <div class="entre-spec"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4B26" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect></svg> 5 Banheiros</div>
            <div class="entre-spec"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4B26" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> 420m²</div>
          </div>
        </div>
      </div>
    </section>

    <section class="entre-banner">
      <div class="entre-banner-content">
        <h2>Seu imóvel com o destaque que ele merece.</h2>
        <p>Anuncie com a ENTRE e alcance os melhores clientes do mercado imobiliário premium de forma rápida e segura.</p>
        <button class="entre-btn-primary">Anunciar agora <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg></button>
      </div>
      <div class="entre-banner-img"></div>
    </section>

    <footer class="entre-footer">
      <div class="entre-footer-top">
        <div class="entre-footer-brand">
          <h2>ENTRE<span>.</span></h2>
          <p>Curadoria de imóveis singulares para pessoas excepcionais. A nova forma de viver.</p>
          <div class="entre-socials">
            <a href="#" class="entre-social-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></a>
            <a href="#" class="entre-social-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a>
            <a href="#" class="entre-social-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg></a>
          </div>
        </div>
        
        <div class="entre-footer-col">
          <h4>Navegação</h4>
          <ul>
            <li><a href="#">Comprar</a></li>
            <li><a href="#">Alugar</a></li>
            <li><a href="#">Lançamentos</a></li>
            <li><a href="#">Anunciar</a></li>
          </ul>
        </div>
        
        <div class="entre-footer-col">
          <h4>Empresa</h4>
          <ul>
            <li><a href="#">Sobre nós</a></li>
            <li><a href="#">Corretores</a></li>
            <li><a href="#">Carreiras</a></li>
            <li><a href="#">Contato</a></li>
          </ul>
        </div>
        
        <div class="entre-footer-col">
          <h4>Legal</h4>
          <ul>
            <li><a href="#">Termos de uso</a></li>
            <li><a href="#">Privacidade</a></li>
            <li><a href="#">Cookies</a></li>
          </ul>
        </div>
      </div>
      
      <div class="entre-footer-bottom">
        <span>&copy; 2026 ENTRE Imobiliária. Todos os direitos reservados.</span>
        <span>Feito com paixão pelo design.</span>
      </div>
    </footer>
  </div>
`;

export const entreTemplate: LandingPageTemplate = {
  id: 'tmpl-entre-01',
  name: 'Entre (Moderno/Ousado)',
  description: 'Template vibrante, com tipografia forte e foco em design, ideal para imobiliárias premium com pegada jovem e arquitetônica.',
  thumbnail: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&w=800&q=80',
  category: 'Comercial/Residencial',
  group: 'Premium',
  objective: 'Apresentação de Marca',
  style: 'Moderno / Ousado',
  resources: ['Destaques', 'Categorias', 'Banner de Captação'],
  themeConfig: {
    ...defaultPremiumTheme,
    primaryColor: '#FF4B26',
    secondaryColor: '#111111',
    backgroundColor: '#F9F9F9',
    textColor: '#111111',
    fontFamily: 'Manrope, sans-serif',
  },
  blocks: [
    templateBlock(
      BlockType.CUSTOM_HTML,
      0,
      { code: entreHtml },
      {},
      'full'
    ),
  ],
};
