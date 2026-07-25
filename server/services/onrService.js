/**
 * Integração com a API do ONR (Operador Nacional do Sistema de Registro Eletrônico de Imóveis)
 * Documentação Swagger: https://www.registrodeimoveis.org.br/swagger/index.html
 */

const ONR_BASE_URL = process.env.ONR_API_URL || 'https://api.registrodeimoveis.org.br/v1';

class ONRService {
  constructor() {
    this.token = null;
    this.tokenExpiresAt = null;
  }

  /**
   * Autentica na API do ONR e armazena o token temporariamente.
   * Em produção, isso pode ser atrelado às chaves (client_id/secret) da organização.
   */
  async authenticate(clientId, clientSecret) {
    if (this.token && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return this.token;
    }

    try {
      // O endpoint exato de auth pode variar conforme o Swagger mais atual
      const response = await fetch(`${ONR_BASE_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials'
        }),
      });

      if (!response.ok) {
        throw new Error(`Falha na autenticação ONR: ${response.statusText}`);
      }

      const data = await response.json();
      this.token = data.access_token;
      
      // Armazena a validade com 5 minutos de folga para renovação preventiva
      const expiresIn = data.expires_in || 3600;
      this.tokenExpiresAt = new Date(new Date().getTime() + (expiresIn - 300) * 1000);
      
      return this.token;
    } catch (error) {
      console.error('[ONR Service] Erro ao autenticar:', error.message);
      throw error;
    }
  }

  async getHeaders(orgConfig) {
    const { onr_client_id, onr_client_secret } = orgConfig;
    if (!onr_client_id || !onr_client_secret) {
      throw new Error('Credenciais do ONR não configuradas para esta organização.');
    }
    const token = await this.authenticate(onr_client_id, onr_client_secret);
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Solicita uma certidão de matrícula
   */
  async requestCertificate(orgConfig, propertyData) {
    try {
      const headers = await this.getHeaders(orgConfig);
      
      const payload = {
        matricula: propertyData.registrationNumber,
        cns_cartorio: propertyData.cns, // Código Nacional de Serventias
        tipo_certidao: propertyData.certificateType || 'inteiro_teor',
        finalidade: 'analise_imobiliaria',
      };

      const response = await fetch(`${ONR_BASE_URL}/certidoes/solicitar`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`Erro ONR (${response.status}): ${errData.mensagem || response.statusText}`);
      }

      return await response.json(); // Retorna o Protocolo
    } catch (error) {
      console.error('[ONR Service] Erro ao solicitar certidão:', error.message);
      throw error;
    }
  }

  /**
   * Consulta o status de um pedido de certidão (Polling)
   */
  async checkProtocolStatus(orgConfig, protocolId) {
    try {
      const headers = await this.getHeaders(orgConfig);
      
      const response = await fetch(`${ONR_BASE_URL}/certidoes/protocolos/${protocolId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Erro ONR ao consultar protocolo: ${response.statusText}`);
      }

      return await response.json(); // { status: "CONCLUIDO", url_download: "..." }
    } catch (error) {
      console.error('[ONR Service] Erro ao consultar protocolo:', error.message);
      throw error;
    }
  }
}

export const onrService = new ONRService();
