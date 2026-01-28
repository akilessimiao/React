import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ShoppingCart, Package, Users, LogOut, Trash2, Edit, ScanBarcode, X, Menu, FileText, LifeBuoy } from 'lucide-react';
import { PieChart, Pie, Tooltip, Legend, Cell } from 'recharts';
import { Html5QrcodeScanner } from 'html5-qrcode';
import './App.css';

const SUPABASE_URL = 'https://sjfxbaxgrvbjyglldstc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_eZYYQAPp_yj_ufkeWOXQoA_56GBqYAa';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GTIN_TOKEN = 's6cPw0Ar3M9NLYHZrdWQUg';
const GTIN_API_URL = 'https://gtin.rscsistemas.com.br/api/gtin/infor/';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF6384', '#36A2EB', '#FFCE56'];

export default function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [role, setRole] = useState('user');
  const [operatorName, setOperatorName] = useState('OPERADOR DESCONHECIDO');
  const [activeTab, setActiveTab] = useState('pdv');
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showZapModal, setShowZapModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [zapDados, setZapDados] = useState({ nome: '', telefone: '' });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [novoProduto, setNovoProduto] = useState({
    codigo: '',
    nome: '',
    preco: '',
    preco_custo: '',
    quantidade_estoque: '',
    fornecedor: ''
  });
  const [editandoProduto, setEditandoProduto] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [eanConsulta, setEanConsulta] = useState('');

  // Carregar dados do Supabase
  const carregarDados = async () => {
    const { data: pts } = await supabase.from('produtos').select('*').order('nome');
    const { data: cls } = await supabase.from('clientes').select('*').order('nome');
    const { data: vds } = await supabase.from('vendas').select('*').order('created_at', { ascending: false });
    if (pts) setProdutos(pts);
    if (cls) setClientes(cls);
    if (vds) setVendas(vds);
  };

  useEffect(() => {
    if (isLogged) carregarDados();
  }, [isLogged]);

  // Login
  const handleLogin = (e) => {
    e.preventDefault();
    let nomeOperador = 'OPERADOR DESCONHECIDO';

    if (loginEmail === '123@123.com' && loginPass === '123') {
      setRole('admin');
      nomeOperador = 'ADMIN PRINCIPAL';
    } else if (loginEmail && loginPass) {
      setRole('user');
      nomeOperador = loginEmail.split('@')[0].toUpperCase();
    } else {
      alert('Credenciais inválidas');
      return;
    }

    setOperatorName(nomeOperador);
    setIsLogged(true);
  };

  // Consulta EAN/GTIN automática
  const consultarEAN = async (ean) => {
    if (!ean || ean.length < 8) {
      alert('Digite um EAN/GTIN válido (mínimo 8 dígitos)');
      return;
    }

    try {
      const response = await fetch(`${GTIN_API_URL}${ean}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${GTIN_TOKEN}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.mensagem || `Erro ${response.status}: Produto não encontrado`);
      }

      const data = await response.json();

      if (data && data.nome) {
        setNovoProduto({
          ...novoProduto,
          codigo: ean,
          nome: data.nome || 'Produto sem descrição',
          fornecedor: data.marca || data.fabricante || 'Desconhecido',
        });
        alert(`Produto encontrado:\n${data.nome}\nMarca/Fornecedor: ${data.marca || 'Não informado'}`);
      } else {
        alert('Produto localizado, mas sem dados suficientes. Complete manualmente.');
      }
    } catch (err) {
      alert(`Erro na consulta:\n${err.message}\nTente novamente ou cadastre manualmente.`);
    }
  };

  // Scanner de código de barras
  useEffect(() => {
    let scanner;
    if (showScanner) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.start(
        { facingMode: "environment" },
        {},
        (decodedText) => {
          setEanConsulta(decodedText);
          consultarEAN(decodedText);
          scanner.clear();
          setShowScanner(false);
        },
        (err) => console.warn("Scanner erro:", err)
      );
    }

    return () => {
      if (scanner) scanner.clear().catch(() => {});
    };
  }, [showScanner]);

  // Gera cupom fiscal com operador dinâmico
  const generateReceipt = (items, total, paid, troco, impostos) => {
    const now = new Date();
    const dt_str = now.toLocaleDateString('pt-BR');
    const time_str = now.toLocaleTimeString('pt-BR', { hour12: false });

    let receipt = `
LDT NET TELECOM
AV AFONSO PENA, 1206 - TIROL 
NATAL - RN    CEP: 59020265 

CNPJ: 06.270.840/0001-50     ${dt_str}
IE: 20.558.140-4            ${time_str}
IM: 00333666                CCF:120289
                            CCD:124857

CUPOM FISCAL

ITEM CÓD. DESC.                 VALOR
`;

    items.forEach((item, index) => {
      receipt += `${String(index + 1).padStart(3, '0')} ${item.codigo || '---'}  ${item.nome}   R$${item.preco.toFixed(2)}\n`;
    });

    receipt += `
DINHEIRO R$${paid.toFixed(2)}          TOTAL R$${total.toFixed(2)}
TROCO    R$${troco.toFixed(2)}
IMPOSTOS 22,5% R$${impostos.toFixed(2)}

TI 01T 17,00%
ND-5:2COF4658121658HO56874Q5
OPERADOR: ${operatorName} - SAIR
456HDOS7 HUKSOJAH56 UHNL9634 896QH86CK0
BEMATECH MP-40 TH FI ECF-IF
VER.01.002 ECF/002 LJ.001
QQQQQOETUTITU ${dt_str} ${time_str}
FAB: BE09912789753009677
`;

    return receipt;
  };

  const salvarVendaNoBanco = async (metodo) => {
    const total = carrinho.reduce((acc, item) => acc + (item.preco * 1), 0);
    const { error } = await supabase.from('vendas').insert([{
      total,
      metodo_pagamento: metodo,
      itens: carrinho,
      cliente_id: clienteSelecionado?.id || null,
      operador: operatorName,
    }]);
    if (!error) {
      alert("Venda registrada!");
      setCarrinho([]);
      setShowCheckout(false);
      carregarDados();
    } else {
      alert("Erro ao salvar: " + error.message);
    }
  };

  const enviarWhatsApp = async () => {
    if (zapDados.nome && zapDados.telefone) {
      await supabase.from('clientes').insert([{ nome: zapDados.nome, telefone: zapDados.telefone }]);
      carregarDados();
    }
    const total = carrinho.reduce((acc, item) => acc + (item.preco * 1), 0);
    const impostos = total * 0.225;
    const receipt = generateReceipt(carrinho, total, total, 0, impostos);
    const telefoneLimpo = zapDados.telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${telefoneLimpo}?text=${encodeURIComponent(receipt)}`, '_blank');
    setShowZapModal(false);
    salvarVendaNoBanco('WhatsApp');
  };

  const salvarProduto = async () => {
    if (editandoProduto) {
      await supabase.from('produtos').update(novoProduto).eq('id', editandoProduto.id);
    } else {
      await supabase.from('produtos').insert([novoProduto]);
    }
    setNovoProduto({ codigo: '', nome: '', preco: '', preco_custo: '', quantidade_estoque: '', fornecedor: '' });
    setEditandoProduto(null);
    carregarDados();
  };

  const editarProduto = (p) => {
    setNovoProduto(p);
    setEditandoProduto(p);
  };

  const excluirProduto = async (id) => {
    if (confirm("Apagar produto?")) {
      await supabase.from('produtos').delete().eq('id', id);
      carregarDados();
    }
  };

  const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getSalesByProduct = () => {
    const salesByProduct = {};
    vendas.forEach(v => {
      v.itens.forEach(i => {
        salesByProduct[i.nome] = (salesByProduct[i.nome] || 0) + i.preco;
      });
    });
    return Object.entries(salesByProduct).map(([name, value]) => ({ name, value }));
  };

  // Tela de Login
  if (!isLogged) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl text-center">
          <div className="bg-blue-600 w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <ShoppingCart color="white" size={40} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-8">Arroz & Linha Soft</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              required
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="E-mail"
              className="w-full p-4 bg-slate-50 border-2 rounded-xl outline-none"
            />
            <input
              required
              type="password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              placeholder="Senha"
              className="w-full p-4 bg-slate-50 border-2 rounded-xl outline-none"
            />
            <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-xl uppercase shadow-lg">
              Entrar no Sistema
            </button>
          </form>
        </div>
        <div className="fixed bottom-0 w-full text-center py-2 bg-white border-t text-sm">
          Desenvolvido por <a href="https://akilessimiao.github.io/portifolio/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">LDT NET</a>
        </div>
      </div>
    );
  }

  // Interface principal
  return (
    <div className="flex flex-col md:flex-row w-full h-screen bg-slate-100 overflow-hidden font-sans relative">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative w-72 h-full bg-[#0047ab] text-white flex flex-col z-50 transition-transform duration-300 print:hidden`}>
        <div className="p-10 text-center">
          <div className="bg-white/10 p-4 rounded-3xl inline-block mb-4 border border-white/20">
            <ShoppingCart size={40} />
          </div>
          <p className="font-black text-[11px] uppercase tracking-widest">Arroz & Linha Soft</p>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => { setActiveTab('pdv'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-8 py-5 rounded-2xl font-black ${activeTab === 'pdv' ? 'bg-white text-blue-700 shadow-xl' : 'opacity-60'}`}>
            <ShoppingCart size={20} /> VENDAS
          </button>
          <button onClick={() => { setActiveTab('clientes'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-8 py-5 rounded-2xl font-black ${activeTab === 'clientes' ? 'bg-white text-blue-700 shadow-xl' : 'opacity-60'}`}>
            <Users size={20} /> CLIENTES
          </button>
          {role === 'admin' && (
            <>
              <button onClick={() => { setActiveTab('relatorios'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-8 py-5 rounded-2xl font-black ${activeTab === 'relatorios' ? 'bg-white text-blue-700 shadow-xl' : 'opacity-60'}`}>
                <FileText size={20} /> RELATÓRIO
              </button>
              <button onClick={() => { setActiveTab('estoque'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-8 py-5 rounded-2xl font-black ${activeTab === 'estoque' ? 'bg-white text-blue-700 shadow-xl' : 'opacity-60'}`}>
                <Package size={20} /> ESTOQUE
              </button>
            </>
          )}
        </nav>
        <div className="p-8 border-t border-white/10">
          <a href="https://wa.me/5584994533322" target="_blank" className="flex items-center gap-3 text-xs font-bold opacity-70 hover:opacity-100 transition-all">
            <LifeBuoy size={18} /> SUPORTE TÉCNICO
          </a>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b px-8 flex items-center justify-between shadow-sm shrink-0">
          <button className="md:hidden p-2" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h2 className="text-xl font-black uppercase tracking-tighter">{activeTab.toUpperCase()}</h2>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black bg-green-100 text-green-600 px-3 py-1 rounded-full uppercase">Conectado</span>
            <button onClick={() => setIsLogged(false)} className="text-red-500 font-bold text-xs">SAIR</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* VENDAS (PDV) */}
          {activeTab === 'pdv' && (
            <div className="flex flex-col lg:flex-row h-full gap-6">
              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {produtos.map(p => (
                  <button key={p.id} onClick={() => setCarrinho([...carrinho, p])} className="bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-blue-500 shadow-sm transition-all active:scale-95">
                    <p className="text-[10px] font-black text-slate-400 uppercase truncate mb-1">{p.nome}</p>
                    <p className="text-xl font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.preco)}</p>
                  </button>
                ))}
              </div>

              <div className="w-full lg:w-96 bg-white rounded-[2.5rem] shadow-xl flex flex-col border overflow-hidden">
                <div className="p-6 bg-slate-50 border-b font-black text-[10px] uppercase text-slate-400">Carrinho</div>
                <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                  {carrinho.map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                      <span className="text-xs font-bold">{item.nome}</span>
                      <button onClick={() => setCarrinho(carrinho.filter((_, idx) => idx !== i))} className="text-red-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="p-8 bg-blue-700 text-white">
                  <div className="flex justify-between mb-4">
                    <span className="opacity-60 text-xs font-black uppercase">Total</span>
                    <span className="text-3xl font-black">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(carrinho.reduce((a, b) => a + b.preco, 0))}
                    </span>
                  </div>
                  <button onClick={() => setShowCheckout(true)} disabled={carrinho.length === 0} className="w-full py-4 bg-white text-blue-700 font-black rounded-2xl uppercase text-xs">
                    Fechar Venda
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* RELATÓRIOS */}
          {activeTab === 'relatorios' && role === 'admin' && (
            <div className="space-y-8">
              <div className="bg-white p-6 rounded-3xl shadow-sm border">
                <h3 className="text-lg font-black uppercase mb-4">Vendas por Produto</h3>
                <div className="flex justify-center">
                  <PieChart width={400} height={400}>
                    <Pie data={getSalesByProduct()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={150} label>
                      {getSalesByProduct().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </div>
              </div>
              {/* Lista de vendas */}
              {vendas.map(v => (
                <div key={v.id} className="bg-white p-6 rounded-3xl shadow-sm border flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-slate-400">{new Date(v.created_at).toLocaleString()}</p>
                    <p className="text-lg font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.total)}</p>
                  </div>
                  <button onClick={() => supabase.from('vendas').delete().eq('id', v.id).then(carregarDados)} className="p-3 bg-red-50 text-red-500 rounded-xl">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ESTOQUE */}
          {activeTab === 'estoque' && role === 'admin' && (
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Consulta EAN */}
                <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    placeholder="Digite EAN/GTIN"
                    value={eanConsulta}
                    onChange={(e) => setEanConsulta(e.target.value)}
                    className="p-4 bg-slate-50 rounded-xl font-bold border-none"
                  />
                  <button
                    onClick={() => consultarEAN(eanConsulta)}
                    className="bg-green-600 text-white font-black rounded-xl uppercase"
                  >
                    Encontrar Produto
                  </button>
                </div>

                {/* Botão Scanner */}
                <button
                  onClick={() => setShowScanner(true)}
                  className="col-span-full bg-purple-600 text-white font-black rounded-xl py-4 flex items-center justify-center gap-2"
                >
                  <ScanBarcode size={20} /> Ler com Câmera
                </button>

                {/* Campos do produto */}
                <input placeholder="Código" value={novoProduto.codigo} onChange={e => setNovoProduto({...novoProduto, codigo: e.target.value})} className="p-4 bg-slate-50 rounded-xl" />
                <input placeholder="Nome" value={novoProduto.nome} onChange={e => setNovoProduto({...novoProduto, nome: e.target.value})} className="p-4 bg-slate-50 rounded-xl" />
                <input placeholder="Preço Venda" type="number" value={novoProduto.preco} onChange={e => setNovoProduto({...novoProduto, preco: e.target.value})} className="p-4 bg-slate-50 rounded-xl" />
                <input placeholder="Preço Custo" type="number" value={novoProduto.preco_custo} onChange={e => setNovoProduto({...novoProduto, preco_custo: e.target.value})} className="p-4 bg-slate-50 rounded-xl" />
                <input placeholder="Estoque" type="number" value={novoProduto.quantidade_estoque} onChange={e => setNovoProduto({...novoProduto, quantidade_estoque: e.target.value})} className="p-4 bg-slate-50 rounded-xl" />
                <input placeholder="Fornecedor" value={novoProduto.fornecedor} onChange={e => setNovoProduto({...novoProduto, fornecedor: e.target.value})} className="p-4 bg-slate-50 rounded-xl" />

                <button onClick={salvarProduto} className="col-span-full bg-blue-600 text-white font-black rounded-xl py-4 uppercase">
                  {editandoProduto ? 'Atualizar Produto' : 'Adicionar Produto'}
                </button>
              </div>

              {/* Lista de produtos */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {produtos.map(p => (
                  <div key={p.id} className="bg-white p-6 rounded-3xl shadow-sm border">
                    <p className="text-lg font-black">{p.nome}</p>
                    <p className="text-sm text-slate-600">Cód: {p.codigo} | Estoque: {p.quantidade_estoque || 0}</p>
                    <p className="text-sm text-slate-600">Fornecedor: {p.fornecedor}</p>
                    <div className="flex gap-3 mt-3">
                      <button onClick={() => editarProduto(p)} className="text-blue-600">
                        <Edit size={20} />
                      </button>
                      <button onClick={() => excluirProduto(p.id)} className="text-red-600">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CLIENTES */}
          {activeTab === 'clientes' && (
            <div className="space-y-4">
              {clientes.map(c => (
                <div key={c.id} className="bg-white p-6 rounded-3xl shadow-sm border">
                  <p className="text-lg font-black">{c.nome}</p>
                  <p className="text-sm text-slate-600">{c.telefone || 'Sem telefone'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal Scanner */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg mx-4 relative">
            <button
              className="absolute top-4 right-4 text-gray-700 hover:text-red-600"
              onClick={() => setShowScanner(false)}
            >
              <X size={28} />
            </button>
            <h3 className="text-xl font-bold mb-4 text-center">Escaneie o código de barras</h3>
            <div id="reader" className="w-full h-80 border-4 border-purple-500 rounded-lg" />
            <p className="text-center mt-4 text-gray-600">Aponte para o código EAN</p>
          </div>
        </div>
      )}

      {/* Modal Checkout */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black mb-6">Fechar Venda</h2>
            {/* ... mantenha o conteúdo do modal de checkout como estava */}
            <button onClick={() => setShowCheckout(false)} className="mt-4 text-red-500">Cancelar</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t text-center py-2 text-sm">
        Desenvolvido por <a href="https://akilessimiao.github.io/portifolio/" target="_blank" className="text-black-600 hover:underline">LDT NET</a>
      </footer>
    </div>
  );
}