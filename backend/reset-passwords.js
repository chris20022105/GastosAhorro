const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('No se pudo establecer servidores DNS personalizados:', e.message);
}
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno del backend
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
  console.error('Error: Las credenciales de Supabase no están configuradas en backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Conectando a Supabase para verificar/restablecer cuentas de usuario...');

  // Diagnóstico de google.com
  try {
    console.log('Prueba de conexión directa a: https://www.google.com');
    const resGoogle = await fetch('https://www.google.com');
    console.log(`✓ Conexión a Google exitosa! Estado HTTP: ${resGoogle.status}`);
  } catch (e) {
    console.error('✗ Error conectando a Google:', e.message);
  }

  // Diagnóstico de fetch directo a Supabase
  try {
    console.log(`Prueba de conexión directa a: ${supabaseUrl}`);
    const res = await fetch(supabaseUrl);
    console.log(`✓ Conexión a Supabase exitosa! Estado HTTP: ${res.status}`);
  } catch (e) {
    console.error('✗ Error en conexión directa a Supabase:', e.message);
    if (e.cause) {
      console.error('Causa detallada:', e.cause);
    }
  }

  const rawPassword = 'Gastos2026!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(rawPassword, salt);

  const usersToReset = [
    { email: 'chris20022105@gmail.com', name: 'Christopher Lara' },
    { email: 'solanhsjudethmu@gmail.com', name: 'Solansh Muñoz' }
  ];

  for (const u of usersToReset) {
    console.log(`Procesando usuario: ${u.name} (${u.email})...`);

    // Intentar buscar el usuario
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('email', u.email)
      .maybeSingle();

    if (findError) {
      console.error(`Error buscando al usuario ${u.email}:`, findError.message);
      console.log('Asegúrate de haber ejecutado primero el script schema.sql en el SQL Editor de Supabase.');
      continue;
    }

    if (existingUser) {
      // Si existe, actualizar contraseña
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: hash, name: u.name })
        .eq('email', u.email);

      if (updateError) {
        console.error(`Error al actualizar la contraseña de ${u.email}:`, updateError.message);
      } else {
        console.log(`✓ Contraseña restablecida con éxito para: ${u.email}`);
      }
    } else {
      // Si no existe, crearlo directamente
      const { error: insertError } = await supabase
        .from('users')
        .insert([{ email: u.email, password_hash: hash, name: u.name }]);

      if (insertError) {
        console.error(`Error al crear el usuario ${u.email}:`, insertError.message);
      } else {
        console.log(`✓ Usuario creado e inicializado con éxito: ${u.email}`);
      }
    }
  }

  console.log('\nProceso terminado. Intenta iniciar sesión ahora con el password: Gastos2026!');
}

run();
