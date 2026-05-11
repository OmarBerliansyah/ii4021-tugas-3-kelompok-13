import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { LogoutButton } from './components/LogoutButton';

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isInitialMount, setIsInitialMount] = useState(true);

  // Once the first loading check is done, never show the full-screen loader again
  useEffect(() => {
    if (isInitialMount && !isLoading) {
      setIsInitialMount(false);
    }
  }, [isLoading, isInitialMount]);

  if (isInitialMount) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="app-container">
      <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Crypto Chat</h1>
        <LogoutButton />
      </header>
      
      <main className="app-content" style={{ padding: '2rem' }}>
        <p>Welcome to the secure chat!</p>
      </main>
    </div>
  );
}

export default App;