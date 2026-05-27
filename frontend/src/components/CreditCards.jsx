import React, { useState, useEffect, useRef } from 'react';
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
  const [valStatementBcp, setValStatementBcp] = useState('');
  const [valStatementRipley, setValStatementRipley] = useState('');
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState('');

  // Estados de filtros de historial e indicadores de slider
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpender, setSelectedSpender] = useState('Todos'); // 'Todos', 'Christopher', 'Solansh'
  const [activeCardIndex, setActiveCardIndex] = useState(0); // 0 = BCP, 1 = Ripley
  
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    let cycleYear = now.getFullYear();
    let cycleMonth = now.getMonth(); // 0-indexed
    if (now.getDate() < 26) {
      cycleMonth = cycleMonth - 1;
      if (cycleMonth < 0) {
        cycleMonth = 11;
        cycleYear = cycleYear - 1;
      }
    }
    const mStr = String(cycleMonth + 1).padStart(2, '0');
    return `${cycleYear}-${mStr}-26`;
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    let cycleYear = now.getFullYear();
    let cycleMonth = now.getMonth(); // 0-indexed
    if (now.getDate() < 26) {
      cycleMonth = cycleMonth - 1;
      if (cycleMonth < 0) {
        cycleMonth = 11;
        cycleYear = cycleYear - 1;
      }
    }
    let nextMonth = cycleMonth + 1;
    let nextYear = cycleYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear = cycleYear + 1;
    }
    const mStr = String(nextMonth + 1).padStart(2, '0');
    return `${nextYear}-${mStr}-25`;
  });

  const scrollRef = useRef(null);

  const handleScroll = (e) => {
    const width = e.target.offsetWidth;
    const scrollLeft = e.target.scrollLeft;
    const index = Math.round(scrollLeft / width);
    if (index !== activeCardIndex && (index === 0 || index === 1)) {
      setActiveCardIndex(index);
    }
  };

  const scrollToCard = (index) => {
    if (scrollRef.current) {
      const width = scrollRef.current.offsetWidth;
      scrollRef.current.scrollTo({
        left: index * width,
        behavior: 'smooth'
      });
      setActiveCardIndex(index);
    }
  };

  // Inicializar inputs cuando se abren los modales
  useEffect(() => {
    if (isConfigOpen) {
      setValLimitBcp(bcpLimit.toString());
      setValLimitRipley(ripleyLimit.toString());
      setValStatementBcp((stats?.bcpStatement || 0).toString());
      setValStatementRipley((stats?.ripleyStatement || 0).toString());
      setConfigError('');
    }
  }, [isConfigOpen, bcpLimit, ripleyLimit, stats]);

  useEffect(() => {
    if (isPayOpen) {
      const defaultAmount = payCard === 'BCP' ? spentBcp : spentRipley;
      setPayAmount(defaultAmount.toFixed(2));
      setPayError('');
    }
  }, [isPayOpen, payCard, spentBcp, spentRipley]);

  // Lock body scroll
  useScrollLock(isPayOpen || isConfigOpen);

  // Guardar configuración de límites y estados de cuenta
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setConfigLoading(true);
    setConfigError('');

    const bcpVal = parseFloat(valLimitBcp);
    const ripleyVal = parseFloat(valLimitRipley);
    const stmtBcpVal = parseFloat(valStatementBcp) || 0;
    const stmtRipleyVal = parseFloat(valStatementRipley) || 0;

    if (isNaN(bcpVal) || bcpVal < 0 || isNaN(ripleyVal) || ripleyVal < 0 || stmtBcpVal < 0 || stmtRipleyVal < 0) {
      setConfigError('Por favor, ingresa montos válidos mayores o iguales a 0.');
      setConfigLoading(false);
      return;
    }

    try {
      // 1. Guardar límites de crédito en el presupuesto mensual
      const budgetRes = await fetch(`/api/budget/${yearMonth}`, {
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

      const budgetData = await budgetRes.json();
      if (!budgetRes.ok) {
        throw new Error(budgetData.error || 'Error al guardar límites');
      }

      // 2. Procesar Estado de Cuenta BCP
      const existingBcpStmt = expenses.find(exp => exp.category === 'Estado Cuenta BCP');
      if (existingBcpStmt) {
        if (stmtBcpVal !== parseFloat(existingBcpStmt.amount)) {
          // Eliminar el existente ya que el valor cambió o se definió en 0
          await fetch(`/api/expenses/${existingBcpStmt.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (stmtBcpVal > 0) {
            await fetch('/api/expenses', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                amount: stmtBcpVal,
                description: 'Estado de Cuenta Facturado BCP',
                category: 'Estado Cuenta BCP',
                date: startDate
              })
            });
          }
        }
      } else if (stmtBcpVal > 0) {
        // No existe pero se especificó un valor mayor a 0, insertar nuevo
        await fetch('/api/expenses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: stmtBcpVal,
            description: 'Estado de Cuenta Facturado BCP',
            category: 'Estado Cuenta BCP',
            date: startDate
          })
        });
      }

      // 3. Procesar Estado de Cuenta Ripley
      const existingRipleyStmt = expenses.find(exp => exp.category === 'Estado Cuenta Ripley');
      if (existingRipleyStmt) {
        if (stmtRipleyVal !== parseFloat(existingRipleyStmt.amount)) {
          // Eliminar el existente ya que el valor cambió o se definió en 0
          await fetch(`/api/expenses/${existingRipleyStmt.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (stmtRipleyVal > 0) {
            await fetch('/api/expenses', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                amount: stmtRipleyVal,
                description: 'Estado de Cuenta Facturado Ripley',
                category: 'Estado Cuenta Ripley',
                date: startDate
              })
            });
          }
        }
      } else if (stmtRipleyVal > 0) {
        // No existe pero se especificó un valor mayor a 0, insertar nuevo
        await fetch('/api/expenses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: stmtRipleyVal,
            description: 'Estado de Cuenta Facturado Ripley',
            category: 'Estado Cuenta Ripley',
            date: startDate
          })
        });
      }

      setIsConfigOpen(false);
      showToast('Configuración de tarjetas actualizada');
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
    // 1. Filtrar solo por compras o estados de cuenta de tarjetas
    const isBcpCategory = exp.category === 'Tarjeta BCP' || exp.category === 'Estado Cuenta BCP';
    const isRipleyCategory = exp.category === 'Tarjeta Ripley' || exp.category === 'Estado Cuenta Ripley';
    
    if (!isBcpCategory && !isRipleyCategory) return false;
 
    // 2. Filtrar por la tarjeta seleccionada en el slider (activeCardIndex: 0 = BCP, 1 = Ripley)
    if (activeCardIndex === 0 && !isBcpCategory) return false;
    if (activeCardIndex === 1 && !isRipleyCategory) return false;
 
    // 3. Filtro por búsqueda
    const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase());
 
    // 4. Filtro por Spender
    let matchesSpender = true;
    if (selectedSpender !== 'Todos') {
      matchesSpender = exp.spender_name.toLowerCase().includes(selectedSpender.toLowerCase());
    }
 
    // 5. Filtro por fechas
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && (exp.date >= startDate);
    }
    if (endDate) {
      matchesDate = matchesDate && (exp.date <= endDate);
    }
 
    return matchesSearch && matchesSpender && matchesDate;
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

      {/* Slider de Tarjetas (Visual Premium & Compacto) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            display: 'flex',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            gap: '16px',
            padding: '4px 0',
            width: '100%'
          }}
          className="no-scrollbar"
        >
          {/* Tarjeta BCP */}
          <div style={{ flex: '0 0 100%', scrollSnapAlign: 'center', width: '100%' }}>
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
          </div>

          {/* Tarjeta Ripley */}
          <div style={{ flex: '0 0 100%', scrollSnapAlign: 'center', width: '100%' }}>
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
          </div>
        </div>

        {/* Indicadores de página estilo iOS */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '2px', marginBottom: '4px' }}>
          <div 
            onClick={() => scrollToCard(0)}
            style={{
              width: activeCardIndex === 0 ? '16px' : '8px',
              height: '8px',
              borderRadius: '4px',
              backgroundColor: activeCardIndex === 0 ? 'var(--color-primary)' : 'var(--ios-separator)',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
          />
          <div 
            onClick={() => scrollToCard(1)}
            style={{
              width: activeCardIndex === 1 ? '16px' : '8px',
              height: '8px',
              borderRadius: '4px',
              backgroundColor: activeCardIndex === 1 ? 'var(--color-primary)' : 'var(--ios-separator)',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
          />
        </div>

        {/* Desglose de Deuda del Estado de Cuenta vs Consumos Nuevos */}
        {(() => {
          const isBCP = activeCardIndex === 0;
          const statement = isBCP ? (stats?.bcpStatement || 0) : (stats?.ripleyStatement || 0);
          const purchases = isBCP ? (stats?.bcpPurchases || 0) : (stats?.ripleyPurchases || 0);
          const payments = isBCP ? (stats?.bcpPayments || 0) : (stats?.ripleyPayments || 0);
          const remainingStatement = Math.max(0, statement - payments);
          const totalDebt = isBCP ? spentBcp : spentRipley;
          
          return (
            <div 
              style={{
                backgroundColor: 'var(--ios-card-bg)',
                border: '1px solid var(--ios-separator)',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginTop: '4px',
                marginBottom: '4px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ios-text)' }}>
                  Detalle de la Tarjeta
                </span>
                <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>
                  Ciclo del 26 al 25
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--ios-separator)', paddingTop: '10px' }}>
                {/* Estado de Cuenta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--ios-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📄 Estado de Cuenta Facturado
                  </span>
                  <span style={{ fontWeight: '600', color: 'var(--ios-text)' }}>
                    S/. {statement.toFixed(2)}
                  </span>
                </div>
                
                {/* Pagos Realizados */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--ios-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ✅ Pagos Realizados (Abonos)
                  </span>
                  <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
                    - S/. {payments.toFixed(2)}
                  </span>
                </div>

                {/* Pendiente del Estado de Cuenta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', backgroundColor: '#7676800d', padding: '6px 8px', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--ios-text-secondary)', fontWeight: '500' }}>
                    ⏳ Pendiente de Estado de Cuenta
                  </span>
                  <span style={{ fontWeight: '700', color: remainingStatement > 0 ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                    S/. {remainingStatement.toFixed(2)}
                  </span>
                </div>

                {/* Consumos del Mes */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '4px' }}>
                  <span style={{ color: 'var(--ios-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🛒 Nuevos Consumos del Ciclo
                  </span>
                  <span style={{ fontWeight: '600', color: 'var(--ios-text)' }}>
                    S/. {purchases.toFixed(2)}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--ios-separator)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ios-text)' }}>
                  Deuda Total Vigente
                </span>
                <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--ios-text)' }}>
                  S/. {totalDebt.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Botón de Pago Único Dinámico */}
        <div>
          {activeCardIndex === 0 ? (
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
          ) : (
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
          )}
        </div>
      </div>

      {/* Historial Exclusivo de Tarjetas */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
          <CreditCard size={18} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--ios-text)' }}>Historial de Consumos</h3>
        </div>

        {/* Rango de Fechas (Desde / Hasta) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: '700' }}>Desde</label>
            <input
              type="date"
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '14px', minHeight: '38px' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: '700' }}>Hasta</label>
            <input
              type="date"
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '14px', minHeight: '38px' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
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

        </div>

        {/* Lista de compras */}
        <div className="expenses-card" style={{ padding: '16px', border: '1px solid var(--ios-separator)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="list-container">
            {cardExpenses.length > 0 ? (
              cardExpenses.map((exp) => {
                const isBCP = exp.category === 'Tarjeta BCP' || exp.category === 'Estado Cuenta BCP';
                const isStatement = exp.category === 'Estado Cuenta BCP' || exp.category === 'Estado Cuenta Ripley';
                const spenderName = exp.spender_name.split(' ')[0];
                return (
                  <div key={exp.id} className="expense-item" style={{ borderBottom: '1px solid var(--ios-separator)', opacity: isStatement ? 0.85 : 1 }}>
                    <div className="expense-left">
                      <div 
                        className="category-emoji-box" 
                        style={{ 
                          backgroundColor: isStatement ? '#fef3c7' : isBCP ? '#e1f0fa' : '#f2f2f7',
                          fontSize: '18px'
                        }}
                      >
                        {isStatement ? '📄' : isBCP ? '💳' : '🛍️'}
                      </div>
                      <div className="expense-info">
                        <span className="expense-desc" style={{ fontWeight: isStatement ? '600' : 'normal' }}>
                          {exp.description}
                        </span>
                        <div className="expense-meta">
                          <span className="spender-tag">{spenderName}</span>
                          <span 
                            style={{ 
                              padding: '2px 6px', 
                              borderRadius: '6px', 
                              fontSize: '10px', 
                              fontWeight: '700',
                              backgroundColor: isStatement ? '#d97706' : isBCP ? '#002A54' : '#636366',
                              color: '#ffffff'
                            }}
                          >
                            {isStatement ? 'Facturado' : isBCP ? 'BCP' : 'Ripley'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Calendar size={10} /> {formatDate(exp.date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="expense-right">
                      <span className="expense-amount" style={{ color: isStatement ? '#d97706' : isBCP ? '#002A54' : '#48484a', fontWeight: isStatement ? '700' : 'normal' }}>
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
              <span className="sheet-title">Configuración de Tarjetas ({yearMonth})</span>
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
              {/* Sección BCP */}
              <div style={{ marginBottom: '16px', borderBottom: '1px solid var(--ios-separator)', paddingBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#002A54', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Tarjeta BCP
                </span>
                {/* Límite BCP */}
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label">Límite de Crédito BCP (S/.)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-input" 
                    style={{ color: '#002A54', fontWeight: '700' }}
                    value={valLimitBcp} 
                    onChange={(e) => setValLimitBcp(e.target.value)} 
                    disabled={configLoading}
                    placeholder="1000.00"
                    required
                  />
                </div>
                {/* Estado Cuenta BCP */}
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label">Estado de Cuenta Facturado BCP (S/.)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-input" 
                    style={{ color: '#002A54', fontWeight: '600' }}
                    value={valStatementBcp} 
                    onChange={(e) => setValStatementBcp(e.target.value)} 
                    disabled={configLoading}
                    placeholder="0.00"
                  />
                  <span style={{ fontSize: '10px', color: 'var(--ios-text-secondary)', marginTop: '4px', display: 'block' }}>
                    Registra la deuda facturada al inicio de este ciclo para pagar.
                  </span>
                </div>
              </div>

              {/* Sección Ripley */}
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#636366', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Tarjeta Ripley
                </span>
                {/* Límite Ripley */}
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label">Límite de Crédito Ripley (S/.)</label>
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
                {/* Estado Cuenta Ripley */}
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label">Estado de Cuenta Facturado Ripley (S/.)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-input" 
                    style={{ color: '#ec6707', fontWeight: '600' }}
                    value={valStatementRipley} 
                    onChange={(e) => setValStatementRipley(e.target.value)} 
                    disabled={configLoading}
                    placeholder="0.00"
                  />
                  <span style={{ fontSize: '10px', color: 'var(--ios-text-secondary)', marginTop: '4px', display: 'block' }}>
                    Registra la deuda facturada al inicio de este ciclo para pagar.
                  </span>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={configLoading}>
                {configLoading ? 'Guardando...' : 'Guardar Configuración'}
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
