import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2 } from 'lucide-react';

interface CreateAccountScreenProps {
  onSwitchToLogin: () => void;
}

export function CreateAccountScreen({ onSwitchToLogin }: CreateAccountScreenProps) {
  const { createAccount } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateAccount = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsCreating(true);
    const success = await createAccount(username.trim(), password);
    
    setTimeout(() => {
      setIsCreating(false);
      if (!success) {
        setError('Username already exists');
      } else {
        setError('');
      }
    }, 500);
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <h1 className="login-title">Create Account</h1>
        
        <div className="login-form">
          <div className="form-text-input">
            <label className="form-label">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              className="form-input"
              placeholder="Enter username"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateAccount();
                }
              }}
            />
          </div>

          <div className="form-text-input">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="form-input"
              placeholder="Enter password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateAccount();
                }
              }}
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            className="ds-button-primary"
            onClick={onSwitchToLogin}
            style={{ width: '100%', marginTop: 'var(--spacing-md)' }}
          >
            Login to Existing Account
          </button>

          <button
            className="ds-button-secondary"
            onClick={handleCreateAccount}
            disabled={isCreating}
            style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
          >
            {isCreating ? (
              <CheckCircle2 size={24} className="checkmark-animation" />
            ) : (
              'Create Account'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

