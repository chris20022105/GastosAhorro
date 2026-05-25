const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const port = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET || 'gastos_ahorro_secret_key_jwt_2026_partner_love';

const token = jwt.sign({
  id: '00000000-0000-0000-0000-000000000000',
  email: 'chris20022105@gmail.com',
  name: 'Christopher Lara'
}, jwtSecret);

async function testEndpoints() {
  const endpoints = [
    `/api/expenses`,
    `/api/stats`,
    `/api/loans/due-alerts`
  ];

  console.log(`Testing local backend endpoints on port ${port}...`);

  for (const endpoint of endpoints) {
    const url = `http://localhost:${port}${endpoint}`;
    console.log(`\n----------------------------------------`);
    console.log(`Fetching: ${url}`);
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        console.log(`Response (JSON):`, JSON.stringify(json, null, 2));
      } else {
        const text = await response.text();
        console.log(`Response (Text/HTML):`, text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      }
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err.message);
    }
  }
}

testEndpoints();
