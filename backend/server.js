const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('No se pudo establecer servidores DNS personalizados:', e.message);
}
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'gastos_ahorro_secret_key_2026';

// Middleware
app.use(cors());
app.use(express.json());

// Inicializar cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('tu-proyecto')) {
  console.warn('ADVERTENCIA: Supabase URL o KEY no configurados adecuadamente en .env');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

// Importar servicio de correo
const { sendExpenseNotification, sendBudgetExceededNotification, sendSavingsNotification } = require('./services/emailService');

// Helpers de zona horaria para Perú (GMT-5)
const getPeruMonth = () => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const peruDate = new Date(utc + (3600000 * -5));
  return peruDate.toISOString().substring(0, 7); // 'YYYY-MM'
};

const getPeruDate = () => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const peruDate = new Date(utc + (3600000 * -5));
  return peruDate.toISOString().split('T')[0]; // 'YYYY-MM-DD'
};


// Middleware para verificar JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso no proporcionado.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token no válido o expirado.' });
    }
    req.user = user;
    next();
  });
};

// ============================================================================
// RUTAS DE AUTENTICACIÓN
// ============================================================================

// Login de usuario
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son requeridos.' });
  }

  try {
    // Buscar usuario en la base de datos Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' } // Sesión extendida de 30 días para conveniencia móvil
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Obtener info del usuario logueado (verificar sesión)
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ============================================================================
// RUTAS DE GASTOS
// ============================================================================

// Obtener todos los gastos
app.get('/api/expenses', authenticateToken, async (req, res) => {
  try {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(expenses);
  } catch (err) {
    console.error('Error al obtener gastos:', err);
    res.status(500).json({ error: 'No se pudieron cargar los gastos.' });
  }
});

// Crear nuevo gasto
app.post('/api/expenses', authenticateToken, async (req, res) => {
  const { amount, description, category, date } = req.body;

  if (!amount || !description || !category) {
    return res.status(400).json({ error: 'Monto, descripción y categoría son requeridos.' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'El monto debe ser un número mayor a cero.' });
  }

  const expenseDate = date || getPeruDate();
  const targetMonth = expenseDate.substring(0, 7); // 'YYYY-MM'

  try {
    // 1. Obtener presupuesto de este mes (inicializar si no existe)
    let { data: budget, error: budgetError } = await supabase
      .from('monthly_budgets')
      .select('*')
      .eq('year_month', targetMonth)
      .maybeSingle();

    if (budgetError) throw budgetError;

    if (!budget) {
      const defaultBudget = {
        year_month: targetMonth,
        income_chris_pen: 2809.90,
        income_solansh_pen: 1550.00,
        budget_limit_pen: 3000.00,
        email_sent_100: false
      };

      const { data: inserted, error: insertError } = await supabase
        .from('monthly_budgets')
        .insert([defaultBudget])
        .select();

      if (insertError) throw insertError;
      budget = inserted[0];
    }

    // 2. Calcular gastos ya registrados de este mes
    const { data: monthExpenses, error: expError } = await supabase
      .from('expenses')
      .select('amount')
      .gte('date', `${targetMonth}-01`)
      .lte('date', `${targetMonth}-31`);

    if (expError) throw expError;

    const currentTotal = (monthExpenses || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const budgetLimit = parseFloat(budget.budget_limit_pen);

    // 3. Si el presupuesto ya está agotado o superado, bloquear la transacción
    if (currentTotal >= budgetLimit) {
      return res.status(400).json({
        error: `Presupuesto mensual agotado. Se ha consumido S/. ${currentTotal.toFixed(2)} de S/. ${budgetLimit.toFixed(2)}. No se permite registrar más gastos.`
      });
    }

    const newExpense = {
      amount: parsedAmount,
      description: description.trim(),
      category: category.trim(),
      date: expenseDate,
      user_id: req.user.id,
      user_email: req.user.email,
      spender_name: req.user.name
    };

    // Insertar en la BD
    const { data: insertedData, error } = await supabase
      .from('expenses')
      .insert([newExpense])
      .select();

    if (error) throw error;

    const createdExpense = insertedData[0];
    const newTotal = currentTotal + parsedAmount;

    // Enviar notificación de correo en segundo plano
    sendExpenseNotification(createdExpense).then(result => {
      if (result.success) {
        console.log(`Notificación de correo enviada para el gasto: ${createdExpense.id}`);
      } else {
        console.error('Fallo al enviar el correo:', result.error);
      }
    }).catch(err => {
      console.error('Error no controlado en sendExpenseNotification:', err);
    });

    // Enviar notificación de presupuesto completado (100%) si cruza el límite
    if (newTotal >= budgetLimit && !budget.email_sent_100) {
      // Marcar de inmediato en BD para evitar envíos duplicados
      supabase
        .from('monthly_budgets')
        .update({ email_sent_100: true })
        .eq('year_month', targetMonth)
        .then(({ error: updateError }) => {
          if (updateError) console.error('Error al actualizar email_sent_100:', updateError);
        });

      sendBudgetExceededNotification(budget, newTotal).then(result => {
        if (result.success) {
          console.log(`Alerta de correo de presupuesto al 100% enviada para: ${targetMonth}`);
        } else {
          console.error('Fallo al enviar correo de alerta de presupuesto:', result.error);
        }
      }).catch(err => {
        console.error('Error no controlado en sendBudgetExceededNotification:', err);
      });
    }

    res.status(201).json(createdExpense);
  } catch (err) {
    console.error('Error al crear gasto:', err);
    res.status(500).json({ error: 'No se pudo registrar el gasto.' });
  }
});

// Eliminar un gasto
app.delete('/api/expenses/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Obtener detalles del gasto para saber la fecha y monto
    const { data: expense, error: findError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !expense) {
      return res.status(404).json({ error: 'El gasto no existe.' });
    }

    const targetMonth = expense.date.substring(0, 7);

    // 2. Eliminar de la base de datos
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // 3. Recalcular total de gastos de este mes
    const { data: monthExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .gte('date', `${targetMonth}-01`)
      .lte('date', `${targetMonth}-31`);

    const newTotal = (monthExpenses || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);

    // 4. Obtener presupuesto de este mes
    const { data: budget } = await supabase
      .from('monthly_budgets')
      .select('*')
      .eq('year_month', targetMonth)
      .maybeSingle();

    if (budget && newTotal < parseFloat(budget.budget_limit_pen) && budget.email_sent_100) {
      // Restablecer el flag de correo enviado si cayó por debajo
      await supabase
        .from('monthly_budgets')
        .update({ email_sent_100: false })
        .eq('year_month', targetMonth);
      console.log(`Restablecido email_sent_100 a false para el mes ${targetMonth} tras eliminar gasto`);
    }

    res.json({ message: 'Gasto eliminado con éxito.' });
  } catch (err) {
    console.error('Error al eliminar gasto:', err);
    res.status(500).json({ error: 'No se pudo eliminar el gasto.' });
  }
});

// ============================================================================
// RUTAS DE PRESUPUESTO
// ============================================================================

// Obtener o inicializar presupuesto mensual
app.get('/api/budget/:yearMonth', authenticateToken, async (req, res) => {
  const { yearMonth } = req.params;

  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    return res.status(400).json({ error: 'Formato de mes inválido. Debe ser YYYY-MM.' });
  }

  try {
    let { data: budget, error } = await supabase
      .from('monthly_budgets')
      .select('*')
      .eq('year_month', yearMonth)
      .maybeSingle();

    if (error) throw error;

    if (!budget) {
      const defaultBudget = {
        year_month: yearMonth,
        income_chris_pen: 2809.90,
        income_solansh_pen: 1550.00,
        budget_limit_pen: 3000.00,
        email_sent_100: false
      };

      const { data: inserted, error: insertError } = await supabase
        .from('monthly_budgets')
        .insert([defaultBudget])
        .select();

      if (insertError) throw insertError;
      budget = inserted[0];
    }

    res.json(budget);
  } catch (err) {
    console.error('Error al obtener presupuesto:', err);
    res.status(500).json({ error: 'No se pudo cargar el presupuesto.' });
  }
});

// Actualizar presupuesto mensual
app.put('/api/budget/:yearMonth', authenticateToken, async (req, res) => {
  const { yearMonth } = req.params;
  const { income_chris_pen, income_solansh_pen, budget_limit_pen } = req.body;

  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    return res.status(400).json({ error: 'Formato de mes inválido. Debe ser YYYY-MM.' });
  }

  const chrisIncome = parseFloat(income_chris_pen);
  const solanshIncome = parseFloat(income_solansh_pen);
  const limit = parseFloat(budget_limit_pen);

  if (isNaN(chrisIncome) || chrisIncome < 0 || isNaN(solanshIncome) || solanshIncome < 0 || isNaN(limit) || limit < 0) {
    return res.status(400).json({ error: 'Ingresos y límites deben ser valores numéricos mayores o iguales a cero.' });
  }

  try {
    const { data: currentBudget } = await supabase
      .from('monthly_budgets')
      .select('*')
      .eq('year_month', yearMonth)
      .maybeSingle();

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .gte('date', `${yearMonth}-01`)
      .lte('date', `${yearMonth}-31`);

    const totalSpent = (expenses || []).reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const shouldResetEmail = totalSpent < limit;

    const updates = {
      income_chris_pen: chrisIncome,
      income_solansh_pen: solanshIncome,
      budget_limit_pen: limit,
      email_sent_100: currentBudget ? (shouldResetEmail ? false : currentBudget.email_sent_100) : false
    };

    const { data: updated, error } = await supabase
      .from('monthly_budgets')
      .update(updates)
      .eq('year_month', yearMonth)
      .select();

    if (error) throw error;

    res.json(updated[0]);
  } catch (err) {
    console.error('Error al actualizar presupuesto:', err);
    res.status(500).json({ error: 'No se pudo actualizar el presupuesto.' });
  }
});

// Obtener estadísticas agregadas (mensual)
app.get('/api/stats', authenticateToken, async (req, res) => {
  const month = req.query.month || getPeruMonth();

  try {
    // 1. Obtener/Inicializar presupuesto de este mes
    let { data: budget, error: budgetError } = await supabase
      .from('monthly_budgets')
      .select('*')
      .eq('year_month', month)
      .maybeSingle();

    if (budgetError) throw budgetError;

    if (!budget) {
      const defaultBudget = {
        year_month: month,
        income_chris_pen: 2809.90,
        income_solansh_pen: 1550.00,
        budget_limit_pen: 3000.00,
        email_sent_100: false
      };

      const { data: inserted, error: insertError } = await supabase
        .from('monthly_budgets')
        .insert([defaultBudget])
        .select();

      if (insertError) throw insertError;
      budget = inserted[0];
    }

    // 2. Traer todos los gastos de este mes
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('date', `${month}-01`)
      .lte('date', `${month}-31`);

    if (error) throw error;

    // Calcular estadísticas
    let totalSpent = 0;
    const partnerSpent = {};
    const categorySpent = {};

    // Obtener los nombres de los usuarios de la base de datos para asegurar consistencia
    const { data: users, userError } = await supabase
      .from('users')
      .select('email, name');
    
    // Inicializar totales de pareja
    if (!userError && users) {
      users.forEach(u => {
        partnerSpent[u.name] = 0;
      });
    }

    (expenses || []).forEach(exp => {
      const amt = parseFloat(exp.amount);
      totalSpent += amt;

      // Por pareja (usar spender_name)
      partnerSpent[exp.spender_name] = (partnerSpent[exp.spender_name] || 0) + amt;

      // Por categoría
      categorySpent[exp.category] = (categorySpent[exp.category] || 0) + amt;
    });

    res.json({
      month,
      totalSpent,
      partnerSpent,
      categorySpent,
      budget
    });
  } catch (err) {
    console.error('Error al calcular estadísticas:', err);
    res.status(500).json({ error: 'No se pudieron calcular las estadísticas.' });
  }
});

// ============================================================================
// RUTAS DE CAJA DE AHORRO
// ============================================================================

// Obtener meta de ahorro activa (inicializar si no existe)
app.get('/api/savings/goal', authenticateToken, async (req, res) => {
  try {
    let { data: goals, error } = await supabase
      .from('savings_goals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    let activeGoal = goals && goals[0];

    // Si no hay meta creada, inicializar una por defecto
    if (!activeGoal) {
      const defaultGoal = {
        target_amount: 5000.00,
        description: 'Meta de Ahorro Colectiva'
      };

      const { data: inserted, error: insertError } = await supabase
        .from('savings_goals')
        .insert([defaultGoal])
        .select();

      if (insertError) throw insertError;
      activeGoal = inserted[0];
    }

    res.json(activeGoal);
  } catch (err) {
    console.error('Error al obtener meta de ahorro:', err);
    res.status(500).json({ error: 'No se pudo cargar la meta de ahorro.' });
  }
});

// Actualizar meta de ahorro
app.put('/api/savings/goal', authenticateToken, async (req, res) => {
  const { target_amount, description } = req.body;
  const parsedTarget = parseFloat(target_amount);

  if (isNaN(parsedTarget) || parsedTarget <= 0) {
    return res.status(400).json({ error: 'El monto objetivo de la meta debe ser mayor a cero.' });
  }

  const desc = description ? description.trim() : 'Meta de Ahorro Colectiva';

  try {
    const { data: goals } = await supabase
      .from('savings_goals')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1);

    let result;
    if (goals && goals.length > 0) {
      // Actualizar la existente
      const { data: updated, error: updateError } = await supabase
        .from('savings_goals')
        .update({ target_amount: parsedTarget, description: desc })
        .eq('id', goals[0].id)
        .select();

      if (updateError) throw updateError;
      result = updated[0];
    } else {
      // Insertar nueva
      const { data: inserted, error: insertError } = await supabase
        .from('savings_goals')
        .insert([{ target_amount: parsedTarget, description: desc }])
        .select();

      if (insertError) throw insertError;
      result = inserted[0];
    }

    res.json(result);
  } catch (err) {
    console.error('Error al actualizar meta de ahorro:', err);
    res.status(500).json({ error: 'No se pudo guardar la meta de ahorro.' });
  }
});

// Obtener aportes/depósitos de ahorro
app.get('/api/savings/deposits', authenticateToken, async (req, res) => {
  try {
    const { data: deposits, error } = await supabase
      .from('savings_deposits')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(deposits || []);
  } catch (err) {
    console.error('Error al obtener depósitos de ahorro:', err);
    res.status(500).json({ error: 'No se pudieron cargar los depósitos.' });
  }
});

// Registrar nuevo aporte de ahorro
app.post('/api/savings/deposits', authenticateToken, async (req, res) => {
  const { amount, description, date } = req.body;
  const isFromSalary = req.body.is_from_salary !== undefined ? req.body.is_from_salary : req.body.isFromSalary;

  if (!amount || !description) {
    return res.status(400).json({ error: 'Monto y descripción son requeridos.' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'El monto del aporte debe ser un número mayor a cero.' });
  }

  const depositDate = date || getPeruDate();
  const targetMonth = depositDate.substring(0, 7); // 'YYYY-MM'

  try {
    let expenseId = null;
    let budget = null;
    let budgetLimit = 3000.00;
    let currentTotal = 0;

    // Si proviene del sueldo, validar presupuesto e insertar gasto primero
    if (isFromSalary) {
      // 1. Obtener/Inicializar presupuesto de este mes
      let { data: budgetData, error: budgetError } = await supabase
        .from('monthly_budgets')
        .select('*')
        .eq('year_month', targetMonth)
        .maybeSingle();

      if (budgetError) throw budgetError;

      if (!budgetData) {
        const defaultBudget = {
          year_month: targetMonth,
          income_chris_pen: 2809.90,
          income_solansh_pen: 1550.00,
          budget_limit_pen: 3000.00,
          email_sent_100: false
        };

        const { data: inserted, error: insertError } = await supabase
          .from('monthly_budgets')
          .insert([defaultBudget])
          .select();

        if (insertError) throw insertError;
        budgetData = inserted[0];
      }

      budget = budgetData;
      budgetLimit = parseFloat(budget.budget_limit_pen);

      // 2. Calcular gastos ya registrados de este mes
      const { data: monthExpenses, error: expError } = await supabase
        .from('expenses')
        .select('amount')
        .gte('date', `${targetMonth}-01`)
        .lte('date', `${targetMonth}-31`);

      if (expError) throw expError;

      currentTotal = (monthExpenses || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);

      // 3. Bloquear la transacción si el presupuesto mensual ya está agotado
      if (currentTotal >= budgetLimit) {
        return res.status(400).json({
          error: `Presupuesto mensual agotado. Se ha consumido S/. ${currentTotal.toFixed(2)} de S/. ${budgetLimit.toFixed(2)}. No se permite registrar ahorros desde el sueldo.`
        });
      }

      // 4. Crear el gasto automático de tipo "Ahorro"
      const newExpense = {
        amount: parsedAmount,
        description: `Ahorro: ${description.trim()}`,
        category: 'Ahorro',
        date: depositDate,
        user_id: req.user.id,
        user_email: req.user.email,
        spender_name: req.user.name
      };

      const { data: insertedExpenseData, error: expInsertError } = await supabase
        .from('expenses')
        .insert([newExpense])
        .select();

      if (expInsertError) throw expInsertError;
      const createdExpense = insertedExpenseData[0];
      expenseId = createdExpense.id;

      const newTotal = currentTotal + parsedAmount;

      // Enviar notificación del gasto creado en segundo plano
      sendExpenseNotification(createdExpense).then(result => {
        if (result.success) {
          console.log(`Notificación de correo enviada para el gasto de ahorro: ${createdExpense.id}`);
        } else {
          console.error('Fallo al enviar correo de gasto de ahorro:', result.error);
        }
      }).catch(err => {
        console.error('Error no controlado en sendExpenseNotification (gasto ahorro):', err);
      });

      // Enviar alerta de presupuesto al 100% si se alcanza el límite
      if (newTotal >= budgetLimit && !budget.email_sent_100) {
        supabase
          .from('monthly_budgets')
          .update({ email_sent_100: true })
          .eq('year_month', targetMonth)
          .then(({ error: updateError }) => {
            if (updateError) console.error('Error al actualizar email_sent_100:', updateError);
          });

        sendBudgetExceededNotification(budget, newTotal).then(result => {
          if (result.success) {
            console.log(`Alerta de correo de presupuesto al 100% enviada para: ${targetMonth}`);
          } else {
            console.error('Fallo al enviar correo de alerta de presupuesto:', result.error);
          }
        }).catch(err => {
          console.error('Error no controlado en sendBudgetExceededNotification:', err);
        });
      }
    }

    // Registrar el depósito
    const newDeposit = {
      amount: parsedAmount,
      description: description.trim(),
      date: depositDate,
      user_id: req.user.id,
      user_email: req.user.email,
      spender_name: req.user.name,
      is_from_salary: !!isFromSalary,
      expense_id: expenseId
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('savings_deposits')
      .insert([newDeposit])
      .select();

    if (insertError) throw insertError;
    const createdDeposit = insertedData[0];

    // Traer el total de ahorros acumulado
    const { data: allDeposits, error: fetchError } = await supabase
      .from('savings_deposits')
      .select('amount');

    if (fetchError) throw fetchError;
    const newTotalSavings = (allDeposits || []).reduce((sum, d) => sum + parseFloat(d.amount), 0);

    // Traer la meta activa
    let { data: goals } = await supabase
      .from('savings_goals')
      .select('target_amount')
      .order('created_at', { ascending: false })
      .limit(1);

    const goalAmount = (goals && goals[0]) ? parseFloat(goals[0].target_amount) : 5000.00;

    // Enviar notificación por correo de Brevo del aporte de ahorro
    sendSavingsNotification(createdDeposit, newTotalSavings, goalAmount).then(result => {
      if (result.success) {
        console.log(`Notificación de correo enviada para el aporte: ${createdDeposit.id}`);
      } else {
        console.error('Fallo al enviar el correo de aporte:', result.error);
      }
    }).catch(err => {
      console.error('Error no controlado en sendSavingsNotification:', err);
    });

    res.status(201).json(createdDeposit);
  } catch (err) {
    console.error('Error al registrar aporte de ahorro:', err);
    res.status(500).json({ error: 'No se pudo registrar el aporte de ahorro.' });
  }
});

// Eliminar un aporte de ahorro
app.delete('/api/savings/deposits/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Obtener detalles del depósito para verificar si tiene un gasto asociado
    const { data: deposit, error: findError } = await supabase
      .from('savings_deposits')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !deposit) {
      return res.status(404).json({ error: 'El aporte de ahorro no existe.' });
    }

    // 2. Eliminar el depósito de ahorro
    const { error: deleteDepError } = await supabase
      .from('savings_deposits')
      .delete()
      .eq('id', id);

    if (deleteDepError) throw deleteDepError;

    // 3. Si tiene un gasto asociado, eliminarlo del historial de gastos
    if (deposit.expense_id) {
      const { data: expense } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', deposit.expense_id)
        .maybeSingle();

      if (expense) {
        const targetMonth = expense.date.substring(0, 7);

        // Eliminar el gasto
        await supabase
          .from('expenses')
          .delete()
          .eq('id', deposit.expense_id);

        // Recalcular total de gastos de este mes
        const { data: monthExpenses } = await supabase
          .from('expenses')
          .select('amount')
          .gte('date', `${targetMonth}-01`)
          .lte('date', `${targetMonth}-31`);

        const newTotal = (monthExpenses || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);

        // Obtener presupuesto para ver si corresponde resetear email_sent_100
        const { data: budget } = await supabase
          .from('monthly_budgets')
          .select('*')
          .eq('year_month', targetMonth)
          .maybeSingle();

        if (budget && newTotal < parseFloat(budget.budget_limit_pen) && budget.email_sent_100) {
          await supabase
            .from('monthly_budgets')
            .update({ email_sent_100: false })
            .eq('year_month', targetMonth);
          console.log(`Restablecido email_sent_100 a false para el mes ${targetMonth} tras eliminar ahorro y su gasto correspondiente`);
        }
      }
    }

    res.json({ message: 'Aporte de ahorro y gasto asociado eliminados con éxito.' });
  } catch (err) {
    console.error('Error al eliminar aporte de ahorro:', err);
    res.status(500).json({ error: 'No se pudo eliminar el aporte de ahorro.' });
  }
});

// ============================================================================
// SERVICIO DE ARCHIVOS ESTÁTICOS (PRODUCCIÓN)
// ============================================================================
if (process.env.NODE_ENV === 'production') {
  // Servir frontend compilado
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('API de GastosAhorro en desarrollo. Inicia el frontend con: npm run dev --prefix frontend');
  });
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en el puerto ${PORT}`);
});
