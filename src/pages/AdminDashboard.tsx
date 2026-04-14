import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Withdrawal, User, Order } from '../types';
import { motion } from 'motion/react';
import { Users, DollarSign, CheckCircle, XCircle, LogOut, ShieldCheck, TrendingUp, History as HistoryIcon } from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBalance: 0,
    pendingWithdrawals: 0
  });

  useEffect(() => {
    const unsubscribeWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Withdrawal));
      setWithdrawals(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setStats(prev => ({ ...prev, pendingWithdrawals: data.filter(w => w.status === 'pending').length }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'withdrawals'));

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
      setUsers(data);
      setStats(prev => ({ 
        ...prev, 
        totalUsers: data.length,
        totalBalance: data.reduce((acc, u) => acc + (u.balance || 0), 0)
      }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    return () => {
      unsubscribeWithdrawals();
      unsubscribeUsers();
    };
  }, []);

  const handleApproveWithdrawal = async (withdrawal: Withdrawal) => {
    try {
      // 1. Update withdrawal status
      await updateDoc(doc(db, 'withdrawals', withdrawal.id), {
        status: 'approved'
      });

      // 2. Deduct from user balance
      await updateDoc(doc(db, 'users', withdrawal.userId), {
        balance: increment(-withdrawal.amount)
      });

      alert('Saque aprovado com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${withdrawal.id}`);
    }
  };

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    try {
      await updateDoc(doc(db, 'withdrawals', withdrawalId), {
        status: 'rejected'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${withdrawalId}`);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main p-6 pb-24">
      <div className="flex justify-between items-start mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="text-primary" size={20} />
            <h1 className="text-2xl font-extrabold text-text-main tracking-tight">Painel Administrativo</h1>
          </div>
          <p className="text-[10px] text-text-sub font-bold uppercase tracking-widest">Controle Total do PedeAí</p>
        </div>
        <button 
          onClick={() => logout()}
          className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline flex items-center gap-1 mt-1"
        >
          <LogOut size={12} /> Sair
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-surface p-6 rounded-2xl border border-border-main shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Users size={24} /></div>
            <div>
              <p className="text-[10px] text-text-sub font-bold uppercase tracking-widest">Total Usuários</p>
              <h3 className="text-2xl font-extrabold text-text-main">{stats.totalUsers}</h3>
            </div>
          </div>
        </div>
        <div className="bg-surface p-6 rounded-2xl border border-border-main shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-green-50 p-3 rounded-xl text-green-600"><DollarSign size={24} /></div>
            <div>
              <p className="text-[10px] text-text-sub font-bold uppercase tracking-widest">Saldo em Custódia</p>
              <h3 className="text-2xl font-extrabold text-text-main">R$ {stats.totalBalance.toFixed(2)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-surface p-6 rounded-2xl border border-border-main shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-orange-50 p-3 rounded-xl text-orange-600"><TrendingUp size={24} /></div>
            <div>
              <p className="text-[10px] text-text-sub font-bold uppercase tracking-widest">Saques Pendentes</p>
              <h3 className="text-2xl font-extrabold text-text-main">{stats.pendingWithdrawals}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawals List */}
      <div className="space-y-6">
        <h2 className="text-lg font-extrabold text-text-main flex items-center gap-2">
          <HistoryIcon size={20} className="text-primary" /> Solicitações de Saque
        </h2>
        
        <div className="space-y-4">
          {withdrawals.map((w) => (
            <motion.div 
              key={w.id}
              layout
              className="bg-surface p-6 rounded-2xl border border-border-main shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${
                  w.userRole === 'store' ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'
                }`}>
                  <DollarSign size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-text-main">{w.userName}</h4>
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded text-text-sub">
                      {w.userRole === 'store' ? 'Loja' : 'Entregador'}
                    </span>
                  </div>
                  <p className="text-xs text-text-sub mt-1">Chave PIX: <span className="font-mono font-medium text-text-main">{w.pixKey}</span></p>
                  <p className="text-[10px] text-text-sub mt-1">{w.createdAt?.toDate().toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0">
                <div className="text-right">
                  <p className="text-[10px] text-text-sub font-bold uppercase tracking-widest">Valor</p>
                  <p className="text-xl font-extrabold text-primary">R$ {w.amount.toFixed(2)}</p>
                </div>

                {w.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleRejectWithdrawal(w.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Rejeitar"
                    >
                      <XCircle size={24} />
                    </button>
                    <button 
                      onClick={() => handleApproveWithdrawal(w)}
                      className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                      title="Aprovar"
                    >
                      <CheckCircle size={24} />
                    </button>
                  </div>
                ) : (
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                    w.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {w.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                  </span>
                )}
              </div>
            </motion.div>
          ))}

          {withdrawals.length === 0 && (
            <div className="text-center py-20 bg-surface rounded-2xl border border-dashed border-border-main">
              <p className="text-text-sub text-sm">Nenhuma solicitação de saque encontrada.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
