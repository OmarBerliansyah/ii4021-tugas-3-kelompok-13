import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { ChatPage } from './pages/ChatPage';

function App() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: 'var(--text-sub)', fontFamily: 'var(--font-inter)' }}>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <AuthPage />;
  }

  return <ChatPage currentUser={user} />;
}

export default App;
