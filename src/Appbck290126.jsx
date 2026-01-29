import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ShoppingCart,
  Package,
  Users,
  LogOut,
  Trash2,
  Edit,
  ScanBarcode,
  X,
  Menu,
  FileText,
  LifeBuoy,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { PieChart, Pie, Tooltip, Legend, Cell } from 'recharts';
import { Html5QrcodeScanner } from 'html5-qrcode';

import './index.css';

// ────────────────────────────────────────────────
// Configurações e constantes
// ────────────────────────────────────────────────
const SUPABASE_URL    = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY    = import.meta.env.VITE_SUPABASE_KEY;
const PIX_CHAVE       = import.meta.env.VITE_PIX_CHAVE || '06.270.840/0001-50';
const CNPJ            = import.meta.env.VITE_CNPJ    || '06.270.840/0001-50';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GTIN_TOKEN      = 's6cPw0Ar3M9NLYHZrdWQUg';
const GTIN_API_URL    = 'https://gtin.rscsistemas.com.br/api/gtin/infor/';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF6384', '#36A2EB', '#FFCE56'];

// ────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────
export default function App() {
  // ── Estados de autenticação ───────────────────────────────────────
  const [isLogged,        setIsLogged]        = useState(false);
  const [role,            setRole]            = useState('user');
  const [operatorName,    setOperatorName]    = useState('OPERADOR DESCONHECIDO');
  const [loginEmail,      setLoginEmail]      = useState('');
  const [loginPass,       setLoginPass]       = useState('');

  // ── Estados da interface ──────────────────────────────────────────
  const [activeTab,       setActiveTab]       = useState('pdv');
  const [isSidebarOpen,   setIsSidebarOpen]   = useState(false);

  // ── Estados do PDV / Carrinho ─────────────────────────────────────
  const [produtos,        setProdutos]        = useState([]);
  const [clientes,        setClientes]        = useState([]);
  const [vendas,          setVendas]          = useState([]);
  const [carrinho,        setCarrinho]        = useState([]);
  const [showCheckout,    setShowCheckout]    = useState(false);
  const [pagamento,       setPagamento]       = useState('dinheiro');
  const [showZapModal,    setShowZapModal]    = useState(false);
  const [buscaCliente,    setBuscaCliente]    = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [zapDados,        setZapDados]        = useState({ nome: '', telefone: '' });

  // ── Estados do Estoque ────────────────────────────────────────────
  const [novoProduto,     setNovoProduto]     = useState({
    codigo: '', nome: '', preco: '', preco_custo: '',
    quantidade_estoque: '', fornecedor: ''
  });
  const [editandoProduto, setEditandoProduto] = useState(null);
  const [showScanner,     setShowScanner]     = useState(false);
  const [eanConsulta,     setEanConsulta]     = useState('');

  const total = carrinho.reduce((acc, item) => acc + (item.preco || 0), 0);

  // ────────────────────────────────────────────────
  // Efeitos
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (isLogged) carregarDados();
  }, [isLogged]);

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

  // ────────────────────────────────────────────────
  // Funções de autenticação
  // ────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────
  // Funções principais
  // ────────────────────────────────────────────────
  const carregarDados = async () => {
    const { data: pts } = await supabase.from('produtos').select('*').order('nome');
    const { data: cls } = await supabase.from('clientes').select('*').order('nome');
    const { data: vds } = await supabase.from('vendas').select('*').order('created_at', { ascending: false });

    setProdutos(pts || []);
    setClientes(cls || []);
    setVendas(vds || []);
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

  // ... (as outras funções longas: generateReceipt, salvarVendaNoBanco, enviarWhatsApp,
  // salvarProduto, editarProduto, excluirProduto, formatBRL, getSalesByProduct)

  // ────────────────────────────────────────────────
  // Renderização condicional - Tela de Login
  // ────────────────────────────────────────────────
  if (!isLogged) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl text-center">
          <div className="bg-blue-600 w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <ShoppingCart color="white" size={40} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-8">
            Arroz & Linha Soft
          </h2>

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

  // ────────────────────────────────────────────────
  // Interface principal (logado)
  // ────────────────────────────────────────────────
  return (
    <div className="flex flex-col md:flex-row w-full h-screen bg-slate-100 overflow-hidden font-sans relative">
      {/* Sidebar */}
      <aside
        className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 fixed md:relative w-72 h-full bg-[#0047ab] text-white
          flex flex-col z-50 transition-transform duration-300 print:hidden
        `}
      >
        {/* Cabeçalho da sidebar */}
        <div className="p-10 text-center">
          <div className="bg-white/10 p-4 rounded-3xl inline-block mb-4 border border-white/20">
            <ShoppingCart size={40} />
          </div>
          <p className="font-black text-[11px] uppercase tracking-widest">
            Arroz & Linha Soft
          </p>
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-4 space-y-2">
          {/* Botões de navegação aqui... (mantive igual ao original) */}
        </nav>

        {/* Rodapé da sidebar */}
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

      {/* Conteúdo principal */}
      <main className="flex-1 flex flex-col overflow-hidden pt-16 md:pt-0">
        {/* ... resto do conteúdo principal (pdv, relatórios, estoque, clientes) */}
      </main>

      {/* Botão menu mobile */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden fixed bottom-4 left-4 z-50 bg-blue-600 text-white p-4 rounded-full shadow-lg print:hidden"
      >
        <Menu size={24} />
      </button>

      {/* Modais (scanner, checkout, etc.) aqui... */}
    </div>
  );
}