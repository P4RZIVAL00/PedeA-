import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Store, Product, OrderItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function StoreDetails() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash' | 'mercadopago'>('pix');
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (!storeId) return;

    const fetchStore = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'stores', storeId));
        if (docSnap.exists()) {
          setStore({ id: docSnap.id, ...docSnap.data() } as Store);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `stores/${storeId}`);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribeProducts = onSnapshot(collection(db, 'stores', storeId, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `stores/${storeId}/products`));

    fetchStore();
    return () => unsubscribeProducts();
  }, [storeId]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryFee = 5;

  const handleCheckout = async () => {
    if (!user || !storeId || cart.length === 0 || !address) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();
      const orderData = {
        customerId: user.uid,
        customerName: user.name,
        storeId,
        storeName: store.name,
        storeAddress: store.address,
        items: cart,
        total: total + deliveryFee,
        deliveryAddress: address,
        paymentMethod,
        status: paymentMethod === 'cash' ? 'created' : 'awaiting_payment',
        deliveryPin,
        createdAt: serverTimestamp(),
        auditLogs: [{
          userId: user.uid,
          userName: user.name,
          action: 'Order created',
          timestamp: new Date(),
          status: paymentMethod === 'cash' ? 'created' : 'awaiting_payment'
        }]
      };

      console.log('Creating order with status:', orderData.status, 'and payment method:', paymentMethod);
      const docRef = await addDoc(collection(db, 'orders'), orderData);

      if (paymentMethod === 'mercadopago') {
        setIsPaying(true);
        const response = await fetch('/api/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart,
            orderId: docRef.id,
            customerEmail: user.email || ''
          })
        });
        const data = await response.json();
        if (data.init_point) {
          window.location.href = data.init_point;
        }
      } else {
        alert('Pedido realizado com sucesso!');
        navigate('/orders');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'orders');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-bg-main"><p className="text-text-sub font-bold animate-pulse">CARREGANDO...</p></div>;
  if (!store) return <div className="min-h-screen flex items-center justify-center bg-bg-main"><p className="text-text-sub font-bold">LOJA NÃO ENCONTRADA</p></div>;

  return (
    <div className="min-h-screen bg-bg-main pb-24">
      {/* Header */}
      <div className="relative h-48 bg-primary">
        {store.image && (
          <img src={store.image} alt={store.name} className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
        )}
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 bg-white/20 backdrop-blur-md p-2 rounded-full text-white"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="px-4 -mt-10 relative z-10">
        <div className="bg-surface p-6 rounded-xl border border-border-main shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
          <h1 className="text-2xl font-extrabold text-text-main tracking-tight">{store.name}</h1>
          <p className="text-text-sub text-xs font-medium mt-1">{store.address}</p>
          <div className="flex items-center gap-6 mt-5">
            <div className="flex flex-col">
              <span className="text-[10px] text-text-sub uppercase font-bold tracking-widest">Entrega</span>
              <span className="text-primary font-bold text-sm">25-35 min</span>
            </div>
            <div className="w-px h-8 bg-border-main" />
            <div className="flex flex-col">
              <span className="text-[10px] text-text-sub uppercase font-bold tracking-widest">Taxa</span>
              <span className="text-primary font-bold text-sm">R$ 5,00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="p-4 space-y-4">
        <h2 className="text-[11px] font-bold text-text-sub uppercase tracking-[1px] mb-1 ml-1">Cardápio</h2>
        <div className="grid gap-3">
          {products.map((product) => (
            <div key={product.id} className="bg-surface p-3 rounded-lg border border-border-main shadow-sm flex gap-4 hover:border-accent transition-all">
              <div className="w-20 h-20 bg-bg-main rounded-md overflow-hidden flex-shrink-0 border border-border-main">
                {product.image && <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
              </div>
              <div className="flex-1 py-1">
                <h3 className="font-bold text-sm text-text-main">{product.name}</h3>
                <p className="text-primary font-bold text-sm mt-1">R$ {product.price.toFixed(2)}</p>
              </div>
              <button 
                onClick={() => addToCart(product)}
                className="self-center bg-primary text-white p-2.5 rounded-md shadow-md active:scale-95 transition-all"
              >
                <Plus size={18} />
              </button>
            </div>
          ))}
          {products.length === 0 && (
            <div className="text-center py-12 text-text-sub border-2 border-dashed border-border-main rounded-xl">
              <p className="text-sm">Nenhum produto disponível nesta loja.</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-50">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-primary text-white p-4 rounded-lg font-bold flex justify-between items-center shadow-xl"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">{cart.length}</div>
              <span className="text-sm uppercase tracking-wider">Ver Carrinho</span>
            </div>
            <span className="text-sm">R$ {total.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Cart Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-[20px] z-[70] max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-extrabold text-text-main tracking-tight">Seu Pedido</h2>
                <button onClick={() => setIsCartOpen(false)} className="text-text-sub"><Minus size={24} /></button>
              </div>

              <div className="space-y-4 mb-6">
                {cart.map((item) => (
                  <div key={item.productId} className="flex justify-between items-center border-b border-border-main pb-4">
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-text-main">{item.name}</h4>
                      <p className="text-xs text-text-sub">R$ {(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-bg-main p-1 rounded-md border border-border-main">
                      <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 text-primary"><Minus size={14} /></button>
                      <span className="font-bold text-xs w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 text-primary"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.productId)} className="ml-4 text-red-500"><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>

              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-[10px] font-bold text-text-sub uppercase tracking-widest mb-1.5 ml-1">Endereço de Entrega</label>
                  <input 
                    type="text" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, bairro..."
                    className="w-full bg-bg-main border border-border-main rounded-md p-3.5 text-sm outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-sub uppercase tracking-widest mb-1.5 ml-1">Forma de Pagamento</label>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setPaymentMethod('pix')}
                        className={`p-3 rounded-md font-bold text-xs border-2 transition-all ${paymentMethod === 'pix' ? 'border-primary bg-green-50 text-primary' : 'border-border-main text-text-sub'}`}
                      >
                        PIX
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('cash')}
                        className={`p-3 rounded-md font-bold text-xs border-2 transition-all ${paymentMethod === 'cash' ? 'border-primary bg-green-50 text-primary' : 'border-border-main text-text-sub'}`}
                      >
                        DINHEIRO
                      </button>
                    </div>
                    <button 
                      onClick={() => setPaymentMethod('mercadopago')}
                      className={`p-3 rounded-md font-bold text-xs border-2 transition-all flex items-center justify-center gap-2 ${paymentMethod === 'mercadopago' ? 'border-primary bg-green-50 text-primary' : 'border-border-main text-text-sub'}`}
                    >
                      <img src="https://www.mercadopago.com/instore/merchant/static/images/mp-logo.png" alt="MP" className="h-4" />
                      CARTÃO / MERCADO PAGO
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-border-main pt-5 space-y-2 mb-8">
                <div className="flex justify-between text-xs text-text-sub font-medium">
                  <span>Subtotal</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-text-sub font-medium">
                  <span>Taxa de Entrega</span>
                  <span>R$ {deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-extrabold text-text-main pt-2">
                  <span>Total</span>
                  <span className="text-primary">R$ {(total + deliveryFee).toFixed(2)}</span>
                </div>
              </div>

              <button 
                onClick={handleCheckout}
                disabled={loading || isPaying || !address}
                className="btn-primary w-full py-4 text-base uppercase tracking-widest"
              >
                {loading || isPaying ? 'PROCESSANDO...' : 'Finalizar Pedido'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
