export type UserRole = 'customer' | 'store' | 'delivery' | 'admin';

export interface User {
  uid: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  cpf?: string;
  vehicleType?: 'bike' | 'motorcycle' | 'car';
  licensePlate?: string;
  isProfileComplete?: boolean;
  balance?: number;
}

export interface Withdrawal {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  amount: number;
  pixKey: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export interface Store {
  id: string;
  name: string;
  category: 'restaurant' | 'market' | 'pharmacy' | 'other';
  address: string;
  phone: string;
  ownerId: string;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  storeId: string;
}

export type OrderStatus = 
  | 'created' 
  | 'awaiting_payment' 
  | 'paid' 
  | 'accepted_by_store' 
  | 'preparing' 
  | 'ready_for_delivery' 
  | 'accepted_by_driver' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'completed'
  | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderAuditLog {
  userId: string;
  userName: string;
  action: string;
  timestamp: any;
  status: OrderStatus;
}

export interface Order {
  id: string;
  customerId: string;
  customerName?: string;
  storeId: string;
  storeName?: string;
  storeAddress?: string;
  items: OrderItem[];
  total: number;
  deliveryAddress: string;
  paymentMethod: 'pix' | 'cash' | 'mercadopago';
  status: OrderStatus;
  createdAt: any; // Firestore Timestamp
  driverId?: string;
  driverName?: string;
  driverVehicle?: string;
  deliveryPin?: string;
  paymentId?: string;
  auditLogs?: OrderAuditLog[];
}

export interface Delivery {
  id: string;
  orderId: string;
  driverId: string;
  status: 'pending' | 'active' | 'completed';
}
