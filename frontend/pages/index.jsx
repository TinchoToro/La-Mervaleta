// pages/index.jsx – Redirige al dashboard o al login
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  useEffect(() => {
    if (cargando) return;
    if (usuario) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [usuario, cargando]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
