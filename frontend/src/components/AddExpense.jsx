import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Calendar, Edit3 } from 'lucide-react';
import useScrollLock from '../hooks/useScrollLock';

export default function AddExpense({ isOpen, onClose, onExpenseAdded, token, user, stats }) {
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

  // Bloquear scroll del fondo cuando está abierto
  useScrollLock(isOpen);

  const categories = [
    { name: 'Café y Bebidas', emoji: '☕' },
    { name: 'Antojos y Snacks', emoji: '🍿' },
    { name: 'Delivery y Comida', emoji: '🍔' },
    { name: 'Transporte y Uber', emoji: '🚗' },
    { name: 'Suscripciones', emoji: '📺' },
    { name: 'Entretenimiento', emoji: '🎬' },
    { name: 'Tarjeta BCP', emoji: '💳', shortName: 'TC BCP' },
    { name: 'Tarjeta Ripley', emoji: '🛍️', shortName: 'TC Ripley' },
    { name: 'Pago Tarjeta BCP', emoji: '💸', shortName: 'Pago BCP' },
    { name: 'Pago Tarjeta Ripley', emoji: '💸', shortName: 'Pago Ripley' },
    { name: 'Otros', emoji: '📦' }
  ];

  const budget = stats?.budget;
  const totalSpent = stats?.totalSpent || 0;
  const budgetLimit = budget ? parseFloat(budget.budget_limit_pen) : 3000;
  const isBlocked = budget && totalSpent >= budgetLimit;

  // Lógica de bloqueo por Tarjetas de Crédito
  const bcpLimit = budget ? parseFloat(budget.credit_limit_bcp_pen) : 1000;
  const bcpSpent = stats?.spentBcp || 0;
  const isBcpBlocked = bcpSpent >= bcpLimit;

  const ripleyLimit = budget ? parseFloat(budget.credit_limit_ripley_pen) : 500;
  const ripleySpent = stats?.spentRipley || 0;
  const isRipleyBlocked = ripleySpent >= ripleyLimit;

  const isCardPurchase = ['Tarjeta BCP', 'Tarjeta Ripley'].includes(category);
  const isSubmitBlocked = isCardPurchase
    ? (category === 'Tarjeta BCP' ? isBcpBlocked : isRipleyBlocked)
    : isBlocked;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const isCurrentBlocked = category === 'Tarjeta BCP'
      ? isBcpBlocked
      : category === 'Tarjeta Ripley'
        ? isRipleyBlocked
        : isBlocked;

    if (isCurrentBlocked) {
      setError(
        category === 'Tarjeta BCP'
          ? 'El límite de crédito de la tarjeta BCP ya se encuentra agotado.'
          : category === 'Tarjeta Ripley'
            ? 'El límite de crédito de la tarjeta Ripley ya se encuentra agotado.'
            : 'El presupuesto de efectivo de este mes ya está agotado.'
      );
      return;
    }

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

  return createPortal(
    <>
      {/* Fondo oscuro traslúcido */}
      <div 
        className={`overlay ${isOpen ? 'open' : ''}`} 
        onClick={() => !loading && onClose()}
        onTouchMove={(e) => e.preventDefault()}
      ></div>

      {/* Tarjeta bottom sheet de iOS */}
      <div className={`bottom-sheet ${isOpen ? 'open' : ''}`}>
        <div className="sheet-header" onTouchMove={(e) => e.preventDefault()}>
          <span className="sheet-title">Registrar Gasto Hormiga</span>
          <button className="btn-close" onClick={() => !loading && onClose()} type="button" disabled={loading}>
            <X size={18} />
          </button>
        </div>

        {isBlocked && (
          <div 
            style={{
              backgroundColor: 'var(--color-danger-light)',
              color: 'var(--color-danger)',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '16px',
              lineHeight: '1.4',
              border: '1px solid rgba(217, 56, 56, 0.2)'
            }}
          >
            ⚠️ El presupuesto mensual se ha agotado o superado (S/. {totalSpent.toFixed(2)} de S/. {budgetLimit.toFixed(2)}). No se permiten registrar más gastos.
          </div>
        )}

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
                  <span>{cat.shortName || cat.name.split(' ')[0]}</span>
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
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading || isSubmitBlocked} 
            style={{ backgroundColor: isSubmitBlocked ? '#86868b' : '' }}
          >
            {loading ? (
              <span>Registrando y enviando correos...</span>
            ) : isSubmitBlocked ? (
              <span>
                {category === 'Tarjeta BCP' 
                  ? 'Límite BCP Excedido 🔒' 
                  : category === 'Tarjeta Ripley' 
                    ? 'Límite Ripley Excedido 🔒' 
                    : 'Presupuesto Agotado 🔒'}
              </span>
            ) : (
              <>
                <Plus size={18} />
                <span>Agregar Gasto</span>
              </>
            )}
          </button>
        </form>
      </div>
    </>,
    document.body
  );
}
