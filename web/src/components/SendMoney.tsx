import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { resolveEnsAddress } from '../lib/ens';
import { sendErc20, sendErc20WithUsdcGas } from '../lib/evm';
import { addTransaction } from '../lib/txStore';

interface SendMoneyProps {
  onBack: () => void;
}

type SendMode = 'username' | 'address' | 'contact';

export function SendMoney({ onBack }: SendMoneyProps) {
  const { evmAddress, providers, smartAccountAddress } = useAuth();
  const [sendMode, setSendMode] = useState<SendMode>('username');
  const [contacts] = useState([
    // { id: '1', username: 'alice', lastTransactionDate: new Date(Date.now() - 1000 * 60 * 60 * 24) },
    // { id: '2', username: 'bob', lastTransactionDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) },
    // { id: '3', username: 'charlie', lastTransactionDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) },
  ]);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState<{
    hash: string;
    usedGaslessTransfer: boolean;
  } | null>(null);

  useEffect(() => {
    if ((sendMode === 'username' || sendMode === 'contact') && recipient.length > 2) {
      const resolveAddress = async () => {
        setIsResolving(true);
        setError('');
        
        try {
          const ensAddress = await resolveEnsAddress(`${recipient}.eth`);
          setResolvedAddress(ensAddress || undefined);

          if (!ensAddress) {
            setError('Username not found on Ethereum network');
          }
        } catch (error) {
          console.error('Error resolving address:', error);
          setError('Error resolving username');
        } finally {
          setIsResolving(false);
        }
      };

      const debounce = setTimeout(resolveAddress, 500);
      return () => clearTimeout(debounce);
    } else {
      setResolvedAddress(undefined);
      setError('');
    }
  }, [recipient, sendMode]);

  const handleContactSelect = (username: string) => {
    setRecipient(username);
    setSendMode('username');
  };

  const handleSend = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (sendMode === 'username' && !resolvedAddress) {
      setError('No address found for this username');
      return;
    }

    setTransactionSuccess(null);
    setShowConfirmation(true);
  };

  const confirmSend = async () => {
    setIsLoading(true);
    setError('');

    try {
      const usdcEvm = (import.meta as any).env?.VITE_USDC_SEPOLIA_ADDRESS as string | undefined;
      
      if (!providers?.evmProvider || !evmAddress || !usdcEvm) {
        throw new Error('Ethereum provider not available');
      }

      const now = Date.now();
      const usd = parseFloat(amount);
      const toAddress = sendMode === 'username' ? resolvedAddress : recipient;

      if (!toAddress) {
        throw new Error('Recipient address not found');
      }

      let hash: string;

      // Use USDC gas payment if smart account is available
      if (providers.smartAccountProvider && smartAccountAddress) {
        const smartAccountProvider = providers.smartAccountProvider;
        const smartAccount = smartAccountProvider.smartAccount;
        const bundlerClient = smartAccountProvider.bundlerClient;

        if (smartAccount && bundlerClient) {
          hash = await sendErc20WithUsdcGas({
            smartAccountProvider,
            smartAccount,
            bundlerClient,
            tokenAddress: usdcEvm as any,
            from: smartAccountAddress as any,
            to: toAddress as any,
            amountTokens: usd.toFixed(6),
          });
        } else {
          // Fallback to regular transaction
          hash = await sendErc20({
            provider: providers.evmProvider,
            tokenAddress: usdcEvm as any,
            from: evmAddress as any,
            to: toAddress as any,
            amountTokens: usd.toFixed(6),
          });
        }
      } else {
        // Fallback to regular transaction
        hash = await sendErc20({
          provider: providers.evmProvider,
          tokenAddress: usdcEvm as any,
          from: evmAddress as any,
          to: toAddress as any,
          amountTokens: usd.toFixed(6),
        });
      }

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
      
      // Reset form and show success
      setRecipient('');
      setAmount('');
      setResolvedAddress(undefined);
      setShowConfirmation(false);
      setError('');
      setTransactionSuccess({
        hash,
        usedGaslessTransfer: !!smartAccountAddress,
      });
    } catch (error) {
      console.error('Error sending transaction:', error);
      setError('Failed to send transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Send Money (Gasless)</h2>
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {transactionSuccess ? (
          /* Success Screen */
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 bg-opacity-20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Transfer Successful!</h3>
              <p className="text-gray-300 mb-4">
                {transactionSuccess.usedGaslessTransfer 
                  ? 'Gas fees were paid with USDC' 
                  : 'Gas fees were paid with ETH'
                }
              </p>
            </div>

            <div className="bg-black bg-opacity-30 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-2">Transaction Hash:</p>
              <div className="flex items-center justify-between bg-white bg-opacity-10 rounded-lg p-3">
                <span className="text-white font-mono text-sm truncate flex-1">
                  {transactionSuccess.hash.slice(0, 20)}...{transactionSuccess.hash.slice(-20)}
                </span>
                <a
                  href={`https://sepolia.etherscan.io/tx/${transactionSuccess.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center space-x-1"
                >
                  <span>Explorer</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            <button
              onClick={() => {
                setTransactionSuccess(null);
                onBack();
              }}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-300"
            >
              Done
            </button>
          </div>
        ) : !showConfirmation ? (
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
                  placeholder={sendMode === 'username' ? 'alice' : '0x... (Ethereum address)'}
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
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">ENS (.eth):</span>
                    {resolvedAddress ? (
                      <span className="text-green-400 font-mono text-xs">
                        {resolvedAddress.slice(0, 10)}...
                      </span>
                    ) : (
                      <span className="text-red-400">Not found</span>
                    )}
                  </div>
                </div>
              )}
              </div>
            )}


            {/* Amount Input */}
            <div>
              <label className="block text-white font-medium mb-2">Amount (USDC)</label>
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
                  <span className="text-gray-300">Amount:</span>
                  <span className="text-white font-semibold">${amount} USDC</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Network:</span>
                  <span className="text-gray-300">Ethereum (Sepolia)</span>
                </div>
                {smartAccountAddress && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Gas Payment:</span>
                    <span className="text-green-400">USDC (Gasless)</span>
                  </div>
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