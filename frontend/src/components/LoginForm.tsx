import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { CryptoLoadingModal } from './CryptoLoadingModal';
import '../styles/AuthForm.css';

interface LoginFormProps {
  onSuccess?: () => void;
  onToggleMode: () => void;
}

export function LoginForm({ onSuccess, onToggleMode }: LoginFormProps): React.JSX.Element {
  const { login, isLoading, clearError } = useAuth();
  const { pushToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [errors, setErrors] = useState<{email?: string, password?: string, general?: string}>({});

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErrors({});
    clearError();

    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = 'Email tidak boleh kosong';
    if (!password.trim()) newErrors.password = 'Password tidak boleh kosong';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      pushToast({
        variant: 'warning',
        title: 'Form login belum lengkap',
        message: 'Periksa kembali email dan password sebelum melanjutkan.',
      });
      return;
    }

    try {
      await login(email, password);
      setEmail('');
      setPassword('');
      if (onSuccess) onSuccess();
    } 
    catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';

      if (msg.includes('invalid') || msg.includes('password') || msg.includes('email')) {
        setErrors({ password: 'Email atau password salah' });
      } 
      else {
        setErrors({ general: err instanceof Error ? err.message : 'Login gagal. Silakan coba lagi.' });
      }
    }
  };

  return (
    <>
      <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-form__intro">
        <span className="auth-form__eyebrow">Encrypted web chat</span>
        <h2>Welcome back</h2>
        <p>Unlock your secure chat identity.</p>
      </div>

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
        {isLoading ? 'Unlocking session...' : 'Log in'}
      </button>

      <button type="button" onClick={onToggleMode} className="toggle-button">
        New here? Create account
      </button>
    </form>
      {isLoading && (
        <CryptoLoadingModal
          headline="Verifying..."
          steps={[
            'Verifying credentials',
            'Issuing JWT',
            'Recovering encrypted private key',
            'Unlocking local key',
          ]}
        />
      )}
    </>
  );
}
