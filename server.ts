import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import * as admin from 'firebase-admin';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let db: any;

try {
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    console.log('Initializing Firebase Admin with Project:', firebaseConfig.projectId);
    
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
    
    // Use the specific database ID from config
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    db = getFirestore(dbId);
    console.log('Using Firestore Database:', dbId);
  } else {
    console.log('Initializing Firebase Admin with Default Credentials');
    if (admin.apps.length === 0) admin.initializeApp();
    db = getFirestore();
  }
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error);
  if (admin.apps.length === 0) admin.initializeApp();
  db = getFirestore();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mercado Pago Setup
  const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
    options: { timeout: 5000 }
  });

  // API Routes
  app.post('/api/create-preference', async (req, res) => {
    try {
      const { items, orderId, customerEmail } = req.body;
      
      const preference = new Preference(client);
      const result = await preference.create({
        body: {
          items: items.map((item: any) => ({
            id: item.productId,
            title: item.name,
            unit_price: Number(item.price),
            quantity: Number(item.quantity),
            currency_id: 'BRL'
          })),
          external_reference: orderId,
          notification_url: `${process.env.APP_URL}/api/webhook`,
          back_urls: {
            success: `${process.env.APP_URL}/order/${orderId}`,
            failure: `${process.env.APP_URL}/order/${orderId}`,
            pending: `${process.env.APP_URL}/order/${orderId}`
          },
          auto_return: 'approved',
        }
      });

      res.json({ id: result.id, init_point: result.init_point });
    } catch (error) {
      console.error('Mercado Pago Error:', error);
      res.status(500).json({ error: 'Failed to create preference' });
    }
  });

  app.post('/api/simulate-payment', async (req, res) => {
    const { orderId } = req.body;
    console.log('Simulating payment for order:', orderId);
    try {
      if (!orderId) {
        return res.status(400).json({ error: 'orderId is required' });
      }

      const orderRef = db.doc(`orders/${orderId}`);
      console.log('Order Reference Path:', orderRef.path);
      const orderDoc = await orderRef.get();
      
      if (!orderDoc.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const orderData = orderDoc.data();
      if (orderData?.status !== 'awaiting_payment') {
        return res.status(400).json({ 
          error: `Status atual: ${orderData?.status}. Precisa ser "awaiting_payment".` 
        });
      }

      await orderRef.update({
        status: 'paid',
        auditLogs: FieldValue.arrayUnion({
          userId: 'system',
          userName: 'Mercado Pago',
          action: 'Pagamento confirmado (Simulação)',
          timestamp: new Date(),
          status: 'paid'
        })
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Simulation Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/webhook', async (req, res) => {
    const { action, data, type } = req.body;
    const resourceId = data?.id || req.query.id;
    const resourceType = type || req.query.topic;

    if (resourceType === 'payment') {
      try {
        // Fetch payment details from MP
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
          }
        });
        const paymentData = await response.json();

        if (paymentData.status === 'approved') {
          const orderId = paymentData.external_reference;
          const orderRef = db.collection('orders').doc(orderId);
          
          await orderRef.update({
            status: 'paid',
            paymentId: resourceId,
            auditLogs: admin.firestore.FieldValue.arrayUnion({
              userId: 'system',
              userName: 'Mercado Pago Webhook',
              action: `Payment ${resourceId} approved`,
              timestamp: new Date(),
              status: 'paid'
            })
          });
          console.log('Order updated to paid:', orderId);
        }
      } catch (error) {
        console.error('Webhook Error:', error);
      }
    }
    
    res.sendStatus(200);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
