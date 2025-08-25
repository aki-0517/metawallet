import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { login, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white border-opacity-20">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 overflow-hidden">
            <img
              src="/logo.jpg"
              alt="Metawallet Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Metawallet</h1>
          <p className="text-gray-300">
            Your gateway to seamless multi-chain crypto experience
          </p>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <p className="text-gray-300 mb-4">
              Sign up or log in with your email to get started
            </p>
          </div>

          <button
            onClick={login}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Connecting...</span>
              </div>
            ) : (
              'Sign up / Log in with Email'
            )}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              Your wallet will be generated automatically using your email.
              <br />
              No seed phrases to remember!
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white border-opacity-20">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-3">Features:</h3>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Multi-chain support (Ethereum & Solana)</li>
              <li>• Send money with @username</li>
              <li>• Gasless transactions</li>
              <li>• Unified transaction history</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}