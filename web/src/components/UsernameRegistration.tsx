import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { checkEnsAvailability, registerEnsName } from '../lib/ens';
import { checkSnsAvailability, registerSnsName } from '../lib/sns';
import { hasMinimumBalances } from '../lib/balances';

export function UsernameRegistration() {
  const { setUsername, providers, evmAddress, solanaAddress } = useAuth();
  const [inputUsername, setInputUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [availability, setAvailability] = useState<{
    ens: boolean | null;
    sns: boolean | null;
  }>({ ens: null, sns: null });
  const [error, setError] = useState('');
  const [selectedUsername, setSelectedUsername] = useState('');
  const [registrationStatus, setRegistrationStatus] = useState<{
    ens: 'idle' | 'registering' | 'success' | 'error';
    sns: 'idle' | 'registering' | 'success' | 'error';
  }>({ ens: 'idle', sns: 'idle' });
  const [registrationErrors, setRegistrationErrors] = useState<{
    ens?: string;
    sns?: string;
  }>({});
  const [balances, setBalances] = useState<{
    eth: string;
    sol: string;
    hasMinimum: { eth: boolean; sol: boolean };
  }>({ eth: '0', sol: '0', hasMinimum: { eth: false, sol: false } });

  useEffect(() => {
    if (inputUsername.length < 3) {
      setAvailability({ ens: null, sns: null });
      setError('');
      return;
    }

    const checkAvailability = async () => {
      setIsChecking(true);
      setError('');
      
      try {
        const [ensAvailable, snsAvailable] = await Promise.all([
          checkEnsAvailability(`${inputUsername}.eth`),
          checkSnsAvailability(`${inputUsername}.sol`),
        ]);
        
        setAvailability({ ens: ensAvailable, sns: snsAvailable });
      } catch (error) {
        console.error('Error checking availability:', error);
        setError('Error checking availability. Please try again.');
      } finally {
        setIsChecking(false);
      }
    };

    const debounce = setTimeout(checkAvailability, 500);
    return () => clearTimeout(debounce);
  }, [inputUsername]);

  // Check balances when entering registration phase
  useEffect(() => {
    const checkBalances = async () => {
      if (selectedUsername && evmAddress && providers?.rawProvider) {
        try {
          const balanceInfo = await hasMinimumBalances(evmAddress, providers.rawProvider);
          setBalances({
            eth: balanceInfo.ethBalance,
            sol: balanceInfo.solBalance,
            hasMinimum: {
              eth: balanceInfo.eth,
              sol: balanceInfo.sol,
            },
          });
        } catch (error) {
          console.error('Error checking balances:', error);
        }
      }
    };

    checkBalances();
  }, [selectedUsername, evmAddress, providers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputUsername || inputUsername.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    if (!availability.ens || !availability.sns) {
      setError('Username is not available on all platforms');
      return;
    }

    setSelectedUsername(inputUsername);
    setError('');
  };

  const handleRegisterEns = async () => {
    if (!selectedUsername || !providers?.evmProvider) return false;
    
    // Check balance before attempting registration
    if (!balances.hasMinimum.eth) {
      setRegistrationErrors(prev => ({ 
        ...prev, 
        ens: `Insufficient ETH balance. You have ${balances.eth} ETH, but need at least 0.01 ETH for registration.` 
      }));
      return false;
    }
    
    setRegistrationStatus(prev => ({ ...prev, ens: 'registering' }));
    setRegistrationErrors(prev => ({ ...prev, ens: undefined }));
    
    try {
      const result = await registerEnsName(
        `${selectedUsername}.eth`,
        providers.evmProvider
      );
      
      if (result.success) {
        setRegistrationStatus(prev => ({ ...prev, ens: 'success' }));
        return true;
      } else {
        setRegistrationStatus(prev => ({ ...prev, ens: 'error' }));
        const errorMsg = result.error?.includes('insufficient funds') 
          ? `Insufficient funds. Current balance: ${balances.eth} ETH. Please get more Sepolia ETH from a faucet.`
          : result.error || 'Registration failed';
        setRegistrationErrors(prev => ({ ...prev, ens: errorMsg }));
        return false;
      }
    } catch (error) {
      setRegistrationStatus(prev => ({ ...prev, ens: 'error' }));
      const errorMsg = error instanceof Error && error.message.includes('insufficient funds')
        ? `Insufficient funds. Current balance: ${balances.eth} ETH. Please get more Sepolia ETH from a faucet.`
        : 'Network error occurred';
      setRegistrationErrors(prev => ({ ...prev, ens: errorMsg }));
      return false;
    }
  };

  const handleRegisterSns = async () => {
    if (!selectedUsername || !providers?.rawProvider || !solanaAddress) return false;
    
    // Check balance before attempting registration
    if (!balances.hasMinimum.sol) {
      setRegistrationErrors(prev => ({ 
        ...prev, 
        sns: `Insufficient SOL balance. You have ${balances.sol} SOL, but need at least 0.1 SOL for registration.` 
      }));
      return false;
    }
    
    setRegistrationStatus(prev => ({ ...prev, sns: 'registering' }));
    setRegistrationErrors(prev => ({ ...prev, sns: undefined }));
    
    try {
      const result = await registerSnsName(
        `${selectedUsername}.sol`,
        solanaAddress,
        providers.rawProvider
      );
      
      if (result.success) {
        setRegistrationStatus(prev => ({ ...prev, sns: 'success' }));
        return true;
      } else {
        setRegistrationStatus(prev => ({ ...prev, sns: 'error' }));
        const errorMsg = result.error?.includes('insufficient funds') || result.error?.includes('no record of a prior credit')
          ? `Insufficient funds. Current balance: ${balances.sol} SOL. Please get more devnet SOL from a faucet.`
          : result.error || 'Registration failed';
        setRegistrationErrors(prev => ({ ...prev, sns: errorMsg }));
        return false;
      }
    } catch (error) {
      setRegistrationStatus(prev => ({ ...prev, sns: 'error' }));
      const errorMsg = error instanceof Error && (error.message.includes('insufficient funds') || error.message.includes('no record of a prior credit'))
        ? `Insufficient funds. Current balance: ${balances.sol} SOL. Please get more devnet SOL from a faucet.`
        : 'Network error occurred';
      setRegistrationErrors(prev => ({ ...prev, sns: errorMsg }));
      return false;
    }
  };

  const handleRegisterBoth = async () => {
    if (!selectedUsername || !providers?.evmProvider || !providers?.rawProvider || !solanaAddress) {
      return;
    }
    
    try {
      // Register both domains in parallel
      const [ensResult, snsResult] = await Promise.all([
        handleRegisterEns(),
        handleRegisterSns()
      ]);
      
      // If both succeed, complete registration
      if (ensResult && snsResult) {
        setUsername(selectedUsername);
      }
    } catch (error) {
      console.error('Error during registration:', error);
    }
  };

  const handleCompleteRegistration = () => {
    if (registrationStatus.ens === 'success' && registrationStatus.sns === 'success') {
      setUsername(selectedUsername);
    }
  };

  const isAvailable = availability.ens && availability.sns;
  const isUnavailable = availability.ens === false || availability.sns === false;

  if (selectedUsername) {
    // Registration phase
    const allRegistrationsComplete = registrationStatus.ens === 'success' && registrationStatus.sns === 'success';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-lg shadow-2xl border border-white border-opacity-20">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Register @{selectedUsername}</h1>
            <p className="text-gray-300">
              Register your username on both ENS and SNS
            </p>
            
            {/* Balance Display */}
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className={`p-2 rounded-lg ${balances.hasMinimum.eth ? 'bg-green-900 bg-opacity-30' : 'bg-red-900 bg-opacity-30'}`}>
                <p className="text-gray-300">ETH Balance</p>
                <p className={balances.hasMinimum.eth ? 'text-green-400' : 'text-red-400'}>
                  {parseFloat(balances.eth).toFixed(4)} ETH
                </p>
              </div>
              <div className={`p-2 rounded-lg ${balances.hasMinimum.sol ? 'bg-green-900 bg-opacity-30' : 'bg-red-900 bg-opacity-30'}`}>
                <p className="text-gray-300">SOL Balance</p>
                <p className={balances.hasMinimum.sol ? 'text-green-400' : 'text-red-400'}>
                  {parseFloat(balances.sol).toFixed(4)} SOL
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Combined Registration Progress */}
            <div className="bg-white bg-opacity-5 rounded-lg p-6 border border-white border-opacity-10">
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* ENS Status */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-white">ENS:</span>
                  {registrationStatus.ens === 'registering' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  )}
                  {registrationStatus.ens === 'success' && (
                    <span className="text-green-400 text-sm flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Registered
                    </span>
                  )}
                  {registrationStatus.ens === 'error' && (
                    <span className="text-red-400 text-sm">Failed</span>
                  )}
                  {registrationStatus.ens === 'idle' && (
                    <span className="text-gray-400 text-sm">Pending</span>
                  )}
                </div>
                
                {/* SNS Status */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-white">SNS:</span>
                  {registrationStatus.sns === 'registering' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                  )}
                  {registrationStatus.sns === 'success' && (
                    <span className="text-green-400 text-sm flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Registered
                    </span>
                  )}
                  {registrationStatus.sns === 'error' && (
                    <span className="text-red-400 text-sm">Failed</span>
                  )}
                  {registrationStatus.sns === 'idle' && (
                    <span className="text-gray-400 text-sm">Pending</span>
                  )}
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-gray-300 text-sm">
                  {selectedUsername}.eth → {evmAddress ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}` : 'Loading...'}
                </p>
                <p className="text-gray-300 text-sm">
                  {selectedUsername}.sol → {solanaAddress ? `${solanaAddress.slice(0, 6)}...${solanaAddress.slice(-4)}` : 'Loading...'}
                </p>
              </div>
            </div>

            {/* Error Messages */}
            {(registrationErrors.ens || registrationErrors.sns) && (
              <div className="space-y-3">
                {registrationErrors.ens && (
                  <div className="text-red-400 text-sm bg-red-900 bg-opacity-30 p-3 rounded-lg">
                    <strong>ENS Error:</strong> {registrationErrors.ens}
                  </div>
                )}
                {registrationErrors.sns && (
                  <div className="text-red-400 text-sm bg-red-900 bg-opacity-30 p-3 rounded-lg">
                    <strong>SNS Error:</strong> {registrationErrors.sns}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={allRegistrationsComplete ? handleCompleteRegistration : handleRegisterBoth}
              disabled={registrationStatus.ens === 'registering' || registrationStatus.sns === 'registering'}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-300 shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              {(registrationStatus.ens === 'registering' || registrationStatus.sns === 'registering') ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Registering domains...
                </div>
              ) : allRegistrationsComplete ? (
                'Complete Setup'
              ) : (
                'Register Both Domains'
              )}
            </button>

            <button
              onClick={() => setSelectedUsername('')}
              className="w-full text-gray-300 hover:text-white py-2 transition-colors"
            >
              ← Back to username selection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white border-opacity-20">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Choose Your Username</h1>
          <p className="text-gray-300">
            This will be your unique @username across all chains
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-white font-medium mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400 font-medium">@</span>
              <input
                type="text"
                id="username"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="your-username"
                className="w-full pl-8 pr-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                minLength={3}
                maxLength={20}
                pattern="[a-z0-9\-]+"
                required
              />
            </div>
          </div>

          {inputUsername.length >= 3 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-gray-300 text-sm">ENS (.eth):</span>
                {isChecking ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                ) : availability.ens === null ? (
                  <span className="text-gray-400 text-sm">-</span>
                ) : availability.ens ? (
                  <span className="text-green-400 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Available
                  </span>
                ) : (
                  <span className="text-red-400 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Taken
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-gray-300 text-sm">SNS (.sol):</span>
                {isChecking ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                ) : availability.sns === null ? (
                  <span className="text-gray-400 text-sm">-</span>
                ) : availability.sns ? (
                  <span className="text-green-400 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Available
                  </span>
                ) : (
                  <span className="text-red-400 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Taken
                  </span>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-900 bg-opacity-30 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!isAvailable || isChecking}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-300 shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
          >
            {isChecking ? 'Checking...' : 'Select Username'}
          </button>
        </form>

        {isUnavailable && (
          <div className="mt-4 text-center">
            <p className="text-gray-300 text-sm">
              Try a different username that's available on both ENS and SNS
            </p>
          </div>
        )}
      </div>
    </div>
  );
}