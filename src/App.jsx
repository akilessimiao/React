import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ShoppingCart, Package, Users, LogOut, Trash2, Edit,
  ScanBarcode, X, Menu, FileText, LifeBuoy, CreditCard, DollarSign
} from 'lucide-react';
import { PieChart, Pie, Tooltip, Legend, Cell } from 'recharts';
import { Html5QrcodeScanner } from 'html5-qrcode';
import './index.css';

// Variáveis do .env (obrigatório criar o arquivo .env na raiz)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const PIX_CHAVE = import.meta.env.VITE_PIX_CHAVE || '06.270.840/0001-50';
const CNPJ = import.meta.env.VITE_CNPJ || '06.270.840/0001-50';

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
  const [pagamento, setPagamento] = useState('dinheiro');
  const [showZapModal, setShowZapModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [zapDados, setZapDados] = useState({ nome: '', telefone: '' });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [novoProduto, setNovoProduto] = useState({
    codigo: '', nome: '', preco: '', preco_custo: '', quantidade_estoque: '', fornecedor: ''
  });
  const [editandoProduto, setEditandoProduto] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [eanConsulta, setEanConsulta] = useState('');

  const total = carrinho.reduce((acc, item) => acc + (item.preco || 0), 0);

  const carregarDados = async () => {
    const { data: pts } = await supabase.from('produtos').select('*').order('nome');
    const { data: cls } = await supabase.from('clientes').select('*').order('nome');
    const { data: vds } = await supabase.from('vendas').select('*').order('created_at', { ascending: false });
    setProdutos(pts || []);
    setClientes(cls || []);
    setVendas(vds || []);
  };

  useEffect(() => {
    if (isLogged) carregarDados();
  }, [isLogged]);

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

  const consultarEAN = async (ean) => {
    if (!ean || ean.length < 8) return alert('EAN inválido (mínimo 8 dígitos)');

    try {
      const res = await fetch(`${GTIN_API_URL}${ean}`, {
        headers: { 
          'Authorization': `Bearer ${GTIN_TOKEN}`, 
          'Accept': 'application/json' 
        }
      });

      if (!res.ok) throw new Error('Produto não encontrado');

      const data = await res.json();
      if (data.nome) {
        setNovoProduto({
          ...novoProduto,
          codigo: ean,
          nome: data.nome || 'Produto sem descrição',
          fornecedor: data.marca || 'Desconhecido'
        });
        alert(`Produto encontrado: ${data.nome}`);
      }
    } catch (err) {
      alert('Erro na consulta ou produto não cadastrado. Preencha manualmente.');
    }
  };

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
        (text) => {
          setEanConsulta(text);
          consultarEAN(text);
          scanner.clear();
          setShowScanner(false);
        }, 
        (err) => console.warn(err)
      );
    }
    return () => scanner?.clear();
  }, [showScanner]);

  const generateReceipt = (items, total, paid = total, troco = 0, impostos = total * 0.225) => {
  const now = new Date();
  const dt_str = now.toLocaleDateString('pt-BR');
  const time_str = now.toLocaleTimeString('pt-BR', { hour12: false });

  // Tudo dentro de crases (backticks) ``
  let receipt = `
LDT NET TELECOM
AV AFONSO PENA, 1206 - TIROL 
NATAL - RN    CEP: 59020265 

CNPJ: ${CNPJ || '06.270.840/0001-50'}     ${dt_str}
IE: 20.558.140-4            ${time_str}
IM: 00333666                CCF:120289
                            CCD:124857

CUPOM FISCAL

ITEM CÓD. DESC.                 VALOR
`;

  items.forEach((item, index) => {
    receipt += `${String(index + 1).padStart(3, '0')} ${item.codigo || '---'}  ${item.nome.padEnd(25)} R$${item.preco.toFixed(2)}\n`;
  });

  receipt += `
DINHEIRO R$${paid.toFixed(2)}          TOTAL R$${total.toFixed(2)}
TROCO    R$${troco.toFixed(2)}
IMPOSTOS 22,5% R$${impostos.toFixed(2)}

PIX: ${PIX_CHAVE || '06.270.840/0001-50'}

TI 01T 17,00%
ND-5:2COF4658121658HO56874Q5
OPERADOR: ${operatorName || 'OPERADOR NÃO IDENTIFICADO'} - SAIR
456HDOS7 HUKSOJAH56 UHNL9634 896QH86CK0
BEMATECH MP-40 TH FI ECF-IF
VER.01.002 ECF/002 LJ.001
QQQQQOETUTITU ${dt_str} ${time_str}
FAB: BE09912789753009677
`;

  return receipt;
};

  const salvarVendaNoBanco = async (metodo) => {
    const { error } = await supabase.from('vendas').insert([{
      total,
      metodo_pagamento: metodo,
      itens: carrinho,
      cliente_id: clienteSelecionado?.id || null,
      operador: operatorName,
    }]);
    if (error) return alert('Erro ao salvar venda: ' + error.message);
    alert('Venda registrada!');
    setCarrinho([]);
    setShowCheckout(false);
    carregarDados();
  };

  const enviarWhatsApp = async () => {
    if (zapDados.nome && zapDados.telefone) {
      await supabase.from('clientes').insert([{ nome: zapDados.nome, telefone: zapDados.telefone }]);
      carregarDados();
    }
    const receipt = generateReceipt(carrinho, total);
    const tel = zapDados.telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(receipt)}`);
    setShowZapModal(false);
    salvarVendaNoBanco('WhatsApp');
  };

  const salvarProduto = async () => {
    const p = {
      codigo: novoProduto.codigo,
      nome: novoProduto.nome,
      preco: parseFloat(novoProduto.preco) || 0,
      preco_custo: parseFloat(novoProduto.preco_custo) || 0,
      quantidade_estoque: parseInt(novoProduto.quantidade_estoque) || 0,
      fornecedor: novoProduto.fornecedor
    };

    let error;
    if (editandoProduto) {
      ({ error } = await supabase.from('produtos').update(p).eq('id', editandoProduto.id));
    } else {
      ({ error } = await supabase.from('produtos').insert([p]));
    }

    if (error) return alert('Erro ao salvar produto: ' + error.message);

    setNovoProduto({ 
      codigo: '', 
      nome: '', 
      preco: '', 
      preco_custo: '', 
      quantidade_estoque: '', 
      fornecedor: '' 
    });
    setEditandoProduto(null);
    carregarDados();
  };

  const editarProduto = (p) => {
    setNovoProduto(p);
    setEditandoProduto(p);
  };

  const excluirProduto = async (id) => {
    if (confirm('Excluir produto?')) {
      await supabase.from('produtos').delete().eq('id', id);
      carregarDados();
    }
  };

  const formatBRL = (val) => 
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(val || 0);

  const getSalesByProduct = () => {
    const map = {};
    vendas.forEach(v => {
      v.itens?.forEach(i => {
        map[i.nome] = (map[i.nome] || 0) + (i.preco || 0);
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  };

  // Login screen
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
              onChange={e => setLoginEmail(e.target.value)} 
              placeholder="E-mail" 
              className="w-full p-4 bg-slate-50 border-2 rounded-xl outline-none" 
            />
            <input 
              required 
              type="password" 
              value={loginPass} 
              onChange={e => setLoginPass(e.target.value)} 
              placeholder="Senha" 
              className="w-full p-4 bg-slate-50 border-2 rounded-xl outline-none" 
            />
            <button 
              type="submit" 
              className="w-full py-4 bg-blue-600 text-white font-black rounded-xl uppercase shadow-lg"
            >
              Entrar no Sistema
            </button>
          </form>
        </div>
        <footer className="fixed bottom-0 w-full text-center py-2 bg-white border-t text-sm">
          <div className="flex items-center justify-center gap-2">
            <img 
              src={import.meta.env.VITE_LOGO_URL || '/logo.png'} 
              alt="LDT NET" 
              className="h-6" 
            />
            <span>LDT NET <span className="text-green-600 font-bold">ONLINE</span></span>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row w-full h-screen bg-slate-100 overflow-hidden font-sans relative">
      {/* SIDEBAR */}
      <aside 
        className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 fixed md:relative w-72 h-full bg-[#0047ab] text-white 
          flex flex-col z-50 transition-transform duration-300 print:hidden`}
      >
        <div className="p-10 text-center">
          <div className="bg-white/10 p-4 rounded-3xl inline-block mb-4 border border-white/20">
            <ShoppingCart size={40} />
          </div>
          <p className="font-black text-[11px] uppercase tracking-widest">Arroz & Linha Soft</p>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => { setActiveTab('pdv'); setIsSidebarOpen(false); }} 
            className={`w-full flex items-center gap-4 px-8 py-5 rounded-2xl font-black 
              ${activeTab === 'pdv' ? 'bg-white text-blue-700 shadow-xl' : 'opacity-60'}`}
          >
            <ShoppingCart size={20} /> VENDAS
          </button>
          <button 
            onClick={() => { setActiveTab('clientes'); setIsSidebarOpen(false); }} 
            className={`w-full flex items-center gap-4 px-8 py-5 rounded-2xl font-black 
              ${activeTab === 'clientes' ? 'bg-white text-blue-700 shadow-xl' : 'opacity-60'}`}
          >
            <Users size={20} /> CLIENTES
          </button>
          {role === 'admin' && (
            <>
              <button 
                onClick={() => { setActiveTab('relatorios'); setIsSidebarOpen(false); }} 
                className={`w-full flex items-center gap-4 px-8 py-5 rounded-2xl font-black 
                  ${activeTab === 'relatorios' ? 'bg-white text-blue-700 shadow-xl' : 'opacity-60'}`}
              >
                <FileText size={20} /> RELATÓRIO
              </button>
              <button 
                onClick={() => { setActiveTab('estoque'); setIsSidebarOpen(false); }} 
                className={`w-full flex items-center gap-4 px-8 py-5 rounded-2xl font-black 
                  ${activeTab === 'estoque' ? 'bg-white text-blue-700 shadow-xl' : 'opacity-60'}`}
              >
                <Package size={20} /> ESTOQUE
              </button>
            </>
          )}
        </nav>
        <div className="p-8 border-t border-white/10">
          <a 
            href="https://wa.me/5584994533322" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-xs font-bold opacity-70 hover:opacity-100 transition-all"
          >
            <LifeBuoy size={18} /> SUPORTE TÉCNICO
          </a>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden pt-16 md:pt-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === 'pdv' && (
            <div className="flex flex-col lg:flex-row h-full gap-6">
              {/* Lista de produtos (esquerda) */}
              <div className="flex-1 overflow-y-auto">
                {produtos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <ShoppingCart size={64} className="mb-4 opacity-50" />
                    <p className="text-xl font-medium">Nenhum produto cadastrado</p>
                    <p className="mt-2">Vá na aba Estoque e cadastre alguns itens</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {produtos.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setCarrinho([...carrinho, { ...p, id: p.id + Date.now() }])}
                        className="bg-white p-4 rounded-xl border hover:border-blue-500 hover:shadow-md transition-all active:scale-95 text-left"
                      >
                        <p className="font-medium text-base truncate">{p.nome}</p>
                        <p className="text-lg font-bold text-green-600 mt-1">{formatBRL(p.preco)}</p>
                        {p.quantidade_estoque > 0 && (
                          <p className="text-xs text-gray-500 mt-1">Estoque: {p.quantidade_estoque}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Carrinho (direita) */}
              <div className="w-full lg:w-96 bg-white rounded-2xl shadow-lg border flex flex-col overflow-hidden">
                <div className="p-5 bg-slate-50 border-b font-bold text-slate-600 flex items-center justify-between">
                  <span>Carrinho</span>
                  <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                    {carrinho.length} item{carrinho.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {carrinho.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <ShoppingCart size={48} className="mb-3 opacity-50" />
                      <p>Carrinho vazio</p>
                      <p className="text-sm mt-2">Selecione produtos à esquerda</p>
                    </div>
                  ) : (
                    carrinho.map((item, index) => (
                      <div 
                        key={item.id || index} 
                        className="flex items-center justify-between bg-slate-50 p-3 rounded-xl"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.nome}</p>
                          <p className="text-sm text-green-600">{formatBRL(item.preco)}</p>
                        </div>
                        <button
                          onClick={() => setCarrinho(carrinho.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-5 bg-blue-600 text-white">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-medium">Total</span>
                    <span className="text-2xl font-black">{formatBRL(total)}</span>
                  </div>

                  <button
                    onClick={() => setShowCheckout(true)}
                    disabled={carrinho.length === 0}
                    className="w-full py-4 bg-white text-blue-700 font-black rounded-xl uppercase tracking-wide 
                      disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                  >
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
                    <Pie 
                      data={getSalesByProduct()} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={150} 
                      label
                    >
                      {getSalesByProduct().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </div>
              </div>
              {vendas.map(v => (
                <div 
                  key={v.id} 
                  className="bg-white p-6 rounded-3xl shadow-sm border flex justify-between items-center"
                >
                  <div>
                    <p className="text-[10px] text-slate-400">
                      {new Date(v.created_at).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-lg font-black">{formatBRL(v.total)}</p>
                  </div>
                  <button 
                    onClick={() => {
                      if (confirm('Excluir venda?')) {
                        supabase.from('vendas').delete().eq('id', v.id).then(carregarDados);
                      }
                    }} 
                    className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition"
                  >
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
                <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    placeholder="Digite EAN/GTIN" 
                    value={eanConsulta} 
                    onChange={e => setEanConsulta(e.target.value)} 
                    className="p-4 bg-slate-50 rounded-xl" 
                  />
                  <button 
                    onClick={() => consultarEAN(eanConsulta)} 
                    className="bg-green-600 text-white font-black rounded-xl uppercase py-4"
                  >
                    Encontrar Produto
                  </button>
                </div>
                <button 
                  onClick={() => setShowScanner(true)} 
                  className="col-span-full bg-purple-600 text-white font-black rounded-xl py-4 
                    flex items-center justify-center gap-2"
                >
                  <ScanBarcode size={20} /> Ler com Câmera
                </button>
                <input 
                  placeholder="Código" 
                  value={novoProduto.codigo} 
                  onChange={e => setNovoProduto({...novoProduto, codigo: e.target.value})} 
                  className="p-4 bg-slate-50 rounded-xl" 
                />
                <input 
                  placeholder="Nome" 
                  value={novoProduto.nome} 
                  onChange={e => setNovoProduto({...novoProduto, nome: e.target.value})} 
                  className="p-4 bg-slate-50 rounded-xl" 
                />
                <input 
                  type="number" 
                  placeholder="Preço Venda" 
                  value={novoProduto.preco} 
                  onChange={e => setNovoProduto({...novoProduto, preco: e.target.value})} 
                  className="p-4 bg-slate-50 rounded-xl" 
                />
                <input 
                  type="number" 
                  placeholder="Preço Custo" 
                  value={novoProduto.preco_custo} 
                  onChange={e => setNovoProduto({...novoProduto, preco_custo: e.target.value})} 
                  className="p-4 bg-slate-50 rounded-xl" 
                />
                <input 
                  type="number" 
                  placeholder="Estoque" 
                  value={novoProduto.quantidade_estoque} 
                  onChange={e => setNovoProduto({...novoProduto, quantidade_estoque: e.target.value})} 
                  className="p-4 bg-slate-50 rounded-xl" 
                />
                <input 
                  placeholder="Fornecedor" 
                  value={novoProduto.fornecedor} 
                  onChange={e => setNovoProduto({...novoProduto, fornecedor: e.target.value})} 
                  className="p-4 bg-slate-50 rounded-xl" 
                />
                <button 
                  onClick={salvarProduto} 
                  className="col-span-full bg-blue-600 text-white font-black rounded-xl py-4 uppercase"
                >
                  {editandoProduto ? 'Atualizar Produto' : 'Adicionar Produto'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {produtos.map(p => (
                  <div key={p.id} className="bg-white p-6 rounded-3xl shadow-sm border">
                    <p className="text-lg font-black">{p.nome}</p>
                    <p className="text-sm text-slate-600">Cód: {p.codigo} | Estoque: {p.quantidade_estoque || 0}</p>
                    <p className="text-sm text-slate-600">Fornecedor: {p.fornecedor}</p>
                    <div className="flex gap-3 mt-3">
                      <button 
                        onClick={() => editarProduto(p)} 
                        className="text-blue-600 hover:text-blue-800 transition"
                      >
                        <Edit size={20} />
                      </button>
                      <button 
                        onClick={() => excluirProduto(p.id)} 
                        className="text-red-600 hover:text-red-800 transition"
                      >
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
              {clientes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Nenhum cliente cadastrado
                </div>
              ) : (
                clientes.map(c => (
                  <div key={c.id} className="bg-white p-6 rounded-3xl shadow-sm border">
                    <p className="text-lg font-black">{c.nome}</p>
                    <p className="text-sm text-slate-600">{c.telefone || 'Sem telefone'}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {/* MODAL SCANNER */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl max-w-lg w-full relative">
            <button
              className="absolute top-4 right-4 text-gray-700 hover:text-red-600"
              onClick={() => setShowScanner(false)}
            >
              <X size={28} />
            </button>
            <h3 className="text-xl font-bold mb-4 text-center">Escaneie o código de barras</h3>
            <div id="reader" className="w-full h-80 border-4 border-purple-500 rounded-lg overflow-hidden" />
            <p className="text-center mt-4 text-gray-600">Aponte para o código EAN/GTIN</p>
          </div>
        </div>
      )}

      {/* MODAL CHECKOUT */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black mb-6">Fechar Venda</h2>
            <p className="text-2xl font-bold text-center mb-6">{formatBRL(total)}</p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <button 
                onClick={() => setPagamento('dinheiro')} 
                className={`py-4 rounded-xl font-bold flex flex-col items-center ${
                  pagamento === 'dinheiro' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800'
                }`}
              >
                <DollarSign className="mb-1" /> Dinheiro
              </button>
              <button 
                onClick={() => setPagamento('cartao')} 
                className={`py-4 rounded-xl font-bold flex flex-col items-center ${
                  pagamento === 'cartao' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
                }`}
              >
                <CreditCard className="mb-1" /> Cartão
              </button>
              <button 
                onClick={() => setPagamento('pix')} 
                className={`py-4 rounded-xl font-bold flex flex-col items-center ${
                  pagamento === 'pix' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800'
                }`}
              >
                <ScanBarcode className="mb-1" /> Pix
              </button>
            </div>

            {pagamento === 'pix' && (
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold mb-4">Pague com Pix</h3>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(PIX_CHAVE)}&amount=${total.toFixed(2)}`}
                  alt="QR Code Pix"
                  className="mx-auto mb-4 border rounded-lg p-2 bg-white"
                />
                <p className="text-sm font-bold mb-1">Valor: {formatBRL(total)}</p>
                <p className="text-xs text-gray-600 break-all">Chave: {PIX_CHAVE}</p>
              </div>
            )}

            {pagamento === 'dinheiro' && (
              <p className="text-center text-gray-700 mb-6">
                Pagamento em dinheiro. Troco será calculado na hora.
              </p>
            )}

            <div className="flex gap-4">
              <button 
                onClick={() => { 
                  salvarVendaNoBanco(pagamento); 
                  setShowCheckout(false); 
                }} 
                className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition"
              >
                Confirmar Venda
              </button>
              <button 
                onClick={() => setShowCheckout(false)} 
                className="flex-1 py-4 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t text-center py-2 text-sm z-40">
        <div className="flex items-center justify-center gap-2">
          <img 
            src={import.meta.env.VITE_LOGO_URL || '/logo.png'} 
            alt="LDT NET" 
            className="h-6" 
          />
          <span>LDT NET <span className="text-green-600 font-bold">ONLINE</span></span>
        </div>
      </footer>

      {/* MOBILE MENU BUTTON */}
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden fixed bottom-4 left-4 z-50 bg-blue-600 text-white p-4 rounded-full shadow-lg print:hidden"
      >
        <Menu size={24} />
      </button>
    </div>
  );
}