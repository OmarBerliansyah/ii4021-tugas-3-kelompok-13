import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AuthForm.css';

interface LoginFormProps {
  onSuccess?: () => void;
  onToggleMode: () => void;
}

export function LoginForm({ onSuccess, onToggleMode }: LoginFormProps): React.JSX.Element {
  const { login, isLoading, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [errors, setErrors] = useState<{email?: string, password?: string, general?: string}>({});

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErrors({});
    clearError();

    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = 'Email cannot be empty';
    if (!password.trim()) newErrors.password = 'Password cannot be empty';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await login(email, password);
      setEmail('');
      setPassword('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const msg = err.message?.toLowerCase() || '';
      
      if (msg.includes('invalid') || msg.includes('password') || msg.includes('email')) {
        setErrors({ password: 'Invalid email or password' });
      } else {
        setErrors({ general: err.message || 'Login failed. Please try again.' });
      }
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Welcome Back</h2>

      {errors.general && <div className="error-message">{errors.general}</div>}

      <div className="form-group">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          className={errors.email ? 'input-error' : ''}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          placeholder="your@email.com"
          required
        />
        {errors.email && <span className="error-caption">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          className={errors.password ? 'input-error' : ''}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          placeholder="••••••••"
          required
        />
        {errors.password && <span className="error-caption">{errors.password}</span>}
      </div>

      <button type="submit" disabled={isLoading} className="submit-button">
        {isLoading ? 'Logging in...' : 'Login'}
      </button>

      <button type="button" onClick={onToggleMode} className="toggle-button">
        Need an account? Register
      </button>
    </form>
  );
}