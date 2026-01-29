import { createContext, useContext, useState, useEffect } from 'react';

const CupomContext = createContext();

export function CupomProvider({ children }) {
  const [cupons, setCupons] = useState(() => {
    const saved = localStorage.getItem('cuponsEmitidos');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cuponsEmitidos', JSON.stringify(cupons));
  }, [cupons]);

  // Gera o próximo número sequencial (pode começar de qualquer número)
  const gerarNumeroCupom = () => {
    if (cupons.length === 0) return 1;
    const ultimo = cupons
      .map(c => Number(c.numero))
      .sort((a, b) => b - a)[0];
    return ultimo + 1;
  };

  const adicionarCupom = (dadosCupom) => {
    const novoNumero = gerarNumeroCupom();
    const novoCupom = {
      id: Date.now(),
      numero: novoNumero,
      data: new Date().toLocaleString('pt-BR'),
      ...dadosCupom, // valorTotal, itens, cliente, etc.
    };
    setCupons(prev => [...prev, novoCupom]);
    return novoCupom;
  };

  return (
    <CupomContext.Provider value={{ cupons, adicionarCupom, gerarNumeroCupom }}>
      {children}
    </CupomContext.Provider>
  );
}

export const useCupom = () => useContext(CupomContext);