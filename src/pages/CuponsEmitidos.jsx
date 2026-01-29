import { useState } from 'react';
import { useCupom } from '../context/CupomContext';

export default function CuponsEmitidos() {
  const { cupons } = useCupom();
  const [busca, setBusca] = useState('');

  const cuponsFiltrados = cupons.filter(c =>
    c.numero.toString().includes(busca)
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Cupons Emitidos</h1>

      <input
        type="text"
        placeholder="Buscar pelo número do cupom..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        className="w-full md:w-80 p-3 mb-6 border rounded-lg"
      />

      {cuponsFiltrados.length === 0 ? (
        <p>Nenhum cupom encontrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Data/Hora</th>
                <th className="px-4 py-3">Valor Total</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {cuponsFiltrados.map(cupom => (
                <tr key={cupom.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{cupom.numero.toString().padStart(6, '0')}</td>
                  <td className="px-4 py-3">{cupom.data}</td>
                  <td className="px-4 py-3">
                    R$ {cupom.valorTotal?.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="px-4 py-3">{cupom.cliente || '—'}</td>
                  <td className="px-4 py-3">
                    <button className="text-blue-600 hover:underline">Ver detalhes</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}