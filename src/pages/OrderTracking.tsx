import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Order } from '../types';
import { motion } from 'motion/react';
import { Clock, CheckCircle, Package, Truck, MapPin, Bike, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Chat from '../components/Chat';
import { AnimatePresence } from 'motion/react';

const STATUS_MAP = {
  created: { label: 'Criado', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
  awaiting_payment: { label: 'Aguardando Pagamento', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
  paid: { label: 'Pago', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
  accepted_by_store: { label: 'Aceito pela Loja', icon: CheckCircle, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  preparing: { label: 'Preparando', icon: Package, color: 'text-orange-500', bg: 'bg-orange-50' },
  ready_for_delivery: { label: 'Pronto para Coleta', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
  accepted_by_driver: { label: 'Entregador Vinculado', icon: Bike, color: 'text-blue-600', bg: 'bg-blue-50' },
  out_for_delivery: { label: 'Em Entrega', icon: Truck, color: 'text-purple-500', bg: 'bg-purple-50' },
  delivered: { label: 'Entregue', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  completed: { label: 'Concluído', icon: CheckCircle, color: 'text-gray-500', bg: 'bg-gray-100' },
  cancelled: { label: 'Cancelado', icon: Clock, color: 'text-red-500', bg: 'bg-red-50' },
};

export default function OrderTracking() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'orders'), where('customerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      console.log('OrderTracking: Received orders update:', ordersData.length, 'orders');
      setOrders(ordersData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (err) => {
      console.error('OrderTracking: Snapshot error:', err);
      handleFirestoreError(err, OperationType.LIST, 'orders');
    });
    return () => unsubscribe();
  }, [user]);

  const confirmCompletion = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'completed',
        auditLogs: arrayUnion({
          userId: user?.uid,
          userName: user?.name,
          action: 'Customer confirmed receipt',
          timestamp: new Date(),
          status: 'completed'
        })
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const simulatePayment = async (orderId: string) => {
    setSimulatingId(orderId);
    try {
      const response = await fetch('/api/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Erro ao simular pagamento');
      }
      
      console.log('Simulation successful, waiting for Firestore update...');
      // Success is handled by onSnapshot listener
    } catch (err: any) {
      console.error('Simulation Error:', err);
      alert(err.message);
    } finally {
      setSimulatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main p-6 pb-24">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/')} className="p-2 bg-surface border border-border-main rounded-full shadow-sm">
          <Truck className="text-primary" />
        </button>
        <h1 className="text-2xl font-extrabold text-text-main tracking-tight">Meus Pedidos</h1>
      </div>

      <div className="space-y-6">
        {orders.map((order) => {
          const status = STATUS_MAP[order.status] || STATUS_MAP.created;
          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface p-5 rounded-lg border border-border-main shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] text-text-sub font-bold uppercase tracking-widest">Pedido #{order.id.slice(-4)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <status.icon size={14} className={status.color} />
                    <span className={`text-xs font-bold uppercase tracking-wide ${status.color}`}>{status.label}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-extrabold text-text-main text-sm">R$ {order.total.toFixed(2)}</span>
                  {order.status !== 'cancelled' && order.status !== 'completed' && (
                    <button 
                      onClick={() => setActiveChatId(order.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-primary/20 transition-colors"
                    >
                      <MessageSquare size={12} /> Chat
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-6 border-y border-border-main py-3">
                {order.items.map((item, idx) => (
                  <p key={idx} className="text-xs text-text-sub font-medium">
                    {item.quantity}x {item.name}
                  </p>
                ))}
              </div>

              <div className="flex items-center gap-3 p-3 bg-bg-main rounded-md border border-border-main">
                <MapPin size={16} className="text-text-sub" />
                <p className="text-[10px] text-text-sub font-bold uppercase tracking-widest truncate">{order.deliveryAddress}</p>
              </div>

              {order.status !== 'delivered' && order.status !== 'completed' && order.status !== 'cancelled' && (
                <div className="mt-4 p-4 bg-bg-main rounded-lg border border-dashed border-primary/30 flex flex-col items-center justify-center">
                  <p className="text-[10px] text-text-sub font-bold uppercase tracking-widest mb-2">PIN de Entrega</p>
                  <p className="text-3xl font-black text-primary tracking-[10px] ml-[10px]">{order.deliveryPin}</p>
                  <p className="text-[9px] text-text-sub mt-2 text-center uppercase font-bold">Informe este código ao entregador no momento da entrega</p>
                </div>
              )}

              {order.status === 'awaiting_payment' && (
                <div className="mt-4 space-y-2">
                  <button 
                    onClick={() => simulatePayment(order.id)}
                    disabled={simulatingId === order.id}
                    className="w-full btn-primary py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    {simulatingId === order.id ? 'PROCESSANDO...' : 'SIMULAR PAGAMENTO (TESTE)'}
                  </button>
                  <p className="text-[9px] text-text-sub text-center uppercase font-bold">Apenas para demonstração do fluxo</p>
                </div>
              )}

              {order.status === 'delivered' && (
                <button 
                  onClick={() => confirmCompletion(order.id)}
                  className="w-full mt-4 btn-primary py-3"
                >
                  CONFIRMAR RECEBIMENTO
                </button>
              )}

              {(order.status === 'out_for_delivery' || order.status === 'accepted_by_driver') && (
                <div className="mt-4 p-4 bg-primary rounded-lg text-white space-y-4 border-b-4 border-accent">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-2 rounded-full">
                      <Bike size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Entregador</p>
                      <p className="font-bold text-sm">{order.driverName}</p>
                      <p className="text-[10px] text-white/70 font-medium">{order.driverVehicle}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(order.storeAddress || '')}&destination=${encodeURIComponent(order.deliveryAddress)}&travelmode=driving`;
                      window.open(url, '_blank');
                    }}
                    className="w-full bg-white text-primary py-2 rounded-md font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <MapPin size={14} /> Acompanhar Rota
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
        {orders.length === 0 && (
          <div className="text-center py-20 text-text-sub">
            <Package size={64} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm">Você ainda não fez nenhum pedido.</p>
            <button 
              onClick={() => navigate('/')}
              className="mt-4 text-primary font-bold text-sm uppercase tracking-widest"
            >
              Começar a comprar
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {activeChatId && (
          <Chat 
            orderId={activeChatId} 
            onClose={() => setActiveChatId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
