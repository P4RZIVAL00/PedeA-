import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Bike, MapPin, Phone, CheckCircle, LogOut, Wallet as WalletIcon, List, MessageSquare } from 'lucide-react';
import Wallet from '../components/Wallet';
import Chat from '../components/Chat';

import { triggerNotification } from '../lib/notifications';

export default function DeliveryDashboard() {
  const { user, logout } = useAuth();
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'deliveries' | 'history' | 'wallet'>('deliveries');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  // Registration Form State
  const [cpf, setCpf] = useState('');
  const [vehicleType, setVehicleType] = useState<'bike' | 'motorcycle' | 'car'>('motorcycle');
  const [licensePlate, setLicensePlate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!user || !user.isProfileComplete) return;
    
    // Available orders (Ready for delivery status, no driver)
    const qAvailable = query(collection(db, 'orders'), where('status', '==', 'ready_for_delivery'));
    const unsubscribeAvailable = onSnapshot(qAvailable, (snapshot) => {
      setAvailableOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));

    // My active deliveries
    const qMy = query(collection(db, 'orders'), where('driverId', '==', user.uid));
    const unsubscribeMy = onSnapshot(qMy, (snapshot) => {
      setMyDeliveries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));

    return () => {
      unsubscribeAvailable();
      unsubscribeMy();
    };
  }, [user]);

  const handleRegisterDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        cpf,
        vehicleType,
        licensePlate: vehicleType === 'bike' ? '' : licensePlate,
        isProfileComplete: true
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user && !user.isProfileComplete) {
    return (
      <div className="min-h-screen bg-bg-main p-6 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface p-8 rounded-xl shadow-xl border border-border-main max-w-md w-full"
        >
          <div className="text-center mb-8">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bike className="text-primary" size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-text-main tracking-tight">Cadastro de Entregador</h1>
            <p className="text-sm text-text-sub mt-2">Complete seu perfil para começar a fazer entregas.</p>
          </div>

          <form onSubmit={handleRegisterDriver} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-text-sub uppercase tracking-widest mb-2">CPF</label>
              <input 
                type="text"
                required
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-text-sub uppercase tracking-widest mb-2">Tipo de Veículo</label>
              <select 
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as any)}
                className="input-field"
              >
                <option value="bike">Bicicleta</option>
                <option value="motorcycle">Moto</option>
                <option value="car">Carro</option>
              </select>
            </div>

            {vehicleType !== 'bike' && (
              <div>
                <label className="block text-[10px] font-bold text-text-sub uppercase tracking-widest mb-2">Placa do Veículo</label>
                <input 
                  type="text"
                  required
                  placeholder="ABC-1234"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="input-field"
                />
              </div>
            )}

            <button 
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-4 text-base mt-4"
            >
              {isSubmitting ? 'SALVANDO...' : 'CONCLUIR CADASTRO'}
            </button>
            
            <button 
              type="button"
              onClick={() => logout()}
              className="w-full text-[10px] font-bold text-text-sub uppercase tracking-widest hover:text-red-500 transition-colors mt-2"
            >
              Sair da conta
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const acceptDelivery = async (orderId: string) => {
    if (!user) return;
    setAcceptingId(orderId);
    setError(null);
    try {
      const order = availableOrders.find(o => o.id === orderId);
      
      await updateDoc(doc(db, 'orders', orderId), {
        driverId: user.uid,
        driverName: user.name,
        driverVehicle: `${user.vehicleType === 'bike' ? 'Bicicleta' : user.vehicleType === 'motorcycle' ? 'Moto' : 'Carro'} (${user.licensePlate || 'S/P'})`,
        status: 'accepted_by_driver',
        auditLogs: arrayUnion({
          userId: user.uid,
          userName: user.name,
          action: 'Delivery accepted by driver',
          timestamp: new Date(),
          status: 'accepted_by_driver'
        })
      });

      // Notify Customer
      if (order?.customerId) {
        triggerNotification({
          userId: order.customerId,
          title: 'Entregador a caminho!',
          body: `${user.name} aceitou sua entrega e está indo para a loja.`,
          data: { orderId }
        });
      }
    } catch (err) {
      console.error('Error accepting delivery:', err);
      setError('Erro ao aceitar entrega. Tente novamente.');
    } finally {
      setAcceptingId(null);
    }
  };

  const startDelivery = async (orderId: string) => {
    try {
      const order = myDeliveries.find(o => o.id === orderId);
      
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'out_for_delivery',
        auditLogs: arrayUnion({
          userId: user?.uid,
          userName: user?.name,
          action: 'Driver started delivery route',
          timestamp: new Date(),
          status: 'out_for_delivery'
        })
      });

      // Notify Customer
      if (order?.customerId) {
        triggerNotification({
          userId: order.customerId,
          title: 'Pedido saiu para entrega!',
          body: `O entregador ${user?.name} já está levando seu pedido.`,
          data: { orderId }
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const openRoute = (storeAddress: string, deliveryAddress: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(storeAddress)}&destination=${encodeURIComponent(deliveryAddress)}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const completeDelivery = async (order: Order, pin: string) => {
    if (pin !== order.deliveryPin) {
      setError('PIN de entrega incorreto!');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'delivered',
        auditLogs: arrayUnion({
          userId: user?.uid,
          userName: user?.name,
          action: 'Delivery completed with PIN validation',
          timestamp: new Date(),
          status: 'delivered'
        })
      });

      // Notify Customer
      if (order.customerId) {
        triggerNotification({
          userId: order.customerId,
          title: 'Pedido Entregue!',
          body: 'Obrigado por pedir no PedeAí. Bom apetite!',
          data: { orderId: order.id }
        });
      }
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main p-6 pb-24">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-text-main tracking-tight">Olá, {user?.name}</h1>
          <p className="text-xs text-text-sub font-bold uppercase tracking-widest">Central de Entregas</p>
        </div>
        <button 
          onClick={() => logout()}
          className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline flex items-center gap-1 mt-1"
        >
          <LogOut size={12} /> Sair
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border-main mb-8">
        <button 
          onClick={() => setActiveTab('deliveries')}
          className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${
            activeTab === 'deliveries' ? 'border-primary text-primary' : 'border-transparent text-text-sub'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <List size={14} /> Ativas
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${
            activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-text-sub'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <CheckCircle size={14} /> Histórico
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('wallet')}
          className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${
            activeTab === 'wallet' ? 'border-primary text-primary' : 'border-transparent text-text-sub'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <WalletIcon size={14} /> Carteira
          </div>
        </button>
      </div>

      <div className="space-y-8">
        {/* Success Toast */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-24 left-6 right-6 bg-green-600 text-white p-4 rounded-xl shadow-2xl z-[100] flex items-center gap-3 border-b-4 border-green-800"
            >
              <CheckCircle size={24} />
              <div>
                <p className="font-bold text-sm">Entrega Concluída!</p>
                <p className="text-[10px] opacity-90 uppercase tracking-widest font-bold">R$ 5,00 adicionados à sua carteira</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'deliveries' && (
          <>
            {/* Active Deliveries */}
            {myDeliveries.filter(o => o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cancelled').length > 0 && (
              <div>
                <h2 className="text-[11px] font-bold text-text-sub uppercase tracking-[1px] mb-4 ml-1 flex items-center gap-2">
                  <Bike size={14} className="text-primary" /> Minhas Entregas
                </h2>
                <div className="space-y-4">
                  {myDeliveries.filter(o => o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cancelled').map((order) => (
                    <motion.div
                      key={order.id}
                      layout
                      className="bg-primary text-white p-6 rounded-lg shadow-lg border-b-4 border-accent"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Pedido #{order.id.slice(-4)}</p>
                          <h3 className="text-lg font-bold mt-1">{order.deliveryAddress}</h3>
                          <p className="text-[10px] text-white/80 font-bold uppercase mt-1">Status: {order.status.replace(/_/g, ' ')}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="bg-white/20 p-2 rounded-full">
                            <MapPin size={20} />
                          </div>
                          {order.status !== 'cancelled' && order.status !== 'completed' && (
                            <button 
                              onClick={() => setActiveChatId(order.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-white/30 transition-colors"
                            >
                              <MessageSquare size={12} /> Chat
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mb-6 pt-4 border-t border-white/20">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/70 uppercase font-bold tracking-widest">Ganho</span>
                          <span className="text-lg font-bold">R$ 5,00</span>
                        </div>
                        <button 
                          onClick={() => openRoute(order.storeAddress || '', order.deliveryAddress)}
                          className="ml-auto bg-white/20 hover:bg-white/30 p-2 rounded-lg flex items-center gap-2 transition-all"
                        >
                          <MapPin size={16} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Ver Rota</span>
                        </button>
                      </div>

                      {order.status === 'accepted_by_driver' && (
                        <button 
                          onClick={() => startDelivery(order.id)}
                          className="w-full bg-white text-primary py-3 rounded-md font-bold text-sm shadow-md uppercase tracking-wider"
                        >
                          Confirmar Coleta (Iniciar Rota)
                        </button>
                      )}

                      {order.status === 'out_for_delivery' && (
                        <div className="space-y-3">
                          <div className="bg-white/10 p-3 rounded-lg border border-white/20">
                            <label className="block text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2">Digite o PIN do Cliente</label>
                            <input 
                              type="text"
                              maxLength={4}
                              placeholder="0000"
                              className="w-full bg-white/20 border-none text-white placeholder-white/50 font-bold text-center tracking-[10px] py-2 rounded focus:ring-2 focus:ring-white/50"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  completeDelivery(order, (e.target as HTMLInputElement).value);
                                }
                              }}
                            />
                          </div>
                          <p className="text-[9px] text-white/70 text-center italic">Peça o código de 4 dígitos ao cliente para finalizar.</p>
                        </div>
                      )}
                      
                      {error && (
                        <p className="text-[10px] text-white font-bold mt-2 text-center uppercase tracking-widest bg-red-500/50 py-1 rounded">{error}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Orders */}
            <div>
              <h2 className="text-[11px] font-bold text-text-sub uppercase tracking-[1px] mb-4 ml-1">Disponíveis para Coleta</h2>
              <div className="space-y-4">
                {availableOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface p-5 rounded-lg border border-border-main shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[10px] text-text-sub font-bold uppercase tracking-widest">Pronto para Coleta</p>
                        <h3 className="font-bold text-sm text-text-main mt-1">{order.deliveryAddress}</h3>
                      </div>
                      <span className="status-pill">
                        R$ 5,00
                      </span>
                    </div>
                    <button 
                      onClick={() => acceptDelivery(order.id)}
                      disabled={acceptingId === order.id}
                      className="btn-primary w-full"
                    >
                      {acceptingId === order.id ? 'ACEITANDO...' : 'ACEITAR ENTREGA'}
                    </button>
                    {error && acceptingId === order.id && (
                      <p className="text-[10px] text-red-500 font-bold mt-2 text-center uppercase tracking-widest">{error}</p>
                    )}
                  </motion.div>
                ))}
                {availableOrders.length === 0 && (
                  <div className="text-center py-12 text-text-sub">
                    <p className="text-sm">Nenhum pedido disponível no momento.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <section>
            <h2 className="text-[11px] font-bold text-text-sub uppercase tracking-[1px] mb-4 ml-1">Entregas Concluídas</h2>
            <div className="space-y-4">
              {myDeliveries.filter(o => o.status === 'delivered').map((order) => (
                <div key={order.id} className="bg-surface p-4 rounded-lg border border-border-main shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-text-sub font-bold uppercase tracking-widest">Pedido #{order.id.slice(-4)}</p>
                      <h3 className="font-bold text-sm text-text-main mt-1">{order.deliveryAddress}</h3>
                      <p className="text-[10px] text-green-600 font-bold uppercase mt-1">Entregue com sucesso</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-text-main">R$ 5,00</p>
                      <CheckCircle size={16} className="text-green-500 ml-auto mt-1" />
                    </div>
                  </div>
                </div>
              ))}
              {myDeliveries.filter(o => o.status === 'delivered').length === 0 && (
                <div className="text-center py-12 text-text-sub">
                  <p className="text-sm">Nenhuma entrega concluída ainda.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'wallet' && (
          <section>
            <h2 className="text-[11px] font-bold text-text-sub uppercase tracking-[1px] mb-4 ml-1">Minha Carteira</h2>
            <Wallet />
          </section>
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
