import { Home, ClipboardList, User, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function BottomNav() {
  const location = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { icon: Home, label: 'Início', path: '/' },
    { icon: ClipboardList, label: 'Pedidos', path: '/orders' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border-main px-6 py-3 flex justify-between items-center z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-all ${
              isActive ? 'text-primary' : 'text-text-sub hover:text-text-main'
            }`}
          >
            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
      <button
        onClick={() => logout()}
        className="flex flex-col items-center gap-1 text-text-sub hover:text-red-500 transition-all"
      >
        <LogOut size={20} />
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Sair</span>
      </button>
    </div>
  );
}
