import React, { useState } from 'react';
import { Lock, LogIn, AlertCircle } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [selectedUser, setSelectedUser] = useState('chris'); // 'chris' o 'solansh'
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const emailMap = {
    chris: 'chris20022105@gmail.com',
    solansh: 'solanhsjudethmu@gmail.com'
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const email = emailMap[selectedUser];

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Contraseña incorrecta');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">GastosAhorro</div>
          <p className="login-subtitle">Finanzas Compartidas 🌱</p>
        </div>

        <form onSubmit={handleLogin}>
          {error && (
            <div 
              style={{
                backgroundColor: 'var(--color-danger-light)',
                color: 'var(--color-danger)',
                padding: '12px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">¿Quién eres?</label>
            <div className="segmented-control">
              <button
                type="button"
                className={selectedUser === 'chris' ? 'active' : ''}
                onClick={() => setSelectedUser('chris')}
              >
                Christopher
              </button>
              <button
                type="button"
                className={selectedUser === 'solansh' ? 'active' : ''}
                onClick={() => setSelectedUser('solansh')}
              >
                Solansh
              </button>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', paddingLeft: '4px', marginTop: '-4px', marginBottom: '16px' }}>
              Iniciando sesión como: {emailMap[selectedUser]}
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label" htmlFor="password">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type="password"
                className="form-input"
                style={{ width: '100%', paddingLeft: '40px' }}
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <Lock 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '14px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'var(--ios-text-secondary)'
                }} 
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span>Verificando...</span>
            ) : (
              <>
                <LogIn size={18} />
                <span>Entrar</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
