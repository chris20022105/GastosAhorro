import React, { useState, useEffect } from 'react';
import { Sliders, X, Plus, Calendar, Edit3, Trash2, TrendingUp, Award, Users } from 'lucide-react';

export default function SavingsBox({ token, user, showToast }) {
  const [goal, setGoal] = useState({ target_amount: 5000, description: 'Meta de Ahorro Colectiva' });
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados para Modal Aporte
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depAmount, setDepAmount] = useState('');
  const [depDescription, setDepDescription] = useState('');
  const [depDate, setDepDate] = useState('');
  const [depLoading, setDepLoading] = useState(false);
  const [depError, setDepError] = useState('');

  // Estados para Modal Meta
  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [goalAmount, setGoalAmount] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalLoading, setGoalLoading] = useState(false);
  const [goalError, setGoalError] = useState('');

  // Cargar datos
  const fetchSavingsData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Cargar Meta
      const goalRes = await fetch('/api/savings/goal', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (goalRes.ok) {
        const goalData = await goalRes.json();
        setGoal(goalData);
      }

      // 2. Cargar Aportes
      const depRes = await fetch('/api/savings/deposits', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (depRes.ok) {
        const depData = await depRes.json();
        setDeposits(depData);
      }
    } catch (err) {
      console.error('Error al cargar datos de ahorro:', err);
      setError('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSavingsData();
    }
  }, [token]);

  // Inicializar inputs de aportes
  useEffect(() => {
    if (isDepositOpen) {
      setDepAmount('');
      setDepDescription('');
      setDepDate(new Date().toISOString().split('T')[0]);
      setDepError('');
    }
  }, [isDepositOpen]);

  // Inicializar inputs de meta
  useEffect(() => {
    if (isGoalOpen) {
      setGoalAmount(goal.target_amount.toString());
      setGoalDescription(goal.description);
      setGoalError('');
    }
  }, [isGoalOpen, goal]);

  // Bloqueo de scroll cuando los modales están abiertos
  useEffect(() => {
    if (isDepositOpen || isGoalOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [isDepositOpen, isGoalOpen]);

  // Totales
  const totalSaved = deposits.reduce((sum, d) => sum + parseFloat(d.amount), 0);
  const target = parseFloat(goal.target_amount) || 5000;
  const progressPercent = Math.min((totalSaved / target) * 100, 100);
  const remainingToGoal = Math.max(target - totalSaved, 0);

  // Ahorro por persona
  const partnerSavings = {};
  deposits.forEach((dep) => {
    partnerSavings[dep.spender_name] = (partnerSavings[dep.spender_name] || 0) + parseFloat(dep.amount);
  });
  const partnerNames = Object.keys(partnerSavings);

  const getPartnerPercentage = (amount) => {
    if (totalSaved === 0) return 0;
    return Math.round((amount / totalSaved) * 100);
  };

  // Crear aporte
  const handleSaveDeposit = async (e) => {
    e.preventDefault();
    setDepLoading(true);
    setDepError('');

    const parsedAmount = parseFloat(depAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setDepError('Por favor, ingresa un monto válido mayor a 0.');
      setDepLoading(false);
      return;
    }

    if (!depDescription.trim()) {
      setDepError('Por favor, ingresa una descripción del aporte.');
      setDepLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/savings/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parsedAmount,
          description: depDescription.trim(),
          date: depDate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar el aporte');
      }

      setIsDepositOpen(false);
      fetchSavingsData();
      if (showToast) {
        showToast('🐷 ¡Aporte guardado y correos de confirmación enviados!');
      }
    } catch (err) {
      setDepError(err.message);
    } finally {
      setDepLoading(false);
    }
  };

  // Guardar configuración de la meta
  const handleSaveGoal = async (e) => {
    e.preventDefault();
    setGoalLoading(true);
    setGoalError('');

    const parsedTarget = parseFloat(goalAmount);
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setGoalError('Por favor, ingresa un monto de meta válido mayor a 0.');
      setGoalLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/savings/goal', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          target_amount: parsedTarget,
          description: goalDescription.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar la meta');
      }

      setIsGoalOpen(false);
      fetchSavingsData();
      if (showToast) {
        showToast('🎯 Meta de ahorro actualizada correctamente');
      }
    } catch (err) {
      setGoalError(err.message);
    } finally {
      setGoalLoading(false);
    }
  };

  // Eliminar aporte
  const handleDeleteDeposit = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este aporte a la caja de ahorro?')) {
      return;
    }

    try {
      const response = await fetch(`/api/savings/deposits/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchSavingsData();
        if (showToast) {
          showToast('Aporte eliminado de la caja');
        }
      } else {
        const data = await response.json();
        throw new Error(data.error || 'No se pudo eliminar el aporte');
      }
    } catch (err) {
      if (showToast) {
        showToast(err.message, 'error');
      }
    }
  };

  return (
    <div className="dashboard-content" style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      {/* Tarjeta de Ahorro Colectivo */}
      <div 
        className="summary-card" 
        style={{ 
          background: 'linear-gradient(135deg, #1b4332, #40916c)',
          boxShadow: '0 8px 24px rgba(27, 67, 50, 0.15)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className="summary-label">Caja de Ahorro Colectiva</span>
            <div className="summary-total">S/. {totalSaved.toFixed(2)}</div>
          </div>
          <button 
            onClick={() => setIsGoalOpen(true)}
            className="btn-settings"
            title="Configurar Meta de Ahorro"
            type="button"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.18)' }}
          >
            <Sliders size={20} />
          </button>
        </div>
        
        <div className="progress-container">
          <div className="progress-info">
            <span>Objetivo: S/. {target.toFixed(2)}</span>
            <span>{progressPercent.toFixed(0)}%</span>
          </div>
          <div className="progress-bar-bg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)' }}>
            <div 
              className="progress-bar-fill" 
              style={{ 
                width: `${progressPercent}%`, 
                backgroundColor: '#ffffff'
              }}
            ></div>
          </div>
          {remainingToGoal > 0 ? (
            <div style={{ fontSize: '11px', color: '#e2ede1', marginTop: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={12} /> Faltan S/. {remainingToGoal.toFixed(2)} para completar la meta "{goal.description}".
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: '#ffe58f', marginTop: '8px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Award size={12} /> 🎉 ¡Felicidades! Meta "{goal.description}" completada y superada.
            </div>
          )}
        </div>
      </div>

      {/* Participación de Ahorro */}
      <div className="section-title" style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Users size={16} style={{ color: '#2d6a4f' }} />
        <span>¿Quién ha aportado más?</span>
      </div>

      <div className="partners-grid">
        {partnerNames.length > 0 ? (
          partnerNames.map((name) => {
            const amount = partnerSavings[name] || 0;
            const percent = getPartnerPercentage(amount);
            return (
              <div key={name} className="partner-card">
                <span className="partner-name">
                  {name.split(' ')[0]}
                </span>
                <span className="partner-amount" style={{ color: '#2d6a4f' }}>S/. {amount.toFixed(2)}</span>
                
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ios-text-secondary)', marginBottom: '4px' }}>
                    <span>Participación</span>
                    <span style={{ fontWeight: '600' }}>{percent}%</span>
                  </div>
                  <div style={{ backgroundColor: '#7676800f', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        backgroundColor: '#2d6a4f', 
                        height: '100%', 
                        width: `${percent}%`,
                        borderRadius: '3px'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="partner-card" style={{ gridColumn: 'span 2', alignItems: 'center', padding: '24px', color: 'var(--ios-text-secondary)' }}>
            Aún no hay aportes registrados.
          </div>
        )}
      </div>

      {/* Historial de Aportes */}
      <div className="section-header" style={{ marginTop: '4px' }}>
        <span className="section-title">Historial de Aportes</span>
        {loading && <span style={{ fontSize: '12px', color: 'var(--ios-text-secondary)' }}>Cargando...</span>}
      </div>

      <div className="expenses-card">
        {deposits.length > 0 ? (
          <div className="list-container">
            {deposits.map((dep) => (
              <div key={dep.id} className="expense-item">
                <div className="expense-left">
                  <div className="category-emoji-box" style={{ backgroundColor: '#e2ede1', color: '#1b4332' }}>
                    🐷
                  </div>
                  <div className="expense-info">
                    <span className="expense-desc">{dep.description}</span>
                    <div className="expense-meta">
                      <span className="spender-tag" style={{ backgroundColor: '#e2ede1', color: '#1b4332' }}>
                        {dep.spender_name.split(' ')[0]}
                      </span>
                      <span>•</span>
                      <span>{new Date(dep.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>
                </div>
                <div className="expense-right">
                  <span className="expense-amount" style={{ color: '#2d6a4f' }}>+ S/. {parseFloat(dep.amount).toFixed(2)}</span>
                  {user.id === dep.user_id && (
                    <button 
                      className="btn-delete"
                      onClick={() => handleDeleteDeposit(dep.id)}
                      title="Eliminar aporte"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-expenses">
            No hay depósitos en la caja de ahorro aún. ¡Registra el primero! 🌱
          </div>
        )}
      </div>

      {/* Botón flotante para registrar aporte (FAB local para esta vista) */}
      <button 
        className="fab fab-savings"
        onClick={() => setIsDepositOpen(true)}
        type="button"
      >
        <Plus size={18} />
        <span>Nuevo Ahorro</span>
      </button>

      {/* MODAL DE APORTE (Bottom Sheet) */}
      <div 
        className={`overlay ${isDepositOpen ? 'open' : ''}`} 
        onClick={() => setIsDepositOpen(false)}
        onTouchMove={(e) => e.preventDefault()}
      ></div>

      <div className={`bottom-sheet ${isDepositOpen ? 'open' : ''}`}>
        <div className="sheet-header" onTouchMove={(e) => e.preventDefault()}>
          <span className="sheet-title">Aportar a Caja de Ahorro</span>
          <button className="btn-close" onClick={() => setIsDepositOpen(false)} type="button">
            <X size={18} />
          </button>
        </div>

        {depError && (
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
            {depError}
          </div>
        )}

        <form onSubmit={handleSaveDeposit}>
          {/* Monto del Aporte */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Monto a Ahorrar (S/.)</label>
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
                color: '#2d6a4f',
                padding: '16px'
              }}
              placeholder="0.00"
              value={depAmount}
              onChange={(e) => setDepAmount(e.target.value)}
              required
              disabled={depLoading}
              autoFocus={isDepositOpen}
            />
          </div>

          {/* Descripción / Origen */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" htmlFor="dep-desc">¿De dónde viene este ahorro?</label>
            <div style={{ position: 'relative' }}>
              <input
                id="dep-desc"
                type="text"
                className="form-input"
                style={{ width: '100%', paddingLeft: '40px' }}
                placeholder="Ej. Ahorro sueldo, Venta de artículo, Extra..."
                value={depDescription}
                onChange={(e) => setDepDescription(e.target.value)}
                required
                maxLength={40}
                disabled={depLoading}
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

          {/* Fecha */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" htmlFor="dep-date">Fecha</label>
            <div style={{ position: 'relative' }}>
              <input
                id="dep-date"
                type="date"
                className="form-input"
                style={{ width: '100%', paddingLeft: '40px' }}
                value={depDate}
                onChange={(e) => setDepDate(e.target.value)}
                required
                disabled={depLoading}
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

          <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', textAlign: 'center', marginBottom: '20px', fontWeight: '500' }}>
            Aportando a nombre de: <span style={{ color: 'var(--ios-text)', fontWeight: '700' }}>{user.name}</span>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={depLoading} 
            style={{ backgroundColor: '#2d6a4f' }}
          >
            {depLoading ? (
              <span>Guardando y notificando...</span>
            ) : (
              <>
                <Plus size={18} />
                <span>Registrar Ahorro</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* MODAL CONFIGURACIÓN META (Bottom Sheet) */}
      <div 
        className={`overlay ${isGoalOpen ? 'open' : ''}`} 
        onClick={() => setIsGoalOpen(false)}
        onTouchMove={(e) => e.preventDefault()}
      ></div>

      <div className={`bottom-sheet ${isGoalOpen ? 'open' : ''}`}>
        <div className="sheet-header" onTouchMove={(e) => e.preventDefault()}>
          <span className="sheet-title">Configurar Meta de Ahorro</span>
          <button className="btn-close" onClick={() => setIsGoalOpen(false)} type="button">
            <X size={18} />
          </button>
        </div>

        {goalError && (
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
            {goalError}
          </div>
        )}

        <form onSubmit={handleSaveGoal}>
          {/* Monto Objetivo */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Monto Meta Objetivo (S/.)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              style={{ fontSize: '20px', fontWeight: '700', color: '#2d6a4f' }}
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              required
              disabled={goalLoading}
              placeholder="5000.00"
            />
          </div>

          {/* Nombre/Descripción de la meta */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Nombre/Motivo de la Meta</label>
            <input
              type="text"
              className="form-input"
              value={goalDescription}
              onChange={(e) => setGoalDescription(e.target.value)}
              required
              disabled={goalLoading}
              placeholder="Ej. Meta de Ahorro Colectiva, Viaje, Auto..."
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={goalLoading}
            style={{ backgroundColor: '#2d6a4f' }}
          >
            {goalLoading ? 'Guardando...' : 'Guardar Meta'}
          </button>
        </form>
      </div>
    </div>
  );
}
