import React from 'react';
import { Wallet, Sparkles, Heart } from 'lucide-react';

export default function Dashboard({ stats, user }) {
  const { totalSpent = 0, partnerSpent = {}, categorySpent = {} } = stats;
  
  // Presupuesto mensual por defecto (configurable mentalmente en S/. 500 para gastos hormiga)
  const monthlyBudget = 600; 
  const progressPercent = Math.min((totalSpent / monthlyBudget) * 100, 100);

  // Emojis de categoría
  const categoryEmojis = {
    'Café y Bebidas': '☕',
    'Antojos y Snacks': '🍿',
    'Delivery y Comida': '🍔',
    'Transporte y Uber': '🚗',
    'Suscripciones': '📺',
    'Entretenimiento': '🎬',
    'Otros': '📦'
  };

  // Nombres de los miembros
  const partnerNames = Object.keys(partnerSpent);
  
  // Calcular porcentaje de participación
  const getPartnerPercentage = (amount) => {
    if (totalSpent === 0) return 0;
    return Math.round((amount / totalSpent) * 100);
  };

  return (
    <div className="dashboard-content">
      {/* Tarjeta de Resumen Mensual */}
      <div className="summary-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className="summary-label">Gastos del Mes</span>
            <div className="summary-total">S/. {totalSpent.toFixed(2)}</div>
          </div>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '10px', borderRadius: '16px' }}>
            <Wallet size={24} />
          </div>
        </div>
        
        <div className="progress-container">
          <div className="progress-info">
            <span>Presupuesto objetivo: S/. {monthlyBudget}</span>
            <span>{progressPercent.toFixed(0)}%</span>
          </div>
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progressPercent}%`, backgroundColor: progressPercent > 90 ? 'var(--color-danger)' : '#ffffff' }}
            ></div>
          </div>
          {totalSpent > monthlyBudget && (
            <div style={{ fontSize: '11px', color: '#ffb3b3', marginTop: '6px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> ¡Ups! Superamos el límite ideal este mes.
            </div>
          )}
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
            Aún no hay gastos registrados.
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
            Registra gastos para ver el desglose.
          </div>
        )}
      </div>
    </div>
  );
}
