import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sliders, Trash2, Calendar, Search, CreditCard, Sparkles, Plus } from 'lucide-react';
import useScrollLock from '../hooks/useScrollLock';

const CardChip = () => (
  <div style={{
    width: '36px',
    height: '26px',
    borderRadius: '6px',
    background: 'linear-gradient(135deg, #f5e278 0%, #d4af37 100%)',
    position: 'relative',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-evenly',
    padding: '3px'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-evenly' }}>
      <div style={{ width: '8px', height: '5px', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '2px' }} />
      <div style={{ width: '8px', height: '5px', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '2px' }} />
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-evenly' }}>
      <div style={{ width: '10px', height: '5px', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '2px' }} />
      <div style={{ width: '10px', height: '5px', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '2px' }} />
    </div>
  </div>
);

export default function CreditCards({ stats, user, onUpdateBudget, token, expenses, onDeleteExpense, showToast }) {
  const budget = stats?.budget;
  const yearMonth = budget ? budget.year_month : new Date().toISOString().substring(0, 7);
  const incomeChris = budget ? parseFloat(budget.income_chris_pen) : 2809.90;
  const incomeSolansh = budget ? parseFloat(budget.income_solansh_pen) : 1550.00;
  const budgetLimit = budget ? parseFloat(budget.budget_limit_pen) : 3000.00;
  const bcpLimit = budget ? parseFloat(budget.credit_limit_bcp_pen) : 1000.00;
  const ripleyLimit = budget ? parseFloat(budget.credit_limit_ripley_pen) : 500.00;
  
  const spentBcp = stats?.spentBcp || 0;
  const spentRipley = stats?.spentRipley || 0;

  const bcpPercent = bcpLimit > 0 ? Math.min((spentBcp / bcpLimit) * 100, 100) : 0;
  const ripleyPercent = ripleyLimit > 0 ? Math.min((spentRipley / ripleyLimit) * 100, 100) : 0;

  // Estados de modales
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payCard, setPayCard] = useState(''); // 'BCP' o 'Ripley'
  const [payAmount, setPayAmount] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [valLimitBcp, setValLimitBcp] = useState('');
  const [valLimitRipley, setValLimitRipley] = useState('');
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState('');

  // Estados de filtros de historial
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpender, setSelectedSpender] = useState('Todos'); // 'Todos', 'Christopher', 'Solansh'
  const [selectedCard, setSelectedCard] = useState('Todas'); // 'Todas', 'BCP', 'Ripley'

  // Inicializar inputs cuando se abren los modales
  useEffect(() => {
    if (isConfigOpen) {
      setValLimitBcp(bcpLimit.toString());
      setValLimitRipley(ripleyLimit.toString());
      setConfigError('');
    }
  }, [isConfigOpen, bcpLimit, ripleyLimit]);

  useEffect(() => {
    if (isPayOpen) {
      const defaultAmount = payCard === 'BCP' ? spentBcp : spentRipley;
      setPayAmount(defaultAmount.toFixed(2));
      setPayError('');
    }
  }, [isPayOpen, payCard, spentBcp, spentRipley]);

  // Lock body scroll
  useScrollLock(isPayOpen || isConfigOpen);

  // Guardar configuración de límites
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setConfigLoading(true);
    setConfigError('');

    const bcpVal = parseFloat(valLimitBcp);
    const ripleyVal = parseFloat(valLimitRipley);

    if (isNaN(bcpVal) || bcpVal < 0 || isNaN(ripleyVal) || ripleyVal < 0) {
      setConfigError('Por favor, ingresa límites de crédito válidos mayores o iguales a 0.');
      setConfigLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/budget/${yearMonth}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          income_chris_pen: incomeChris,
          income_solansh_pen: incomeSolansh,
          budget_limit_pen: budgetLimit,
          credit_limit_bcp_pen: bcpVal,
          credit_limit_ripley_pen: ripleyVal
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar configuración');
      }

      setIsConfigOpen(false);
      showToast('Líneas de crédito actualizadas');
      if (onUpdateBudget) {
        onUpdateBudget();
      }
    } catch (err) {
      setConfigError(err.message);
    } finally {
      setConfigLoading(false);
    }
  };

  // Registrar abono a la tarjeta (Pago Rápido)
  const handleQuickPay = async (e) => {
    e.preventDefault();
    setPayLoading(true);
    setPayError('');

    const parsedAmount = parseFloat(payAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setPayError('Por favor, ingresa un monto válido mayor a 0.');
      setPayLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parsedAmount,
          description: `Pago Tarjeta ${payCard}`,
          category: `Pago Tarjeta ${payCard}`,
          date: new Date().toISOString().split('T')[0]
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar el pago');
      }

      setIsPayOpen(false);
      showToast(`Pago de S/. ${parsedAmount.toFixed(2)} registrado en BCP/Ripley`);
      if (onUpdateBudget) {
        onUpdateBudget();
      }
    } catch (err) {
      setPayError(err.message);
    } finally {
      setPayLoading(false);
    }
  };

  // Confirmar y eliminar consumo
  const handleDeleteClick = (id, description, amount) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el consumo "${description}" por S/. ${amount.toFixed(2)}?`)) {
      onDeleteExpense(id);
    }
  };

  // Formatear fecha de YYYY-MM-DD a DD/MM/AAAA
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Filtrar consumos cargados a las tarjetas
  const cardExpenses = expenses.filter((exp) => {
    // 1. Filtrar solo por compras de tarjetas
    const isCard = exp.category === 'Tarjeta BCP' || exp.category === 'Tarjeta Ripley';
    if (!isCard) return false;

    // 2. Filtro por búsqueda
    const matchesSearch = 
      exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.category.toLowerCase().includes(searchQuery.toLowerCase());

    // 3. Filtro por Spender
    let matchesSpender = true;
    if (selectedSpender !== 'Todos') {
      matchesSpender = exp.spender_name.toLowerCase().includes(selectedSpender.toLowerCase());
    }

    // 4. Filtro por Tarjeta BCP / Ripley
    let matchesCardType = true;
    if (selectedCard !== 'Todas') {
      matchesCardType = 
        selectedCard === 'BCP' 
          ? exp.category === 'Tarjeta BCP' 
          : exp.category === 'Tarjeta Ripley';
    }

    return matchesSearch && matchesSpender && matchesCardType;
  });

  return (
    <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Cabecera de Tarjetas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 0 0' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Resumen de Créditos
          </span>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--ios-text)', marginTop: '2px' }}>
            Tarjetas de Crédito
          </h2>
        </div>
        <button 
          onClick={() => setIsConfigOpen(true)}
          style={{
            background: 'var(--ios-card-bg)',
            border: '1px solid var(--ios-separator)',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--ios-text)',
            boxShadow: 'var(--shadow-sm)'
          }}
          type="button"
          title="Configurar Líneas de Crédito"
        >
          <Sliders size={18} />
        </button>
      </div>

      {/* Grid de Tarjetas (Visual Premium) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Tarjeta BCP (Azul y Naranja BCP) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #002A54 0%, #004481 65%, #FF7F00 100%)',
            borderRadius: '20px',
            padding: '22px',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0, 42, 84, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '190px'
          }}>
            {/* Card Reflection Overlay */}
            <div style={{
              position: 'absolute',
              top: '-60%',
              left: '-60%',
              width: '220%',
              height: '220%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)',
              pointerEvents: 'none'
            }} />

            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  BCP Crédito
                </span>
                <span style={{ fontSize: '9px', opacity: 0.75, letterSpacing: '0.5px' }}>
                  Visa Signature
                </span>
              </div>
              <CardChip />
            </div>

            {/* Middle row */}
            <div style={{ margin: '12px 0', zIndex: 1 }}>
              <span style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Deuda Acumulada
              </span>
              <div style={{ fontSize: '30px', fontWeight: '800', letterSpacing: '-0.5px', marginTop: '2px' }}>
                S/. {spentBcp.toFixed(2)}
              </div>
            </div>

            {/* Bottom row / Progress */}
            <div style={{ zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.9, marginBottom: '6px' }}>
                <span>Límite: S/. {bcpLimit.toFixed(0)}</span>
                <span>Disp: S/. {(bcpLimit - spentBcp).toFixed(2)}</span>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.22)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    backgroundColor: '#ffffff', 
                    height: '100%', 
                    width: `${bcpPercent}%`, 
                    borderRadius: '3px', 
                    transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)' 
                  }} 
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setPayCard('BCP');
              setIsPayOpen(true);
            }}
            className="btn-primary"
            style={{
              backgroundColor: '#002A54',
              borderRadius: '14px',
              padding: '12px',
              fontWeight: '700',
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(0, 42, 84, 0.15)'
            }}
          >
            Pagar Tarjeta BCP 💸
          </button>
        </div>

        {/* Tarjeta Ripley (Plateada / Gris Premium) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #3a3a3c 0%, #7c7c80 50%, #d1d1d6 100%)',
            borderRadius: '20px',
            padding: '22px',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(100, 100, 100, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '190px'
          }}>
            {/* Card Reflection Overlay */}
            <div style={{
              position: 'absolute',
              top: '-60%',
              left: '-60%',
              width: '220%',
              height: '220%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)',
              pointerEvents: 'none'
            }} />

            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Ripley
                </span>
                <span style={{ fontSize: '9px', opacity: 0.75, letterSpacing: '0.5px' }}>
                  Mastercard Gold
                </span>
              </div>
              <CardChip />
            </div>

            {/* Middle row */}
            <div style={{ margin: '12px 0', zIndex: 1 }}>
              <span style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Deuda Acumulada
              </span>
              <div style={{ fontSize: '30px', fontWeight: '800', letterSpacing: '-0.5px', marginTop: '2px' }}>
                S/. {spentRipley.toFixed(2)}
              </div>
            </div>

            {/* Bottom row / Progress */}
            <div style={{ zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.9, marginBottom: '6px' }}>
                <span>Límite: S/. {ripleyLimit.toFixed(0)}</span>
                <span>Disp: S/. {(ripleyLimit - spentRipley).toFixed(2)}</span>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.22)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    backgroundColor: '#ffffff', 
                    height: '100%', 
                    width: `${ripleyPercent}%`, 
                    borderRadius: '3px', 
                    transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)' 
                  }} 
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setPayCard('Ripley');
              setIsPayOpen(true);
            }}
            className="btn-primary"
            style={{
              backgroundColor: '#48484a',
              borderRadius: '14px',
              padding: '12px',
              fontWeight: '700',
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(72, 72, 74, 0.15)'
            }}
          >
            Pagar Tarjeta Ripley 💸
          </button>
        </div>

      </div>

      {/* Historial Exclusivo de Tarjetas */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
          <CreditCard size={18} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--ios-text)' }}>Historial de Consumos</h3>
        </div>

        {/* Buscador */}
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px', fontSize: '14px' }}
            placeholder="Buscar consumo o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search 
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

        {/* Filtros */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {/* Spender selector */}
          <div className="segmented-control" style={{ margin: 0 }}>
            <button className={selectedSpender === 'Todos' ? 'active' : ''} onClick={() => setSelectedSpender('Todos')}>
              Todos
            </button>
            <button className={selectedSpender === 'Christopher' ? 'active' : ''} onClick={() => setSelectedSpender('Christopher')}>
              Christopher
            </button>
            <button className={selectedSpender === 'Solansh' ? 'active' : ''} onClick={() => setSelectedSpender('Solansh')}>
              Solansh
            </button>
          </div>

          {/* Card selector */}
          <div className="segmented-control" style={{ margin: 0 }}>
            <button className={selectedCard === 'Todas' ? 'active' : ''} onClick={() => setSelectedCard('Todas')}>
              Todas
            </button>
            <button className={selectedCard === 'BCP' ? 'active' : ''} onClick={() => setSelectedCard('BCP')}>
              BCP
            </button>
            <button className={selectedCard === 'Ripley' ? 'active' : ''} onClick={() => setSelectedCard('Ripley')}>
              Ripley
            </button>
          </div>
        </div>

        {/* Lista de compras */}
        <div className="expenses-card" style={{ padding: '16px', border: '1px solid var(--ios-separator)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="list-container">
            {cardExpenses.length > 0 ? (
              cardExpenses.map((exp) => {
                const isBCP = exp.category === 'Tarjeta BCP';
                const spenderName = exp.spender_name.split(' ')[0];
                return (
                  <div key={exp.id} className="expense-item" style={{ borderBottom: '1px solid var(--ios-separator)' }}>
                    <div className="expense-left">
                      <div 
                        className="category-emoji-box" 
                        style={{ 
                          backgroundColor: isBCP ? '#e1f0fa' : '#f2f2f7',
                          fontSize: '18px'
                        }}
                      >
                        {isBCP ? '💳' : '🛍️'}
                      </div>
                      <div className="expense-info">
                        <span className="expense-desc">{exp.description}</span>
                        <div className="expense-meta">
                          <span className="spender-tag">{spenderName}</span>
                          <span 
                            style={{ 
                              padding: '2px 6px', 
                              borderRadius: '6px', 
                              fontSize: '10px', 
                              fontWeight: '700',
                              backgroundColor: isBCP ? '#002A54' : '#636366',
                              color: '#ffffff'
                            }}
                          >
                            {isBCP ? 'BCP' : 'Ripley'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Calendar size={10} /> {formatDate(exp.date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="expense-right">
                      <span className="expense-amount" style={{ color: isBCP ? '#002A54' : '#48484a' }}>
                        S/. {parseFloat(exp.amount).toFixed(2)}
                      </span>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteClick(exp.id, exp.description, parseFloat(exp.amount))}
                        title="Eliminar gasto"
                        type="button"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-expenses" style={{ padding: '24px 0' }}>
                No hay consumos de tarjeta registrados con los filtros seleccionados.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PORTAL: MODAL DE CONFIGURACIÓN DE LÍMITES */}
      {createPortal(
        <>
          <div 
            className={`overlay ${isConfigOpen ? 'open' : ''}`} 
            onClick={() => !configLoading && setIsConfigOpen(false)}
            onTouchMove={(e) => e.preventDefault()}
          ></div>
          
          <div className={`bottom-sheet ${isConfigOpen ? 'open' : ''}`}>
            <div className="sheet-header" onTouchMove={(e) => e.preventDefault()}>
              <span className="sheet-title">Líneas de Crédito ({yearMonth})</span>
              <button className="btn-close" onClick={() => !configLoading && setIsConfigOpen(false)} type="button" disabled={configLoading}>
                <X size={18} />
              </button>
            </div>

            {configError && (
              <div style={{
                backgroundColor: 'var(--color-danger-light)',
                color: 'var(--color-danger)',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '16px'
              }}>
                {configError}
              </div>
            )}

            <form onSubmit={handleSaveConfig}>
              {/* Límite BCP */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Límite Tarjeta BCP (S/.)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-input" 
                  style={{ color: '#005ca9', fontWeight: '700' }}
                  value={valLimitBcp} 
                  onChange={(e) => setValLimitBcp(e.target.value)} 
                  disabled={configLoading}
                  placeholder="1000.00"
                  required
                />
              </div>

              {/* Límite Ripley */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Límite Tarjeta Ripley (S/.)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-input" 
                  style={{ color: '#ec6707', fontWeight: '700' }}
                  value={valLimitRipley} 
                  onChange={(e) => setValLimitRipley(e.target.value)} 
                  disabled={configLoading}
                  placeholder="500.00"
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={configLoading}>
                {configLoading ? 'Guardando...' : 'Guardar Líneas de Crédito'}
              </button>
            </form>
          </div>
        </>,
        document.body
      )}

      {/* PORTAL: MODAL DE PAGO RÁPIDO */}
      {createPortal(
        <>
          <div 
            className={`overlay ${isPayOpen ? 'open' : ''}`} 
            onClick={() => !payLoading && setIsPayOpen(false)}
            onTouchMove={(e) => e.preventDefault()}
          ></div>

          <div className={`bottom-sheet ${isPayOpen ? 'open' : ''}`}>
            <div className="sheet-header" onTouchMove={(e) => e.preventDefault()}>
              <span className="sheet-title">Abonar a Tarjeta {payCard}</span>
              <button className="btn-close" onClick={() => !payLoading && setIsPayOpen(false)} type="button" disabled={payLoading}>
                <X size={18} />
              </button>
            </div>

            {payError && (
              <div style={{
                backgroundColor: 'var(--color-danger-light)',
                color: 'var(--color-danger)',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '16px'
              }}>
                {payError}
              </div>
            )}

            <form onSubmit={handleQuickPay}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Monto a Pagar (S/.)</label>
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
                    color: payCard === 'BCP' ? '#002A54' : '#48484a',
                    padding: '16px'
                  }}
                  placeholder="0.00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                  disabled={payLoading}
                  autoFocus={isPayOpen}
                />
              </div>

              <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', textAlign: 'center', marginBottom: '20px', fontWeight: '500' }}>
                Se registrará como un gasto de caja (efectivo) para Christopher/Solansh y reducirá la deuda acumulada de la tarjeta.
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={payLoading} 
                style={{ backgroundColor: payCard === 'BCP' ? '#002A54' : '#48484a', boxShadow: 'none' }}
              >
                {payLoading ? (
                  <span>Registrando pago...</span>
                ) : (
                  <>
                    <Plus size={18} />
                    <span>Confirmar Pago (S/. {parseFloat(payAmount || 0).toFixed(2)})</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </>,
        document.body
      )}

    </div>
  );
}
