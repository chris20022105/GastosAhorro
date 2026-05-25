import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Plus, PieChart, List, RefreshCw, Wallet, PiggyBank, CreditCard, Coins } from 'lucide-react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ExpenseList from './components/ExpenseList';
import AddExpense from './components/AddExpense';
import SavingsBox from './components/SavingsBox';
import CreditCards from './components/CreditCards';
import CreditLoans from './components/CreditLoans';


export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState({ totalSpent: 0, partnerSpent: {}, categorySpent: {} });
  const [mainTab, setMainTab] = useState('expenses'); // 'expenses', 'savings', 'cards' o 'loans'
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' o 'history'
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Estado para alertas de cobro
  const [dueLoans, setDueLoans] = useState([]);
  const [isDueAlertOpen, setIsDueAlertOpen] = useState(false);
  
  // Estado para notificaciones Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Mostrar alerta Toast
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Verificar sesión activa al arrancar
  useEffect(() => {
    if (token) {
      verifySession();
    }
  }, [token]);

  // Cargar datos cuando el usuario está verificado
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const verifySession = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
      } else {
        // Token inválido o expirado
        handleLogout();
      }
    } catch (err) {
      console.error('Error al verificar sesión:', err);
      // Mantener sesión offline si falla la conexión, o desloguear si es persistente
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Cargar gastos
      const expRes = await fetch('/api/expenses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const expData = await expRes.json();
      if (expRes.ok) setExpenses(expData);

      // Cargar estadísticas
      const statsRes = await fetch('/api/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsRes.ok) setStats(statsData);

      // Cargar alertas de cobro de préstamos
      const alertRes = await fetch('/api/loans/due-alerts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (alertRes.ok) {
        const alertData = await alertRes.json();
        setDueLoans(alertData);
        if (alertData.length > 0) {
          setIsDueAlertOpen(true);
        }
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
      showToast('Error de conexión al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (newToken, loggedUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(loggedUser);
    showToast(`¡Hola de nuevo, ${loggedUser.name.split(' ')[0]}! 👋`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setExpenses([]);
    setStats({ totalSpent: 0, partnerSpent: {}, categorySpent: {} });
    showToast('Sesión cerrada');
  };

  const handleExpenseAdded = (newExpense) => {
    // Añadir al inicio del estado local
    setExpenses((prev) => [newExpense, ...prev]);
    
    // Recalcular estadísticas
    fetchData();
    
    showToast('💸 Gasto registrado y correos enviados');
  };

  const handleDeleteExpense = async (id) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setExpenses((prev) => prev.filter((exp) => exp.id !== id));
        fetchData();
        showToast('Gasto eliminado correctamente');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'No se pudo eliminar el gasto');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Toast Notificación */}
      <div className={`toast ${toast.show ? 'show' : ''} ${toast.type === 'error' ? 'toast-error' : ''}`}>
        {toast.message}
      </div>

      {/* Cabecera Estilo iOS */}
      <header className="app-header">
        <div className="app-title-container">
          <span className="app-title">GastosAhorro</span>
          <span className="app-date">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="btn-logout" 
            onClick={fetchData} 
            title="Sincronizar datos"
            disabled={loading}
            style={{ color: 'var(--color-primary)' }}
          >
            <RefreshCw size={18} className={loading ? 'spin-animation' : ''} />
          </button>
          <button className="btn-logout" onClick={handleLogout} title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Switcher de Vistas (iOS Segmented Control) */}
      {mainTab === 'expenses' && (
        <div style={{ padding: '16px 20px 0 20px' }}>
          <div className="segmented-control">
            <button
              className={activeTab === 'dashboard' ? 'active' : ''}
              onClick={() => setActiveTab('dashboard')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <PieChart size={14} />
                <span>Resumen</span>
              </div>
            </button>
            <button
              className={activeTab === 'history' ? 'active' : ''}
              onClick={() => setActiveTab('history')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <List size={14} />
                <span>Gastos ({expenses.length})</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      {mainTab === 'expenses' ? (
        activeTab === 'dashboard' ? (
          <Dashboard stats={stats} user={user} onUpdateBudget={fetchData} token={token} />
        ) : (
          <ExpenseList 
            expenses={expenses} 
            onDeleteExpense={handleDeleteExpense} 
            user={user} 
          />
        )
      ) : mainTab === 'savings' ? (
        <SavingsBox token={token} user={user} showToast={showToast} />
      ) : mainTab === 'cards' ? (
        <CreditCards
          stats={stats}
          user={user}
          onUpdateBudget={fetchData}
          token={token}
          expenses={expenses}
          onDeleteExpense={handleDeleteExpense}
          showToast={showToast}
        />
      ) : (
        <CreditLoans
          token={token}
          user={user}
          onUpdateBudget={fetchData}
          showToast={showToast}
        />
      )}

      {/* Botón flotante para registrar gasto (FAB) */}
      {mainTab === 'expenses' && (
        <button 
          className={`fab ${stats.budget && stats.totalSpent >= stats.budget.budget_limit_pen ? 'fab-blocked' : ''}`} 
          onClick={() => setIsAddOpen(true)} 
          type="button"
        >
          <Plus size={18} />
          <span>Nuevo Gasto</span>
        </button>
      )}

      {/* Bottom Sheet para agregar */}
      {mainTab === 'expenses' && (
        <AddExpense
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onExpenseAdded={handleExpenseAdded}
          token={token}
          user={user}
          stats={stats}
        />
      )}

      {/* Barra de Navegación Inferior (iOS Tab Bar) */}
      <nav className="bottom-tab-bar">
        <button 
          className={`tab-item ${mainTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setMainTab('expenses')}
          type="button"
        >
          <Wallet size={20} />
          <span>Gastos</span>
        </button>
        <button 
          className={`tab-item ${mainTab === 'savings' ? 'active' : ''}`}
          onClick={() => setMainTab('savings')}
          type="button"
        >
          <PiggyBank size={20} />
          <span>Caja Ahorro</span>
        </button>
        <button 
          className={`tab-item ${mainTab === 'cards' ? 'active' : ''}`}
          onClick={() => setMainTab('cards')}
          type="button"
        >
          <CreditCard size={20} />
          <span>Tarjetas</span>
        </button>
        <button 
          className={`tab-item ${mainTab === 'loans' ? 'active' : ''}`}
          onClick={() => setMainTab('loans')}
          type="button"
        >
          <Coins size={20} />
          <span>Préstamos</span>
        </button>
      </nav>

      {/* MODAL DE ALERTA DE COBROS VENCIDOS (Estilo iOS Alert) */}
      {isDueAlertOpen && dueLoans.length > 0 && createPortal(
        <>
          <div className="overlay open" onClick={() => setIsDueAlertOpen(false)}></div>
          <div className="login-card" style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            maxWidth: '340px',
            borderRadius: '24px',
            padding: '28px 24px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid rgba(0,0,0,0.02)'
          }}>
            <span style={{ fontSize: '32px' }}>⚠️</span>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginTop: '12px', color: 'var(--ios-text)' }}>
              Cobros Pendientes
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--ios-text-secondary)', marginTop: '8px', lineHeight: '1.4' }}>
              Tienes {dueLoans.length} préstamo(s) que vencen hoy o ya están vencidos.
            </p>
            
            <div style={{
              backgroundColor: '#7676800d',
              borderRadius: '12px',
              padding: '12px',
              margin: '16px 0',
              maxHeight: '120px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {dueLoans.map(loan => (
                <div key={loan.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600' }}>
                  <span style={{ color: 'var(--ios-text)' }}>{loan.borrower_name}</span>
                  <span style={{ color: 'var(--color-danger)' }}>S/. {parseFloat(loan.remaining_debt).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: '14px', padding: '12px' }}
                onClick={() => {
                  setIsDueAlertOpen(false);
                  setMainTab('loans');
                }}
              >
                Ver en Préstamos ⚖️
              </button>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ios-text-secondary)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '8px'
                }}
                onClick={() => setIsDueAlertOpen(false)}
              >
                Entendido, cerrar
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
