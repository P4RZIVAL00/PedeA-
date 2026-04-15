import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';

export interface Toast {
  id: string;
  title: string;
  body: string;
}

interface NotificationToastProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export default function NotificationToast({ toasts, onClose }: NotificationToastProps) {
  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            className="pointer-events-auto bg-surface border border-border-main shadow-2xl rounded-2xl p-4 w-80 flex gap-4 items-start relative overflow-hidden group"
          >
            {/* Accent Bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
            
            <div className="bg-primary/10 p-2 rounded-full shrink-0">
              <Bell size={20} className="text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-text-main truncate">{toast.title}</h4>
              <p className="text-xs text-text-sub mt-1 leading-relaxed line-clamp-2">{toast.body}</p>
            </div>

            <button 
              onClick={() => onClose(toast.id)}
              className="p-1 hover:bg-bg-main rounded-full text-text-sub transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
