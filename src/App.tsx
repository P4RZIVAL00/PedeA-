import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Login from './pages/Login';
import CustomerHome from './pages/CustomerHome';
import StoreDetails from './pages/StoreDetails';
import StoreDashboard from './pages/StoreDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import OrderTracking from './pages/OrderTracking';
import AdminDashboard from './pages/AdminDashboard';

import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const { user, loading, isAuthReady } = useAuth();

  if (!isAuthReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="animate-pulse text-primary font-extrabold text-3xl tracking-tight">PedeAí</div>
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
        {user.role === 'customer' && (
          <>
            <Route path="/" element={<CustomerHome />} />
            <Route path="/store/:storeId" element={<StoreDetails />} />
            <Route path="/orders" element={<OrderTracking />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
        {user.role === 'store' && (
          <>
            <Route path="/" element={<StoreDashboard />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
        {user.role === 'delivery' && (
          <>
            <Route path="/" element={<DeliveryDashboard />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
        {user.role === 'admin' && (
          <>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
      {user.role === 'customer' && <BottomNav />}
    </ErrorBoundary>
  );
}
