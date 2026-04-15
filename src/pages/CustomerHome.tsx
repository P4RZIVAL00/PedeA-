import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Store } from '../types';
import { motion } from 'motion/react';
import { Search, ShoppingBag, Utensils, Pill, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { BellOff } from 'lucide-react';

const CATEGORIES = [
  { id: 'restaurant', name: 'Restaurantes', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
  { id: 'market', name: 'Mercados', icon: ShoppingBag, color: 'bg-blue-100 text-blue-600' },
  { id: 'pharmacy', name: 'Farmácias', icon: Pill, color: 'bg-red-100 text-red-600' },
  { id: 'other', name: 'Outros', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-600' },
];

export default function CustomerHome() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { permission } = useNotifications();

  useEffect(() => {
    const q = query(collection(db, 'stores'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
      setStores(storesData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'stores'));
    return () => unsubscribe();
  }, []);

  const filteredStores = selectedCategory 
    ? stores.filter(s => s.category === selectedCategory)
    : stores;

  return (
    <div className="min-h-screen bg-bg-main pb-20">
      {/* Header */}
      <div className="bg-primary text-white p-6 border-bottom-[4px] border-accent shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">TaNaMão</h1>
            <div className="text-xs opacity-90 font-medium">Porto Walter - Acre</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-sm">Olá, {user?.name || 'Visitante'}</div>
            <div className="text-[10px] opacity-80 uppercase tracking-widest font-bold">Sessão Ativa</div>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" size={18} />
          <input
            type="text"
            placeholder="O que deseja hoje?"
            className="w-full bg-white/10 border border-white/20 rounded-md py-2.5 pl-11 pr-4 text-white placeholder:text-white/60 outline-none focus:bg-white/20 transition-all text-sm"
          />
        </div>
      </div>

      {permission === 'denied' && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3">
          <div className="bg-red-100 p-2 rounded-full">
            <BellOff size={16} className="text-red-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-red-900 uppercase tracking-widest">Notificações Bloqueadas</p>
            <p className="text-[10px] text-red-700">Ative as notificações no seu navegador para receber avisos sobre seus pedidos.</p>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="p-4">
        <h2 className="text-[11px] font-bold text-text-sub uppercase tracking-[1px] mb-3 ml-1">Categorias</h2>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`flex items-center gap-3 p-4 rounded-lg border transition-all text-left ${
                selectedCategory === cat.id 
                  ? 'bg-primary text-white border-primary shadow-md' 
                  : 'bg-surface border-border-main text-text-main hover:border-accent'
              }`}
            >
              <div className={`p-2 rounded-md ${selectedCategory === cat.id ? 'bg-white/20' : 'bg-bg-main'}`}>
                <cat.icon size={20} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wide">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stores List */}
      <div className="px-4">
        <h2 className="text-[11px] font-bold text-text-sub uppercase tracking-[1px] mb-3 ml-1">Destaques em Porto Walter</h2>
        <div className="bg-surface rounded-xl border border-border-main overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
          {filteredStores.map((store, index) => (
            <motion.div
              key={store.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/store/${store.id}`)}
              className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-all ${
                index !== filteredStores.length - 1 ? 'border-b border-border-main' : ''
              }`}
            >
              <div className="w-11 h-11 bg-bg-main rounded-lg flex items-center justify-center text-text-sub overflow-hidden border border-border-main">
                {store.image ? (
                  <img src={store.image} alt={store.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Utensils size={20} />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-text-main">{store.name}</h3>
                <p className="text-[11px] text-text-sub font-medium">Aberto • 25-35 min</p>
              </div>
              <div className="text-primary font-bold text-xs uppercase tracking-wider">Ver</div>
            </motion.div>
          ))}
          {filteredStores.length === 0 && (
            <div className="text-center py-12 text-text-sub">
              <p className="text-sm">Nenhuma loja encontrada.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
