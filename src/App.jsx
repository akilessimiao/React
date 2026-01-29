import { useState, useEffect } from 'react';

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
    // Dados básicos
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    cnae: '',
    inscricaoEstadual: '',
    inscricaoMunicipal: '',
    responsavel: '',
    email: '',
    telefone: '',
    // Endereço
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    // Status
    status: 'pendente',
  });

  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  const [activationKey, setActivationKey] = useState('');
  const [isActivated, setIsActivated] = useState(false);

  // Carregar dados salvos ao montar
  useEffect(() => {
    const saved = localStorage.getItem('empresaData');
    if (saved) {
      const data = JSON.parse(saved);
      setFormData(data);
      if (data.status === 'ativo') {
        setIsActivated(true);
        setActiveStep(3);
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cnpj') {
      formattedValue = formatCNPJ(value);
    } else if (name === 'cep') {
      formattedValue = formatCEP(value);
    } else if (name === 'inscricaoEstadual' || name === 'inscricaoMunicipal') {
      formattedValue = formatIE(value);
    } else if (name === 'telefone') {
      formattedValue = formatTelefone(value);
    } else if (name === 'uf') {
      formattedValue = value.toUpperCase().slice(0, 2);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));
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

      setFormData((prev) => ({
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
      alert('CNPJ não encontrado ou erro na consulta. Preencha manualmente.');
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

    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleNextStep = () => {
    if (activeStep === 1) {
      const cnpjLimpo = formData.cnpj.replace(/\D/g, '');
      if (cnpjLimpo.length !== 14) {
        alert('Por favor, preencha um CNPJ válido');
        return;
      }
      if (!formData.razaoSocial.trim()) {
        alert('Razão Social é obrigatória');
        return;
      }
    }

    if (activeStep === 2) {
      if (!formData.responsavel.trim()) {
        alert('Nome do responsável é obrigatório');
        return;
      }
      if (!formData.email.trim()) {
        alert('E-mail é obrigatório');
        return;
      }
    }

    setActiveStep(activeStep + 1);
  };

  const handlePreviousStep = () => {
    setActiveStep(activeStep - 1);
  };

  const handleSave = () => {
    const cnpjLimpo = formData.cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      alert('CNPJ inválido');
      return;
    }

    if (!formData.razaoSocial.trim() || !formData.responsavel.trim() || !formData.email.trim()) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    // Salvar no localStorage
    localStorage.setItem('empresaData', JSON.stringify(formData));
    alert('✅ Dados salvos com sucesso! Agora gere sua chave de ativação.');
    setActiveStep(3);
  };

  const handleActivate = () => {
    if (!activationKey.trim()) {
      alert('Digite a chave de ativação');
      return;
    }

    // Chave de demonstração (substitua pela sua lógica real)
    const demoKey = 'LDT-DEMO-2024';
    const fullKey = `LDT-NET-${formData.cnpj.replace(/\D/g, '').slice(0, 8)}`;

    if (activationKey === demoKey || activationKey === fullKey) {
      const activatedData = {
        ...formData,
        status: 'ativo',
        activatedAt: new Date().toISOString(),
        activationKey: activationKey,
      };
      localStorage.setItem('empresaData', JSON.stringify(activatedData));
      setIsActivated(true);
      alert('🎉 Sistema ativado com sucesso! Versão completa liberada.');
    } else {
      alert('❌ Chave de ativação inválida. Verifique e tente novamente.');
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
          .ldt { background: #0047ab; color: white; padding: 8px; margin-top: 15px; }
          .ldt-text { font-size: 9px; }
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
            ${empresa.logradouro}, ${empresa.numero} - ${empresa.bairro}<br>
            ${empresa.cidade} - ${empresa.uf}<br>
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
              CNPJ: 12.345.678/0001-90<br>
              (84) 99999-9999<br>
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Cadastro da Empresa</h1>
        <p className="text-gray-600">
          {isActivated ? '✅ Sistema ativado - Versão Completa' : '📝 Configure seus dados para ativar o sistema'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className={`font-medium ${activeStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            1. Dados Básicos
          </span>
          <span className={`font-medium ${activeStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            2. Contato
          </span>
          <span className={`font-medium ${activeStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            3. Ativação
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${(activeStep / 3) * 100}%` }}
          ></div>
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
                <span className="text-blue-600 text-sm mt-1 inline-block">
                  Consultando dados da Receita...
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
                placeholder="Ex: 47.12-1-00 - Comércio varejista"
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
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Próximo →
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
                placeholder="SP"
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
                  Responsável pela Empresa *
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
                  E-mail para Contato *
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
                Telefone para Contato
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
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Salvar Dados
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Ativação */}
      {activeStep === 3 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            {isActivated ? '✅ Sistema Ativado' : '🔑 Ativação do Sistema'}
          </h2>

          {!isActivated ? (
            <div className="bg-blue-50 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Dados da Empresa</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Razão Social:</strong> {formData.razaoSocial}</p>
                  <p><strong>CNPJ:</strong> {formData.cnpj}</p>
                  <p><strong>Responsável:</strong> {formData.responsavel}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chave de Ativação
                </label>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={activationKey}
                    onChange={(e) => setActivationKey(e.target.value.toUpperCase())}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg"
                    placeholder="Digite sua chave de ativação"
                  />

                  <div className="bg-white p-4 rounded-lg border border-dashed">
                    <p className="text-sm font-medium text-gray-700 mb-2">Chave de Demonstração:</p>
                    <p className="font-mono text-lg bg-gray-100 p-2 rounded text-center">
                      LDT-DEMO-2024
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Use esta chave para testar a versão demo com marca d'água
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-dashed">
                    <p className="text-sm font-medium text-gray-700 mb-2">Chave Completa:</p>
                    <p className="font-mono text-lg bg-gray-100 p-2 rounded text-center">
                      LDT-NET-{formData.cnpj.replace(/\D/g, '').slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Chave única gerada para sua empresa (versão completa sem restrições)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  onClick={handleActivate}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Ativar Sistema
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 rounded-lg p-6 space-y-4">
              <div className="text-center">
                <div className="inline-block bg-green-600 text-white rounded-full p-4 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-green-800 mb-2">Sistema Ativado com Sucesso!</h3>
                <p className="text-gray-600">Versão completa liberada - Sem marca d'água</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm font-medium text-gray-700 mb-2">Chave de Ativação:</p>
                  <p className="font-mono bg-gray-100 p-2 rounded">{formData.activationKey}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm font-medium text-gray-700 mb-2">Data de Ativação:</p>
                  <p className="font-mono bg-gray-100 p-2 rounded">
                    {new Date(formData.activatedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex justify-center gap-4 pt-4">
                <button
                  onClick={handlePrintCupom}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  🖨️ Imprimir Cupom de Teste
                </button>
              </div>

              <div className="bg-white p-4 rounded-lg border border-dashed">
                <p className="text-sm font-medium text-gray-700 mb-2">📝 Cupom Fiscal:</p>
                <p className="text-xs text-gray-600">
                  Seus dados da empresa (CNPJ, IE, IM, CNAE, endereço, contato) serão impressos no cupom fiscal,
                  seguidos pela divulgação da LDT NET TELECOM como desenvolvedora do sistema.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}