import { useState, useEffect } from 'react';

interface Transaction {
  id: string;
  type: 'sent' | 'received';
  recipient?: string;
  sender?: string;
  amount: number;
  currency: 'USDC' | 'USDT';
  chain: 'ethereum' | 'solana';
  status: 'completed' | 'pending' | 'failed';
  timestamp: Date;
  hash: string;
}

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');

  useEffect(() => {
    // Mock transaction data - in real implementation, fetch from blockchain/database
    const fetchTransactions = async () => {
      setIsLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock transactions
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          type: 'sent',
          recipient: '@alice',
          amount: 50.00,
          currency: 'USDC',
          chain: 'ethereum',
          status: 'completed',
          timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          hash: '0x1234...abcd'
        },
        {
          id: '2',
          type: 'received',
          sender: '@bob',
          amount: 25.50,
          currency: 'USDT',
          chain: 'solana',
          status: 'completed',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          hash: '5J7K...9xyz'
        },
        {
          id: '3',
          type: 'sent',
          recipient: 'HXt4...9KLm',
          amount: 100.00,
          currency: 'USDC',
          chain: 'solana',
          status: 'pending',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
          hash: '8N2P...5def'
        },
        {
          id: '4',
          type: 'received',
          sender: '0x742d...8E5f',
          amount: 75.25,
          currency: 'USDT',
          chain: 'ethereum',
          status: 'completed',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          hash: '0x9876...5432'
        },
        {
          id: '5',
          type: 'sent',
          recipient: '@charlie',
          amount: 200.00,
          currency: 'USDC',
          chain: 'ethereum',
          status: 'failed',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
          hash: '0xabcd...1234'
        }
      ];
      
      setTransactions(mockTransactions);
      setIsLoading(false);
    };

    fetchTransactions();
  }, []);

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