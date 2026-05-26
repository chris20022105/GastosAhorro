import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Trash2, Coins, Search, Plus, Clock, User, Edit3, CheckCircle, ArrowRightLeft } from 'lucide-react';
import useScrollLock from '../hooks/useScrollLock';

export default function CreditLoans({ token, user, onUpdateBudget, showToast }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados de modales
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  // Estados de formularios
  // Nuevo Préstamo
  const [borrowerName, setBorrowerName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loanDate, setLoanDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Registrar Pago
  const [payAmount, setPayAmount] = useState('');
  const [payType, setPayType] = useState('complete'); // 'complete' o 'partial'
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  // Extender Plazo
  const [newDueDate, setNewDueDate] = useState('');
  const [extendLoading, setExtendLoading] = useState(false);
  const [extendError, setExtendError] = useState('');

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Pendientes'); // 'Pendientes' o 'Pagados'
  const [expandedLoanId, setExpandedLoanId] = useState(null); // Para ver el historial de abonos


  // Cargar préstamos
  const fetchLoans = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/loans', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setLoans(data);
      } else {
        showToast(data.error || 'Error al obtener préstamos', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión al cargar préstamos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  // Sincronizar campos de formularios al abrir modales
  useEffect(() => {
    if (isAddOpen) {
      setBorrowerName('');
      setAmount('');
      setDescription('');
      setLoanDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setAddError('');
    }
  }, [isAddOpen]);

  useEffect(() => {
    if (isPayOpen && selectedLoan) {
      setPayType('complete');
      setPayAmount(selectedLoan.remaining_debt.toString());
      setPayError('');
    }
  }, [isPayOpen, selectedLoan]);

  useEffect(() => {
    if (isExtendOpen && selectedLoan) {
      setNewDueDate(selectedLoan.due_date);
      setExtendError('');
    }
  }, [isExtendOpen, selectedLoan]);

  // Lock body scroll
  useScrollLock(isAddOpen || isPayOpen || isExtendOpen);

  // Calcular totales
  const activeLoans = loans.filter(l => l.status !== 'Pagado');
  const totalLentActive = activeLoans.reduce((sum, l) => sum + parseFloat(l.remaining_debt), 0);
  const debtorsCount = new Set(activeLoans.map(l => l.borrower_name.toLowerCase())).size;

  // Registrar préstamo
  const handleAddLoan = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setAddError('Por favor, ingresa un monto válido mayor a 0.');
      setAddLoading(false);
      return;
    }

    if (!borrowerName.trim()) {
      setAddError('Por favor, ingresa el nombre de la persona.');
      setAddLoading(false);
      return;
    }

    if (!dueDate) {
      setAddError('Por favor, selecciona la fecha de cobro.');
      setAddLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          borrower_name: borrowerName,
          amount: parsedAmount,
          description: description,
          loan_date: loanDate,
          due_date: dueDate
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar préstamo');
      }

      setIsAddOpen(false);
      showToast('⚖️ Préstamo registrado correctamente');
      fetchLoans();
      if (onUpdateBudget) onUpdateBudget();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  // Registrar pago / abono
  const handlePayLoan = async (e) => {
    e.preventDefault();
    setPayLoading(true);
    setPayError('');

    const amtToPay = parseFloat(payAmount);
    if (isNaN(amtToPay) || amtToPay <= 0) {
      setPayError('El monto del abono debe ser mayor a 0.');
      setPayLoading(false);
      return;
    }

    if (amtToPay > parseFloat(selectedLoan.remaining_debt)) {
      setPayError(`El abono no puede superar la deuda actual de S/. ${parseFloat(selectedLoan.remaining_debt).toFixed(2)}.`);
      setPayLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/loans/${selectedLoan.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amtToPay })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar pago');
      }

      setIsPayOpen(false);
      showToast(amtToPay >= parseFloat(selectedLoan.remaining_debt) ? '✅ Préstamo liquidado' : '💵 Abono registrado');
      fetchLoans();
      if (onUpdateBudget) onUpdateBudget();
    } catch (err) {
      setPayError(err.message);
    } finally {
      setPayLoading(false);
    }
  };

  // Extender plazo
  const handleExtendLoan = async (e) => {
    e.preventDefault();
    setExtendLoading(true);
    setExtendError('');

    if (!newDueDate) {
      setExtendError('Por favor, selecciona una fecha válida.');
      setExtendLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/loans/${selectedLoan.id}/extend`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ due_date: newDueDate })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al extender fecha');
      }

      setIsExtendOpen(false);
      showToast('📅 Plazo de cobro extendido');
      fetchLoans();
      if (onUpdateBudget) onUpdateBudget();
    } catch (err) {
      setExtendError(err.message);
    } finally {
      setExtendLoading(false);
    }
  };

  // Eliminar préstamo
  const handleDeleteLoan = async (id, borrower, totalAmount) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el préstamo a "${borrower}" por S/. ${totalAmount.toFixed(2)}? Se borrará todo el historial de abonos asociado.`)) {
      try {
        const response = await fetch(`/api/loans/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          showToast('Préstamo eliminado correctamente');
          fetchLoans();
          if (onUpdateBudget) onUpdateBudget();
        } else {
          const data = await response.json();
          throw new Error(data.error || 'No se pudo eliminar el préstamo');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  // Cambiar tipo de abono (completo / parcial)
  const handlePayTypeChange = (type) => {
    setPayType(type);
    if (type === 'complete') {
      setPayAmount(selectedLoan.remaining_debt.toString());
    } else {
      setPayAmount('');
    }
  };

  // Formatear fecha
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Obtener color de alerta de fecha
  const getDateAlertStyles = (dueDateStr) => {
    if (!dueDateStr) return {};
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dueDateStr);
    due.setHours(24,0,0,0); // Ajustar desfase de zona horaria del constructor

    if (due < today) {
      // Vencido
      return { color: 'var(--color-danger)', fontWeight: '700' };
    } else if (due.getTime() === today.getTime()) {
      // Vence hoy
      return { color: '#ec6707', fontWeight: '700' };
    }
    return { color: 'var(--ios-text-secondary)', fontWeight: '500' };
  };

  // Filtrar préstamos
  const filteredLoans = loans.filter((loan) => {
    // 1. Filtrar por estado
    const matchesStatus = 
      selectedStatus === 'Pendientes' 
        ? loan.status !== 'Pagado' 
        : loan.status === 'Pagado';

    // 2. Filtrar por búsqueda
    const matchesSearch = 
      loan.borrower_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loan.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 0 0' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Registro de Cobros
          </span>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--ios-text)', marginTop: '2px' }}>
            Préstamos Activos
          </h2>
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          style={{
            background: 'var(--color-primary)',
            border: 'none',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#ffffff',
            boxShadow: 'var(--shadow-sm)'
          }}
          type="button"
          title="Registrar Nuevo Préstamo"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Tarjetas Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        
        {/* Total por cobrar */}
        <div className="partner-card" style={{ padding: '16px', background: 'linear-gradient(135deg, var(--color-primary), #3b503a)', color: '#ffffff', border: 'none' }}>
          <span style={{ fontSize: '11px', opacity: 0.8, fontWeight: '600', textTransform: 'uppercase' }}>Por Cobrar</span>
          <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '6px' }}>
            S/. {totalLentActive.toFixed(2)}
          </div>
        </div>

        {/* Deudores */}
        <div className="partner-card" style={{ padding: '16px', border: '1px solid var(--ios-separator)', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Deudores</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--ios-text)', marginTop: '6px' }}>
            {debtorsCount} persona(s)
          </div>
        </div>

      </div>

      {/* Buscador */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="form-input"
          style={{ width: '100%', paddingLeft: '40px', borderRadius: '12px', fontSize: '14px' }}
          placeholder="Buscar persona o concepto..."
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



      {/* Segmented Control */}
      <div className="segmented-control" style={{ margin: 0 }}>
        <button className={selectedStatus === 'Pendientes' ? 'active' : ''} onClick={() => setSelectedStatus('Pendientes')}>
          Cobros Activos ({loans.filter(l => l.status !== 'Pagado').length})
        </button>
        <button className={selectedStatus === 'Pagados' ? 'active' : ''} onClick={() => setSelectedStatus('Pagados')}>
          Historial Pagados ({loans.filter(l => l.status === 'Pagado').length})
        </button>
      </div>

      {/* Lista de Préstamos */}
      <div className="expenses-card" style={{ padding: '16px', border: '1px solid var(--ios-separator)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="list-container">
          {filteredLoans.length > 0 ? (
            filteredLoans.map((loan) => {
              const isOverdue = new Date(loan.due_date) < new Date() && loan.status !== 'Pagado';
              const dateStyle = getDateAlertStyles(loan.due_date);
              const hasAbonos = loan.loan_payments && loan.loan_payments.length > 0;
              const isExpanded = expandedLoanId === loan.id;

              return (
                <div key={loan.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--ios-separator)', padding: '12px 0' }}>
                  
                  {/* Fila principal */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div 
                        className="category-emoji-box" 
                        style={{ 
                          backgroundColor: loan.status === 'Pagado' ? '#e2ede1' : isOverdue ? '#ffe5e5' : '#fffbe6',
                          fontSize: '18px'
                        }}
                      >
                        {loan.status === 'Pagado' ? '✅' : '⚖️'}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--ios-text)', fontSize: '15px' }}>
                          {loan.borrower_name}
                        </div>
                        {loan.description && (
                          <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                            {loan.description}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <span style={{ color: 'var(--ios-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            <User size={10} /> {loan.spender_name.split(' ')[0]}
                          </span>
                          <span style={dateStyle} className="due-date-alert">
                            📅 Lim: {formatDate(loan.due_date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: loan.status === 'Pagado' ? 'var(--color-primary)' : 'var(--ios-text)' }}>
                        S/. {parseFloat(loan.remaining_debt).toFixed(2)}
                      </div>
                      {loan.status !== 'Pagado' && parseFloat(loan.remaining_debt) < parseFloat(loan.amount) && (
                        <div style={{ fontSize: '10px', color: 'var(--ios-text-secondary)', fontWeight: '600' }}>
                          Original: S/. {parseFloat(loan.amount).toFixed(2)}
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => handleDeleteLoan(loan.id, loan.borrower_name, parseFloat(loan.amount))}
                          title="Eliminar préstamo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Acciones Rápidas (Solo si no está pagado) */}
                  {loan.status !== 'Pagado' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingLeft: '44px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLoan(loan);
                          setIsPayOpen(true);
                        }}
                        style={{
                          backgroundColor: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        Abonar / Liquidar 💵
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLoan(loan);
                          setIsExtendOpen(true);
                        }}
                        style={{
                          backgroundColor: '#f2f2f7',
                          color: 'var(--ios-text)',
                          border: '1px solid var(--ios-separator)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        Cambiar Fecha 📅
                      </button>
                    </div>
                  )}

                  {/* Historial de Abonos */}
                  {hasAbonos && (
                    <div style={{ paddingLeft: '44px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--ios-text-secondary)',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 0'
                        }}
                      >
                        <Clock size={12} />
                        {isExpanded ? 'Ocultar historial de abonos' : `Ver historial de abonos (${loan.loan_payments.length})`}
                      </button>

                      {isExpanded && (
                        <div style={{
                          backgroundColor: '#f8f8fa',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          marginTop: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          border: '1px solid var(--ios-separator)'
                        }}>
                          {loan.loan_payments.map((payment) => (
                            <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                              <span style={{ color: 'var(--ios-text-secondary)' }}>
                                {formatDate(payment.payment_date)} • por {payment.spender_name.split(' ')[0]}
                              </span>
                              <span style={{ fontWeight: '700', color: 'var(--color-primary)' }}>
                                + S/. {parseFloat(payment.amount).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          ) : (
            <div className="no-expenses" style={{ padding: '24px 0' }}>
              No hay registros de préstamos que coincidan con los filtros.
            </div>
          )}
        </div>
      </div>

      {/* PORTAL: NUEVO PRÉSTAMO */}
      {isAddOpen && createPortal(
        <>
          <div 
            className="overlay open" 
            onClick={() => !addLoading && setIsAddOpen(false)}
            onTouchMove={(e) => e.preventDefault()}
          ></div>

          <div className="bottom-sheet open">
            <div className="sheet-header" onTouchMove={(e) => e.preventDefault()}>
              <span className="sheet-title">Registrar Préstamo</span>
              <button className="btn-close" onClick={() => !addLoading && setIsAddOpen(false)} type="button" disabled={addLoading}>
                <X size={18} />
              </button>
            </div>

            {addError && (
              <div style={{
                backgroundColor: 'var(--color-danger-light)',
                color: 'var(--color-danger)',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '16px'
              }}>
                {addError}
              </div>
            )}

            <form onSubmit={handleAddLoan}>
              {/* Monto */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Monto Prestado (S/.)</label>
                <input
                  type="number"
                  step="0.01"
                  pattern="[0-9]*"
                  inputMode="decimal"
                  className="form-input"
                  style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)' }}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  disabled={addLoading}
                />
              </div>

              {/* A quién */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">¿A quién se lo prestaste?</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nombre del deudor (ej. Pedro, Papá...)"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  required
                  maxLength={50}
                  disabled={addLoading}
                />
              </div>

              {/* Fechas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Fecha Préstamo</label>
                  <input
                    type="date"
                    className="form-input"
                    value={loanDate}
                    onChange={(e) => setLoanDate(e.target.value)}
                    required
                    disabled={addLoading}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Fecha Cobro</label>
                  <input
                    type="date"
                    className="form-input"
                    style={{ borderColor: 'rgba(183, 94, 0, 0.3)' }}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    disabled={addLoading}
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={addLoading}>
                {addLoading ? 'Registrando...' : 'Registrar Préstamo ⚖️'}
              </button>
            </form>
          </div>
        </>,
        document.body
      )}

      {/* PORTAL: REGISTRAR ABONO / PAGO */}
      {isPayOpen && selectedLoan && createPortal(
        <>
          <div 
            className="overlay open" 
            onClick={() => !payLoading && setIsPayOpen(false)}
            onTouchMove={(e) => e.preventDefault()}
          ></div>

          <div className="bottom-sheet open">
            <div className="sheet-header" onTouchMove={(e) => e.preventDefault()}>
              <span className="sheet-title">Cobrar Deuda a {selectedLoan.borrower_name}</span>
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

            <form onSubmit={handlePayLoan}>
              {/* Segmented abono type */}
              <div className="segmented-control" style={{ marginBottom: '16px' }}>
                <button 
                  type="button" 
                  className={payType === 'complete' ? 'active' : ''} 
                  onClick={() => handlePayTypeChange('complete')}
                  disabled={payLoading}
                >
                  Pago Completo
                </button>
                <button 
                  type="button" 
                  className={payType === 'partial' ? 'active' : ''} 
                  onClick={() => handlePayTypeChange('partial')}
                  disabled={payLoading}
                >
                  Abono Parcial
                </button>
              </div>

              {/* Monto de abono */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Monto del Pago (S/.)</label>
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
                    color: 'var(--color-primary)',
                    padding: '12px'
                  }}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                  disabled={payLoading || payType === 'complete'}
                  autoFocus={isPayOpen}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={payLoading}>
                {payLoading ? 'Registrando cobro...' : `Confirmar Cobro (S/. ${parseFloat(payAmount || 0).toFixed(2)})`}
              </button>
            </form>
          </div>
        </>,
        document.body
      )}

      {/* PORTAL: EXTENDER FECHA */}
      {isExtendOpen && selectedLoan && createPortal(
        <>
          <div 
            className="overlay open" 
            onClick={() => !extendLoading && setIsExtendOpen(false)}
            onTouchMove={(e) => e.preventDefault()}
          ></div>

          <div className="bottom-sheet open">
            <div className="sheet-header" onTouchMove={(e) => e.preventDefault()}>
              <span className="sheet-title">Cambiar Fecha de Cobro</span>
              <button className="btn-close" onClick={() => !extendLoading && setIsExtendOpen(false)} type="button" disabled={extendLoading}>
                <X size={18} />
              </button>
            </div>

            {extendError && (
              <div style={{
                backgroundColor: 'var(--color-danger-light)',
                color: 'var(--color-danger)',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '16px'
              }}>
                {extendError}
              </div>
            )}

            <form onSubmit={handleExtendLoan}>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Nueva Fecha de Vencimiento</label>
                <input
                  type="date"
                  className="form-input"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  required
                  disabled={extendLoading}
                  autoFocus={isExtendOpen}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={extendLoading}>
                {extendLoading ? 'Actualizando...' : 'Extender Plazo de Cobro 📅'}
              </button>
            </form>
          </div>
        </>,
        document.body
      )}

    </div>
  );
}
