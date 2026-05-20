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
const { sendExpenseNotification } = require('./services/emailService');

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

  try {
    const newExpense = {
      amount: parsedAmount,
      description: description.trim(),
      category: category.trim(),
      date: date || new Date().toISOString().split('T')[0],
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
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Gasto eliminado con éxito.' });
  } catch (err) {
    console.error('Error al eliminar gasto:', err);
    res.status(500).json({ error: 'No se pudo eliminar el gasto.' });
  }
});

// Obtener estadísticas agregadas
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    // Traer todos los gastos
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*');

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

    expenses.forEach(exp => {
      const amt = parseFloat(exp.amount);
      totalSpent += amt;

      // Por pareja (usar spender_name)
      partnerSpent[exp.spender_name] = (partnerSpent[exp.spender_name] || 0) + amt;

      // Por categoría
      categorySpent[exp.category] = (categorySpent[exp.category] || 0) + amt;
    });

    res.json({
      totalSpent,
      partnerSpent,
      categorySpent
    });
  } catch (err) {
    console.error('Error al calcular estadísticas:', err);
    res.status(500).json({ error: 'No se pudieron calcular las estadísticas.' });
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
