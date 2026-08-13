const fs = require('fs');
const path = require('path');
const https = require('https');

const images = {
  luxury: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop',
  luxury2: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&h=800&fit=crop',
  rural: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=800&fit=crop',
  rural2: 'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=1200&h=800&fit=crop',
  urban: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=800&fit=crop',
  urban2: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&h=800&fit=crop',
  commercial: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=800&fit=crop',
  lots: 'https://images.unsplash.com/photo-1473161924773-228b7e28b17b?w=1200&h=800&fit=crop',
  mcmv: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&h=800&fit=crop',
  modernHouse: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=800&fit=crop',
  classic: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&h=800&fit=crop',
  beach: 'https://images.unsplash.com/photo-1499793983394-2d6e66b9b832?w=1200&h=800&fit=crop',
  eco: 'https://images.unsplash.com/photo-1518005068251-37900150dfca?w=1200&h=800&fit=crop',
};

const dir = path.join(__dirname, 'public', 'images', 'templates');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      // Check for redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  for (const [key, url] of Object.entries(images)) {
    const dest = path.join(dir, `${key}.jpg`);
    console.log(`Downloading ${key}...`);
    try {
      await download(url, dest);
      console.log(`Saved ${key}.jpg`);
    } catch (e) {
      console.error(`Failed ${key}: ${e.message}`);
    }
  }
}

run();
