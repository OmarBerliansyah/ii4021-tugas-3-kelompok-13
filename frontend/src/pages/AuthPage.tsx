import { useState } from 'react';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';
import '../styles/AuthPage.css';

export function AuthPage(): React.JSX.Element {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="auth-page-container">
      <div className="auth-page-copy">
        <span className="auth-page-copy__label">II4021 Cryptography</span>
        <h1>Kelompok 13 Secure Chat</h1>
        <p>
          A calm messenger UI where JWT auth, ECDH key agreement, HKDF, and
          AES-256 encryption stay visible for demo without crowding the chat.
        </p>
      </div>
      {isLogin ? (
        <LoginForm 
          onSuccess={() => console.log('Logged in')} 
          onToggleMode={() => setIsLogin(false)} 
        />
      ) : (
        <RegisterForm 
          onSuccess={() => setIsLogin(true)} 
          onToggleMode={() => setIsLogin(true)} 
        />
      )}
    </div>
  );
}
