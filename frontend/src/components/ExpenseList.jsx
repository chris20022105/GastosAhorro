import React, { useState } from 'react';
import { Search, Trash2, Calendar, User } from 'lucide-react';

export default function ExpenseList({ expenses, onDeleteExpense, user }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpender, setSelectedSpender] = useState('Todos'); // 'Todos', 'Christopher', 'Solansh'
  const [selectedCategory, setSelectedCategory] = useState('Todas'); // 'Todas', ...

  const categoryEmojis = {
    'Café y Bebidas': '☕',
    'Antojos y Snacks': '🍿',
    'Delivery y Comida': '🍔',
    'Transporte y Uber': '🚗',
    'Suscripciones': '📺',
    'Entretenimiento': '🎬',
    'Otros': '📦'
  };

  const categories = ['Todas', 'Café y Bebidas', 'Antojos y Snacks', 'Delivery y Comida', 'Transporte y Uber', 'Suscripciones', 'Entretenimiento', 'Otros'];

  // Confirmar y eliminar
  const handleDeleteClick = (id, description, amount) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el gasto "${description}" por S/. ${amount.toFixed(2)}?`)) {
      onDeleteExpense(id);
    }
  };

  // Formatear fecha de YYYY-MM-DD a DD/MM/AAAA
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Filtrar gastos según filtros y búsqueda
  const filteredExpenses = expenses.filter((exp) => {
    // 1. Filtro por búsqueda
    const matchesSearch = 
      exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.category.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Filtro por Spender (persona)
    let matchesSpender = true;
    if (selectedSpender !== 'Todos') {
      // Comparar por el nombre corto o email
      matchesSpender = exp.spender_name.toLowerCase().includes(selectedSpender.toLowerCase());
    }

    // 3. Filtro por Categoría
    const matchesCategory = selectedCategory === 'Todas' || exp.category === selectedCategory;

    return matchesSearch && matchesSpender && matchesCategory;
  });

  return (
    <div className="dashboard-content" style={{ paddingTop: 0 }}>
      {/* Buscador estilo iOS */}
      <div style={{ position: 'relative', marginBottom: '14px' }}>
        <input
          type="text"
          className="form-input"
          style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px', fontSize: '14px' }}
          placeholder="Buscar por descripción o categoría..."
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

      {/* Control Segmentado de Miembro */}
      <div className="segmented-control">
        <button
          className={selectedSpender === 'Todos' ? 'active' : ''}
          onClick={() => setSelectedSpender('Todos')}
        >
          Todos
        </button>
        <button
          className={selectedSpender === 'Christopher' ? 'active' : ''}
          onClick={() => setSelectedSpender('Christopher')}
        >
          Christopher
        </button>
        <button
          className={selectedSpender === 'Solansh' ? 'active' : ''}
          onClick={() => setSelectedSpender('Solansh')}
        >
          Solansh
        </button>
      </div>

      {/* Selector de Categorías (Horizontal Scrolling) */}
      <div className="categories-horizontal">
        {categories.map((cat) => (
          <div
            key={cat}
            className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat !== 'Todas' && <span>{categoryEmojis[cat]}</span>}
            <span>{cat}</span>
          </div>
        ))}
      </div>

      {/* Tarjeta de Historial de Gastos */}
      <div className="expenses-card">
        <div className="section-header">
          <span className="section-title">
            {selectedSpender === 'Todos' ? 'Gastos' : `Gastos de ${selectedSpender}`}
            {selectedCategory !== 'Todas' && ` - ${selectedCategory}`}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', fontWeight: '500' }}>
            {filteredExpenses.length} registro(s)
          </span>
        </div>

        <div className="list-container">
          {filteredExpenses.length > 0 ? (
            filteredExpenses.map((exp) => {
              const emoji = categoryEmojis[exp.category] || '💸';
              const isOwnExpense = exp.user_email === user.email;
              
              return (
                <div key={exp.id} className="expense-item">
                  <div className="expense-left">
                    <div className="category-emoji-box">
                      {emoji}
                    </div>
                    <div className="expense-info">
                      <span className="expense-desc">{exp.description}</span>
                      <div className="expense-meta">
                        <span className="spender-tag">
                          {exp.spender_name.split(' ')[0]}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Calendar size={10} /> {formatDate(exp.date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="expense-right">
                    <span className="expense-amount">S/. {parseFloat(exp.amount).toFixed(2)}</span>
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
            <div className="no-expenses">
              No hay gastos registrados que coincidan con los filtros aplicados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
