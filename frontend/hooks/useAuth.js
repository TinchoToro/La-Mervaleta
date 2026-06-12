// hooks/useAuth.js – Contexto de autenticación global
import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario]   = useState(null);
  const [cargando, setCargando] = useState(true);

  // Al montar, verificar si hay token guardado
  useEffect(() => {
    const token = authService.getToken();
    if (token) {
      authService.me()
        .then(setUsuario)
        .catch(() => authService.logout())
        .finally(() => setCargando(false));
    } else {
      setCargando(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await authService.login({ email, password });
    authService.saveToken(data.token);
    setUsuario(data.usuario);
    return data.usuario;
  };

  const register = async (formData) => {
    const data = await authService.register(formData);
    authService.saveToken(data.token);
    setUsuario(data.usuario);
    return data.usuario;
  };

  const logout = () => {
    authService.logout();
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
