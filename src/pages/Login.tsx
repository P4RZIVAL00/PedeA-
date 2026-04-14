import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserRole } from '../types';
import { motion } from 'motion/react';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      if (!userDoc.exists()) {
        // New user via Google, need to set role
        setTempUser(result.user);
        setShowRoleSelection(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!tempUser) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', tempUser.uid), {
        uid: tempUser.uid,
        name: tempUser.displayName || name,
        phone: phone || '',
        role,
        isProfileComplete: role !== 'delivery'
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          name,
          phone,
          role,
          isProfileComplete: role !== 'delivery'
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('O login por e-mail não está ativado. Por favor, use o Login do Google abaixo.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (showRoleSelection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface p-8 rounded-[20px] shadow-xl border border-border-main max-w-md w-full text-center"
        >
          <h2 className="text-2xl font-extrabold text-primary mb-4">Quase lá!</h2>
          <p className="text-text-sub mb-6">Como você deseja usar o PedeAí?</p>
          
          <div className="grid grid-cols-1 gap-3 mb-8">
            {(['customer', 'store', 'delivery', 'admin'] as UserRole[])
              .filter(r => r !== 'admin' || tempUser?.email === 'elissonnascimento171@gmail.com')
              .map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`py-4 rounded-xl font-bold border-2 transition-all ${
                  role === r 
                    ? 'border-primary bg-green-50 text-primary' 
                    : 'border-border-main text-text-sub hover:border-accent'
                }`}
              >
                {r === 'customer' ? 'Sou Cliente' : r === 'store' ? 'Tenho uma Loja' : r === 'delivery' ? 'Sou Entregador' : 'Administrador'}
              </button>
            ))}
          </div>

          <button
            onClick={handleCompleteRegistration}
            disabled={loading}
            className="btn-primary w-full py-4 text-base uppercase tracking-widest"
          >
            {loading ? 'Salvando...' : 'Começar a usar'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-main p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface p-8 rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-border-main max-w-md w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-primary mb-1 tracking-tight">PedeAí</h1>
          <p className="text-text-sub text-sm">Porto Walter - Acre</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-sub mb-1.5 ml-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-md border border-border-main focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-sub mb-1.5 ml-1">Telefone</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-md border border-border-main focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
                  placeholder="(68) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-sub mb-1.5 ml-1">Eu sou um:</label>
                <div className="grid grid-cols-1 gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    {(['customer', 'store', 'delivery'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`py-2 rounded-md text-xs font-bold border transition-all ${
                          role === r 
                            ? 'bg-primary text-white border-primary' 
                            : 'bg-white text-text-sub border-border-main hover:border-accent'
                        }`}
                      >
                        {r === 'customer' ? 'Cliente' : r === 'store' ? 'Loja' : 'Entregador'}
                      </button>
                    ))}
                  </div>
                  {email === 'elissonnascimento171@gmail.com' && (
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`py-2 rounded-md text-xs font-bold border transition-all ${
                        role === 'admin' 
                          ? 'bg-primary text-white border-primary' 
                          : 'bg-white text-text-sub border-border-main hover:border-accent'
                      }`}
                    >
                      Administrador
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-sub mb-1.5 ml-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-md border border-border-main focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-sub mb-1.5 ml-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-md border border-border-main focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 text-base"
          >
            {loading ? 'Carregando...' : isSignUp ? 'CRIAR CONTA' : 'ENTRAR'}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-main"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-surface px-2 text-text-sub font-bold">Ou</span></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border border-border-main py-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-all shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            ENTRAR COM GOOGLE
          </button>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary text-sm font-bold hover:underline text-center"
          >
            {isSignUp ? 'Já tem uma conta? Entrar' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
