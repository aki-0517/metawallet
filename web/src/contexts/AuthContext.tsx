import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeWeb3Auth, login, logout, web3auth } from '../lib/web3auth';
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";

interface WalletProviders {
  evmProvider?: EthereumPrivateKeyProvider;
  solanaProvider?: SolanaPrivateKeyProvider;
}

interface User {
  email?: string;
  name?: string;
  profileImage?: string;
  verifier?: string;
  verifierId?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  providers: WalletProviders | null;
  isLoading: boolean;
  username: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setUsername: (username: string) => void;
  evmAddress: string | null;
  solanaAddress: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [providers, setProviders] = useState<WalletProviders | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsernameState] = useState<string | null>(null);
  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await initializeWeb3Auth();
        
        if (web3auth.connected && web3auth.status === 'connected') {
          try {
            const userInfo = await web3auth.getUserInfo();
            setUser(userInfo);
            setIsAuthenticated(true);
            
            // Get stored username from localStorage
            const storedUsername = localStorage.getItem('metawallet_username');
            if (storedUsername) {
              setUsernameState(storedUsername);
            }
          } catch (userInfoError) {
            console.warn('Failed to get user info, but Web3Auth is connected:', userInfoError);
            // Still set as authenticated if Web3Auth reports connected
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        
        // Don't throw error to prevent app crash
        // User can still try to login manually
        if (error instanceof Error) {
          console.error('Auth initialization failed, but app will continue to load');
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    const getAddresses = async () => {
      if (providers?.evmProvider) {
        try {
          const evmAccounts = await providers.evmProvider.getAccounts();
          if (evmAccounts.length > 0) {
            setEvmAddress(evmAccounts[0]);
          }
        } catch (error) {
          console.error('Error getting EVM address:', error);
        }
      }

      if (providers?.solanaProvider) {
        try {
          const solanaAccounts = await providers.solanaProvider.getAccounts();
          if (solanaAccounts.length > 0) {
            setSolanaAddress(solanaAccounts[0]);
          }
        } catch (error) {
          console.error('Error getting Solana address:', error);
        }
      }
    };

    getAddresses();
  }, [providers]);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await login();
      
      if (result) {
        setUser(result.user);
        setProviders(result.providers);
        setIsAuthenticated(true);
        
        // Check if user has a username stored
        const storedUsername = localStorage.getItem('metawallet_username');
        if (storedUsername) {
          setUsernameState(storedUsername);
        }
      } else {
        console.warn('Login failed or was cancelled');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        console.error('Login failed with:', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
      setUser(null);
      setProviders(null);
      setUsernameState(null);
      setEvmAddress(null);
      setSolanaAddress(null);
      localStorage.removeItem('metawallet_username');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const setUsername = (newUsername: string) => {
    setUsernameState(newUsername);
    localStorage.setItem('metawallet_username', newUsername);
  };

  const value: AuthContextType = {
    isAuthenticated,
    user,
    providers,
    isLoading,
    username,
    login: handleLogin,
    logout: handleLogout,
    setUsername,
    evmAddress,
    solanaAddress,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}