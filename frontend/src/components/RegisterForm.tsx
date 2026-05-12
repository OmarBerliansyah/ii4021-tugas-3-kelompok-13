import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { CryptoLoadingModal } from './CryptoLoadingModal';
import '../styles/AuthForm.css';

interface RegisterFormProps {
  onSuccess?: () => void;
  onToggleMode: () => void;
}

export function RegisterForm({ onSuccess, onToggleMode }: RegisterFormProps): React.JSX.Element {
  const { register, isLoading, clearError } = useAuth();
  const { pushToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [errors, setErrors] = useState<{email?: string, password?: string, confirmPassword?: string}>({});

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErrors({});
    clearError();

    const newErrors: typeof errors = {};

    if (!email.trim()) newErrors.email = 'Email tidak boleh kosong';
    if (!password.trim()) {
        newErrors.password = 'Password tidak boleh kosong';
    } 
    else if (password.length < 8) {
        newErrors.password = 'Minimal 8 karakter';
    }
    if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Konfirmasi password tidak sama';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      pushToast({
        variant: 'warning',
        title: 'Form registrasi belum valid',
        message: 'Pastikan email valid, password >= 8 karakter, dan konfirmasi password sama.',
      });
      return;
    }

    try {
      await register(email, password);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      if (onSuccess) onSuccess();
    } 
    catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      if (msg.includes('email') || msg.includes('registered')) {
        setErrors({ email: 'Email sudah terdaftar' });
      } 
      else {
        setErrors({ password: 'Registrasi gagal' });
      }
    }
  };

  return (
    <>
      <form className="auth-form auth-form--register" onSubmit={handleSubmit}>
      <div className="auth-form__intro">
        <span className="auth-form__eyebrow">Client-side keys</span>
        <h2>Create secure account</h2>
        <p>Your chat keys are prepared in this browser.</p>
      </div>

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
          <span className="default-caption">Minimal 8 karakter</span>
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
        {isLoading ? 'Preparing account...' : 'Create account'}
      </button>

      <button type="button" onClick={onToggleMode} className="toggle-button">
        Already have an account? Log in
      </button>
    </form>
      {isLoading && (
        <CryptoLoadingModal
          headline="Preparing..."
          steps={[
            'Generating ECDH key pair',
            'Deriving password key',
            'Encrypting private key',
            'Saving public identity',
          ]}
        />
      )}
    </>
  );
}
