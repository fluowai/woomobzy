import fetch from 'node-fetch';

async function checkCurrentWebsite() {
  const url =
    'https://pamasimoveis.com.br/imovel/venda/apartamentos/vinhedo/nova-vinhedo-spazio-reale-condominium-spazio-reale/5314';

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 15000,
  });

  const html = await response.text();

  // Look for image patterns
  const s3Matches = html.match(/https:\/\/s3\.amazonaws\.com\/[^\s"']+/g) || [];
  const wootechMatches =
    html.match(/https:\/\/s\.wootech\.com\.br\/[^\s"']+/g) || [];
  const imgTags = [
    ...html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/g),
  ].map((m) => m[1]);

  console.log('S3 images:', s3Matches.length);
  console.log('Wootech images:', wootechMatches.length);
  console.log('IMG tags:', imgTags.length);

  console.log('\nSample IMG tags:');
  imgTags.slice(0, 10).forEach((src) => {
    console.log(' ', src);
  });
}

checkCurrentWebsite().catch(console.error);
