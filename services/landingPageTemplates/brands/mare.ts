import { LandingPageTemplate, templateBlock, defaultPremiumTheme } from '../shared';
import { BlockType } from '../../../types/landingPage';

const mareHtml = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
    
    .mare-container {
      font-family: 'Montserrat', sans-serif;
      color: #F5EAD6;
      background-color: #0B2B42;
      width: 100%;
      overflow-x: hidden;
    }
    .mare-container * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    .mare-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2rem 5%;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      z-index: 10;
    }
    .mare-logo {
      font-family: 'Playfair Display', serif;
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: 2px;
      color: #F5EAD6;
      display: flex;
      flex-direction: column;
      line-height: 1;
    }
    .mare-logo span {
      font-family: 'Montserrat', sans-serif;
      font-size: 0.6rem;
      letter-spacing: 4px;
      font-weight: 400;
      margin-top: 5px;
    }
    .mare-nav {
      display: flex;
      gap: 2rem;
    }
    .mare-nav a {
      color: #F5EAD6;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 400;
      transition: color 0.3s;
    }
    .mare-nav a:hover {
      color: #E37651;
    }
    .mare-btn-outline {
      border: 1px solid #F5EAD6;
      background: transparent;
      color: #F5EAD6;
      padding: 0.7rem 1.5rem;
      border-radius: 30px;
      font-size: 0.9rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s;
    }
    .mare-btn-outline:hover {
      background: #F5EAD6;
      color: #0B2B42;
    }
    .mare-hero {
      position: relative;
      height: 90vh;
      min-height: 700px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 0 5%;
      background: linear-gradient(to right, rgba(11,43,66,0.9) 0%, rgba(11,43,66,0.4) 50%, rgba(11,43,66,0.1) 100%), url('https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80') center/cover;
    }
    .mare-hero h1 {
      font-family: 'Playfair Display', serif;
      font-size: 4.5rem;
      line-height: 1.1;
      margin-bottom: 1.5rem;
      max-width: 600px;
    }
    .mare-hero p {
      font-size: 1.1rem;
      max-width: 450px;
      line-height: 1.6;
      margin-bottom: 3rem;
      opacity: 0.9;
    }
    .mare-search-box {
      background: #F5EAD6;
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      gap: 1rem;
      align-items: flex-end;
      max-width: 1000px;
      color: #0B2B42;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    }
    .mare-search-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .mare-search-field label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #0B2B42;
    }
    .mare-search-field select, .mare-search-field input {
      padding: 0.8rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-family: 'Montserrat', sans-serif;
      font-size: 0.9rem;
      color: #333;
      background: #fff;
      width: 100%;
    }
    .mare-btn-primary {
      background: #E37651;
      color: #F5EAD6;
      border: none;
      padding: 1rem 2rem;
      border-radius: 6px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: background 0.3s;
      height: 47px;
    }
    .mare-btn-primary:hover {
      background: #c55f3e;
    }
    
    .mare-map-section {
      padding: 6rem 5%;
      display: flex;
      align-items: center;
      gap: 4rem;
      background-color: #0B2B42;
      overflow: hidden;
    }
    .mare-map-content {
      flex: 1;
      max-width: 450px;
    }
    .mare-map-content h2 {
      font-family: 'Playfair Display', serif;
      font-size: 3.5rem;
      line-height: 1.1;
      margin-bottom: 2rem;
      color: #F5EAD6;
    }
    .mare-map-content p {
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 3rem;
      opacity: 0.8;
    }
    .mare-locations {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .mare-location-item {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }
    .mare-location-item svg {
      color: #E37651;
      margin-top: 2px;
      flex-shrink: 0;
    }
    .mare-location-item h4 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.2rem;
    }
    .mare-location-item p {
      font-size: 0.85rem;
      margin-bottom: 0;
      opacity: 0.7;
    }
    .mare-map-image {
      flex: 1.5;
      position: relative;
    }
    .mare-map-image img {
      width: 100%;
      height: auto;
      opacity: 0.5;
      filter: brightness(0.8) sepia(1) hue-rotate(180deg) saturate(2);
    }
    .mare-map-pin {
      position: absolute;
      color: #E37651;
      animation: pulse 2s infinite;
    }
    
    .mare-properties {
      background-color: #F5EAD6;
      color: #0B2B42;
      padding: 6rem 5%;
    }
    .mare-properties-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 3rem;
    }
    .mare-properties-header h2 {
      font-family: 'Playfair Display', serif;
      font-size: 3rem;
    }
    .mare-link {
      color: #0B2B42;
      font-weight: 600;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .mare-link:hover {
      text-decoration: underline;
    }
    .mare-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
    }
    .mare-card {
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      height: 400px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 1.5rem;
      background-size: cover;
      background-position: center;
      color: #fff;
    }
    .mare-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(to top, rgba(11,43,66,0.9) 0%, transparent 60%);
      z-index: 1;
    }
    .mare-card > * {
      position: relative;
      z-index: 2;
    }
    .mare-tag {
      position: absolute;
      top: 1rem;
      left: 1rem;
      background: rgba(255,255,255,0.9);
      color: #0B2B42;
      padding: 0.3rem 0.8rem;
      font-size: 0.7rem;
      font-weight: 700;
      border-radius: 4px;
      letter-spacing: 1px;
    }
    .mare-card-loc {
      font-size: 0.8rem;
      margin-bottom: 0.3rem;
      opacity: 0.9;
    }
    .mare-card-title {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 0.3rem;
    }
    .mare-card-specs {
      font-size: 0.85rem;
      margin-bottom: 1rem;
      opacity: 0.8;
    }
    .mare-card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .mare-card-price {
      font-size: 1.3rem;
      font-weight: 700;
    }
    .mare-card-price span {
      font-size: 0.8rem;
      font-weight: 400;
      opacity: 0.8;
    }
    
    .mare-lifestyle {
      padding: 5rem 5%;
      background-color: #0B2B42;
      text-align: center;
    }
    .mare-lifestyle h2 {
      font-family: 'Playfair Display', serif;
      font-size: 2.5rem;
      margin-bottom: 4rem;
    }
    .mare-icons-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 2rem;
    }
    .mare-icon-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .mare-icon-box svg {
      width: 48px;
      height: 48px;
      color: #E37651;
    }
    .mare-icon-box h4 {
      font-size: 1rem;
      font-weight: 600;
    }
    .mare-icon-box p {
      font-size: 0.8rem;
      opacity: 0.7;
      line-height: 1.4;
    }
    
    .mare-steps {
      background-color: #F5EAD6;
      color: #0B2B42;
      padding: 6rem 5%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4rem;
    }
    .mare-steps-content {
      flex: 1;
    }
    .mare-steps h2 {
      font-family: 'Playfair Display', serif;
      font-size: 2.5rem;
      margin-bottom: 3rem;
    }
    .mare-steps-list {
      display: flex;
      justify-content: space-between;
      position: relative;
    }
    .mare-steps-list::before {
      content: '';
      position: absolute;
      top: 30px;
      left: 0;
      right: 0;
      border-top: 2px dashed #0B2B42;
      opacity: 0.2;
      z-index: 1;
    }
    .mare-step {
      text-align: center;
      position: relative;
      z-index: 2;
      width: 18%;
    }
    .mare-step-icon {
      width: 60px;
      height: 60px;
      background: #F5EAD6;
      border: 2px solid #0B2B42;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem;
      font-size: 1.5rem;
      color: #0B2B42;
    }
    .mare-step h4 {
      font-size: 1.2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    .mare-step p {
      font-size: 0.8rem;
      opacity: 0.8;
      line-height: 1.4;
    }
    .mare-steps-image {
      flex: 0.7;
      border-radius: 50% 50% 0 0;
      overflow: hidden;
      height: 400px;
    }
    .mare-steps-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .mare-guide {
      padding: 6rem 5%;
      background-color: #5D888D;
      color: #fff;
      display: flex;
      gap: 4rem;
      align-items: center;
    }
    .mare-guide-left {
      flex: 1;
    }
    .mare-guide h2 {
      font-family: 'Playfair Display', serif;
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    .mare-guide p {
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 2rem;
      opacity: 0.9;
      max-width: 400px;
    }
    .mare-btn-white {
      background: #fff;
      color: #5D888D;
      padding: 0.8rem 1.5rem;
      border-radius: 30px;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .mare-guide-cards {
      display: flex;
      gap: 1rem;
      margin-top: 3rem;
    }
    .mare-guide-card {
      width: 120px;
      height: 160px;
      border-radius: 8px;
      background-size: cover;
      background-position: center;
      display: flex;
      align-items: flex-end;
      padding: 0.8rem;
      position: relative;
      overflow: hidden;
    }
    .mare-guide-card::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
    }
    .mare-guide-card span {
      position: relative;
      z-index: 2;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .mare-guide-right {
      flex: 0.8;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .mare-quote-icon {
      font-size: 4rem;
      color: #E37651;
      line-height: 1;
      font-family: serif;
    }
    .mare-quote-text {
      font-family: 'Playfair Display', serif;
      font-size: 1.5rem;
      line-height: 1.4;
    }
    .mare-quote-author {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .mare-quote-author img {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
    }
    .mare-quote-author h5 {
      font-size: 0.9rem;
      margin-bottom: 0.2rem;
    }
    .mare-quote-author span {
      font-size: 0.8rem;
      opacity: 0.7;
    }
    
    .mare-cta {
      background: linear-gradient(to right, #b04620, #e67d5b);
      padding: 4rem 5%;
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .mare-cta-left h2 {
      font-family: 'Playfair Display', serif;
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    .mare-cta-left p {
      font-size: 1rem;
      opacity: 0.9;
      margin-bottom: 1.5rem;
    }
    .mare-cta-features {
      display: flex;
      gap: 2rem;
    }
    .mare-cta-feature {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .mare-cta-feature svg {
      width: 32px;
      height: 32px;
      opacity: 0.8;
    }
    
    .mare-newsletter {
      background-color: #082032;
      padding: 3rem 5%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #fff;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .mare-news-left {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .mare-news-left svg {
      width: 40px;
      height: 40px;
      opacity: 0.8;
    }
    .mare-news-left h4 {
      font-size: 1.1rem;
      margin-bottom: 0.2rem;
    }
    .mare-news-left p {
      font-size: 0.85rem;
      opacity: 0.7;
    }
    .mare-news-form {
      display: flex;
      gap: 1rem;
    }
    .mare-news-form input {
      padding: 0.8rem 1.5rem;
      border-radius: 30px;
      border: 1px solid rgba(255,255,255,0.3);
      background: transparent;
      color: #fff;
      width: 300px;
    }
    .mare-btn-sand {
      background: #F5EAD6;
      color: #0B2B42;
      border: none;
      padding: 0.8rem 2rem;
      border-radius: 30px;
      font-weight: 600;
      cursor: pointer;
    }
    
    .mare-footer {
      background-color: #082032;
      color: #F5EAD6;
      padding: 4rem 5% 2rem;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
      gap: 2rem;
    }
    .mare-footer p, .mare-footer a {
      font-size: 0.85rem;
      opacity: 0.7;
      text-decoration: none;
      color: #F5EAD6;
      line-height: 1.8;
    }
    .mare-footer h4 {
      font-size: 1rem;
      margin-bottom: 1.5rem;
      font-weight: 600;
    }
    .mare-footer ul {
      list-style: none;
    }
    .mare-footer-bottom {
      background-color: #082032;
      color: rgba(245,234,214,0.5);
      text-align: center;
      padding: 1.5rem;
      font-size: 0.8rem;
    }
  </style>
  
  <div class="mare-container">
    <header class="mare-header">
      <div class="mare-logo">
        MARÉ
        <span>ALUGUEL DE IMÓVEIS</span>
      </div>
      <nav class="mare-nav">
        <a href="#">Alugar</a>
        <a href="#">Bairros</a>
        <a href="#">Guia local</a>
        <a href="#">Para proprietários</a>
        <a href="#">Sobre a MARÉ</a>
      </nav>
      <button class="mare-btn-outline">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        Fale com a gente
      </button>
    </header>

    <section class="mare-hero">
      <h1>Sua vida<br>merece novos<br>horizontes.</h1>
      <p>Encontre um lar perto do mar,<br>sem abrir mão da cidade.</p>
      
      <div class="mare-search-box">
        <div class="mare-search-field">
          <label>Cidade</label>
          <select><option>Florianópolis</option></select>
        </div>
        <div class="mare-search-field">
          <label>Bairro</label>
          <select><option>Todos os bairros</option></select>
        </div>
        <div class="mare-search-field">
          <label>Faixa de preço</label>
          <select><option>R$ 2.000 - R$ 15.000+</option></select>
        </div>
        <div class="mare-search-field">
          <label>Estilo de vida</label>
          <select><option>Todos os estilos</option></select>
        </div>
        <button class="mare-btn-primary">Buscar imóveis <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg></button>
      </div>
    </section>

    <section class="mare-map-section">
      <div class="mare-map-content">
        <h2>Viva onde<br>outros passam<br>férias</h2>
        <p>Selecionamos os melhores bairros de Florianópolis para você viver com qualidade, praticidade e vista para o que importa.</p>
        <div class="mare-locations">
          <div class="mare-location-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <div>
              <h4>Jurerê Internacional</h4>
              <p>Sofisticação à beira-mar</p>
            </div>
          </div>
          <div class="mare-location-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <div>
              <h4>Campeche</h4>
              <p>Natureza, praia e bem-estar</p>
            </div>
          </div>
          <div class="mare-location-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <div>
              <h4>Itacorubi</h4>
              <p>Praticidade no dia a dia</p>
            </div>
          </div>
          <div class="mare-location-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <div>
              <h4>Trindade</h4>
              <p>Vida urbana e universitária</p>
            </div>
          </div>
          <div class="mare-location-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <div>
              <h4>Cacupé</h4>
              <p>Tranquilidade e vista incrível</p>
            </div>
          </div>
        </div>
      </div>
      <div class="mare-map-image">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/SantaCatarina_Municip_Florianopolis.svg/1200px-SantaCatarina_Municip_Florianopolis.svg.png" alt="Mapa Floripa">
        <svg class="mare-map-pin" style="top:20%; right:30%" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        <svg class="mare-map-pin" style="top:50%; right:40%" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        <svg class="mare-map-pin" style="top:70%; right:20%" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
      </div>
    </section>

    <section class="mare-properties">
      <div class="mare-properties-header">
        <h2>Imóveis selecionados no litoral</h2>
        <a href="#" class="mare-link">Ver todos os imóveis <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg></a>
      </div>
      <div class="mare-grid">
        <div class="mare-card" style="background-image: url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')">
          <span class="mare-tag">DESTAQUE</span>
          <p class="mare-card-loc">Jurerê Internacional</p>
          <h3 class="mare-card-title">Apartamento 3 suítes</h3>
          <p class="mare-card-specs">125 m² • 2 vagas</p>
          <div class="mare-card-bottom">
            <p class="mare-card-price">R$ 9.500<span>/mês</span></p>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </div>
        </div>
        <div class="mare-card" style="background-image: url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')">
          <span class="mare-tag">VISTA MAR</span>
          <p class="mare-card-loc">Cacupé</p>
          <h3 class="mare-card-title">Casa 4 suítes</h3>
          <p class="mare-card-specs">360 m² • 3 vagas</p>
          <div class="mare-card-bottom">
            <p class="mare-card-price">R$ 14.000<span>/mês</span></p>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </div>
        </div>
        <div class="mare-card" style="background-image: url('https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')">
          <span class="mare-tag">NOVO</span>
          <p class="mare-card-loc">Campeche</p>
          <h3 class="mare-card-title">Apartamento 2 suítes</h3>
          <p class="mare-card-specs">80 m² • 1 vaga</p>
          <div class="mare-card-bottom">
            <p class="mare-card-price">R$ 4.800<span>/mês</span></p>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </div>
        </div>
        <div class="mare-card" style="background-image: url('https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')">
          <span class="mare-tag">PET FRIENDLY</span>
          <p class="mare-card-loc">Trindade</p>
          <h3 class="mare-card-title">Apartamento 2 quartos</h3>
          <p class="mare-card-specs">90 m² • 2 vagas</p>
          <div class="mare-card-bottom">
            <p class="mare-card-price">R$ 5.200<span>/mês</span></p>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </div>
        </div>
      </div>
    </section>

    <section class="mare-lifestyle">
      <h2>Encontre o estilo de vida que combina com você</h2>
      <div class="mare-icons-grid">
        <div class="mare-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          <h4>Perto da praia</h4>
          <p>A poucos passos do mar</p>
        </div>
        <div class="mare-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          <h4>Vista para o mar</h4>
          <p>Acorde com novos horizontes</p>
        </div>
        <div class="mare-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 21a9 9 0 0 0 9-9c0-5-4-9-9-9s-9 4-9 9a9 9 0 0 0 9 9z"></path><path d="M9 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"></path><path d="M19 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"></path></svg>
          <h4>Pet friendly</h4>
          <p>Seu pet também merece esse lar</p>
        </div>
        <div class="mare-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          <h4>Home office</h4>
          <p>Espaços para focar e produzir</p>
        </div>
        <div class="mare-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21h18"></path><path d="M9 8h1"></path><path d="M9 12h1"></path><path d="M9 16h1"></path><path d="M14 8h1"></path><path d="M14 12h1"></path><path d="M14 16h1"></path><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path></svg>
          <h4>Condomínio completo</h4>
          <p>Lazer, segurança e comodidade</p>
        </div>
        <div class="mare-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="10" rx="2" ry="2"></rect><circle cx="6" cy="19" r="2"></circle><circle cx="18" cy="19" r="2"></circle><line x1="10" y1="7" x2="10" y2="17"></line></svg>
          <h4>Mobilidade</h4>
          <p>Fácil acesso a tudo o que importa</p>
        </div>
      </div>
    </section>

    <section class="mare-steps">
      <div class="mare-steps-content">
        <h2>Alugar com a MARÉ é simples e seguro</h2>
        <div class="mare-steps-list">
          <div class="mare-step">
            <div class="mare-step-icon">01</div>
            <h4>Conta para a gente</h4>
            <p>o que você busca</p>
          </div>
          <div class="mare-step">
            <div class="mare-step-icon">02</div>
            <h4>Recebe opções</h4>
            <p>selecionadas</p>
          </div>
          <div class="mare-step">
            <div class="mare-step-icon">03</div>
            <h4>Visita os imóveis</h4>
            <p>com nossa equipe</p>
          </div>
          <div class="mare-step">
            <div class="mare-step-icon">04</div>
            <h4>Envia sua proposta</h4>
            <p>de forma online</p>
          </div>
          <div class="mare-step">
            <div class="mare-step-icon">05</div>
            <h4>Assina o contrato</h4>
            <p>e muda-se!</p>
          </div>
        </div>
      </div>
      <div class="mare-steps-image">
        <img src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Interior">
      </div>
    </section>

    <section class="mare-guide">
      <div class="mare-guide-left">
        <h2>Guia local: viva o melhor de Floripa</h2>
        <p>Dicas de quem conhece. Restaurantes, mercados, escolas, trilhas e muito mais para o seu dia a dia ser incrível.</p>
        <a href="#" class="mare-btn-white">Explorar bairros <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg></a>
        
        <div class="mare-guide-cards">
          <div class="mare-guide-card" style="background-image: url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80')">
            <span>Gastronomia</span>
          </div>
          <div class="mare-guide-card" style="background-image: url('https://images.unsplash.com/photo-1497633762265-9d179a990aa6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80')">
            <span>Educação</span>
          </div>
          <div class="mare-guide-card" style="background-image: url('https://images.unsplash.com/photo-1444492417251-9c84a5fa18e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80')">
            <span>Ao ar livre</span>
          </div>
          <div class="mare-guide-card" style="background-image: url('https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80')">
            <span>Bem-estar</span>
          </div>
        </div>
      </div>
      <div class="mare-guide-right">
        <div class="mare-quote-icon">“</div>
        <p class="mare-quote-text">A MARÉ nos ajudou a encontrar o lar perfeito para nossa família. Profissionais incríveis e imóveis de altíssimo padrão.</p>
        <div class="mare-quote-author">
          <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" alt="Juliana">
          <div>
            <h5>Juliana e Rafael</h5>
            <span>Moradores de Cacupé</span>
          </div>
        </div>
      </div>
    </section>

    <section class="mare-cta">
      <div class="mare-cta-left">
        <h2>É proprietário?</h2>
        <p>Alugue seu imóvel com quem entende do litoral e valoriza o que é seu.</p>
        <button class="mare-btn-outline" style="border-color: #fff; border-radius: 8px;">Fale com um especialista <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg></button>
      </div>
      <div class="mare-cta-features">
        <div class="mare-cta-feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <p>Inquilinos<br>qualificados</p>
        </div>
        <div class="mare-cta-feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <p>Divulgação premium<br>e estratégica</p>
        </div>
        <div class="mare-cta-feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <p>Gestão completa<br>e transparente</p>
        </div>
      </div>
    </section>

    <section class="mare-newsletter">
      <div class="mare-news-left">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        <div>
          <h4>Receba oportunidades exclusivas</h4>
          <p>Novos imóveis, dicas de bairros e conteúdos para viver bem no litoral.</p>
        </div>
      </div>
      <div class="mare-news-form">
        <input type="email" placeholder="Seu melhor e-mail">
        <button class="mare-btn-sand">Quero receber</button>
      </div>
    </section>

    <footer class="mare-footer">
      <div>
        <div class="mare-logo" style="margin-bottom: 1.5rem;">
          MARÉ
          <span>ALUGUEL DE IMÓVEIS</span>
        </div>
        <p>Mais que imóveis, ajudamos você a encontrar o lugar onde a vida acontece melhor.</p>
      </div>
      <div>
        <h4>Navegação</h4>
        <ul>
          <li><a href="#">Alugar</a></li>
          <li><a href="#">Bairros</a></li>
          <li><a href="#">Guia local</a></li>
          <li><a href="#">Para proprietários</a></li>
          <li><a href="#">Sobre a MARÉ</a></li>
        </ul>
      </div>
      <div>
        <h4>Bairros</h4>
        <ul>
          <li><a href="#">Jurerê Internacional</a></li>
          <li><a href="#">Campeche</a></li>
          <li><a href="#">Cacupé</a></li>
          <li><a href="#">Itacorubi</a></li>
          <li><a href="#">Trindade</a></li>
        </ul>
      </div>
      <div>
        <h4>Para proprietários</h4>
        <ul>
          <li><a href="#">Aluguel garantido</a></li>
          <li><a href="#">Gestão de aluguel</a></li>
          <li><a href="#">Divulgação do imóvel</a></li>
          <li><a href="#">Consultoria</a></li>
        </ul>
      </div>
      <div>
        <h4>Contato</h4>
        <ul>
          <li><a href="#">(48) 99123-4567</a></li>
          <li><a href="#">contato@marealugueis.com.br</a></li>
          <li><a href="#">Florianópolis, SC</a></li>
        </ul>
      </div>
    </footer>
    <div class="mare-footer-bottom">
      &copy; 2026 MARÉ. Aluguel de Imóveis. Todos os direitos reservados.
    </div>
  </div>
`;

export const mareTemplate: LandingPageTemplate = {
  id: 'tmpl-mare-01',
  name: 'Maré (Litoral)',
  description: 'Template elegante focado em aluguel no litoral com mapa ilustrado e tipografia serifada.',
  thumbnail: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?ixlib=rb-4.0.3&w=800&q=80',
  category: 'Litoral',
  group: 'Premium',
  objective: 'Capturar Leads e Proprietários',
  style: 'Sofisticado',
  resources: ['Imóveis', 'Mapas', 'Bairros', 'Guia Local'],
  themeConfig: {
    ...defaultPremiumTheme,
    primaryColor: '#008C73',
    secondaryColor: '#E37651',
    backgroundColor: '#0B2B42',
    textColor: '#F5EAD6',
    fontFamily: 'Montserrat, sans-serif',
  },
  blocks: [
    templateBlock(
      BlockType.CUSTOM_HTML,
      0,
      { code: mareHtml },
      {},
      'full'
    ),
  ],
};
