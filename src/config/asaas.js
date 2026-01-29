const ASAAS_API_KEY = import.meta.env.VITE_ASAAS_API_KEY;
const ASAAS_API_URL = import.meta.env.VITE_ASAAS_API_URL || 'https://api.asaas.com/v3';

export const asaasConfig = {
  apiKey: ASAAS_API_KEY,
  apiUrl: ASAAS_API_URL,
  headers: {
    'access_token': ASAAS_API_KEY,
    'Content-Type': 'application/json',
  },
};

// Funções da API Asaas
export const asaasAPI = {
  // Criar cobrança
  async criarCobranca(dados) {
    try {
      const response = await fetch(`${ASAAS_API_URL}/payments`, {
        method: 'POST',
        headers: asaasConfig.headers,
        body: JSON.stringify(dados),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar cobrança');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro na API Asaas:', error);
      throw error;
    }
  },

  // Buscar pagamento pelo ID
  async buscarPagamento(id) {
    try {
      const response = await fetch(`${ASAAS_API_URL}/payments/${id}`, {
        method: 'GET',
        headers: asaasConfig.headers,
      });

      if (!response.ok) {
        throw new Error('Pagamento não encontrado');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar pagamento:', error);
      throw error;
    }
  },

  // Buscar pagamento por código de identificação externo
  async buscarPagamentoPorCodigo(codigo) {
    try {
      const response = await fetch(`${ASAAS_API_URL}/payments?externalReference=${codigo}`, {
        method: 'GET',
        headers: asaasConfig.headers,
      });

      if (!response.ok) {
        throw new Error('Pagamento não encontrado');
      }

      const data = await response.json();
      return data.data?.[0]; // Retorna o primeiro pagamento encontrado
    } catch (error) {
      console.error('Erro ao buscar pagamento:', error);
      return null;
    }
  },

  // Gerar link de pagamento
  gerarLinkPagamento(pagamentoId) {
    return `https://www.asaas.com/payment/${pagamentoId}`;
  },

  // Criar cobrança para licença
  async criarCobrancaLicenca(empresa, tipo = 'mensal') {
    const planos = {
      mensal: { valor: 49.90, descricao: 'Licença Mensal - PDV Completo' },
      anual: { valor: 499.00, descricao: 'Licença Anual - PDV Completo (Economize 17%)' },
      demo: { valor: 0, descricao: 'Licença Demo - Versão de Teste' },
    };

    const plano = planos[tipo] || planos.mensal;

    const dadosCobranca = {
      billingType: 'BOLETO',
      value: plano.valor,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Vencimento em 3 dias
      description: plano.descricao,
      externalReference: `LIC-${empresa.cnpj.replace(/\D/g, '')}-${Date.now()}`,
      customer: {
        name: empresa.razaoSocial,
        cpfCnpj: empresa.cnpj,
        email: empresa.email,
        phone: empresa.telefone || '',
        address: empresa.logradouro,
        addressNumber: empresa.numero,
        complement: empresa.complemento || '',
        province: empresa.bairro,
        postalCode: empresa.cep.replace(/\D/g, ''),
        city: empresa.cidade,
        state: empresa.uf,
      },
    };

    return await this.criarCobranca(dadosCobranca);
  },
};