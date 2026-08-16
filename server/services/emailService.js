import nodemailer from 'nodemailer';

/**
 * Email Service for sending contact form notifications
 * Uses Nodemailer with SMTP configuration
 */

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

/**
 * Send contact form notification email
 * @param {Object} formData - Contact form data
 * @param {string} formData.name - Contact name
 * @param {string} formData.email - Contact email
 * @param {string} formData.phone - Contact phone
 * @param {string} formData.message - Contact message
 * @param {string} recipientEmail - Email to send notification to
 * @returns {Promise<Object>} - Email send result
 */
export const sendContactFormEmail = async (formData, recipientEmail) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${formData.name}" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      replyTo: formData.email,
      subject: `Novo Contato - Fale Conosco: ${formData.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .field { margin-bottom: 20px; }
            .label { font-weight: bold; color: #16a34a; margin-bottom: 5px; }
            .value { background: white; padding: 10px; border-left: 3px solid #16a34a; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📧 Novo Contato Recebido</h1>
              <p style="margin: 10px 0 0 0;">Formulário Fale Conosco - Fazendas Brasil</p>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">👤 Nome:</div>
                <div class="value">${formData.name}</div>
              </div>
              <div class="field">
                <div class="label">📧 Email:</div>
                <div class="value"><a href="mailto:${formData.email}">${formData.email}</a></div>
              </div>
              <div class="field">
                <div class="label">📱 Telefone:</div>
                <div class="value"><a href="tel:${formData.phone}">${formData.phone}</a></div>
              </div>
              <div class="field">
                <div class="label">💬 Mensagem:</div>
                <div class="value">${formData.message}</div>
              </div>
              <div class="footer">
                <p>Este email foi gerado automaticamente pelo sistema Fazendas Brasil</p>
                <p>Data: ${new Date().toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Novo Contato - Fale Conosco

Nome: ${formData.name}
Email: ${formData.email}
Telefone: ${formData.phone}

Mensagem:
${formData.message}

---
Data: ${new Date().toLocaleString('pt-BR')}
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

/**
 * Test email configuration
 * @returns {Promise<boolean>} - True if configuration is valid
 */
export const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return false;
  }
};
