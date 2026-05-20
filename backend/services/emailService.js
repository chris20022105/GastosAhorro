const dotenv = require('dotenv');
dotenv.config();

/**
 * Envía un correo de notificación a ambos miembros de la pareja
 * @param {Object} expense - Datos del gasto
 * @param {number} expense.amount - Monto del gasto
 * @param {string} expense.description - Descripción del gasto
 * @param {string} expense.category - Categoría del gasto
 * @param {string} expense.date - Fecha del gasto
 * @param {string} expense.spender_name - Nombre del que hizo el gasto
 */
async function sendExpenseNotification(expense) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;
  const fromName = process.env.EMAIL_FROM_NAME;

  const partner1Email = process.env.PARTNER_EMAIL_1;
  const partner1Name = process.env.PARTNER_NAME_1;
  const partner2Email = process.env.PARTNER_EMAIL_2;
  const partner2Name = process.env.PARTNER_NAME_2;

  if (!apiKey) {
    console.error('Error: BREVO_API_KEY no está configurada.');
    return { success: false, error: 'BREVO_API_KEY no configurada' };
  }

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

  const emoji = categoryEmojis[expense.category] || '💸';
  const formattedAmount = `S/. ${parseFloat(expense.amount).toFixed(2)}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nuevo Gasto Registrado</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #f5f5f7;
          margin: 0;
          padding: 20px;
          color: #1d1d1f;
        }
        .container {
          max-width: 500px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .header {
          text-align: center;
          margin-bottom: 24px;
        }
        .logo {
          font-size: 28px;
          font-weight: 700;
          color: #2c3e2b;
          letter-spacing: -0.5px;
        }
        .subtitle {
          font-size: 14px;
          color: #86868b;
          margin-top: 4px;
        }
        .badge {
          display: inline-block;
          background-color: #f5f5f7;
          color: #1d1d1f;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 100px;
          margin-bottom: 16px;
        }
        .amount-display {
          font-size: 36px;
          font-weight: 700;
          text-align: center;
          margin: 10px 0 24px 0;
          color: #2c3e2b;
          letter-spacing: -1px;
        }
        .card {
          background-color: #f5f5f7;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #e5e5ea;
          padding: 12px 0;
        }
        .row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .row:first-child {
          padding-top: 0;
        }
        .label {
          font-size: 14px;
          color: #86868b;
        }
        .value {
          font-size: 14px;
          font-weight: 600;
          color: #1d1d1f;
        }
        .button-container {
          text-align: center;
          margin-top: 24px;
        }
        .btn {
          display: inline-block;
          background-color: #1d1d1f;
          color: #ffffff;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          padding: 12px 24px;
          border-radius: 12px;
          transition: background-color 0.2s ease;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #86868b;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">GastosAhorro</div>
          <div class="subtitle">Finanzas en Pareja</div>
        </div>
        
        <div style="text-align: center;">
          <span class="badge">NUEVO GASTO REGISTRADO</span>
        </div>
        
        <div class="amount-display">
          ${formattedAmount}
        </div>
        
        <div class="card">
          <div class="row">
            <span class="label">Registrado por</span>
            <span class="value">${expense.spender_name}</span>
          </div>
          <div class="row">
            <span class="label">Descripción</span>
            <span class="value">${expense.description}</span>
          </div>
          <div class="row">
            <span class="label">Categoría</span>
            <span class="value">${emoji} ${expense.category}</span>
          </div>
          <div class="row">
            <span class="label">Fecha</span>
            <span class="value">${expense.date}</span>
          </div>
        </div>
        
        <div class="button-container">
          <a href="https://gastosahorro.onrender.com" class="btn">Abrir Aplicación</a>
        </div>
        
        <div class="footer">
          Este correo fue enviado de forma automática por GastosAhorro.<br>
          ¡Sigan ahorrando juntos! 🌱
        </div>
      </div>
    </body>
    </html>
  `;

  const requestBody = {
    sender: {
      name: fromName || 'GastosAhorro',
      email: fromEmail || 'chris20022105@gmail.com'
    },
    to: [
      {
        email: partner1Email,
        name: partner1Name
      },
      {
        email: partner2Email,
        name: partner2Name
      }
    ],
    subject: `💸 ${expense.spender_name} gastó ${formattedAmount} en ${expense.description}`,
    htmlContent: htmlContent
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Correo enviado con éxito a través de Brevo:', data);
      return { success: true, messageId: data.messageId };
    } else {
      const errorText = await response.text();
      console.error('Error al enviar correo por Brevo (API Response):', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('Error de red al conectar con Brevo:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendExpenseNotification
};
