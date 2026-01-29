import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { coraAPI, coraConfig } from '../../config/cora';
import { licencaService } from '../../services/licencaService';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Funções de formatação
const formatCNPJ = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const formatCEP = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

const formatIE = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})$/, '$1');
};

const formatTelefone = (value) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

export default function DadosEmpresaForm() {
  const [formData, setFormData] = useState({
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    cnae: '',
    inscricaoEstadual: '',
    inscricaoMunicipal: '',
    responsavel: '',
    email: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    status: 'pendente',
  });

  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  const [isActivated, setIsActivated] = useState(false);
  const [empresaId, setEmpresaId] = useState(null);
  const [licencaId, setLicencaId] = useState(null);
  const [pixData, setPixData] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('demo');

  // Carregar dados salvos
  useEffect(() => {
    const savedCNPJ = localStorage.getItem('empresaCNPJ');
    if (savedCNPJ) {
      verificarLicencaSalva(savedCNPJ);
    }
  }, []);

  const verificarLicencaSalva = async (cnpj) => {
    setLoading(true);
    try {
      const resultado = await licencaService.verificarLicencaPorCNPJ(cnpj);
      if (resultado?.licenca) {
        setIsActivated(true);
        setActiveStep(4);
        setEmpresaId(resultado.licenca.empresa_id);
        setLicencaId(resultado.licenca.id);
        
        const empresa = resultado.empresa;
        setFormData({
          cnpj: empresa.cnpj,
          razaoSocial: empresa.razao_social,
          nomeFantasia: empresa.nome_fantasia || '',
          cnae: empresa.cnae || '',
          inscricaoEstadual: empresa.inscricao_estadual || '',
          inscricaoMunicipal: empresa.inscricao_municipal || '',
          responsavel: empresa.responsavel,
          email: empresa.email,
          telefone: empresa.telefone || '',
          cep: empresa.cep || '',
          logradouro: empresa.logradouro || '',
          numero: empresa.numero || '',
          complemento: empresa.complemento || '',
          bairro: empresa.bairro || '',
          cidade: empresa.cidade || '',
          uf: empresa.uf || '',
          status: 'ativo',
        });
      }
    } catch (error) {
      console.error('Erro ao verificar licença:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cnpj') formattedValue = formatCNPJ(value);
    else if (name === 'cep') formattedValue = formatCEP(value);
    else if (name === 'inscricaoEstadual' || name === 'inscricaoMunicipal') formattedValue = formatIE(value);
    else if (name === 'telefone') formattedValue = formatTelefone(value);
    else if (name === 'uf') formattedValue = value.toUpperCase().slice(0, 2);

    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  // Consulta CNPJ automática
  useEffect(() => {
    const cnpjLimpo = formData.cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length === 14) {
      consultarCNPJ(cnpjLimpo);
    }
  }, [formData.cnpj]);

  const consultarCNPJ = async (cnpj) => {
    setLoading(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!response.ok) throw new Error('CNPJ não encontrado');
      const data = await response.json();

      setFormData(prev => ({
        ...prev,
        razaoSocial: data.razao_social || '',
        nomeFantasia: data.nome_fantasia || '',
        cnae: data.cnae_fiscal_descricao || '',
        inscricaoEstadual: data.inscricao_estadual || '',
        cep: data.cep?.replace(/\D/g, '') || '',
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        bairro: data.bairro || '',
        cidade: data.municipio || '',
        uf: data.uf || '',
      }));
    } catch (err) {
      console.error('Erro ao consultar CNPJ:', err);
      alert('CNPJ não encontrado. Preencha manualmente.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Imagem muito grande (máx 2MB)');
      e.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Apenas imagens (JPG/PNG/SVG)');
      e.target.value = '';
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const uploadLogo = async () => {
    if (!logoFile) return null;

    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${formData.cnpj.replace(/\D/g, '')}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos-empresas')
        .upload(filePath, logoFile, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('logos-empresas')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload da logo:', error);
      return null;
    }
  };

  const handleNextStep = () => {
    if (activeStep === 1) {
      const cnpjLimpo = formData.cnpj.replace(/\D/g, '');
      if (cnpjLimpo.length !== 14 || !formData.razaoSocial.trim()) {
        alert('Preencha CNPJ e Razão Social corretamente');
        return;
      }
    }

    if (activeStep === 2) {
      if (!formData.responsavel.trim() || !formData.email.trim()) {
        alert('Preencha Responsável e E-mail');
        return;
      }
    }

    setActiveStep(prev => prev + 1);
  };

  const handlePreviousStep = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSave = async () => {
    const cnpjLimpo = formData.cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14 || !formData.razaoSocial.trim() || !formData.responsavel.trim() || !formData.email.trim()) {
      alert('Preencha todos os campos obrigatórios corretamente');
      return;
    }

    setLoading(true);
    try {
      const logoUrl = await uploadLogo();
      const empresaData = { ...formData, logoUrl };
      const empresaSalva = await licencaService.salvarEmpresa(empresaData);
      
      setEmpresaId(empresaSalva.id);
      localStorage.setItem('empresaCNPJ', formData.cnpj);
      setActiveStep(3);
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      alert(`Erro ao salvar: ${error.message || 'Tente novamente'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGerarCobranca = async () => {
    if (!empresaId) {
      alert('Erro: Empresa não encontrada');
      return;
    }

    setLoading(true);
    try {
      const licenca = await licencaService.criarLicenca(empresaId, selectedPlan);
      setLicencaId(licenca.id);

      if (selectedPlan === 'demo') {
        await licencaService.ativarLicencaAposPagamento(licenca.id);
        setIsActivated(true);
        setActiveStep(4);
        return;
      }

      const { data: empresa } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', empresaId)
        .single();

      const pix = await coraAPI.criarCobrancaLicenca(empresa, selectedPlan, licenca.id);
      await licencaService.vincularPixCora(licenca.id, pix);
      setPixData(pix);
      setActiveStep(4);
    } catch (error) {
      console.error('Erro ao gerar cobrança:', error);
      alert(`❌ Erro: ${error.message || 'Não foi possível gerar o Pix. Tente novamente.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificarPagamento = async () => {
    if (!pixData?.id || !licencaId) return;

    setLoading(true);
    try {
      const pix = await coraAPI.buscarPix(pixData.id);
      
      if (['CONCLUIDA', 'RECEBIDA'].includes(pix.status)) {
        await licencaService.ativarLicencaAposPagamento(licencaId);
        setIsActivated(true);
        alert('✅ Pagamento confirmado! Sistema ativado com sucesso.');
      } else {
        alert(`⏳ Status: ${pix.status}\nAguarde a confirmação ou escaneie novamente o QR Code.`);
      }
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
      alert('Erro ao verificar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintCupom = () => {
    const printWindow = window.open('', '_blank');
    const empresa = formData;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cupom Fiscal - ${empresa.nomeFantasia || empresa.razaoSocial}</title>
        <style>
          * { margin: 0; padding: 0; font-family: 'Courier New', monospace; }
          body { padding: 20px; width: 300px; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .empresa-nome { font-size: 18px; font-weight: bold; margin: 5px 0; }
          .empresa-razao { font-size: 12px; }
          .empresa-info { font-size: 10px; line-height: 1.4; margin: 5px 0; }
          .separator { border-top: 1px dashed #000; margin: 10px 0; }
          .item { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; }
          .total { font-size: 16px; font-weight: bold; text-align: right; margin: 10px 0; }
          .footer { text-align: center; font-size: 10px; margin-top: 20px; border-top: 2px dashed #000; padding-top: 10px; }
          .ldt { background: #0047ab; color: white; padding: 8px; margin-top: 15px; border-radius: 4px; }
          .ldt-text { font-size: 9px; line-height: 1.3; }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoPreview ? `<img src="${logoPreview}" style="max-width: 200px; margin-bottom: 5px;">` : ''}
          <div class="empresa-nome">${empresa.nomeFantasia || empresa.razaoSocial}</div>
          <div class="empresa-razao">${empresa.razaoSocial}</div>
          <div class="empresa-info">
            CNPJ: ${empresa.cnpj}<br>
            ${empresa.inscricaoEstadual ? `IE: ${empresa.inscricaoEstadual}<br>` : ''}
            ${empresa.inscricaoMunicipal ? `IM: ${empresa.inscricaoMunicipal}<br>` : ''}
            ${empresa.cnae ? `CNAE: ${empresa.cnae}<br>` : ''}
            ${empresa.logradouro}, ${empresa.numero || 'S/N'} ${empresa.complemento ? `- ${empresa.complemento}` : ''}<br>
            ${empresa.bairro} - ${empresa.cidade} - ${empresa.uf}<br>
            ${empresa.telefone ? `Tel: ${empresa.telefone}<br>` : ''}
            ${empresa.email ? `Email: ${empresa.email}<br>` : ''}
            Responsável: ${empresa.responsavel}
          </div>
        </div>

        <div class="separator"></div>

        <div class="item">
          <span>Data: ${new Date().toLocaleDateString('pt-BR')}</span>
          <span>Hora: ${new Date().toLocaleTimeString('pt-BR')}</span>
        </div>

        <div class="separator"></div>

        <div class="item">
          <span>ITEM TESTE</span>
          <span>R$ 0,00</span>
        </div>

        <div class="separator"></div>

        <div class="total">TOTAL: R$ 0,00</div>

        <div class="footer">
          <p>Obrigado pela preferência!</p>
          <p>${empresa.nomeFantasia || empresa.razaoSocial}</p>
          
          <div class="ldt">
            <div class="ldt-text">
              <strong>----------</strong><br>
              Software PDV desenvolvido por:<br>
              <strong>LDT NET TELECOM</strong><br>
              Soluções em TI e Automação<br>
              CNPJ: 06.270.840/0001-50<br>
              (84) 99624-3201<br>
              www.ldtnet.com.br<br>
              <strong>----------</strong>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-md p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
          <span>Configuração da Empresa</span>
          {coraConfig.isSandbox && (
            <span className="ml-3 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
              AMBIENTE DE TESTES (SANDBOX)
            </span>
          )}
        </h1>
        <p className="text-gray-600">
          {isActivated 
            ? '✅ Sistema ativado - Versão Completa' 
            : 'Configure seus dados para ativar o sistema PDV LDT NET'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2 text-sm font-medium">
          {[1, 2, 3, 4].map(step => (
            <span key={step} className={`flex flex-col items-center ${
              activeStep >= step ? 'text-blue-600' : 'text-gray-400'
            }`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                activeStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                {step}
              </span>
              <span className="mt-1 hidden md:block">
                {step === 1 ? 'Dados' : step === 2 ? 'Contato' : step === 3 ? 'Plano' : 'Pix'}
              </span>
            </span>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(activeStep / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Dados Básicos */}
      {activeStep === 1 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Dados Básicos da Empresa</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700 mb-1">
                CNPJ *
              </label>
              <input
                id="cnpj"
                type="tel"
                name="cnpj"
                value={formData.cnpj}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="00.000.000/0000-00"
                required
              />
              {loading && (
                <span className="text-blue-600 text-sm mt-1 inline-block animate-pulse">
                  Consultando Receita Federal...
                </span>
              )}
            </div>

            <div>
              <label htmlFor="razaoSocial" className="block text-sm font-medium text-gray-700 mb-1">
                Razão Social *
              </label>
              <input
                id="razaoSocial"
                type="text"
                name="razaoSocial"
                value={formData.razaoSocial}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="nomeFantasia" className="block text-sm font-medium text-gray-700 mb-1">
                Nome Fantasia
              </label>
              <input
                id="nomeFantasia"
                type="text"
                name="nomeFantasia"
                value={formData.nomeFantasia}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="cnae" className="block text-sm font-medium text-gray-700 mb-1">
                CNAE Principal
              </label>
              <input
                id="cnae"
                type="text"
                name="cnae"
                value={formData.cnae}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 47.12-1-00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="inscricaoEstadual" className="block text-sm font-medium text-gray-700 mb-1">
                Inscrição Estadual
              </label>
              <input
                id="inscricaoEstadual"
                type="text"
                name="inscricaoEstadual"
                value={formData.inscricaoEstadual}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="000.000.000.000"
              />
            </div>

            <div>
              <label htmlFor="inscricaoMunicipal" className="block text-sm font-medium text-gray-700 mb-1">
                Inscrição Municipal
              </label>
              <input
                id="inscricaoMunicipal"
                type="text"
                name="inscricaoMunicipal"
                value={formData.inscricaoMunicipal}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="000.000.000"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              onClick={handleNextStep}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Consultando...
                </span>
              ) : (
                'Próximo →'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Endereço e Contato */}
      {activeStep === 2 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Endereço e Contato</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div>
              <label htmlFor="cep" className="block text-sm font-medium text-gray-700 mb-1">
                CEP
              </label>
              <input
                id="cep"
                type="tel"
                name="cep"
                value={formData.cep}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="00000-000"
                maxLength={9}
              />
            </div>

            <div className="md:col-span-3">
              <label htmlFor="logradouro" className="block text-sm font-medium text-gray-700 mb-1">
                Logradouro
              </label>
              <input
                id="logradouro"
                type="text"
                name="logradouro"
                value={formData.logradouro}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div>
              <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-1">
                Número
              </label>
              <input
                id="numero"
                type="text"
                name="numero"
                value={formData.numero}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="complemento" className="block text-sm font-medium text-gray-700 mb-1">
                Complemento
              </label>
              <input
                id="complemento"
                type="text"
                name="complemento"
                value={formData.complemento}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="bairro" className="block text-sm font-medium text-gray-700 mb-1">
                Bairro
              </label>
              <input
                id="bairro"
                type="text"
                name="bairro"
                value={formData.bairro}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="uf" className="block text-sm font-medium text-gray-700 mb-1">
                UF
              </label>
              <input
                id="uf"
                type="text"
                name="uf"
                value={formData.uf}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="RN"
                maxLength={2}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="cidade" className="block text-sm font-medium text-gray-700 mb-1">
                Cidade
              </label>
              <input
                id="cidade"
                type="text"
                name="cidade"
                value={formData.cidade}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="border-t pt-6 mt-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Informações para Contato</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="responsavel" className="block text-sm font-medium text-gray-700 mb-1">
                  Responsável *
                </label>
                <input
                  id="responsavel"
                  type="text"
                  name="responsavel"
                  value={formData.responsavel}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome completo"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail *
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="contato@empresa.com.br"
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              <input
                id="telefone"
                type="tel"
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(84) 99999-9999"
              />
            </div>
          </div>

          <div className="flex justify-between gap-4 pt-4">
            <button
              onClick={handlePreviousStep}
              className="px-8 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              ← Voltar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Dados'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Escolha do Plano */}
      {activeStep === 3 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Escolha seu Plano</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Plano Demo */}
            <div
              onClick={() => setSelectedPlan('demo')}
              className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                selectedPlan === 'demo'
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <h3 className="text-xl font-bold text-gray-800 mb-2">Demo</h3>
              <p className="text-4xl font-bold text-blue-600 mb-2">Gratuito</p>
              <p className="text-sm text-gray-600 mb-4">15 dias • Sem cartão</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  <span>PDV Completo</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  <span>Estoque Básico</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  <span>Relatórios</span>
                </li>
                <li className="flex items-start text-gray-400">
                  <span className="mr-2 mt-0.5">✗</span>
                  <span className="line-through">Sem marca d'água</span>
                </li>
              </ul>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPlan('demo');
                }}
                className={`w-full py-2 rounded-lg transition ${
                  selectedPlan === 'demo'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Selecionar Demo
              </button>
            </div>

            {/* Plano Mensal */}
            <div
              onClick={() => setSelectedPlan('mensal')}
              className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                selectedPlan === 'mensal'
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <div className="flex justify-end">
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                  + Popular
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Mensal</h3>
              <p className="text-4xl font-bold text-blue-600 mb-2">
                R$ 49,90
                <span className="text-lg font-normal text-gray-600">/mês</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">Cancelamento imediato</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  <span>Todas funcionalidades</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  <span>Estoque Avançado</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  <span>Sem marca d'água</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  <span>Suporte prioritário</span>
                </li>
              </ul>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPlan('mensal');
                }}
                className={`w-full py-2 rounded-lg transition ${
                  selectedPlan === 'mensal'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Assinar Mensal
              </button>
            </div>

            {/* Plano Anual */}
            <div
              onClick={() => setSelectedPlan('anual')}
              className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                selectedPlan === 'anual'
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <div className="flex justify-end">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                  -17% OFF
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Anual</h3>
              <p className="text-4xl font-bold text-blue-600 mb-2">
                R$ 499,00
                <span className="text-lg font-normal text-gray-600">/ano</span>
              </p>
              <p className="text-sm text-gray-600 mb-2">Melhor custo-benefício</p>
              <p className="text-xs bg-green-50 text-green-800 px-3 py-1 rounded inline-block mb-4">
                Economize R$ 99,80/ano
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  <span>Todas funcionalidades</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  <span>Estoque Avançado</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  <span>Sem marca d'água</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  <span>Suporte prioritário</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  <span>Atualizações ilimitadas</span>
                </li>
              </ul>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPlan('anual');
                }}
                className={`w-full py-2 rounded-lg transition ${
                  selectedPlan === 'anual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Assinar Anual
              </button>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mt-6">
            <div className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3 text-sm text-blue-800">
                <p className="font-medium">Pagamento 100% seguro via Pix</p>
                <p>Seu sistema será ativado automaticamente após confirmação do pagamento (instantâneo).</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              onClick={handleGerarCobranca}
              disabled={loading}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Gerando Pix...
                </span>
              ) : (
                'Continuar para Pagamento →'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Pagamento com Pix */}
      {activeStep === 4 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <span>{isActivated ? '✅ Sistema Ativado' : '📱 Pague com Pix'}</span>
            {coraConfig.isSandbox && (
              <span className="ml-3 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
                TESTE - Use Pix de teste da Cora
              </span>
            )}
          </h2>

          {!isActivated ? (
            selectedPlan === 'demo' ? (
              <div className="bg-green-50 p-6 rounded-xl border border-green-200 text-center">
                <div className="inline-block bg-green-100 text-green-800 rounded-full p-3 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-green-800 mb-2">Licença Demo Ativada!</h3>
                <p className="text-green-700 mb-4">
                  Você tem <strong>15 dias grátis</strong> para testar todas as funcionalidades.<br />
                  Após o período, escolha um plano para continuar usando o sistema.
                </p>
                <button
                  onClick={() => {
                    setIsActivated(true);
                    setActiveStep(5);
                  }}
                  className="mt-4 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Acessar Sistema PDV
                </button>
                <p className="text-xs text-green-600 mt-4">
                  * A versão demo inclui marca d'água "DEMO - LDT NET" nos cupons
                </p>
              </div>
            ) : pixData ? (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-blue-100 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="bg-blue-100 text-blue-800 font-bold text-sm px-3 py-1 rounded-full">
                      Escaneie com seu app bancário
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    {pixData.qrCodeImage ? (
                      <div className="inline-block p-4 bg-white border rounded-lg">
                        <img 
                          src={pixData.qrCodeImage} 
                          alt="QR Code Pix" 
                          className="w-56 h-56"
                        />
                      </div>
                    ) : (
                      <div className="bg-gray-100 border-2 border-dashed rounded-lg p-12 text-gray-500">
                        QR Code não carregou
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Valor a pagar</p>
                    <p className="text-3xl font-bold text-green-600">
                      R$ {pixData.valor.toFixed(2)}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg text-left">
                    <p className="text-xs font-medium text-gray-600 mb-2">Para pagar:</p>
                    <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
                      <li>Abra seu app bancário</li>
                      <li>Escaneie o QR Code acima</li>
                      <li>Confirme o pagamento de R$ {pixData.valor.toFixed(2)}</li>
                      <li>Seu sistema será ativado automaticamente</li>
                    </ol>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium text-gray-800">Código Pix Copia e Cola</h4>
                    <button
                      onClick={() => navigator.clipboard.writeText(pixData.qrCode)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copiar
                    </button>
                  </div>
                  <div className="bg-white p-3 rounded font-mono text-xs break-all border border-gray-200">
                    {pixData.qrCode}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleVerificarPagamento}
                    disabled={loading}
                    className="flex-1 px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition disabled:opacity-50 flex justify-center items-center"
                  >
                    {loading ? (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    {loading ? 'Verificando...' : 'Verificar Pagamento'}
                  </button>
                  
                  <button
                    onClick={() => setActiveStep(3)}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                  >
                    ← Escolher outro plano
                  </button>
                </div>

                <div className="text-center text-xs text-gray-500 p-4 bg-blue-50 rounded-lg">
                  <p className="font-medium text-blue-800 mb-1">Pagamento 100% seguro</p>
                  <p>O pagamento é processado diretamente pela Cora (banco digital regulado pelo Banco Central)</p>
                  <p className="mt-1">Recebido por: LDT NET TELECOM - CNPJ: 06.270.840/0001-50</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Gerando QR Code Pix...</p>
              </div>
            )
          ) : (
            <div className="bg-green-50 rounded-xl p-8 text-center">
              <div className="inline-block bg-green-600 text-white rounded-full p-4 mb-6 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="white">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h3 className="text-3xl font-bold text-green-800 mb-2">Sistema Ativado com Sucesso!</h3>
              <p className="text-xl text-gray-700 mb-6">
                Versão {selectedPlan === 'mensal' ? 'Mensal' : selectedPlan === 'anual' ? 'Anual' : 'Demo'} ativada
              </p>
              
              <div className="max-w-md mx-auto bg-white rounded-lg p-6 shadow">
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div>
                    <p className="text-sm text-gray-600">Plano</p>
                    <p className="font-semibold">{selectedPlan === 'mensal' ? 'Mensal' : selectedPlan === 'anual' ? 'Anual' : 'Demo (15 dias)'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Valor</p>
                    <p className="font-semibold text-green-600">
                      {selectedPlan === 'mensal' ? 'R$ 49,90/mês' : selectedPlan === 'anual' ? 'R$ 499,00/ano' : 'Gratuito'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Ativado em</p>
                    <p className="font-semibold">{new Date().toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handlePrintCupom}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir Cupom de Teste
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21v-1.5M14 21v-1.5m4-15v7.5m0 0a3 3 0 01-3 3H5a3 3 0 01-3-3V6a3 3 0 013-3h6a3 3 0 013 3z" />
                  </svg>
                  Acessar PDV
                </button>
              </div>

              <div className="mt-8 p-4 bg-white rounded-lg border border-dashed">
                <p className="text-sm font-medium text-gray-700 mb-2">📝 Seus dados no cupom fiscal:</p>
                <p className="text-xs text-gray-600">
                  CNPJ, IE, IM, CNAE, endereço completo, contato e responsável aparecerão no topo do cupom.<br />
                  Na parte inferior, sempre será exibida a divulgação da LDT NET TELECOM como desenvolvedora.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}