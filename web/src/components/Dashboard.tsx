import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SendMoney } from './SendMoney';
import { TransactionHistory } from './TransactionHistory';
import { getEvmBalances } from '../lib/evm';
import { getSolanaBalances } from '../lib/solana';

interface AssetBalance {
  usdc: number;
}

interface ChainBalances {
  ethereum: AssetBalance;
  solana: AssetBalance;
}

export function Dashboard() {
  const { user, username, evmAddress, solanaAddress, logout } = useAuth();
  const [balances, setBalances] = useState<ChainBalances>({
    ethereum: { usdc: 0 },
    solana: { usdc: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showAddresses, setShowAddresses] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'history'>('overview');

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        setIsLoading(true);
        const usdcEvm = (import.meta as any).env?.VITE_USDC_SEPOLIA_ADDRESS as string | undefined;
        const usdcSol = (import.meta as any).env?.VITE_USDC_SOLANA_MINT as string | undefined;

        const [evm, sol] = await Promise.all([
          evmAddress
            ? getEvmBalances({
                walletAddress: evmAddress as any,
                usdcAddress: usdcEvm as any,
              })
            : Promise.resolve({ usdc: 0 }),
          solanaAddress
            ? getSolanaBalances({ owner: solanaAddress, usdcMint: usdcSol })
            : Promise.resolve({ usdc: 0 }),
        ]);

        setBalances({
          ethereum: { usdc: evm.usdc },
          solana: { usdc: sol.usdc },
        });
      } catch (err) {
        console.error('Failed to load balances:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalances();
  }, [evmAddress, solanaAddress]);

  const totalUSD = 
    balances.ethereum.usdc + 
    balances.solana.usdc;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="bg-black bg-opacity-20 backdrop-blur-lg border-b border-white border-opacity-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Metawallet</h1>
              {username && <p className="text-sm text-gray-300">@{username}</p>}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-300">Welcome back</p>
              <p className="text-white font-medium">{user?.name || user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-black bg-opacity-10 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-1">
            {[
              { key: 'overview', label: 'Overview', icon: '📊' },
              { key: 'send', label: 'Send', icon: '💸' },
              { key: 'history', label: 'History', icon: '📋' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-6 py-3 font-medium transition-all ${
                  activeTab === tab.key
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900 bg-opacity-20'
                    : 'text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-10'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Total Balance */}
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 text-center">
              <h2 className="text-lg text-gray-300 mb-2">Total Balance</h2>
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                  <span className="text-white">Loading...</span>
                </div>
              ) : (
                <div className="text-5xl font-bold text-white mb-4">
                  ${totalUSD.toFixed(2)}
                </div>
              )}
              <p className="text-gray-400">USD equivalent across all chains</p>
            </div>

            {/* Chain Balances */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Ethereum */}
              <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <span className="w-6 h-6 bg-gray-600 rounded-full mr-3"></span>
                    Ethereum (Sepolia)
                  </h3>
                  <span className="text-gray-400 text-sm">70% of total</span>
                </div>
                {isLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-600 rounded"></div>
                    <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">USDC</span>
                      <span className="text-white font-medium">${balances.ethereum.usdc.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Solana */}
              <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <span className="w-6 h-6 bg-purple-600 rounded-full mr-3"></span>
                    Solana (Devnet)
                  </h3>
                  <span className="text-gray-400 text-sm">30% of total</span>
                </div>
                {isLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-600 rounded"></div>
                    <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">USDC</span>
                      <span className="text-white font-medium">${balances.solana.usdc.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Wallet Addresses */}
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">My Addresses</h3>
                <button
                  onClick={() => setShowAddresses(!showAddresses)}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  {showAddresses ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showAddresses && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300 text-sm">Ethereum Address</span>
                      <button
                        onClick={() => evmAddress && copyToClipboard(evmAddress)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="bg-black bg-opacity-30 rounded-lg p-3 font-mono text-sm text-white break-all">
                      {evmAddress || 'Loading...'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300 text-sm">Solana Address</span>
                      <button
                        onClick={() => solanaAddress && copyToClipboard(solanaAddress)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="bg-black bg-opacity-30 rounded-lg p-3 font-mono text-sm text-white break-all">
                      {solanaAddress || 'Loading...'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'send' && (
          <SendMoney onBack={() => setActiveTab('overview')} />
        )}

        {activeTab === 'history' && (
          <TransactionHistory />
        )}
      </main>
    </div>
  );
}