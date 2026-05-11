import { useState } from 'react';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';
import '../styles/AuthPage.css';

export function AuthPage(): React.JSX.Element {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="auth-page-container">
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