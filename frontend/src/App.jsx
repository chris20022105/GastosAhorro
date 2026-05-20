import React, { useState, useEffect } from 'react';
import { LogOut, Plus, PieChart, List, RefreshCw } from 'lucide-react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ExpenseList from './components/ExpenseList';
import AddExpense from './components/AddExpense';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState({ totalSpent: 0, partnerSpent: {}, categorySpent: {} });
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' o 'history'
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
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

      {/* Contenido Principal */}
      {activeTab === 'dashboard' ? (
        <Dashboard stats={stats} user={user} />
      ) : (
        <ExpenseList 
          expenses={expenses} 
          onDeleteExpense={handleDeleteExpense} 
          user={user} 
        />
      )}

      {/* Botón flotante para registrar gasto (FAB) */}
      <button className="fab" onClick={() => setIsAddOpen(true)} type="button">
        <Plus size={18} />
        <span>Nuevo Gasto</span>
      </button>

      {/* Bottom Sheet para agregar */}
      <AddExpense
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onExpenseAdded={handleExpenseAdded}
        token={token}
        user={user}
      />
    </div>
  );
}
