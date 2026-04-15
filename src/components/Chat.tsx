import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Send, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerNotification } from '../lib/notifications';
import { Order, Store } from '../types';

interface ChatProps {
  orderId: string;
  onClose: () => void;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: any;
}

export default function Chat({ orderId, onClose }: ChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [storeOwnerId, setStoreOwnerId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const orderSnap = await getDoc(doc(db, 'orders', orderId));
        if (orderSnap.exists()) {
          const orderData = orderSnap.data() as Order;
          setOrder(orderData);
          
          // Fetch store owner ID
          const storeSnap = await getDoc(doc(db, 'stores', orderData.storeId));
          if (storeSnap.exists()) {
            setStoreOwnerId((storeSnap.data() as Store).ownerId);
          }
        }
      } catch (err) {
        console.error('Error fetching order details for chat:', err);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  useEffect(() => {
    const q = query(
      collection(db, 'orders', orderId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [orderId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      await addDoc(collection(db, 'orders', orderId, 'messages'), {
        senderId: user.uid,
        senderName: user.name,
        text: newMessage.trim(),
        timestamp: serverTimestamp()
      });

      // Notify other participants
      const recipients = new Set<string>();
      if (order) {
        if (order.customerId !== user.uid) recipients.add(order.customerId);
        if (storeOwnerId && storeOwnerId !== user.uid) recipients.add(storeOwnerId);
        if (order.driverId && order.driverId !== user.uid) recipients.add(order.driverId);
      }

      recipients.forEach(recipientId => {
        triggerNotification({
          userId: recipientId,
          title: `Nova mensagem de ${user.name}`,
          body: newMessage.trim(),
          data: { orderId, type: 'chat' }
        });
      });

      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div className="bg-surface w-full max-w-lg h-[80vh] sm:h-[600px] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-border-main">
        {/* Header */}
        <div className="p-4 border-b border-border-main flex items-center justify-between bg-surface">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <MessageSquare size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-text-main">Chat do Pedido</h3>
              <p className="text-[10px] text-text-sub uppercase tracking-widest">#{orderId.slice(-6)}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-bg-main rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg-main/30"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <MessageSquare size={48} className="text-text-sub/20 mb-4" />
              <p className="text-text-sub text-sm font-medium">Nenhuma mensagem ainda.<br/>Inicie a conversa!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex flex-col ${msg.senderId === user?.uid ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                  msg.senderId === user?.uid 
                    ? 'bg-primary text-white rounded-tr-none' 
                    : 'bg-surface text-text-main border border-border-main rounded-tl-none'
                }`}>
                  <p className="font-bold text-[10px] mb-1 opacity-70 uppercase tracking-tighter">
                    {msg.senderId === user?.uid ? 'Você' : msg.senderName}
                  </p>
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
                <span className="text-[9px] text-text-sub mt-1 px-1">
                  {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <form 
          onSubmit={handleSendMessage}
          className="p-4 bg-surface border-t border-border-main flex gap-2"
        >
          <input 
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-bg-main border border-border-main rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-primary text-white p-3 rounded-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg shadow-primary/20"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
