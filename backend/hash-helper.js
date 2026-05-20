const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=== Generador de Hashes de Contraseña para GastosAhorro ===');

rl.question('Ingresa el correo electrónico del usuario (ej: chris20022105@gmail.com): ', (email) => {
  if (!email.trim()) {
    console.error('El correo no puede estar vacío.');
    rl.close();
    return;
  }

  rl.question('Ingresa la nueva contraseña: ', async (password) => {
    if (!password) {
      console.error('La contraseña no puede estar vacía.');
      rl.close();
      return;
    }

    try {
      console.log('Generando hash...');
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      console.log('\n------------------------------------------------------------');
      console.log('¡Hash Generado con Éxito!');
      console.log('------------------------------------------------------------');
      console.log(`Nueva Contraseña: ${password}`);
      console.log(`Hash Bcrypt:      ${hash}`);
      console.log('------------------------------------------------------------');
      console.log('Ejecuta la siguiente consulta SQL en tu editor de Supabase:');
      console.log('------------------------------------------------------------');
      console.log(`UPDATE users \nSET password_hash = '${hash}' \nWHERE email = '${email.trim().toLowerCase()}';`);
      console.log('------------------------------------------------------------\n');
    } catch (err) {
      console.error('Error al generar el hash:', err);
    } finally {
      rl.close();
    }
  });
});
