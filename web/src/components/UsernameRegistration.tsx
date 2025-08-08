import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { checkEnsAvailability } from '../lib/ens';
import { checkSnsAvailability } from '../lib/sns';

export function UsernameRegistration() {
  const { setUsername } = useAuth();
  const [inputUsername, setInputUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [availability, setAvailability] = useState<{
    ens: boolean | null;
    sns: boolean | null;
  }>({ ens: null, sns: null });
  const [error, setError] = useState('');

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

    setUsername(inputUsername);
  };

  const isAvailable = availability.ens && availability.sns;
  const isUnavailable = availability.ens === false || availability.sns === false;

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
            {isChecking ? 'Checking...' : 'Register Username'}
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