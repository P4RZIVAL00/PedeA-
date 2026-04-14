import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, addDoc, serverTimestamp, getDocs, setDoc, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Store, Order, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Store as StoreIcon, Package, CheckCircle, Clock, LogOut, Trash2, Utensils, Wallet as WalletIcon, MapPin } from 'lucide-react';
import Wallet from '../components/Wallet';

export default function StoreDashboard() {
  const { user, logout } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'wallet'>('orders');

  // Store Form
  const [storeName, setStoreName] = useState('');
  const [storeCategory, setStoreCategory] = useState<Store['category']>('restaurant');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');

  // Product Form
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodImage, setProdImage] = useState('');

  useEffect(() => {
    if (!user) return;

    const qStore = query(collection(db, 'stores'), where('ownerId', '==', user.uid));
    const unsubscribeStore = onSnapshot(qStore, (snapshot) => {
      if (!snapshot.empty) {
        setStore({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Store);
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'stores'));

    return () => unsubscribeStore();
  }, [user]);

  useEffect(() => {
    if (!store) return;

    const qOrders = query(collection(db, 'orders'), where('storeId', '==', store.id));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));

    const qProducts = query(collection(db, 'stores', store.id, 'products'));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `stores/${store.id}/products`));

    return () => {
      unsubscribeOrders();
      unsubscribeProducts();
    };
  }, [store]);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const newStore = {
        id: user.uid,
        name: storeName,
        category: storeCategory,
        address: storeAddress,
        phone: storePhone,
        ownerId: user.uid,
        image: 'https://picsum.photos/seed/store/800/400'
      };
      await setDoc(doc(db, 'stores', user.uid), newStore);
      setStore(newStore as Store);
      setIsCreatingStore(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'stores');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    try {
      await addDoc(collection(db, 'stores', store.id, 'products'), {
        name: prodName,
        price: parseFloat(prodPrice),
        image: prodImage || `https://picsum.photos/seed/${prodName}/400/400`,
        storeId: store.id
      });
      setProdName('');
      setProdPrice('');
      setProdImage('');
      setIsAddingProduct(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `stores/${store.id}/products`);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        status: newStatus,
        auditLogs: arrayUnion({
          userId: user?.uid,
          userName: user?.name,
          action: `Status updated to ${newStatus.replace(/_/g, ' ')}`,
          timestamp: new Date(),
          status: newStatus
        })
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  if (!store && !isCreatingStore) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-bg-main">
        <div className="bg-surface p-8 rounded-xl shadow-lg max-w-sm border border-border-main">
          <StoreIcon size={64} className="mx-auto text-primary mb-6" />
          <h2 className="text-2xl font-extrabold mb-2 tracking-tight">Bem-vindo ao PedeAí</h2>
          <p className="text-text-sub text-sm mb-8 font-medium">Você ainda não cadastrou sua loja. Vamos começar?</p>
          <button 
            onClick={() => setIsCreatingStore(true)}
            className="btn-primary w-full py-4 text-base uppercase tracking-widest"
          >
            Cadastrar Minha Loja
          </button>
          <button 
            onClick={() => logout()}
            className="mt-6 text-red-500 font-bold text-xs uppercase tracking-widest hover:underline flex items-center justify-center gap-2 w-full"
          >
            <LogOut size={14} /> Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  if (isCreatingStore) {
    return (
      <div className="min-h-screen bg-bg-main p-6">
        <div className="max-w-md mx-auto bg-surface p-8 rounded-xl border border-border-main shadow-lg">
          <h2 className="text-2xl font-extrabold text-primary mb-6 tracking-tight">Configurar Loja</h2>
          <form onSubmit={handleCreateStore} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-sub mb-1.5">Nome da Loja</label>
              <input required value={storeName} onChange={e => setStoreName(e.target.value)} className="w-full p-3 rounded-md border border-border-main text-sm" placeholder="Ex: Pizzaria do João" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-sub mb-1.5">Categoria</label>
              <select value={storeCategory} onChange={e => setStoreCategory(e.target.value as any)} className="w-full p-3 rounded-md border border-border-main text-sm">
                <option value="restaurant">Restaurante</option>
                <option value="market">Mercado</option>
                <option value="pharmacy">Farmácia</option>
                <option value="other">Outros</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-sub mb-1.5">Endereço</label>
              <input required value={storeAddress} onChange={e => setStoreAddress(e.target.value)} className="w-full p-3 rounded-md border border-border-main text-sm" placeholder="Rua Central, 123" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-sub mb-1.5">Telefone</label>
              <input required value={storePhone} onChange={e => setStorePhone(e.target.value)} className="w-full p-3 rounded-md border border-border-main text-sm" placeholder="(68) 99999-9999" />
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setIsCreatingStore(false)} className="flex-1 py-3 border border-border-main rounded-md text-sm font-bold text-text-sub">CANCELAR</button>
              <button type="submit" className="flex-1 btn-primary py-3">SALVAR</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main p-6 pb-24">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-text-main tracking-tight">{store?.name}</h1>
          <p className="text-xs text-text-sub font-bold uppercase tracking-widest">Painel do Lojista</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="status-pill">
            Aberto
          </div>
          <button 
            onClick={() => logout()}
            className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline flex items-center gap-1"
          >
            <LogOut size={12} /> Sair
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-surface p-4 rounded-lg border border-border-main shadow-sm">
          <p className="text-[10px] text-text-sub font-bold uppercase tracking-widest mb-1">Pedidos Hoje</p>
          <p className="text-2xl font-extrabold text-text-main">{orders.length}</p>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border-main shadow-sm">
          <p className="text-[10px] text-text-sub font-bold uppercase tracking-widest mb-1">Saldo (R$)</p>
          <p className="text-2xl font-extrabold text-primary">
            {(user?.balance || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border-main mb-8">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${
            activeTab === 'orders' ? 'border-primary text-primary' : 'border-transparent text-text-sub'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Package size={14} /> Pedidos
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${
            activeTab === 'products' ? 'border-primary text-primary' : 'border-transparent text-text-sub'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Utensils size={14} /> Produtos
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

      {/* Sections */}
      <div className="space-y-8">
        {activeTab === 'orders' && (
          <section>
            <h2 className="text-[11px] font-bold text-text-sub uppercase tracking-[1px] mb-4 ml-1">Pedidos Recentes</h2>
            <div className="space-y-4">
              {orders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-surface p-5 rounded-lg border border-border-main shadow-sm relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] text-text-sub font-bold uppercase tracking-widest">Pedido #{order.id.slice(-4)}</p>
                      <p className="font-bold text-sm text-text-main mt-1">{order.deliveryAddress}</p>
                      <p className="text-[10px] text-text-sub font-medium mt-1">Cliente: {order.customerName}</p>
                    </div>
                    <span className="status-pill text-[10px]">
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="space-y-2 mb-6 border-y border-border-main py-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-text-sub font-medium">{item.quantity}x {item.name}</span>
                        <span className="font-bold text-text-main">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {order.driverId && (
                    <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-100 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-1">Entregador vinculado</p>
                        <p className="text-sm font-bold text-blue-900">{order.driverName}</p>
                        <p className="text-[10px] text-blue-700 font-medium">{order.driverVehicle}</p>
                      </div>
                      <button 
                        onClick={() => {
                          const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(order.storeAddress || '')}&destination=${encodeURIComponent(order.deliveryAddress)}&travelmode=driving`;
                          window.open(url, '_blank');
                        }}
                        className="bg-blue-600 text-white p-2 rounded-lg flex items-center gap-2 shadow-sm hover:bg-blue-700 transition-all"
                      >
                        <MapPin size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Rota</span>
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {(order.status === 'created' || order.status === 'paid') && (
                      <button onClick={() => updateOrderStatus(order.id, 'accepted_by_store')} className="btn-primary flex-1">ACEITAR PEDIDO</button>
                    )}
                    {order.status === 'awaiting_payment' && (
                      <div className="flex-1 bg-bg-main p-2 rounded text-center border border-border-main">
                        <p className="text-[10px] font-bold text-text-sub uppercase tracking-widest">Aguardando Pagamento</p>
                      </div>
                    )}
                    {order.status === 'accepted_by_store' && (
                      <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="btn-primary flex-1 bg-text-sub">INICIAR PREPARO</button>
                    )}
                    {order.status === 'preparing' && (
                      <button onClick={() => updateOrderStatus(order.id, 'ready_for_delivery')} className="btn-primary flex-1">MARCAR COMO PRONTO</button>
                    )}
                    {order.status === 'ready_for_delivery' && (
                      <div className="flex-1 bg-green-50 p-2 rounded text-center border border-green-100">
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Aguardando Entregador</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {orders.length === 0 && (
                <div className="text-center py-8 text-text-sub border-2 border-dashed border-border-main rounded-xl">
                  <p className="text-sm">Nenhum pedido recebido ainda.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'products' && (
          <section>
            <div className="flex justify-between items-center mb-4 ml-1">
              <h2 className="text-[11px] font-bold text-text-sub uppercase tracking-[1px]">Meus Produtos</h2>
              <button onClick={() => setIsAddingProduct(true)} className="text-primary font-bold text-xs flex items-center gap-1">
                <Plus size={14} /> ADICIONAR
              </button>
            </div>
            
            <div className="grid gap-3">
              {products.map((product) => (
                <div key={product.id} className="bg-surface p-3 rounded-lg border border-border-main shadow-sm flex gap-4">
                  <div className="w-16 h-16 bg-bg-main rounded-md overflow-hidden flex-shrink-0 border border-border-main">
                    {product.image && <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                  </div>
                  <div className="flex-1 py-1">
                    <h3 className="font-bold text-sm text-text-main">{product.name}</h3>
                    <p className="text-primary font-bold text-sm mt-1">R$ {product.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div className="text-center py-8 text-text-sub border-2 border-dashed border-border-main rounded-xl">
                  <p className="text-sm">Nenhum produto cadastrado.</p>
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

      {/* Add Product Modal */}
      <AnimatePresence>
        {isAddingProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddingProduct(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-[20px] z-[70] p-6 shadow-2xl"
            >
              <h2 className="text-xl font-extrabold text-text-main tracking-tight mb-6">Novo Produto</h2>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-sub mb-1.5 ml-1">Nome do Produto</label>
                  <input required value={prodName} onChange={e => setProdName(e.target.value)} className="w-full p-3 rounded-md border border-border-main text-sm" placeholder="Ex: Pizza Calabresa" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-sub mb-1.5 ml-1">Preço (R$)</label>
                  <input required type="number" step="0.01" value={prodPrice} onChange={e => setProdPrice(e.target.value)} className="w-full p-3 rounded-md border border-border-main text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-sub mb-1.5 ml-1">URL da Imagem (Opcional)</label>
                  <input value={prodImage} onChange={e => setProdImage(e.target.value)} className="w-full p-3 rounded-md border border-border-main text-sm" placeholder="https://..." />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsAddingProduct(false)} className="flex-1 py-3 border border-border-main rounded-md text-sm font-bold text-text-sub">CANCELAR</button>
                  <button type="submit" className="flex-1 btn-primary py-3">ADICIONAR</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
