import { useState, useEffect } from 'react';
import { getUserAllTransactions, getTransactions } from '../lib/txStore';
import { useAuth } from '../contexts/AuthContext';

interface Transaction {
  id: string;
  type: 'sent' | 'received';
  recipient?: string; // for sent
  sender?: string;    // for received
  amount: number;
  currency: 'USDC';
  chain: 'ethereum' | 'solana';
  status: 'completed' | 'pending' | 'failed';
  timestamp: Date;
  hash: string;
}

export function TransactionHistory() {
  const { evmAddress, solanaAddress, smartAccountAddress, eoaAddress } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');

  // Get user's wallet addresses for filtering
  const getUserAddresses = (): string[] => {
    return [
      evmAddress,
      solanaAddress, 
      smartAccountAddress,
      eoaAddress
    ].filter(Boolean).map(addr => addr?.toLowerCase());
  };

  // Helper function to check if transaction involves user's wallet
  const isUserTransaction = (tx: any): boolean => {
    const userAddresses = getUserAddresses();
    
    // If no user addresses are available yet, don't show any transactions
    if (userAddresses.length === 0) {
      return false;
    }
    
    // For sent transactions: the user should be the one sending FROM their address
    // The counterparty is the recipient, so we don't need to check counterparty
    // For received transactions: the user should be the one receiving TO their address
    // The counterparty is the sender, so we need to check if the transaction was TO user's address
    
    // Since the transaction structure doesn't store the user's address explicitly,
    // and all stored transactions are supposed to be from the user's perspective,
    // we need a better way to verify. For now, let's check if the counterparty is NOT 
    // one of the user's addresses (meaning it's a transaction with external parties)
    
    if (tx.counterparty) {
      const counterpartyLower = tx.counterparty.toLowerCase();
      
      // If counterparty is a username (starts with @), it's valid
      if (counterpartyLower.startsWith('@')) {
        return true;
      }
      
      // If counterparty is one of our own addresses, it might be a self-transaction or invalid
      const isCounterpartySelf = userAddresses.includes(counterpartyLower);
      
      // Show transactions where counterparty is NOT ourselves (external transactions)
      return !isCounterpartySelf;
    }
    
    return true;
  };

  useEffect(() => {
    setIsLoading(true);
    
    const userAddresses = getUserAddresses();
    
    // If no user addresses are available, show empty list
    if (userAddresses.length === 0) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }
    
    // Get transactions from user-specific storage
    let list = getUserAllTransactions(userAddresses);
    
    // Also check legacy global storage for backward compatibility
    const legacyTransactions = getTransactions();
    if (legacyTransactions.length > 0) {
      // Filter legacy transactions to only include user's transactions
      const userLegacyTransactions = legacyTransactions.filter(isUserTransaction);
      // Merge with user-specific transactions, removing duplicates
      const allTransactions = [...list, ...userLegacyTransactions];
      const uniqueTransactions = allTransactions.reduce((acc, tx) => {
        const existing = acc.find(t => t.hash === tx.hash);
        if (!existing) {
          acc.push(tx);
        }
        return acc;
      }, [] as typeof list);
      list = uniqueTransactions.sort((a, b) => b.timestamp - a.timestamp);
    }
    
    // Additional filtering to ensure only user transactions are shown
    const userTransactions = list.filter(isUserTransaction);
    
    const normalized: Transaction[] = userTransactions.map((t) => ({
      id: t.id,
      type: t.type,
      recipient: t.type === 'sent' ? t.counterparty : undefined,
      sender: t.type === 'received' ? t.counterparty : undefined,
      amount: t.amount,
      currency: t.currency,
      chain: t.chain,
      status: t.status,
      timestamp: new Date(t.timestamp),
      hash: t.hash,
    }));
    setTransactions(normalized);
    setIsLoading(false);
  }, [evmAddress, solanaAddress, smartAccountAddress, eoaAddress]);

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getChainIcon = (chain: Transaction['chain']) => {
    if (chain === 'ethereum') {
      return <span className="w-4 h-4 bg-gray-600 rounded-full inline-block"></span>;
    } else {
      return <span className="w-4 h-4 bg-purple-600 rounded-full inline-block"></span>;
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Transaction History</h2>
          
          {/* Filter Buttons */}
          <div className="flex bg-black bg-opacity-30 rounded-lg p-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'sent', label: 'Sent' },
              { key: 'received', label: 'Received' }
            ].map(option => (
              <button
                key={option.key}
                onClick={() => setFilter(option.key as any)}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  filter === option.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-black bg-opacity-30 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-600 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-600 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-600 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-400">No transactions found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((tx) => (
              <div key={tx.id} className="bg-black bg-opacity-30 rounded-lg p-4 hover:bg-opacity-40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Transaction Type Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'sent' 
                        ? 'bg-red-600 bg-opacity-20 text-red-400' 
                        : 'bg-green-600 bg-opacity-20 text-green-400'
                    }`}>
                      {tx.type === 'sent' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-white font-medium">
                          {tx.type === 'sent' ? 'Sent to' : 'Received from'} {tx.recipient || tx.sender}
                        </span>
                        {getChainIcon(tx.chain)}
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(tx.status)} bg-current bg-opacity-20`}>
                          {tx.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>{formatTimestamp(tx.timestamp)}</span>
                        <a
                          href={tx.chain === 'ethereum' ? `https://sepolia.etherscan.io/tx/${tx.hash}` : `https://explorer.solana.com/tx/${tx.hash}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-blue-400"
                        >
                          View
                        </a>
                        <button
                          onClick={() => copyToClipboard(tx.hash)}
                          className="flex items-center space-x-1 hover:text-blue-400 transition-colors"
                        >
                          <span className="font-mono">{tx.hash.slice(0, 10)}...</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-lg font-semibold ${
                      tx.type === 'sent' ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {tx.type === 'sent' ? '-' : '+'}${tx.amount.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-400">
                      {tx.currency} • {tx.chain}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}