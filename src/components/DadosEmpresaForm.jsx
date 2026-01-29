// src/components/DadosEmpresaForm.jsx
import { useState, useEffect } from 'react';

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
    .replace(/(-\d{3})\d+$/, '$1');
};

export default function DadosEmpresaForm() {
  const [formData, setFormData] = useState({
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
  });

  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cnpj') {
      formattedValue = formatCNPJ(value);
    } else if (name === 'cep') {
      formattedValue = formatCEP(value);
    } else if (name === 'uf') {
      formattedValue = value.toUpperCase().slice(0, 2);
      if (formattedValue.length > 2) formattedValue = formattedValue.slice(0, 2);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));
  };

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

  const handleSubmit = (e) => {
    e.preventDefault();
    const cnpjLimpo = formData.cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      alert('CNPJ inválido. Preencha corretamente.');
      return;
    }
    console.log('Dados enviados:', formData);
    alert('✅ Dados salvos com sucesso!');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dados da Empresa</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Dados Básicos */}
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
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="00.000.000/0000-00"
              required
              aria-required="true"
            />
            {loading && (
              <span className="text-blue-600 text-sm mt-1 inline-block">
                Consultando dados da Receita Federal...
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
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              aria-required="true"
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
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Endereço */}
        <div className="border-t border-gray-200 pt-5 mt-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Endereço</h3>

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
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

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
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="SP"
                maxLength={2}
                aria-label="Unidade Federativa (2 letras)"
              />
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="border-t border-gray-200 pt-5 mt-5">
          <label htmlFor="logo-upload" className="block text-sm font-medium text-gray-700 mb-1">
            Logotipo
          </label>
          <div className="flex items-center gap-6">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Preview da logo"
                className="h-20 w-20 object-contain border-2 border-gray-200 rounded p-2 bg-white"
              />
            ) : (
              <div className="h-20 w-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                <span className="text-xs font-medium">Sem logo</span>
              </div>
            )}
            <label
              htmlFor="logo-upload"
              className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Selecionar imagem
            </label>
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleLogo}
              className="hidden"
              aria-label="Upload de logotipo da empresa"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Formatos: JPG, PNG, SVG (máx 2MB)</p>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-4 pt-5 border-t border-gray-200 mt-5">
          <button
            type="button"
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}