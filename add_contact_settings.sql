-- Add contact form configuration columns to site_settings table

-- Add contact email column
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT 'contato@okaimoveis.com.br';

-- Add WhatsApp template for contact form auto-reply
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS contact_whatsapp_template TEXT DEFAULT 'Olá {name}! Recebemos seu contato através do formulário "Fale Conosco". Nossa equipe já está analisando sua mensagem e entrará em contato em breve. Obrigado!';

-- Add comments for documentation
COMMENT ON COLUMN site_settings.contact_email IS 'Email address to receive contact form submissions';
COMMENT ON COLUMN site_settings.contact_whatsapp_template IS 'WhatsApp message template for contact form auto-reply. Variables: {name}, {email}, {phone}, {message}';
