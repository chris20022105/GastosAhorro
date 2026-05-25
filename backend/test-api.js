const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const port = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET || 'gastos_ahorro_secret_key_jwt_2026_partner_love';

const payload = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'chris20022105@gmail.com',
  name: 'Christopher Lara'
};

const token = jwt.sign(payload, jwtSecret);

async function testApi() {
  const url = `http://localhost:${port}/api/stats`;
  console.log(`Sending GET request to ${url}...`);
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log('\n--- LOCAL API STATUS ---');
    console.log('Status code:', response.status);
    console.log('API response body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error connecting to local API:', err.message);
    console.log('Please make sure your backend server is running on port 5000 (run: npm run dev or equivalent).');
  }
}

testApi();
