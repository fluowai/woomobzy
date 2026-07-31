import { LandingPageTemplate } from '../shared';
import { BlockType } from '../../../types/landingPage';
import { templateBlock } from '../shared';

const nexoHtml = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
    
    .nexo-container {
      font-family: 'Inter', sans-serif;
      color: #E2E8F0;
      background-color: #06060F;
      width: 100%;
      overflow-x: hidden;
    }
    .nexo-container * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    /* Header */
    .nexo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 5%;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      z-index: 100;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .nexo-logo {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.5px;
    }
    .nexo-logo svg {
      color: #722ED1;
    }
    .nexo-nav {
      display: flex;
      gap: 2.5rem;
    }
    .nexo-nav a {
      color: #94A3B8;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: color 0.3s;
    }
    .nexo-nav a:hover {
      color: #fff;
    }
    .nexo-auth {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .nexo-auth a {
      color: #94A3B8;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
    }
    .nexo-auth a:hover {
      color: #fff;
    }
    .nexo-btn-primary {
      background: linear-gradient(135deg, #722ED1 0%, #9F7AEA 100%);
      color: #fff;
      border: none;
      padding: 0.7rem 1.5rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(114,46,209,0.3);
      transition: all 0.3s;
    }
    .nexo-btn-primary:hover {
      box-shadow: 0 6px 20px rgba(114,46,209,0.5);
      transform: translateY(-1px);
    }
    
    /* Hero */
    .nexo-hero {
      position: relative;
      padding: 10rem 5% 5rem;
      min-height: 850px;
      display: flex;
      align-items: center;
      gap: 4rem;
      background: radial-gradient(circle at 70% 30%, rgba(114,46,209,0.15) 0%, rgba(6,6,15,1) 50%);
    }
    .nexo-hero::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: url('https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80') center/cover;
      opacity: 0.15;
      z-index: 0;
      mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
      -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
    }
    .nexo-hero-content {
      flex: 1.2;
      position: relative;
      z-index: 2;
    }
    .nexo-hero h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 4.5rem;
      line-height: 1.1;
      color: #fff;
      margin-bottom: 1.5rem;
      letter-spacing: -1px;
    }
    .nexo-hero h1 span {
      background: linear-gradient(90deg, #722ED1 0%, #A8F25C 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .nexo-hero p {
      font-size: 1.1rem;
      color: #94A3B8;
      line-height: 1.6;
      margin-bottom: 3rem;
      max-width: 500px;
    }
    
    /* Search Box */
    .nexo-search-box {
      background: rgba(15,15,25,0.6);
      border: 1px solid rgba(114,46,209,0.3);
      border-radius: 16px;
      padding: 1.5rem;
      backdrop-filter: blur(12px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
    }
    .nexo-search-input {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 8px;
      padding: 1rem 1.5rem;
      margin-bottom: 1.5rem;
    }
    .nexo-search-input svg {
      color: #722ED1;
    }
    .nexo-search-input input {
      flex: 1;
      background: transparent;
      border: none;
      color: #fff;
      font-size: 1rem;
      font-family: 'Inter', sans-serif;
      outline: none;
    }
    .nexo-search-input input::placeholder {
      color: #64748B;
    }
    .nexo-search-input button {
      background: #722ED1;
      color: #fff;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .nexo-tags-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.8rem;
    }
    .nexo-tag-btn {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.1);
      color: #94A3B8;
      padding: 0.6rem 1rem;
      border-radius: 30px;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .nexo-tag-btn:hover, .nexo-tag-btn.active {
      background: rgba(114,46,209,0.1);
      border-color: #722ED1;
      color: #fff;
    }
    
    /* Hero Features */
    .nexo-hero-features {
      display: flex;
      gap: 2rem;
      margin-top: 3rem;
    }
    .nexo-hero-feature {
      display: flex;
      align-items: flex-start;
      gap: 0.8rem;
    }
    .nexo-hero-feature svg {
      color: #A8F25C;
      width: 20px;
      height: 20px;
      margin-top: 2px;
    }
    .nexo-hero-feature p {
      font-size: 0.85rem;
      margin-bottom: 0;
      color: #E2E8F0;
      font-weight: 500;
    }
    .nexo-hero-feature span {
      display: block;
      color: #64748B;
      font-size: 0.75rem;
      font-weight: 400;
      margin-top: 2px;
    }
    
    /* Hero Match Card */
    .nexo-match-card-wrapper {
      flex: 0.8;
      position: relative;
      z-index: 2;
      perspective: 1000px;
    }
    .nexo-match-card {
      background: rgba(15,15,25,0.8);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 20px;
      padding: 2rem;
      backdrop-filter: blur(20px);
      box-shadow: 0 30px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(114,46,209,0.2) inset;
      transform: rotateY(-5deg) rotateX(5deg);
      transition: transform 0.5s;
    }
    .nexo-match-card:hover {
      transform: rotateY(0) rotateX(0);
    }
    .nexo-match-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .nexo-match-badge {
      background: rgba(168,242,92,0.1);
      color: #A8F25C;
      border: 1px solid rgba(168,242,92,0.2);
      padding: 0.4rem 0.8rem;
      border-radius: 30px;
      font-size: 0.8rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .nexo-match-body {
      display: flex;
      gap: 2rem;
      align-items: center;
      margin-bottom: 2rem;
    }
    .nexo-circle-progress {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: conic-gradient(#A8F25C 92%, rgba(255,255,255,0.05) 92%);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .nexo-circle-inner {
      width: 105px;
      height: 105px;
      background: #0f0f19;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .nexo-circle-inner h2 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 2.2rem;
      color: #fff;
      line-height: 1;
    }
    .nexo-circle-inner p {
      font-size: 0.7rem;
      color: #94A3B8;
      margin-top: 5px;
    }
    .nexo-match-info h3 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.3rem;
      color: #fff;
      margin-bottom: 0.5rem;
    }
    .nexo-match-info p {
      color: #94A3B8;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 1rem;
    }
    .nexo-match-specs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.8rem;
    }
    .nexo-match-spec {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #CBD5E1;
    }
    .nexo-match-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .nexo-match-price h4 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.6rem;
      color: #fff;
    }
    .nexo-match-price span {
      font-size: 0.85rem;
      color: #64748B;
      font-weight: 400;
    }
    .nexo-match-price p {
      font-size: 0.75rem;
      color: #64748B;
      margin-top: 4px;
    }
    
    /* Section Divider */
    .nexo-divider {
      text-align: center;
      padding: 2rem 0;
      position: relative;
    }
    .nexo-divider span {
      background: #06060F;
      padding: 0 1rem;
      color: #94A3B8;
      font-size: 0.9rem;
      position: relative;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .nexo-divider::before {
      content: '';
      position: absolute;
      top: 50%; left: 10%; right: 10%;
      border-top: 1px dashed rgba(255,255,255,0.1);
      z-index: 1;
    }
    
    /* Recommendations */
    .nexo-section {
      padding: 5rem 5%;
    }
    .nexo-section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 3rem;
    }
    .nexo-section-header h2 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.8rem;
      color: #fff;
    }
    .nexo-link {
      color: #94A3B8;
      text-decoration: none;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: color 0.3s;
    }
    .nexo-link:hover {
      color: #fff;
    }
    .nexo-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
    }
    .nexo-card {
      background: #0F0F19;
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 12px;
      overflow: hidden;
      transition: transform 0.3s, border-color 0.3s;
    }
    .nexo-card:hover {
      transform: translateY(-5px);
      border-color: rgba(114,46,209,0.4);
    }
    .nexo-card-img {
      height: 200px;
      position: relative;
      background-size: cover;
      background-position: center;
    }
    .nexo-card-match {
      position: absolute;
      top: 1rem; left: 1rem;
      background: rgba(15,15,25,0.9);
      border: 1px solid rgba(168,242,92,0.3);
      color: #A8F25C;
      padding: 0.3rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      backdrop-filter: blur(4px);
    }
    .nexo-card-content {
      padding: 1.5rem;
    }
    .nexo-card-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.1rem;
      color: #fff;
      margin-bottom: 0.2rem;
    }
    .nexo-card-loc {
      font-size: 0.85rem;
      color: #94A3B8;
      margin-bottom: 1rem;
    }
    .nexo-card-specs {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
      color: #CBD5E1;
    }
    .nexo-card-specs span {
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .nexo-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .nexo-card-price {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.2rem;
      color: #fff;
      font-weight: 600;
    }
    .nexo-card-price small {
      font-size: 0.75rem;
      color: #64748B;
      font-weight: 400;
    }
    .nexo-btn-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: rgba(255,255,255,0.05);
      border: none;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .nexo-btn-icon:hover {
      background: #722ED1;
    }
    
    /* Journey */
    .nexo-journey-section {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 4rem;
      padding: 5rem 5%;
    }
    .nexo-simulador {
      background: #0F0F19;
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 16px;
      padding: 2.5rem;
      text-align: center;
    }
    .nexo-simulador h3 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.2rem;
      color: #fff;
      margin-bottom: 0.5rem;
    }
    .nexo-simulador > p {
      font-size: 0.85rem;
      color: #94A3B8;
      margin-bottom: 3rem;
    }
    .nexo-gauge {
      width: 200px;
      height: 100px;
      margin: 0 auto 2rem;
      position: relative;
      overflow: hidden;
    }
    .nexo-gauge-arc {
      width: 200px;
      height: 200px;
      border-radius: 50%;
      border: 10px solid #1E293B;
      border-top-color: #A8F25C;
      border-left-color: #A8F25C;
      transform: rotate(45deg);
    }
    .nexo-gauge-value {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
    }
    .nexo-gauge-value p {
      font-size: 0.75rem;
      color: #94A3B8;
      margin-bottom: 0.2rem;
    }
    .nexo-gauge-value h4 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 2rem;
      color: #fff;
      line-height: 1;
    }
    .nexo-sim-stats {
      text-align: left;
      margin-top: 2rem;
    }
    .nexo-sim-stat {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
      font-size: 0.85rem;
    }
    .nexo-sim-stat span { color: #94A3B8; }
    .nexo-sim-stat strong { color: #fff; }
    
    .nexo-journey-info h3 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.5rem;
      color: #fff;
      margin-bottom: 0.5rem;
    }
    .nexo-journey-info > p {
      font-size: 0.95rem;
      color: #94A3B8;
      margin-bottom: 3rem;
    }
    .nexo-journey-steps {
      display: flex;
      justify-content: space-between;
      position: relative;
    }
    .nexo-journey-steps::before {
      content: '';
      position: absolute;
      top: 30px; left: 5%; right: 5%;
      border-top: 1px dashed rgba(255,255,255,0.2);
      z-index: 1;
    }
    .nexo-j-step {
      width: 22%;
      position: relative;
      z-index: 2;
    }
    .nexo-j-icon {
      width: 60px;
      height: 60px;
      background: #0F0F19;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.5rem;
      color: #94A3B8;
    }
    .nexo-j-step.active .nexo-j-icon {
      background: #722ED1;
      border-color: #9F7AEA;
      color: #fff;
      box-shadow: 0 0 20px rgba(114,46,209,0.4);
    }
    .nexo-j-step.done .nexo-j-icon {
      border-color: #A8F25C;
      color: #A8F25C;
    }
    .nexo-j-step h5 {
      font-size: 0.95rem;
      color: #fff;
      margin-bottom: 0.5rem;
    }
    .nexo-j-step p {
      font-size: 0.8rem;
      color: #64748B;
      line-height: 1.5;
    }
    
    /* Grid de Features */
    .nexo-features-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
      padding: 0 5% 5rem;
    }
    .nexo-feat-box {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .nexo-feat-box svg {
      color: #722ED1;
      width: 24px;
      height: 24px;
    }
    .nexo-feat-box div h4 {
      font-size: 1rem;
      color: #fff;
      margin-bottom: 0.2rem;
    }
    .nexo-feat-box div p {
      font-size: 0.8rem;
      color: #64748B;
    }
    
    /* Footer CTA */
    .nexo-cta {
      background: #0F0F19;
      border-top: 1px solid rgba(255,255,255,0.05);
      padding: 5rem 5%;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .nexo-cta-icon {
      width: 60px;
      height: 60px;
      background: rgba(114,46,209,0.1);
      border: 1px solid rgba(114,46,209,0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #722ED1;
      margin-bottom: 1.5rem;
    }
    .nexo-cta-left h2 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 2.2rem;
      color: #fff;
      margin-bottom: 0.5rem;
    }
    .nexo-cta-left p {
      color: #94A3B8;
      font-size: 1rem;
    }
    .nexo-btn-green {
      background: #A8F25C;
      color: #06060F;
      border: none;
      padding: 1rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s;
    }
    .nexo-btn-green:hover {
      background: #96de4b;
      transform: translateY(-2px);
    }
    
    /* Footer */
    .nexo-footer {
      background: #06060F;
      padding: 5rem 5% 2rem;
      border-top: 1px solid rgba(255,255,255,0.05);
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr;
      gap: 3rem;
    }
    .nexo-footer-about p {
      font-size: 0.85rem;
      color: #64748B;
      line-height: 1.6;
      margin: 1.5rem 0;
    }
    .nexo-socials {
      display: flex;
      gap: 1rem;
    }
    .nexo-socials a {
      color: #94A3B8;
      background: rgba(255,255,255,0.05);
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.3s;
    }
    .nexo-socials a:hover {
      background: #722ED1;
      color: #fff;
    }
    .nexo-footer h4 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1rem;
      color: #fff;
      margin-bottom: 1.5rem;
    }
    .nexo-footer ul {
      list-style: none;
    }
    .nexo-footer ul li {
      margin-bottom: 1rem;
    }
    .nexo-footer ul li a {
      color: #94A3B8;
      text-decoration: none;
      font-size: 0.85rem;
      transition: color 0.3s;
    }
    .nexo-footer ul li a:hover {
      color: #A8F25C;
    }
    .nexo-apps {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .nexo-app-btn {
      background: #0F0F19;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 0.6rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.8rem;
      color: #fff;
      text-decoration: none;
      transition: border-color 0.3s;
    }
    .nexo-app-btn:hover {
      border-color: #722ED1;
    }
    .nexo-app-btn svg { width: 24px; height: 24px; }
    .nexo-app-btn div {
      display: flex;
      flex-direction: column;
    }
    .nexo-app-btn span {
      font-size: 0.65rem;
      color: #94A3B8;
    }
    .nexo-app-btn strong {
      font-size: 0.9rem;
      font-weight: 600;
    }
    .nexo-copyright {
      padding: 2rem 5%;
      border-top: 1px solid rgba(255,255,255,0.05);
      display: flex;
      justify-content: space-between;
      color: #64748B;
      font-size: 0.8rem;
    }
  </style>

  <div class="nexo-container">
    <header class="nexo-header">
      <div class="nexo-logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
        NEXO
      </div>
      <nav class="nexo-nav">
        <a href="#">Soluções</a>
        <a href="#">Como funciona</a>
        <a href="#">Imóveis</a>
        <a href="#">Preços</a>
        <a href="#">Conteúdo</a>
      </nav>
      <div class="nexo-auth">
        <a href="#">Entrar</a>
        <button class="nexo-btn-primary">Criar conta</button>
      </div>
    </header>

    <section class="nexo-hero">
      <div class="nexo-hero-content">
        <h1>O imóvel certo<br>encontra <span>você.</span></h1>
        <p>Conte o que precisa. Nossa inteligência<br>encontra onde sua vida encaixa.</p>
        
        <div class="nexo-search-box">
          <div class="nexo-search-input">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <input type="text" placeholder="Conte o que você precisa em um imóvel...">
            <button><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></button>
          </div>
          <div class="nexo-tags-grid">
            <div class="nexo-tag-btn active"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> Quero 2 quartos</div>
            <div class="nexo-tag-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> Até R$ 4.500</div>
            <div class="nexo-tag-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path></svg> Perto do metrô</div>
            <div class="nexo-tag-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21a9 9 0 0 0 9-9c0-5-4-9-9-9s-9 4-9 9a9 9 0 0 0 9 9z"></path></svg> Pet friendly</div>
            <div class="nexo-tag-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect></svg> Com vaga</div>
          </div>
        </div>
        
        <div class="nexo-hero-features">
          <div class="nexo-hero-feature">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <div>
              <p>Busca Inteligente 24/7</p>
              <span>IA que entende você</span>
            </div>
          </div>
          <div class="nexo-hero-feature">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <div>
              <p>Análise e aprovação</p>
              <span>mais rápidas</span>
            </div>
          </div>
          <div class="nexo-hero-feature">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <div>
              <p>Seguro, transparente</p>
              <span>e 100% digital</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="nexo-match-card-wrapper">
        <div class="nexo-match-card">
          <div class="nexo-match-header">
            <span class="nexo-match-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path></svg> Seu match imobiliário</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </div>
          <div class="nexo-match-body">
            <div class="nexo-circle-progress">
              <div class="nexo-circle-inner">
                <h2>92%</h2>
                <p>Match perfeito</p>
              </div>
            </div>
            <div class="nexo-match-info">
              <h3>Apartamento na Vila Nova Conceição</h3>
              <p><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path></svg> São Paulo, SP</p>
              <div class="nexo-match-specs">
                <span class="nexo-match-spec"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> 2 quartos</span>
                <span class="nexo-match-spec"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect></svg> 1 suíte</span>
                <span class="nexo-match-spec"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect></svg> 1 vaga</span>
                <span class="nexo-match-spec"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> 72 m²</span>
              </div>
            </div>
          </div>
          <div class="nexo-match-footer">
            <div class="nexo-match-price">
              <h4>R$ 4.200 <span>/mês</span></h4>
              <p>Condomínio R$ 780 • IPTU R$ 120</p>
            </div>
            <button class="nexo-btn-primary" style="padding: 0.8rem 2rem;">Ver detalhes &rarr;</button>
          </div>
        </div>
      </div>
    </section>

    <div class="nexo-divider">
      <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#722ED1" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path></svg> Da busca ao contrato, tudo inteligente. <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#722ED1" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path></svg></span>
    </div>

    <section class="nexo-section">
      <div class="nexo-section-header">
        <h2>Recomendações feitas para você</h2>
        <a href="#" class="nexo-link">Ver todos os imóveis &rarr;</a>
      </div>
      <div class="nexo-grid">
        <div class="nexo-card">
          <div class="nexo-card-img" style="background-image: url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')">
            <span class="nexo-card-match">92% match</span>
          </div>
          <div class="nexo-card-content">
            <h3 class="nexo-card-title">Vila Nova Conceição</h3>
            <p class="nexo-card-loc">São Paulo, SP</p>
            <div class="nexo-card-specs">
              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> 2</span>
              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect></svg> 1</span>
              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> 72m²</span>
            </div>
            <div class="nexo-card-footer">
              <div class="nexo-card-price">R$ 4.200 <small>/mês</small></div>
              <button class="nexo-btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></button>
            </div>
          </div>
        </div>
        <div class="nexo-card">
          <div class="nexo-card-img" style="background-image: url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')">
            <span class="nexo-card-match" style="color:#FBBF24; border-color:rgba(251,191,36,0.3); background:rgba(251,191,36,0.1);">89% match</span>
          </div>
          <div class="nexo-card-content">
            <h3 class="nexo-card-title">Pinheiros</h3>
            <p class="nexo-card-loc">São Paulo, SP</p>
            <div class="nexo-card-specs">
              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> 2</span>
              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect></svg> 1</span>
              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> 68m²</span>
            </div>
            <div class="nexo-card-footer">
              <div class="nexo-card-price">R$ 3.900 <small>/mês</small></div>
              <button class="nexo-btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></button>
            </div>
          </div>
        </div>
        <div class="nexo-card">
          <div class="nexo-card-img" style="background-image: url('https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')">
            <span class="nexo-card-match" style="color:#FBBF24; border-color:rgba(251,191,36,0.3); background:rgba(251,191,36,0.1);">87% match</span>
          </div>
          <div class="nexo-card-content">
            <h3 class="nexo-card-title">Perdizes</h3>
            <p class="nexo-card-loc">São Paulo, SP</p>
            <div class="nexo-card-specs">
              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> 2</span>
              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect></svg> 2</span>
              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> 75m²</span>
            </div>
            <div class="nexo-card-footer">
              <div class="nexo-card-price">R$ 4.600 <small>/mês</small></div>
              <button class="nexo-btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></button>
            </div>
          </div>
        </div>
        <div class="nexo-card">
          <div class="nexo-card-img" style="background-image: url('https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')">
            <span class="nexo-card-match" style="color:#F87171; border-color:rgba(248,113,113,0.3); background:rgba(248,113,113,0.1);">65% match</span>
          </div>
          <div class="nexo-card-content">
            <h3 class="nexo-card-title">Moema</h3>
            <p class="nexo-card-loc">São Paulo, SP</p>
            <div class="nexo-card-specs">
              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> 1</span>
              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect></svg> 1</span>
              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> 55m²</span>
            </div>
            <div class="nexo-card-footer">
              <div class="nexo-card-price">R$ 3.400 <small>/mês</small></div>
              <button class="nexo-btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="nexo-journey-section">
      <div class="nexo-simulador">
        <h3>Simulador de elegibilidade</h3>
        <p>Descubra seu poder de aluguel em segundos.</p>
        <div class="nexo-gauge">
          <div class="nexo-gauge-arc"></div>
          <div class="nexo-gauge-value">
            <p>Você pode alugar até</p>
            <h4>R$ 5.200</h4>
          </div>
        </div>
        <div class="nexo-sim-stats">
          <div class="nexo-sim-stat"><span>Renda mensal</span> <strong>R$ 9.200</strong></div>
          <div class="nexo-sim-stat"><span>Comprometimento recomendado</span> <strong>30%</strong></div>
          <div class="nexo-sim-stat"><span>Outras despesas</span> <strong>R$ 1.800</strong></div>
        </div>
        <div style="background: rgba(168,242,92,0.1); border: 1px solid rgba(168,242,92,0.2); padding: 0.8rem; border-radius: 8px; margin-top: 1rem; color: #A8F25C; font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem; justify-content: center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Perfil aprovado com alta chance!
        </div>
      </div>
      
      <div>
        <div class="nexo-journey-info">
          <h3>Jornada digital do aluguel</h3>
          <p>Processo 100% digital, simples e seguro.</p>
        </div>
        <div class="nexo-journey-steps">
          <div class="nexo-j-step active">
            <div class="nexo-j-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path></svg></div>
            <h5>1. Busca inteligente</h5>
            <p>IA entende o que você precisa e mostra os melhores matches.</p>
          </div>
          <div class="nexo-j-step">
            <div class="nexo-j-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg></div>
            <h5>2. Visita e proposta</h5>
            <p>Agende visitas online e faça sua proposta sem sair de casa.</p>
          </div>
          <div class="nexo-j-step">
            <div class="nexo-j-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div>
            <h5>3. Análise e aprovação</h5>
            <p>Nossa IA analisa seu perfil e te dá retorno muito mais rápido.</p>
          </div>
          <div class="nexo-j-step">
            <div class="nexo-j-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
            <h5>4. Contrato digital</h5>
            <p>Assine digitalmente e receba as chaves. Tudo online.</p>
          </div>
        </div>
      </div>
    </section>

    <section>
      <div style="padding: 0 5% 2rem;"><h3 style="font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; color: #fff;">Segurança e confiança em cada etapa</h3></div>
      <div class="nexo-features-grid">
        <div class="nexo-feat-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
          <div><h4>+300 mil</h4><p>contratos digitais</p></div>
        </div>
        <div class="nexo-feat-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <div><h4>+95%</h4><p>aprovação em até 48h</p></div>
        </div>
        <div class="nexo-feat-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <div><h4>99,9%</h4><p>uptime da plataforma</p></div>
        </div>
        <div class="nexo-feat-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <div><h4>LGPD & Criptografia</h4><p>dados protegidos</p></div>
        </div>
      </div>
    </section>

    <section class="nexo-cta">
      <div style="display:flex; gap: 2rem; align-items:center;">
        <div class="nexo-cta-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path></svg>
        </div>
        <div class="nexo-cta-left">
          <h2>Pronto para encontrar o imóvel certo?</h2>
          <p>Cadastre-se grátis e deixe nossa inteligência trabalhar por você.</p>
        </div>
      </div>
      <button class="nexo-btn-green">Criar minha conta grátis <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path></svg></button>
    </section>

    <footer class="nexo-footer">
      <div class="nexo-footer-about">
        <div class="nexo-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          NEXO
        </div>
        <p>Plataforma inteligente de aluguel que usa IA para conectar pessoas a imóveis e simplificar cada etapa do processo.</p>
        <div class="nexo-socials">
          <a href="#"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></a>
          <a href="#"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a>
          <a href="#"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg></a>
        </div>
      </div>
      <div>
        <h4>NEXO</h4>
        <ul>
          <li><a href="#">Quem somos</a></li>
          <li><a href="#">Carreiras</a></li>
          <li><a href="#">Imprensa</a></li>
          <li><a href="#">Blog</a></li>
        </ul>
      </div>
      <div>
        <h4>Soluções</h4>
        <ul>
          <li><a href="#">Para inquilinos</a></li>
          <li><a href="#">Para proprietários</a></li>
          <li><a href="#">Para imobiliárias</a></li>
          <li><a href="#">Corporativo</a></li>
        </ul>
      </div>
      <div>
        <h4>Ajuda</h4>
        <ul>
          <li><a href="#">Central de ajuda</a></li>
          <li><a href="#">Políticas</a></li>
          <li><a href="#">Segurança & LGPD</a></li>
        </ul>
      </div>
      <div class="nexo-apps">
        <h4>Baixe o app</h4>
        <p style="font-size: 0.85rem; color: #64748B; margin-bottom: 0.5rem;">Tenha a NEXO no seu celular.</p>
        <a href="#" class="nexo-app-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"></path><path d="M12 16V8"></path><path d="M8 12l4-4 4 4"></path></svg>
          <div>
            <span>Download on the</span>
            <strong>App Store</strong>
          </div>
        </a>
        <a href="#" class="nexo-app-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          <div>
            <span>GET IT ON</span>
            <strong>Google Play</strong>
          </div>
        </a>
      </div>
    </footer>
    <div class="nexo-copyright">
      <span>&copy; 2026 NEXO. Todos os direitos reservados.</span>
      <span style="display:flex; gap:1.5rem;"><a href="#" style="color:#64748B; text-decoration:none;">Termos de uso</a> <a href="#" style="color:#64748B; text-decoration:none;">Privacidade</a></span>
    </div>
  </div>
`;

export const nexoTemplate: LandingPageTemplate = {
  id: 'tmpl-nexo-01',
  name: 'Nexo (High-Tech)',
  description: 'Template focado em IA, agilidade e visual cyberpunk/moderno, ideal para proptechs.',
  thumbnail: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&w=800&q=80',
  category: 'Proptech',
  group: 'Premium',
  objective: 'Geração de Cadastros',
  style: 'Dark Mode / Futurista',
  resources: ['Busca Inteligente', 'Match de IA', 'Simulador'],
  themeConfig: {
    primaryColor: '#722ED1',
    secondaryColor: '#A8F25C',
    backgroundColor: '#06060F',
    textColor: '#E2E8F0',
    fontFamily: 'Inter, sans-serif',
  },
  blocks: [
    templateBlock(
      BlockType.CUSTOM_HTML,
      0,
      { code: nexoHtml },
      {},
      'full'
    ),
  ],
};
