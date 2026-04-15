import { useEffect, useState, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { messaging, db, auth } from '../firebase';
import { Toast } from '../components/NotificationToast';

export function useNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' ? Notification.permission : 'default'
  );

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((title: string, body: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, title, body }]);
    setTimeout(() => removeToast(id), 6000);
  }, [removeToast]);

  useEffect(() => {
    if (!messaging || !auth.currentUser) return;

    const requestPermission = async () => {
      try {
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm === 'granted') {
          const vapidKey = import.meta.env.VITE_VAPID_KEY;
          if (!vapidKey) {
            console.warn('VITE_VAPID_KEY is not set. Push notifications will not work.');
            return;
          }

          const currentToken = await getToken(messaging, {
            vapidKey: vapidKey
          });
          
          if (currentToken) {
            setToken(currentToken);
            // Save token to user document
            const userRef = doc(db, 'users', auth.currentUser!.uid);
            await updateDoc(userRef, {
              fcmTokens: arrayUnion(currentToken)
            });
          }
        }
      } catch (err) {
        console.error('Error getting notification permission/token:', err);
      }
    };

    requestPermission();

    // Listen for foreground messages
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      if (payload.notification) {
        addToast(payload.notification.title || 'Notificação', payload.notification.body || '');
      }
    });

    return () => unsubscribe();
  }, [auth.currentUser, addToast]);

  return { token, toasts, removeToast, permission };
}
