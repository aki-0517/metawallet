import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { resolveEnsAddress } from '../lib/ens';
import { resolveSnsAddress } from '../lib/sns';
import { sendErc20 } from '../lib/evm';
import { sendSplToken } from '../lib/solana';
import { addTransaction } from '../lib/txStore';

interface SendMoneyProps {
  onBack: () => void;
}

type SendMode = 'username' | 'address' | 'contact';
type SelectedChain = 'ethereum' | 'solana' | 'auto';

export function SendMoney({ onBack }: SendMoneyProps) {
  const { evmAddress, solanaAddress, providers } = useAuth();
  const [sendMode, setSendMode] = useState<SendMode>('username');
  const [contacts] = useState([
    // { id: '1', username: 'alice', lastTransactionDate: new Date(Date.now() - 1000 * 60 * 60 * 24) },
    // { id: '2', username: 'bob', lastTransactionDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) },
    // { id: '3', username: 'charlie', lastTransactionDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) },
  ]);
  const [selectedChain, setSelectedChain] = useState<SelectedChain>('auto');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedAddresses, setResolvedAddresses] = useState<{
    ethereum?: string;
    solana?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if ((sendMode === 'username' || sendMode === 'contact') && recipient.length > 2) {
      const resolveAddresses = async () => {
        setIsResolving(true);
        setError('');
        
        try {
          const [ensAddress, snsAddress] = await Promise.all([
            resolveEnsAddress(`${recipient}.eth`),
            resolveSnsAddress(`${recipient}.sol`),
          ]);

          setResolvedAddresses({
            ethereum: ensAddress || undefined,
            solana: snsAddress || undefined,
          });

          if (!ensAddress && !snsAddress) {
            setError('Username not found on any network');
          }
        } catch (error) {
          console.error('Error resolving addresses:', error);
          setError('Error resolving username');
        } finally {
          setIsResolving(false);
        }
      };

      const debounce = setTimeout(resolveAddresses, 500);
      return () => clearTimeout(debounce);
    } else {
      setResolvedAddresses({});
      setError('');
    }
  }, [recipient, sendMode]);

  const handleContactSelect = (username: string) => {
    setRecipient(username);
    setSendMode('username');
  };

  const calculateDistribution = () => {
    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount)) return { ethereum: 0, solana: 0 };

    if (selectedChain === 'ethereum') {
      return { ethereum: totalAmount, solana: 0 };
    } else if (selectedChain === 'solana') {
      return { ethereum: 0, solana: totalAmount };
    } else {
      // Auto distribution based on current balances (70% Ethereum, 30% Solana as per mock)
      return {
        ethereum: totalAmount * 0.7,
        solana: totalAmount * 0.3,
      };
    }
  };

  const handleSend = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (sendMode === 'username' && (!resolvedAddresses.ethereum && !resolvedAddresses.solana)) {
      setError('No addresses found for this username');
      return;
    }

    setShowConfirmation(true);
  };

  const confirmSend = async () => {
    setIsLoading(true);
    setError('');

    try {
      const usdcEvm = (import.meta as any).env?.VITE_USDC_SEPOLIA_ADDRESS as string | undefined;
      const usdcSol = (import.meta as any).env?.VITE_USDC_SOLANA_MINT as string | undefined;

      const now = Date.now();
      const tasks: Promise<void>[] = [];

      const pushEth = async (toAddress: string, usd: number) => {
        if (!providers?.evmProvider || !evmAddress || !usdcEvm) return;
        const hash = await sendErc20({
          provider: providers.evmProvider,
          tokenAddress: usdcEvm as any,
          from: evmAddress as any,
          to: toAddress as any,
          amountTokens: usd.toFixed(6),
        });
        addTransaction({
          id: `${hash}`,
          type: 'sent',
          counterparty: sendMode === 'username' ? `@${recipient}` : toAddress,
          amount: usd,
          currency: 'USDC',
          chain: 'ethereum',
          status: 'completed',
          timestamp: now,
          hash,
        });
      };

      const pushSol = async (toAddress: string, usd: number) => {
        if (!providers?.solanaProvider || !solanaAddress || !usdcSol) return;
        const sig = await sendSplToken({
          provider: providers.solanaProvider,
          mint: usdcSol,
          fromPubkey: solanaAddress,
          toPubkey: toAddress,
          amountTokens: usd.toFixed(6),
        });
        addTransaction({
          id: `${sig}`,
          type: 'sent',
          counterparty: sendMode === 'username' ? `@${recipient}` : toAddress,
          amount: usd,
          currency: 'USDC',
          chain: 'solana',
          status: 'completed',
          timestamp: now,
          hash: sig,
        });
      };

      if (sendMode === 'address') {
        const usd = parseFloat(amount);
        if (selectedChain === 'ethereum') {
          tasks.push(pushEth(recipient, usd));
        } else if (selectedChain === 'solana') {
          tasks.push(pushSol(recipient, usd));
        }
      } else {
        const distr = calculateDistribution();
        if (distr.ethereum > 0 && resolvedAddresses.ethereum) {
          tasks.push(pushEth(resolvedAddresses.ethereum, distr.ethereum));
        }
        if (distr.solana > 0 && resolvedAddresses.solana) {
          tasks.push(pushSol(resolvedAddresses.solana, distr.solana));
        }
      }

      await Promise.all(tasks);
      
      // Reset form after successful send
      setRecipient('');
      setAmount('');
      setResolvedAddresses({});
      setShowConfirmation(false);
      setError('');
      alert('Transaction sent successfully!');
    } catch (error) {
      console.error('Error sending transaction:', error);
      setError('Failed to send transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const distribution = calculateDistribution();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Send Money</h2>
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!showConfirmation ? (
          <div className="space-y-6">
            {/* Send Mode Toggle */}
            <div>
              <label className="block text-white font-medium mb-3">Send to:</label>
              <div className="flex bg-black bg-opacity-30 rounded-lg p-1">
                <button
                  onClick={() => setSendMode('username')}
                  className={`flex-1 py-2 px-3 rounded-md font-medium transition-all ${
                    sendMode === 'username'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  @Username
                </button>
                <button
                  onClick={() => setSendMode('contact')}
                  className={`flex-1 py-2 px-3 rounded-md font-medium transition-all ${
                    sendMode === 'contact'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Contacts
                </button>
                <button
                  onClick={() => setSendMode('address')}
                  className={`flex-1 py-2 px-3 rounded-md font-medium transition-all ${
                    sendMode === 'address'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Address
                </button>
              </div>
            </div>

            {/* Contact List */}
            {sendMode === 'contact' && (
              <div>
                <label className="block text-white font-medium mb-3">Select Contact</label>
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleContactSelect(contact.username)}
                      className="w-full p-4 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-lg transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium">
                              {contact.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">@{contact.username}</p>
                            <p className="text-gray-400 text-sm">
                              Last transaction: {contact.lastTransactionDate.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                  {contacts.length === 0 && (
                    <p className="text-center text-gray-400 py-8">
                      No contacts yet. Send money to someone first to add them to your contacts!
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Recipient Input */}
            {sendMode !== 'contact' && (
              <div>
                <label className="block text-white font-medium mb-2">
                  {sendMode === 'username' ? 'Username' : 'Recipient Address'}
                </label>
              <div className="relative">
                {sendMode === 'username' && (
                  <span className="absolute left-3 top-3 text-gray-400 font-medium">@</span>
                )}
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={sendMode === 'username' ? 'alice' : '0x... or address'}
                  className={`w-full ${sendMode === 'username' ? 'pl-8' : 'pl-4'} pr-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                {isResolving && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                  </div>
                )}
              </div>
              
              {/* Address Resolution Results */}
              {sendMode === 'username' && recipient.length > 2 && !isResolving && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">ENS (.eth):</span>
                    {resolvedAddresses.ethereum ? (
                      <span className="text-green-400 font-mono text-xs">
                        {resolvedAddresses.ethereum.slice(0, 10)}...
                      </span>
                    ) : (
                      <span className="text-red-400">Not found</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">SNS (.sol):</span>
                    {resolvedAddresses.solana ? (
                      <span className="text-green-400 font-mono text-xs">
                        {resolvedAddresses.solana.slice(0, 10)}...
                      </span>
                    ) : (
                      <span className="text-red-400">Not found</span>
                    )}
                  </div>
                </div>
              )}
              </div>
            )}

            {/* Chain Selection (only for address mode) */}
            {sendMode === 'address' && (
              <div>
                <label className="block text-white font-medium mb-2">Chain</label>
                <select
                  value={selectedChain}
                  onChange={(e) => setSelectedChain(e.target.value as SelectedChain)}
                  className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ethereum" className="bg-gray-800">Ethereum (Sepolia)</option>
                  <option value="solana" className="bg-gray-800">Solana (Devnet)</option>
                </select>
              </div>
            )}

            {/* Amount Input */}
            <div>
              <label className="block text-white font-medium mb-2">Amount (USD)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Distribution Preview (for username mode with auto distribution) */}
            {sendMode === 'username' && amount && parseFloat(amount) > 0 && (
              <div className="bg-black bg-opacity-30 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Transaction Distribution:</h4>
                {distribution.ethereum > 0 && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300">Ethereum (70%):</span>
                    <span className="text-white">${distribution.ethereum.toFixed(2)}</span>
                  </div>
                )}
                {distribution.solana > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Solana (30%):</span>
                    <span className="text-white">${distribution.solana.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="text-red-400 text-sm text-center bg-red-900 bg-opacity-30 p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!recipient || !amount || parseFloat(amount) <= 0 || isResolving}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-300 shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              Review Transaction
            </button>
          </div>
        ) : (
          /* Confirmation Screen */
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-4">Confirm Transaction</h3>
              <div className="bg-black bg-opacity-30 rounded-lg p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-300">To:</span>
                  <span className="text-white">
                    {sendMode === 'username' ? `@${recipient}` : `${recipient.slice(0, 10)}...`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Amount:</span>
                  <span className="text-white font-semibold">${amount}</span>
                </div>
                {sendMode === 'username' && (
                  <>
                    {distribution.ethereum > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">  • Ethereum:</span>
                        <span className="text-gray-300">${distribution.ethereum.toFixed(2)}</span>
                      </div>
                    )}
                    {distribution.solana > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">  • Solana:</span>
                        <span className="text-gray-300">${distribution.solana.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSend}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-300 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  'Confirm & Send'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}