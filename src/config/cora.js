// src/config/cora.js
const CORA_API_KEY = import.meta.env.VITE_CORA_API_KEY || 'int-4Pf1ePblHBCp8LogSH5Yaj';
const CORA_PIX_KEY = import.meta.env.VITE_CORA_PIX_KEY || '06270840000150';
const CORA_ENV = import.meta.env.VITE_CORA_ENV || 'sandbox'; // 'sandbox' ou 'production'

export const coraConfig = {
  apiKey: CORA_API_KEY,
  pixKey: CORA_PIX_KEY,
  apiUrl: CORA_ENV === 'production' 
    ? 'https://api.cora.com.br/v1' 
    : 'https://api.cora.sandbox.com.br/v1',
  headers: {
    'Authorization': `Bearer ${CORA_API_KEY}`,
    'Content-Type': 'application/json',
  },
  isSandbox: CORA_ENV === 'sandbox',
};

// Funções da API Cora
export const coraAPI = {
  // Criar Pix Dinâmico
  async criarPix(dados) {
    try {
      const response = await fetch(`${coraConfig.apiUrl}/pix/qrcodes/dynamic`, {
        method: 'POST',
        headers: coraConfig.headers,
        body: JSON.stringify(dados),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Erro Cora API:', error);
        throw new Error(error.message || `Erro ${response.status}: ${JSON.stringify(error)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro na API Cora:', error);
      throw error;
    }
  },

  // Buscar Pix pelo ID
  async buscarPix(pixId) {
    try {
      const response = await fetch(`${coraConfig.apiUrl}/pix/qrcodes/${pixId}`, {
        method: 'GET',
        headers: coraConfig.headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Pix não encontrado');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar Pix:', error);
      throw error;
    }
  },

  // Criar cobrança para licença
  async criarCobrancaLicenca(empresa, tipo = 'mensal', licencaId) {
    const planos = {
      mensal: { valor: 49.90, descricao: 'Licença Mensal PDV LDT NET' },
      anual: { valor: 499.00, descricao: 'Licença Anual PDV LDT NET' },
      demo: { valor: 0, descricao: 'Licença Demo PDV LDT NET' },
    };

    const plano = planos[tipo] || planos.mensal;

    // Identificação única para rastreamento
    const identificacao = `LDT-LIC-${licencaId.substring(0, 8)}-${Date.now()}`;

    // Licença demo não gera cobrança
    if (tipo === 'demo') {
      return {
        id: `demo-${licencaId}`,
        status: 'ATIVA',
        valor: 0,
        identificacao: identificacao,
        qrCode: null,
        qrCodeImage: null,
      };
    }

    const dadosPix = {
      valor: plano.valor,
      chave: coraConfig.pixKey, // CNPJ da LDT NET: 06.270.840/0001-50
      identificacao: identificacao,
      infoAdicionais: [
        { nome: 'Licença', valor: plano.descricao },
        { nome: 'Empresa', valor: empresa.razao_social.substring(0, 40) },
        { nome: 'CNPJ', valor: empresa.cnpj.replace(/\D/g, '') },
      ],
      solicitacaoPagador: `Pagamento licença PDV - ${empresa.nome_fantasia || empresa.razao_social}`,
    };

    return await this.criarPix(dadosPix);
  },
};