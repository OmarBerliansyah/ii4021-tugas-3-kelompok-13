import { useAuth } from '../contexts/AuthContext';

export function LogoutButton(): React.JSX.Element {
  const { logout, user } = useAuth();

  return (
    <div className="user-menu" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <span className="user-email" style={{ fontSize: '0.9rem', color: '#666' }}>
        {user?.email}
      </span>
      <button 
        onClick={logout} 
        className="logout-button"
        style={{
          padding: '8px 16px',
          backgroundColor: '#ff4444',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        Logout
      </button>
    </div>
  );
}