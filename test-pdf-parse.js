import { PDFParse } from 'pdf-parse';
console.log('PDFParse type:', typeof PDFParse);
try {
  const p = new PDFParse({ data: Buffer.from('%PDF-1.4...') });
  console.log('Instance created successfully');
  p.getText().then(result => {
    console.log('getText result:', result);
  }).catch(err => {
    console.error('getText error:', err);
  });
} catch (e) {
  console.error('Error creating instance:', e);
}
