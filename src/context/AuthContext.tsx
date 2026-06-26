import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('schedule_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('schedule_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase
        .from('users_login')
        .select('*')
        .eq('email_id', email)
        .eq('password', password)
        .single();

      if (error || !data) {
        return { error: 'Invalid email or password' };
      }

      const userData: User = {
        id: data.id,
        name: data.name,
        email: data.email_id,
        org_id: data.org_id,
        department: data.department,
        course: data.course,
        division: data.division,
        prn: data.prn,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      setUser(userData);
      localStorage.setItem('schedule_user', JSON.stringify(userData));
      return { error: null };
    } catch {
      return { error: 'An unexpected error occurred' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('schedule_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
