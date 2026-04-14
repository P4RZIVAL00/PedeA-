import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet as WalletIcon, ArrowUpRight, History, X } from 'lucide-react';

export default function Wallet() {
  const { user } = useAuth();
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !pixKey) return;

    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount > (user.balance || 0)) {
      alert('Saldo insuficiente');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'withdrawals'), {
        userId: user.uid,
        userName: user.name,
        userRole: user.role,
        amount: withdrawAmount,
        pixKey,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setIsWithdrawModalOpen(false);
      setAmount('');
      setPixKey('');
      alert('Solicitação de saque enviada com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'withdrawals');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-primary text-white p-6 rounded-2xl shadow-lg border-b-4 border-accent relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mb-1">Saldo Disponível</p>
          <h2 className="text-3xl font-extrabold">R$ {(user?.balance || 0).toFixed(2)}</h2>
          <button 
            onClick={() => setIsWithdrawModalOpen(true)}
            className="mt-6 bg-white text-primary px-6 py-2 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md hover:bg-accent hover:text-white transition-all"
          >
            <ArrowUpRight size={14} /> Solicitar Saque
          </button>
        </div>
        <WalletIcon className="absolute -right-4 -bottom-4 text-white/10 w-32 h-32 rotate-12" />
      </div>

      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface w-full max-w-md rounded-2xl p-8 shadow-2xl border border-border-main relative"
            >
              <button 
                onClick={() => setIsWithdrawModalOpen(false)}
                className="absolute right-4 top-4 text-text-sub hover:text-text-main"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-extrabold text-text-main mb-6">Solicitar Saque</h3>
              
              <form onSubmit={handleWithdraw} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-text-sub uppercase tracking-widest mb-2">Valor (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-sub uppercase tracking-widest mb-2">Chave PIX</label>
                  <input 
                    type="text"
                    required
                    placeholder="CPF, Email ou Celular"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    className="input-field"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-4 text-sm"
                >
                  {loading ? 'ENVIANDO...' : 'CONFIRMAR SAQUE'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
