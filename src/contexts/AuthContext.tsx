import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../supabaseClient'; // make sure this path is correct

interface User {
  id: string;
  name: string;
  email: string;
  onboardingComplete: boolean;
  paymentVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkPaymentStatus: () => Promise<boolean>;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initComplete, setInitComplete] = useState(false);

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
    setInitComplete(true);
  }, []);

  const login = async (email: string, password: string) => {
  setIsLoading(true);
  try {
    // This is REAL Supabase login!
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      throw error || new Error('Login failed');
    }

    // Store the user object
    setUser({
      id: data.user.id,
      name: data.user.user_metadata?.full_name || '',
      email: data.user.email,
      onboardingComplete: false,      // You may want to load this from your database!
      paymentVerified: false,         // Same as above
    });
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    toast.success('Login successful');
  } catch (error) {
    toast.error('Login failed');
    throw error;
  } finally {
    setIsLoading(false);
  }
};

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
    toast.info('You have been logged out');
  };

  const checkPaymentStatus = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      // This would normally be an API call to Skool payment verification
      // Simulating payment verification for demo purposes
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Always return true for demo
      if (user) {
        const updatedUser = { ...user, paymentVerified: true };
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
        return true;
      }
      return false;
    } catch (error) {
      toast.error('Failed to verify payment status');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    }
  };

  // Don't render anything until initial check is complete
  if (!initComplete) {
    return null;
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      checkPaymentStatus,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};