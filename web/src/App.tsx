import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { FaucetScreen } from './components/FaucetScreen';
import { UsernameRegistration } from './components/UsernameRegistration';
import { Dashboard } from './components/Dashboard';

function AppContent() {
  const { isAuthenticated, username, isLoading, hasFaucetTokens } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Metawallet...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (!hasFaucetTokens) {
    return <FaucetScreen />;
  }

  if (!username) {
    return <UsernameRegistration />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
