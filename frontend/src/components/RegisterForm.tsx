import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AuthForm.css';

interface RegisterFormProps {
  onSuccess?: () => void;
  onToggleMode: () => void;
}

export function RegisterForm({ onSuccess, onToggleMode }: RegisterFormProps): React.JSX.Element {
  const { register, isLoading, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [errors, setErrors] = useState<{email?: string, password?: string, confirmPassword?: string}>({});

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErrors({});
    clearError();

    const newErrors: typeof errors = {};

    if (!email.trim()) newErrors.email = 'Email cannot be empty';
    if (!password.trim()) {
        newErrors.password = 'Password cannot be empty';
    } else if (password.length < 8) {
        newErrors.password = 'Minimum 8 characters';
    }
    if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await register(email, password);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const msg = err.message?.toLowerCase() || '';
      if (msg.includes('email') || msg.includes('registered')) {
        setErrors({ email: 'Email is already registered' });
      } else {
        setErrors({ password: 'Registration failed' });
      }
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Create Account</h2>

      <div className="form-group">
        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
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
        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          className={errors.password ? 'input-error' : ''}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          placeholder="••••••••"
          required
        />
        {errors.password ? (
          <span className="error-caption">{errors.password}</span>
        ) : (
          <span className="default-caption">Minimum 8 characters</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="register-confirm">Confirm Password</label>
        <input
          id="register-confirm"
          type="password"
          className={errors.confirmPassword ? 'input-error' : ''}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          placeholder="••••••••"
          required
        />
        {errors.confirmPassword && <span className="error-caption">{errors.confirmPassword}</span>}
      </div>

      <button type="submit" disabled={isLoading} className="submit-button">
        {isLoading ? 'Creating Account...' : 'Register'}
      </button>

      <button type="button" onClick={onToggleMode} className="toggle-button">
        Already have an account? Login
      </button>
    </form>
  );
}