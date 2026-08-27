import forge from 'node-forge';
import signpdf from 'node-signpdf';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import crypto from 'crypto';
import { getSupabaseServer } from '../lib/supabase-server.js';

export class DigitalSignatureService {
  /**
   * Gera um par de chaves e um certificado auto-assinado (PKI interno)
   */
  static generateCertificate(signerName, signerEmail) {
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

    const attrs = [
      { name: 'commonName', value: signerName },
      { name: 'countryName', value: 'BR' },
      { shortName: 'ST', value: 'SP' },
      { name: 'localityName', value: 'Sao Paulo' },
      { name: 'organizationName', value: 'Imobzy' },
      { shortName: 'OU', value: 'Assinatura Digital' }
    ];
    
    if (signerEmail) {
      attrs.push({ name: 'emailAddress', value: signerEmail });
    }

    cert.setSubject(attrs);
    cert.setIssuer(attrs);

    // Auto-assina o certificado
    cert.sign(keys.privateKey, forge.md.sha256.create());

    const pemCert = forge.pki.certificateToPem(cert);
    const pemKey = forge.pki.privateKeyToPem(keys.privateKey);

    return { pemCert, pemKey };
  }

  /**
   * Assina o PDF com as informações do signatário.
   */
  static async signDocument(pdfBuffer, signerName, signerEmail, metadata = {}) {
    // 1. Gera o certificado PKI na hora para o signatário (assinatura in-house)
    const { pemCert, pemKey } = this.generateCertificate(signerName, signerEmail);
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
      forge.pki.privateKeyFromPem(pemKey),
      [forge.pki.certificateFromPem(pemCert)],
      'senha123'
    );
    const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
    const p12Buffer = Buffer.from(p12Der, 'binary');

    // 2. Prepara o PDF usando pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Adiciona uma página no final ou um texto de rodapé para a assinatura visível
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    
    const text = `Assinado digitalmente por: ${signerName}\nData: ${new Date().toLocaleString('pt-BR')}\nIP: ${metadata.ip || 'N/A'}\nValidação WhatsApp: ${metadata.whatsappValidated ? 'Sim' : 'Não'}`;
    lastPage.drawText(text, {
      x: 50,
      y: 50,
      size: 10,
    });

    const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
    const bufferToSign = Buffer.from(pdfBytes);

    // 3. Adiciona a assinatura criptográfica usando node-signpdf (usamos importação padrão de acordo com a doc)
    const signer = signpdf.default ? signpdf.default : signpdf;
    
    // O signpdf requer que o PDF tenha um placeholder (um ByteRange vazio).
    // Para simplificar, o plainAddPlaceholder injeta esse placeholder.
    let pdfWithPlaceholder;
    try {
      const { plainAddPlaceholder } = await import('node-signpdf/dist/helpers/index.js');
      pdfWithPlaceholder = plainAddPlaceholder({
        pdfBuffer: bufferToSign,
        reason: 'Assinatura Eletrônica Imobzy',
        signatureLength: 8192
      });
    } catch(e) {
      // Fallback
      console.error('Falha ao adicionar placeholder:', e);
      return bufferToSign;
    }

    const signedPdf = signer.sign(pdfWithPlaceholder, p12Buffer, { passphrase: 'senha123' });
    
    return signedPdf;
  }
}
