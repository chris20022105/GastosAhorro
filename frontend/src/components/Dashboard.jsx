import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, Sparkles, Heart, Sliders, X, Lock, AlertTriangle, CalendarDays } from 'lucide-react';
import useScrollLock from '../hooks/useScrollLock';

export default function Dashboard({ stats, user, onUpdateBudget, token }) {
  const { totalSpent = 0, partnerSpent = {}, categorySpent = {}, budget } = stats;

  const isConfirmed = budget ? parseFloat(budget.income_chris_pen) >= 0 : true;
  const budgetLimit = budget ? parseFloat(budget.budget_limit_pen) : 3000;
  const incomeChris = budget ? Math.abs(parseFloat(budget.income_chris_pen)) : 2809.90;
  const incomeSolansh = budget ? parseFloat(budget.income_solansh_pen) : 1550.00;
  const bcpLimit = budget ? parseFloat(budget.credit_limit_bcp_pen) : 1000.00;
  const ripleyLimit = budget ? parseFloat(budget.credit_limit_ripley_pen) : 500.00;
  const yearMonth = budget ? budget.year_month : new Date().toISOString().substring(0, 7);

  const progressPercent = Math.min((totalSpent / budgetLimit) * 100, 100);
  const remainingBudget = Math.max(budgetLimit - totalSpent, 0);
  const combinedIncome = incomeChris + incomeSolansh;
  const salaryProgressPercent = combinedIncome > 0 ? Math.min((totalSpent / combinedIncome) * 100, 100) : 0;
  const remainingSalary = Math.max(combinedIncome - totalSpent, 0);
  const isExceeded = totalSpent >= budgetLimit;
  const isNearLimit = totalSpent >= budgetLimit * 0.9 && totalSpent < budgetLimit;


  // Cálculos de Micro-Límites (Presupuesto Diario/Semanal Dinámico)
  const today = new Date();
  const todayNoTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Determinar año y mes del ciclo
  let cycleYear = today.getFullYear();
  let cycleMonth = today.getMonth(); // 0-indexed
  if (yearMonth) {
    const parts = yearMonth.split('-');
    if (parts.length === 2) {
      cycleYear = parseInt(parts[0], 10);
      cycleMonth = parseInt(parts[1], 10) - 1;
    }
  }

  // Fecha inicio del ciclo: cycleYear-cycleMonth-26
  const cycleStart = new Date(cycleYear, cycleMonth, 26);
  // Fecha fin del ciclo: 25 del siguiente mes
  const cycleEnd = new Date(cycleYear, cycleMonth + 1, 25);

  // Días totales en el ciclo
  const diffTotalTime = cycleEnd.getTime() - cycleStart.getTime();
  const totalDays = Math.round(diffTotalTime / (1000 * 60 * 60 * 24)) + 1;

  // Días restantes en el ciclo (incluyendo hoy)
  let remainingDays = 0;
  if (todayNoTime < cycleStart) {
    remainingDays = totalDays; // Aún no empieza el ciclo
  } else if (todayNoTime > cycleEnd) {
    remainingDays = 0; // Ya terminó el ciclo
  } else {
    const diffRemainingTime = cycleEnd.getTime() - todayNoTime.getTime();
    remainingDays = Math.round(diffRemainingTime / (1000 * 60 * 60 * 24)) + 1;
  }

  // Presupuesto diario original
  const dailyOriginal = budgetLimit / totalDays;

  // Presupuesto diario restante dinámico
  const dailyRemaining = remainingDays > 0 ? remainingBudget / remainingDays : 0;

  // Presupuesto semanal restante dinámico
  const weeklyRemaining = dailyRemaining * Math.min(7, remainingDays);

  // Semáforo de estado diario
  let dailyRemainingStatus = {
    bgColor: 'rgba(52, 199, 89, 0.1)',
    textColor: 'var(--color-primary)',
    icon: <Sparkles size={14} />,
    message: ''
  };

  if (remainingBudget <= 0) {
    dailyRemainingStatus = {
      bgColor: 'var(--color-danger-light)',
      textColor: 'var(--color-danger)',
      icon: <Lock size={14} />,
      message: '🔒 Límite de presupuesto mensual alcanzado. S/. 0.00 diario disponible.'
    };
  } else if (remainingDays === 0) {
    dailyRemainingStatus = {
      bgColor: '#7676800f',
      textColor: 'var(--ios-text-secondary)',
      icon: <CalendarDays size={14} />,
      message: '⌛ El mes ha concluido.'
    };
  } else if (dailyRemaining >= dailyOriginal) {
    const diff = dailyRemaining - dailyOriginal;
    dailyRemainingStatus = {
      bgColor: 'var(--color-primary-light)',
      textColor: 'var(--color-primary)',
      icon: <Sparkles size={14} />,
      message: `🎉 ¡Margen positivo! Tienen S/. ${diff.toFixed(2)} más por día de lo presupuestado originalmente.`
    };
  } else {
    const diff = dailyOriginal - dailyRemaining;
    dailyRemainingStatus = {
      bgColor: '#fffbe6',
      textColor: '#b75e00',
      icon: <AlertTriangle size={14} />,
      message: `⚠️ Ajuste necesario: Deben gastar S/. ${diff.toFixed(2)} menos por día para cumplir la meta.`
    };
  }

  // Estados para modal de configuración
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [valChris, setValChris] = useState('');
  const [valSolansh, setValSolansh] = useState('');
  const [valLimit, setValLimit] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Inicializar inputs cuando se abre el modal
  useEffect(() => {
    if (isModalOpen) {
      setValChris(incomeChris.toString());
      setValSolansh(incomeSolansh.toString());
      setValLimit(budgetLimit.toString());
      setError('');
    }
  }, [isModalOpen, incomeChris, incomeSolansh, budgetLimit]);

  // Auto-abrir modal si el presupuesto no está confirmado para este ciclo
  useEffect(() => {
    if (budget && parseFloat(budget.income_chris_pen) < 0) {
      const sessionKey = `hasAutoOpened-${budget.year_month}`;
      if (!sessionStorage.getItem(sessionKey)) {
        setIsModalOpen(true);
        sessionStorage.setItem(sessionKey, 'true');
      }
    }
  }, [budget]);

  // Bloquear scroll del fondo cuando los modales están abiertos
  useScrollLock(isModalOpen);

  const numChris = parseFloat(valChris) || 0;
  const numSolansh = parseFloat(valSolansh) || 0;
  const previewCombinedIncome = numChris + numSolansh;

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/budget/${yearMonth}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          income_chris_pen: numChris,
          income_solansh_pen: numSolansh,
          budget_limit_pen: parseFloat(valLimit) || 0,
          credit_limit_bcp_pen: bcpLimit,
          credit_limit_ripley_pen: ripleyLimit
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar el presupuesto');
      }

      setIsModalOpen(false);
      if (onUpdateBudget) {
        onUpdateBudget();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  // Emojis de categoría
  const categoryEmojis = {
    'Café y Bebidas': '☕',
    'Antojos y Snacks': '🍿',
    'Delivery y Comida': '🍔',
    'Transporte y Uber': '🚗',
    'Suscripciones': '📺',
    'Entretenimiento': '🎬',
    'Ahorro': '🐷',
    'Otros': '📦'
  };

  // Nombres de los miembros
  const partnerNames = Object.keys(partnerSpent);
  
  // Calcular porcentaje de participación
  const getPartnerPercentage = (amount) => {
    if (totalSpent === 0) return 0;
    return Math.round((amount / totalSpent) * 100);
  };

  // Autocompletar presupuesto límite
  const selectSuggestion = (percent) => {
    const suggested = Math.round(previewCombinedIncome * percent);
    setValLimit(suggested.toString());
  };

  const getCycleRangeText = (yearMonth) => {
    if (!yearMonth) return '';
    const parts = yearMonth.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; // 0-indexed
    
    const start = new Date(y, m, 26);
    const end = new Date(y, m + 1, 25);
    
    const opt = { day: 'numeric', month: 'short' };
    return `${start.toLocaleDateString('es-ES', opt)} a ${end.toLocaleDateString('es-ES', opt)}`;
  };

  return (
    <div className="dashboard-content">
      {!isConfirmed && (
        <div className="alert-banner alert-banner-warning" style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', border: '1px solid rgba(212, 107, 8, 0.2)', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <CalendarDays size={18} style={{ flexShrink: 0 }} />
            <strong>¡Nuevo ciclo iniciado ({getCycleRangeText(yearMonth)})!</strong>
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginLeft: '26px' }}>
            Por favor, confirma o actualiza los sueldos y el límite de gasto para este periodo.
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary"
            style={{
              marginLeft: '26px',
              padding: '6px 12px',
              fontSize: '12px',
              width: 'auto',
              minHeight: 'auto',
              background: 'var(--color-primary)',
              marginTop: '4px'
            }}
            type="button"
          >
            Confirmar Presupuesto ✍️
          </button>
        </div>
      )}
      {/* Banner de bloqueo (100% de Presupuesto) */}
      {isExceeded && (
        <div className="alert-banner alert-banner-danger" style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <Lock size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>¡Presupuesto Agotado (100%)!</strong>
            Se ha consumido S/. {totalSpent.toFixed(2)} de S/. {budgetLimit.toFixed(2)}. Se envió una alerta por correo a ambos y se ha bloqueado el registro de más gastos hasta el próximo mes o hasta que aumenten el presupuesto.
          </div>
        </div>
      )}

      {/* Banner de advertencia (90% de Presupuesto) */}
      {isNearLimit && (
        <div className="alert-banner alert-banner-warning" style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>¡Alerta de Consumo Elevado (90%)!</strong>
            Han consumido el {progressPercent.toFixed(0)}% del límite mensual. Saldo libre restante: <strong>S/. {remainingBudget.toFixed(2)}</strong>. ¡Hora de cuidar los gastos hormiga!
          </div>
        </div>
      )}

      {/* Tarjeta de Resumen Mensual */}
      <div 
        className="summary-card" 
        style={{ 
          background: isExceeded 
            ? 'linear-gradient(135deg, #a8071a, #cf1322)' 
            : isNearLimit 
              ? 'linear-gradient(135deg, #d46b08, #b75e00)' 
              : 'linear-gradient(135deg, var(--color-primary), #3b503a)',
          transition: 'background 0.5s ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className="summary-label">Gastos del Mes</span>
            <div className="summary-total">S/. {totalSpent.toFixed(2)}</div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-settings"
            title="Configurar Presupuesto e Ingresos"
            type="button"
          >
            <Sliders size={20} />
          </button>
        </div>
        
        <div className="progress-container">
          <div className="progress-info">
            <span>Presupuesto objetivo: S/. {budgetLimit.toFixed(2)}</span>
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
          {isExceeded ? (
            <div style={{ fontSize: '11px', color: '#ffb3b3', marginTop: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={12} /> Límite alcanzado. Registro deshabilitado.
            </div>
          ) : isNearLimit ? (
            <div style={{ fontSize: '11px', color: '#ffe58f', marginTop: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle size={12} /> ¡Atención! Solo quedan S/. {remainingBudget.toFixed(2)} libres.
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: '#e2ede1', marginTop: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> ¡Buen trabajo! Quedan S/. {remainingBudget.toFixed(2)} del presupuesto mensual.
            </div>
          )}
        </div>
      </div>

      {/* Micro-Límites: Control Diario y Semanal Dinámico */}
      <div 
        className="expenses-card" 
        style={{ 
          marginTop: '-4px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          border: '1px solid var(--ios-separator)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Límite Diario Disponible
            </span>
            <div 
              style={{ 
                fontSize: '24px', 
                fontWeight: '800', 
                color: remainingBudget <= 0 ? 'var(--color-danger)' : dailyRemaining < dailyOriginal ? '#d46b08' : 'var(--color-primary)', 
                marginTop: '4px', 
                display: 'flex', 
                alignItems: 'baseline', 
                gap: '4px' 
              }}
            >
              S/. {dailyRemaining.toFixed(2)}
              <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--ios-text-secondary)' }}>/ día</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>Esta semana:</span>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--ios-text)' }}>
              S/. {weeklyRemaining.toFixed(2)}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--ios-separator)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ios-text-secondary)', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CalendarDays size={12} style={{ color: 'var(--color-primary)' }} />
              Días restantes: <strong>{remainingDays}</strong> de {totalDays}
            </span>
            <span>Original: S/. {dailyOriginal.toFixed(2)}/día</span>
          </div>
          
          {/* Badge o Mensaje del Semáforo */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '11px', 
              fontWeight: '600',
              padding: '8px 12px',
              borderRadius: '10px',
              backgroundColor: dailyRemainingStatus.bgColor,
              color: dailyRemainingStatus.textColor,
              marginTop: '4px',
              lineHeight: '1.3'
            }}
          >
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              {dailyRemainingStatus.icon}
            </div>
            <span>{dailyRemainingStatus.message}</span>
          </div>
        </div>
      </div>

      {/* Indicador de Consumo de Sueldo Combinado */}
      <div 
        className="expenses-card" 
        style={{ 
          marginTop: '-4px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          border: '1px solid var(--ios-separator)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Consumo de Sueldos Netos
            </span>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--ios-text)', marginTop: '4px' }}>
              S/. {totalSpent.toFixed(2)} <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--ios-text-secondary)' }}>gastados</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>Sueldo Familiar:</span>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-primary)' }}>
              S/. {combinedIncome.toFixed(2)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ios-text-secondary)', marginBottom: '4px' }}>
            <span>Consumo Familiar ({salaryProgressPercent.toFixed(0)}%)</span>
            <span>Restan S/. {remainingSalary.toFixed(2)} libres</span>
          </div>
          <div style={{ backgroundColor: '#7676800f', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
            <div 
              style={{ 
                backgroundColor: 'var(--color-primary)', 
                height: '100%', 
                width: `${salaryProgressPercent}%`,
                borderRadius: '4px',
                transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            ></div>
          </div>
        </div>
      </div>



      {/* Comparativa de Pareja */}
      <div className="section-title" style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Heart size={16} style={{ color: 'var(--color-primary)' }} />
        <span>¿Quién gasta qué?</span>
      </div>

      <div className="partners-grid">
        {partnerNames.length > 0 ? (
          partnerNames.map((name) => {
            const amount = partnerSpent[name] || 0;
            const percent = getPartnerPercentage(amount);
            return (
              <div key={name} className="partner-card">
                <span className="partner-name">
                  {name.split(' ')[0]}
                </span>
                <span className="partner-amount">S/. {amount.toFixed(2)}</span>
                
                {/* Micro barra indicadora de porcentaje */}
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ios-text-secondary)', marginBottom: '4px' }}>
                    <span>Participación</span>
                    <span style={{ fontWeight: '600' }}>{percent}%</span>
                  </div>
                  <div style={{ backgroundColor: '#7676800f', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        backgroundColor: 'var(--color-primary)', 
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
            Aún no hay gastos registrados este mes.
          </div>
        )}
      </div>

      {/* Desglose por Categorías */}
      <div className="section-title" style={{ marginTop: '4px' }}>Desglose por Categoría</div>
      
      <div className="expenses-card" style={{ gap: '16px' }}>
        {Object.keys(categorySpent).length > 0 ? (
          Object.entries(categorySpent)
            .sort((a, b) => b[1] - a[1]) // Ordenar de mayor a menor
            .map(([category, amount]) => {
              const emoji = categoryEmojis[category] || '💸';
              const catPercent = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
              return (
                <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>{emoji}</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ios-text)' }}>{category}</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--ios-text)' }}>
                      S/. {amount.toFixed(2)}
                    </div>
                  </div>
                  {/* Barra de progreso de categoría */}
                  <div style={{ backgroundColor: '#7676800f', height: '5px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        backgroundColor: 'var(--color-primary)', 
                        opacity: 0.7,
                        height: '100%', 
                        width: `${catPercent}%`
                      }}
                    ></div>
                  </div>
                </div>
              );
            })
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--ios-text-secondary)', padding: '16px 0' }}>
            Registra gastos para ver el desglose mensual.
          </div>
        )}
      </div>

      {/* MODAL CONFIGURACIÓN DE INGRESOS Y PRESUPUESTO (Estilo Bottom Sheet iOS) */}
      {createPortal(
        <>
          <div 
            className={`overlay ${isModalOpen ? 'open' : ''}`} 
            onClick={() => !loading && setIsModalOpen(false)}
            onTouchMove={(e) => e.preventDefault()}
          ></div>
          
          <div className={`bottom-sheet ${isModalOpen ? 'open' : ''}`}>
            <div className="sheet-header" onTouchMove={(e) => e.preventDefault()}>
              <span className="sheet-title">Configuración del Mes ({yearMonth})</span>
              <button className="btn-close" onClick={() => !loading && setIsModalOpen(false)} type="button" disabled={loading}>
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

            <form onSubmit={handleSaveBudget}>
              {/* Ingreso Christopher */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Sueldo Neto Christopher (S/.)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-input" 
                  value={valChris} 
                  onChange={(e) => setValChris(e.target.value)} 
                  disabled={loading}
                  placeholder="2809.90"
                  required
                />
              </div>

              {/* Ingreso Solansh */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Sueldo Neto Solansh (S/.)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-input" 
                  value={valSolansh} 
                  onChange={(e) => setValSolansh(e.target.value)} 
                  disabled={loading}
                  placeholder="1550.00"
                  required
                />
              </div>

              {/* Sueldo combinado informativo */}
              <div style={{ 
                backgroundColor: '#7676800c', 
                borderRadius: '14px', 
                padding: '12px 16px', 
                marginBottom: '16px',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: 'var(--ios-text-secondary)' }}>Ingreso Neto Familiar</span>
                <span style={{ fontSize: '15px', color: 'var(--color-primary)', fontWeight: '700' }}>
                  S/. {previewCombinedIncome.toFixed(2)}
                </span>
              </div>

              {/* Presupuesto Límite */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Presupuesto Límite de Gasto (S/.)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-input" 
                  style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-primary)' }}
                  value={valLimit} 
                  onChange={(e) => setValLimit(e.target.value)} 
                  disabled={loading}
                  placeholder="3000.00"
                  required
                />
              </div>



              {/* Panel de sugerencias */}
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px', paddingLeft: '4px' }}>
                  Sugerencias de límite de gasto
                </span>
                <div className="budget-modal-suggestions">
                  <button 
                    type="button" 
                    className="budget-suggestion-btn" 
                    onClick={() => selectSuggestion(0.5)}
                    disabled={loading || previewCombinedIncome <= 0}
                  >
                    <div>50% Ahorro</div>
                    <div style={{ fontSize: '10px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>S/. {(previewCombinedIncome * 0.5).toFixed(0)}</div>
                  </button>
                  <button 
                    type="button" 
                    className="budget-suggestion-btn" 
                    onClick={() => selectSuggestion(0.7)}
                    disabled={loading || previewCombinedIncome <= 0}
                  >
                    <div>70% Equilib.</div>
                    <div style={{ fontSize: '10px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>S/. {(previewCombinedIncome * 0.7).toFixed(0)}</div>
                  </button>
                  <button 
                    type="button" 
                    className="budget-suggestion-btn" 
                    onClick={() => selectSuggestion(1.0)}
                    disabled={loading || previewCombinedIncome <= 0}
                  >
                    <div>100% Total</div>
                    <div style={{ fontSize: '10px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>S/. {previewCombinedIncome.toFixed(0)}</div>
                  </button>
                </div>
              </div>

              {/* Botón de envío */}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Presupuesto'}
              </button>
            </form>
          </div>
        </>,
        document.body
      )}


    </div>
  );
}
