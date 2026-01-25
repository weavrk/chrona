import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2 } from 'lucide-react';

export function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoggingIn(true);
    const success = login(username.trim(), password);
    
    setTimeout(() => {
      setIsLoggingIn(false);
      if (!success) {
        setError('Invalid username or password');
      } else {
        setError('');
      }
    }, 500);
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <h1 className="login-title">Chrona</h1>
        
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
                  handleLogin();
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
                  handleLogin();
                }
              }}
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            className="ds-button-primary"
            onClick={handleLogin}
            disabled={isLoggingIn}
            style={{ width: '100%', marginTop: 'var(--spacing-md)' }}
          >
            {isLoggingIn ? (
              <CheckCircle2 size={24} className="checkmark-animation" />
            ) : (
              'Login'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

