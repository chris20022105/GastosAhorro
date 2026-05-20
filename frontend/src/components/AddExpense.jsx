import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, Edit3 } from 'lucide-react';

export default function AddExpense({ isOpen, onClose, onExpenseAdded, token, user }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Café y Bebidas');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sincronizar fecha al abrir
  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      setDescription('');
      setCategory('Café y Bebidas');
      setError('');
    }
  }, [isOpen]);

  const categories = [
    { name: 'Café y Bebidas', emoji: '☕' },
    { name: 'Antojos y Snacks', emoji: '🍿' },
    { name: 'Delivery y Comida', emoji: '🍔' },
    { name: 'Transporte y Uber', emoji: '🚗' },
    { name: 'Suscripciones', emoji: '📺' },
    { name: 'Entretenimiento', emoji: '🎬' },
    { name: 'Otros', emoji: '📦' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Por favor, ingresa un monto válido mayor a 0.');
      return;
    }

    if (!description.trim()) {
      setError('Por favor, ingresa una descripción.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parsedAmount,
          description: description.trim(),
          category,
          date
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar el gasto');
      }

      onExpenseAdded(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Fondo oscuro traslúcido */}
      <div className={`overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>

      {/* Tarjeta bottom sheet de iOS */}
      <div className={`bottom-sheet ${isOpen ? 'open' : ''}`}>
        <div className="sheet-header">
          <span className="sheet-title">Registrar Gasto Hormiga</span>
          <button className="btn-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div 
            style={{
              backgroundColor: 'var(--color-danger-light)',
              color: 'var(--color-danger)',
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '16px'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Monto del Gasto */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Monto (S/.)</label>
            <input
              type="number"
              step="0.01"
              pattern="[0-9]*"
              inputMode="decimal"
              className="form-input"
              style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                textAlign: 'center', 
                letterSpacing: '-0.5px',
                color: 'var(--color-primary)',
                padding: '16px'
              }}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={loading}
              autoFocus={isOpen}
            />
          </div>

          {/* Descripción */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" htmlFor="desc">¿En qué gastaste?</label>
            <div style={{ position: 'relative' }}>
              <input
                id="desc"
                type="text"
                className="form-input"
                style={{ width: '100%', paddingLeft: '40px' }}
                placeholder="Ej. Starbucks, Uber, Chocolates..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={40}
                disabled={loading}
              />
              <Edit3 
                size={16} 
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

          {/* Selección de Categoría */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Categoría</label>
            <div className="category-grid">
              {categories.map((cat) => (
                <div
                  key={cat.name}
                  className={`category-grid-item ${category === cat.name ? 'active' : ''}`}
                  onClick={() => !loading && setCategory(cat.name)}
                >
                  <span className="emoji">{cat.emoji}</span>
                  <span>{cat.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fecha */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" htmlFor="date">Fecha</label>
            <div style={{ position: 'relative' }}>
              <input
                id="date"
                type="date"
                className="form-input"
                style={{ width: '100%', paddingLeft: '40px' }}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={loading}
              />
              <Calendar 
                size={16} 
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

          {/* Quién registra */}
          <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', textAlign: 'center', marginBottom: '20px', fontWeight: '500' }}>
            Registrando a nombre de: <span style={{ color: 'var(--ios-text)', fontWeight: '700' }}>{user.name}</span>
          </div>

          {/* Botón de envío */}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span>Registrando y enviando correos...</span>
            ) : (
              <>
                <Plus size={18} />
                <span>Agregar Gasto</span>
              </>
            )}
          </button>
        </form>
      </div>
    </>
  );
}
