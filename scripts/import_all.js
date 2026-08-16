import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Credenciais do Supabase não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BASE_URL = 'https://www.fazendasbrasil.com.br';
const TARGET_URL = 'https://www.fazendasbrasil.com.br/imobiliaria/imoveis/0/1';

async function importAll() {
  console.log(`🚀 Iniciando importação completa de ${TARGET_URL}\n`);

  let successCount = 0;
  let errorCount = 0;

  try {
    // 1. Buscar a página de listagem
    console.log(`📥 Baixando página de listagem...`);
    const { data: pageHtml } = await axios.get(TARGET_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const $ = cheerio.load(pageHtml);

    // 2. Extrair links dos imóveis
    const propertyLinks = [];
    $('[id^="property-"]').each((i, el) => {
      const id = $(el).attr('id');
      if (id) {
        const link = $(el).find('a[href*="/imoveis/"]').first().attr('href');
        if (link) {
          const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
          if (!propertyLinks.includes(fullUrl)) propertyLinks.push(fullUrl);
        }
      }
    });

    console.log(`✅ Encontrados ${propertyLinks.length} imóveis\n`);

    // 3. Processar cada imóvel
    for (let i = 0; i < propertyLinks.length; i++) {
      const url = propertyLinks[i];
      console.log(`\n[${i + 1}/${propertyLinks.length}] Processando: ${url}`);

      try {
        const { data: html } = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const $page = cheerio.load(html);

        // Extrair dados
        const title =
          $page('h1').text().trim() ||
          $page('h2').first().text().trim() ||
          'Sem Título';
        const bodyText = $page('body').text();

        // Preço
        let price = 0;
        let priceText =
          $page('.valor').text().trim() || $page('.price').text().trim();
        if (!priceText) {
          const match = bodyText.match(/R\$\s?([\d.,]+)/);
          if (match) priceText = match[1];
        }
        if (priceText) {
          price = parseFloat(
            priceText.replace(/[^\d,]/g, '').replace(',', '.')
          );
        }

        // Localização
        let city = 'Importado';
        let state = 'BR';
        const titleMatch = title.match(/em\s(.*?)\s-\s([A-Z]{2})/);
        if (titleMatch) {
          city = titleMatch[1].trim();
          state = titleMatch[2].trim();
        }

        // Descrição
        const description =
          $page('.descricao-imovel').text().trim() ||
          $page('.description').text().trim() ||
          $page('p').text().slice(0, 300);

        // Área
        let area = 0;
        const areaMatch = bodyText.match(
          /([\d.,]+)\s?(hectares|ha|alqueires)/i
        );
        if (areaMatch) {
          let val = parseFloat(areaMatch[1].replace('.', '').replace(',', '.'));
          if (areaMatch[2].toLowerCase().includes('alq')) val *= 48400;
          else val *= 10000;
          area = val;
        }

        // Imagens - procurar especificamente as do imóvel
        const images = [];
        console.log(`   🔍 Procurando imagens...`);
        $page('img').each((idx, el) => {
          const src = $page(el).attr('src');
          if (src && src.includes('admin/imovel')) {
            const full = src.startsWith('http') ? src : `${BASE_URL}${src}`;
            console.log(`      ✅ Imagem encontrada: ${full}`);
            if (!images.includes(full)) images.push(full);
          }
        });
        console.log(`   📸 Total de imagens: ${images.length}`);

        const propertyData = {
          title,
          description,
          price: price || 0,
          type: 'Fazenda',
          status: 'Disponível',
          city,
          state,
          features: { area, bedrooms: 0, bathrooms: 0 },
          images,
          highlighted: true,
          created_at: new Date().toISOString(),
        };

        // Salvar no Supabase
        const { error } = await supabase
          .from('properties')
          .upsert(propertyData, { onConflict: 'title' });

        if (error) {
          console.error(`   ❌ Erro ao salvar: ${error.message}`);
          errorCount++;
        } else {
          console.log(`   ✅ Salvo: ${title}`);
          console.log(`   📸 Fotos: ${images.length}`);
          successCount++;
        }

        // Delay para não sobrecarregar
        await new Promise((r) => setTimeout(r, 1500));
      } catch (error) {
        console.error(`   ❌ Erro ao processar: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n\n🎉 IMPORTAÇÃO CONCLUÍDA!`);
    console.log(`✅ Sucessos: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📊 Total: ${propertyLinks.length}`);
  } catch (e) {
    console.error(`\n❌ Erro fatal:`, e.message);
    console.error(e.stack);
  }
}

importAll();
