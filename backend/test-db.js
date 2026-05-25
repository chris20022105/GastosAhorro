const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const getPeruMonth = () => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const peruDate = new Date(utc + (3600000 * -5));
  return peruDate.toISOString().substring(0, 7); // 'YYYY-MM'
};

async function test() {
  const month = getPeruMonth();
  console.log('Calculating stats for month:', month);

  // 1. Fetch range expenses
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('date', `${month}-01`)
    .lte('date', `${month}-31`);

  if (error) {
    console.error('Error fetching expenses:', error);
    return;
  }

  let totalSpent = 0;
  let bcpPurchases = 0;
  let bcpPayments = 0;
  let ripleyPurchases = 0;
  let ripleyPayments = 0;

  expenses.forEach(exp => {
    const amt = parseFloat(exp.amount);
    console.log(`Processing expense: "${exp.description}", cat: "${exp.category}", amt: ${amt}, date: ${exp.date}`);
    
    if (exp.category === 'Tarjeta BCP') {
      bcpPurchases += amt;
    } else if (exp.category === 'Tarjeta Ripley') {
      ripleyPurchases += amt;
    } else if (exp.category === 'Pago Tarjeta BCP') {
      bcpPayments += amt;
      totalSpent += amt;
    } else if (exp.category === 'Pago Tarjeta Ripley') {
      ripleyPayments += amt;
      totalSpent += amt;
    } else {
      totalSpent += amt;
    }
  });

  const spentBcp = Math.max(0, bcpPurchases - bcpPayments);
  const spentRipley = Math.max(0, ripleyPurchases - ripleyPayments);

  console.log('\n--- CALCULATED RESULTS ---');
  console.log('bcpPurchases:', bcpPurchases);
  console.log('bcpPayments:', bcpPayments);
  console.log('spentBcp (calculated):', spentBcp);
  console.log('ripleyPurchases:', ripleyPurchases);
  console.log('ripleyPayments:', ripleyPayments);
  console.log('spentRipley (calculated):', spentRipley);
  console.log('totalSpent (cash):', totalSpent);
}

test();
