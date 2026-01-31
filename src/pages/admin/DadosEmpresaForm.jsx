import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { coraAPI, coraConfig } from '../../config/cora';
import { licencaService } from '../../services/licencaService';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Funções de formatação (mantidas iguais)
const formatCNPJ = (value) => value
  .replace(/\D/g, '')
  .replace(/(\d{2})(\d)/, '$1.$2')
  .replace(/(\d{3})(\d)/, '$1.$2')
  .replace(/(\d{3})(\d)/, '$1/$2')
  .replace(/(\d{4})(\d)/, '$1-$2')
  .replace(/(-\d{2})\d+?$/, '$1');

const formatCEP = (value) => value
  .replace(/\D/g, '')
  .replace(/(\d{5})(\d)/, '$1-$2')
  .replace(/(-\d{3})\d+?$/, '$1');

const formatIE = (value) => value
  .replace(/\D/g, '')
  .replace(/(\d{3})(\d)/, '$1.$2')
  .replace(/(\d{3})(\d)/, '$1.$2')
  .replace(/(\d{3})(\d)/, '$1.$2')
  .replace(/(\d{3})$/, '$1');

const formatTelefone = (value) => {
  const cleaned = value.replace(/\D/g, '');
  return cleaned.length <= 10
    ? cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    : cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
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
        setActiveStep(5); // pula direto para tela de ativado
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

  // Consulta CNPJ automática (mantida)
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
        alert('Preencha CNPJ válido e Razão Social');
        return;
      }
    }

    if (activeStep === 2) {
      if (!formData.responsavel.trim() || !formData.email.trim()) {
        alert('Responsável e E-mail são obrigatórios');
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
      alert('Preencha todos os campos obrigatórios');
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
      alert('Erro: Empresa não encontrada. Salve os dados primeiro.');
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
        alert(`⏳ Status atual: ${pix.status}\n\nAguarde a confirmação ou tente verificar novamente.`);
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
          body { padding: 20px; width: 300px; margin: 0 auto; }
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
              Soluções em TI e Automação Comercial<br>
              CNPJ: 06.270.840/0001-50<br>
              (84) 99624-3201<br>
              www.ldtnet.com.br<br>
              ldtnettelecom@gmail.com<br>
              <strong>----------</strong>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-md p-6 relative">
      {/* BOTÃO APP – FIXO NO TOPO DIREITO */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => window.location.href = '/#/login'}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow transition duration-200 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          APP → Entrar no Sistema
        </button>
      </div>

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

          {/* ... seu código do Step 1 continua igual ... */}

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
          {/* ... seu código do Step 2 continua igual ... */}

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
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600 shadow-lg'
                  : 'border-gray-300 hover:border-blue-400 hover:shadow'
              }`}
            >
              <h3 className="text-xl font-bold text-gray-800 mb-2">Demo</h3>
              <p className="text-4xl font-bold text-blue-600 mb-2">Gratuito</p>
              <p className="text-sm text-gray-600 mb-4">15 dias de teste completo</p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  PDV Completo
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  Estoque Básico
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  Relatórios
                </li>
                <li className="flex items-start text-gray-500">
                  <span className="mr-2 mt-0.5">✗</span>
                  <span className="line-through">Sem marca d'água</span>
                </li>
              </ul>
              <button
                className={`w-full py-3 rounded-lg font-medium transition ${
                  selectedPlan === 'demo'
                    ? 'bg-blue-600 text-white shadow-md'
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
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600 shadow-lg'
                  : 'border-gray-300 hover:border-blue-400 hover:shadow'
              }`}
            >
              <div className="flex justify-end mb-2">
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">
                  + Popular
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Mensal</h3>
              <p className="text-4xl font-bold text-blue-600 mb-2">
                R$ 89,90<span className="text-lg font-normal text-gray-600">/mês</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">Cancelamento a qualquer momento</p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  Todas funcionalidades
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  Estoque Avançado
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  Sem marca d'água
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  Suporte prioritário
                </li>
              </ul>
              <button
                className={`w-full py-3 rounded-lg font-medium transition ${
                  selectedPlan === 'mensal'
                    ? 'bg-blue-600 text-white shadow-md'
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
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600 shadow-lg'
                  : 'border-gray-300 hover:border-blue-400 hover:shadow'
              }`}
            >
              <div className="flex justify-end mb-2">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                  -17% OFF
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Anual</h3>
              <p className="text-4xl font-bold text-blue-600 mb-2">
                R$ 799,00<span className="text-lg font-normal text-gray-600">/ano</span>
              </p>
              <p className="text-sm text-gray-600 mb-2">Melhor custo-benefício</p>
              <p className="text-xs bg-green-50 text-green-800 px-3 py-1 rounded inline-block mb-4">
                Economize R$ 278,80 no ano
              </p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  Todas funcionalidades
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  Estoque Avançado
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  Sem marca d'água
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  Suporte prioritário
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 mt-0.5">✓</span>
                  Atualizações ilimitadas
                </li>
              </ul>
              <button
                className={`w-full py-3 rounded-lg font-medium transition ${
                  selectedPlan === 'anual'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Assinar Anual
              </button>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mt-6 text-center">
            <p className="text-blue-800 font-medium">
              Pagamento 100% seguro via Pix Cora • Ativação automática após confirmação
            </p>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              onClick={handlePreviousStep}
              className="px-8 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              ← Voltar
            </button>
            <button
              onClick={handleGerarCobranca}
              disabled={loading}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Gerando Pix...
                </>
              ) : (
                'Gerar Pix e Continuar →'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Pagamento com Pix */}
      {activeStep === 4 && (
        <div className="space-y-6 text-center">
          {isActivated ? (
            <div className="bg-green-50 rounded-xl p-10">
              <div className="inline-block bg-green-600 text-white rounded-full p-5 mb-6">
                <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-green-800 mb-4">Sistema Ativado com Sucesso!</h2>
              <p className="text-xl text-gray-700 mb-6">
                Plano {selectedPlan === 'mensal' ? 'Mensal' : selectedPlan === 'anual' ? 'Anual' : 'Demo'} liberado
              </p>

              <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow border mb-8">
                <div className="grid grid-cols-2 gap-4 text-left text-sm">
                  <div>
                    <p className="text-gray-600">Plano</p>
                    <p className="font-bold">{selectedPlan === 'mensal' ? 'Mensal' : selectedPlan === 'anual' ? 'Anual' : 'Demo (15 dias)'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Valor</p>
                    <p className="font-bold text-green-600">
                      {selectedPlan === 'mensal' ? 'R$ 89,90/mês' : selectedPlan === 'anual' ? 'R$ 799,00/ano' : 'Gratuito'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600">Ativado em</p>
                    <p className="font-bold">{new Date().toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handlePrintCupom}
                  className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center justify-center shadow-md text-lg font-medium"
                >
                  🖨️ Imprimir Cupom de Teste
                </button>
                <button
                  onClick={() => window.location.href = '/#/login'}
                  className="px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center justify-center shadow-md text-lg font-medium"
                >
                  Acessar o PDV Agora →
                </button>
              </div>

              <div className="mt-10 p-6 bg-white rounded-xl border border-dashed text-sm">
                <p className="font-medium text-gray-700 mb-3">📝 Seus dados no cupom fiscal:</p>
                <p className="text-gray-600">
                  CNPJ, Inscrição Estadual/Municipal, CNAE, endereço completo, telefone, e-mail e nome do responsável aparecerão automaticamente no topo de todos os cupons fiscais emitidos.<br /><br />
                  <strong>Na parte inferior de cada cupom sempre será exibida a divulgação obrigatória:</strong><br />
                  "Software PDV desenvolvido por LDT NET TELECOM – CNPJ 06.270.840/0001-50"
                </p>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Pague com Pix</h2>
              <p className="text-gray-600 mb-8">Escaneie o QR Code abaixo com seu aplicativo bancário</p>

              {pixData ? (
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md mx-auto">
                  <div className="flex justify-center mb-6">
                    <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
                      Pronto para pagar
                    </div>
                  </div>

                  {pixData.qrCodeImage ? (
                    <div className="mb-8 flex justify-center">
                      <img
                        src={pixData.qrCodeImage}
                        alt="QR Code Pix"
                        className="w-64 h-64 object-contain border-4 border-blue-500 rounded-xl shadow"
                      />
                    </div>
                  ) : (
                    <div className="bg-gray-100 border-4 border-dashed rounded-xl p-16 text-center text-gray-500 mb-8">
                      QR Code não carregou – tente atualizar
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <p className="text-lg font-medium text-gray-600">Valor a pagar</p>
                    <p className="text-4xl font-bold text-green-600">
                      R$ {pixData.valor?.toFixed(2) || '89,90'}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-5 rounded-lg mb-6 text-left text-sm">
                    <p className="font-medium text-gray-700 mb-3">Como pagar:</p>
                    <ol className="list-decimal list-inside space-y-2 text-gray-600">
                      <li>Abra o app do seu banco</li>
                      <li>Escolha a opção Pix → Ler QR Code</li>
                      <li>Escaneie o código acima</li>
                      <li>Confirme o valor de R$ {pixData.valor?.toFixed(2)}</li>
                      <li>O sistema será ativado automaticamente em segundos</li>
                    </ol>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700">Copia e Cola:</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(pixData.qrCode);
                          alert('Código copiado!');
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                      >
                        Copiar
                      </button>
                    </div>
                    <div className="bg-white p-3 rounded border font-mono text-xs break-all">
                      {pixData.qrCode || 'Código não disponível'}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleVerificarPagamento}
                      disabled={loading}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 font-medium flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Verificando...
                        </>
                      ) : (
                        'Verificar Pagamento Agora'
                      )}
                    </button>

                    <button
                      onClick={() => setActiveStep(3)}
                      className="flex-1 py-4 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition font-medium"
                    >
                      ← Escolher outro plano
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
                  <p className="text-xl text-gray-600">Gerando cobrança Pix...</p>
                  <p className="text-sm text-gray-500 mt-2">Isso leva apenas alguns segundos</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}