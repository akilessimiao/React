// src/services/licencaService.js
import { createClient } from '@supabase/supabase-js';
import { asaasAPI } from '../config/asaas';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const licencaService = {
  // Gerar chave de ativação única
  gerarChaveAtivacao(cnpj) {
    const timestamp = Date.now().toString(36);
    const cnpjHash = cnpj.replace(/\D/g, '').slice(0, 8);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `LDT-NET-${cnpjHash}-${timestamp}-${random}`;
  },

  // Salvar empresa no Supabase
  async salvarEmpresa(dadosEmpresa) {
    try {
      // Verificar se empresa já existe
      const { data: empresaExistente } = await supabase
        .from('empresas')
        .select('id')
        .eq('cnpj', dadosEmpresa.cnpj)
        .single();

      if (empresaExistente) {
        // Atualizar empresa existente
        const { data, error } = await supabase
          .from('empresas')
          .update({
            razao_social: dadosEmpresa.razaoSocial,
            nome_fantasia: dadosEmpresa.nomeFantasia,
            cnae: dadosEmpresa.cnae,
            inscricao_estadual: dadosEmpresa.inscricaoEstadual,
            inscricao_municipal: dadosEmpresa.inscricaoMunicipal,
            responsavel: dadosEmpresa.responsavel,
            email: dadosEmpresa.email,
            telefone: dadosEmpresa.telefone,
            cep: dadosEmpresa.cep,
            logradouro: dadosEmpresa.logradouro,
            numero: dadosEmpresa.numero,
            complemento: dadosEmpresa.complemento,
            bairro: dadosEmpresa.bairro,
            cidade: dadosEmpresa.cidade,
            uf: dadosEmpresa.uf,
            logo_url: dadosEmpresa.logoUrl,
          })
          .eq('cnpj', dadosEmpresa.cnpj)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Criar nova empresa
        const { data, error } = await supabase
          .from('empresas')
          .insert([{
            cnpj: dadosEmpresa.cnpj,
            razao_social: dadosEmpresa.razaoSocial,
            nome_fantasia: dadosEmpresa.nomeFantasia,
            cnae: dadosEmpresa.cnae,
            inscricao_estadual: dadosEmpresa.inscricaoEstadual,
            inscricao_municipal: dadosEmpresa.inscricaoMunicipal,
            responsavel: dadosEmpresa.responsavel,
            email: dadosEmpresa.email,
            telefone: dadosEmpresa.telefone,
            cep: dadosEmpresa.cep,
            logradouro: dadosEmpresa.logradouro,
            numero: dadosEmpresa.numero,
            complemento: dadosEmpresa.complemento,
            bairro: dadosEmpresa.bairro,
            cidade: dadosEmpresa.cidade,
            uf: dadosEmpresa.uf,
            logo_url: dadosEmpresa.logoUrl,
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
      throw error;
    }
  },

  // Criar licença no Supabase
  async criarLicenca(empresaId, tipo = 'demo') {
    try {
      const chaveAtivacao = this.gerarChaveAtivacao(empresaId);
      
      const { data, error } = await supabase
        .from('licencas')
        .insert([{
          empresa_id: empresaId,
          chave_ativacao: chaveAtivacao,
          tipo: tipo,
          valor: tipo === 'mensal' ? 49.90 : tipo === 'anual' ? 499.00 : 0,
          status: tipo === 'demo' ? 'ativo' : 'pendente',
          data_expiracao: this.calcularExpiracao(tipo),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao criar licença:', error);
      throw error;
    }
  },

  // Calcular data de expiração
  calcularExpiracao(tipo) {
    const hoje = new Date();
    if (tipo === 'mensal') {
      hoje.setMonth(hoje.getMonth() + 1);
    } else if (tipo === 'anual') {
      hoje.setFullYear(hoje.getFullYear() + 1);
    } else if (tipo === 'demo') {
      hoje.setDate(hoje.getDate() + 15); // 15 dias para demo
    }
    return hoje.toISOString();
  },

  // Verificar licença pelo CNPJ
  async verificarLicencaPorCNPJ(cnpj) {
    try {
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('id, cnpj, razao_social, nome_fantasia, cnae, inscricao_estadual, inscricao_municipal, responsavel, email, telefone, cep, logradouro, numero, complemento, bairro, cidade, uf, logo_url')
        .eq('cnpj', cnpj)
        .single();

      if (empresaError || !empresa) {
        return null;
      }

      const { data: licencas, error: licencaError } = await supabase
        .from('licencas')
        .select('*')
        .eq('empresa_id', empresa.id)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
        .limit(1);

      if (licencaError || !licencas || licencas.length === 0) {
        return { empresa, licenca: null };
      }

      const licenca = licencas[0];
      const expiracao = new Date(licenca.data_expiracao);
      const agora = new Date();

      // Verificar se está expirada
      if (expiracao < agora) {
        await this.atualizarStatusLicenca(licenca.id, 'expirado');
        return { empresa, licenca: null };
      }

      return { empresa, licenca };
    } catch (error) {
      console.error('Erro ao verificar licença:', error);
      return null;
    }
  },

  // Verificar licença pela chave de ativação
  async verificarLicencaPorChave(chave) {
    try {
      const { data: licenca, error } = await supabase
        .from('licencas')
        .select(`
          *,
          empresas (
            id,
            cnpj,
            razao_social,
            nome_fantasia,
            cnae,
            inscricao_estadual,
            inscricao_municipal,
            responsavel,
            email,
            telefone,
            cep,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            uf,
            logo_url
          )
        `)
        .eq('chave_ativacao', chave)
        .eq('status', 'ativo')
        .single();

      if (error || !licenca) {
        return null;
      }

      const expiracao = new Date(licenca.data_expiracao);
      const agora = new Date();

      if (expiracao < agora) {
        await this.atualizarStatusLicenca(licenca.id, 'expirado');
        return null;
      }

      return {
        empresa: licenca.empresas,
        licenca: licenca,
      };
    } catch (error) {
      console.error('Erro ao verificar licença por chave:', error);
      return null;
    }
  },

  // Atualizar status da licença
  async atualizarStatusLicenca(licencaId, novoStatus) {
    try {
      const { error } = await supabase
        .from('licencas')
        .update({ status: novoStatus })
        .eq('id', licencaId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao atualizar status da licença:', error);
      return false;
    }
  },

  // Atualizar licença com ID do pagamento Asaas
  async vincularPagamentoAsaas(licencaId, pagamentoId) {
    try {
      const { error } = await supabase
        .from('licencas')
        .update({ asaas_payment_id: pagamentoId })
        .eq('id', licencaId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao vincular pagamento Asaas:', error);
      return false;
    }
  },

  // Ativar licença após pagamento confirmado
  async ativarLicencaAposPagamento(licencaId) {
    try {
      const { data: licenca, error: selectError } = await supabase
        .from('licencas')
        .select('tipo, data_expiracao')
        .eq('id', licencaId)
        .single();

      if (selectError) throw selectError;

      const novaExpiracao = this.calcularExpiracao(licenca.tipo);

      const { error } = await supabase
        .from('licencas')
        .update({
          status: 'ativo',
          data_ativacao: new Date().toISOString(),
          data_expiracao: novaExpiracao,
        })
        .eq('id', licencaId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao ativar licença:', error);
      return false;
    }
  },
};