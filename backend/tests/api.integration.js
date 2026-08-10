import 'dotenv/config';

const BASE = 'http://localhost:5000';

const test = async (name, fn) => {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
  } catch (err) {
    console.log(`❌ FAIL: ${name} — ${err.message}`);
  }
};

const post = async (path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
};

const get = async (path, token) => {
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, data: await res.json() };
};

(async () => {
  console.log('\n🧪 Running API Integration Tests...\n');

  // Health check
  await test('Health endpoint', async () => {
    const { data } = await get('/health');
    if (data.status !== 'ok' && data.status !== 'degraded') throw new Error(`Got status: ${data.status}`);
  });

  // Register
  let token;
  await test('User registration', async () => {
    const email = `test_${Date.now()}@invoiceagent.com`;
    const { status, data } = await post('/api/auth/register', {
      name: 'Test User', email, password: 'password123'
    });
    if (!data.success) throw new Error(data.message);
    token = data.data.token;
    if (!token) throw new Error('No token returned');
  });

  // Login
  await test('Dashboard stats returns data', async () => {
    const { data } = await get('/api/dashboard/stats', token);
    if (!data.success) throw new Error(data.message);
    const stats = data.data;
    if (stats.total_invoices === undefined) throw new Error('Missing total_invoices');
    console.log(`   → Total invoices: ${stats.total_invoices}, Total amount: ₹${stats.total_amount}`);
  });

  await test('Invoices list API', async () => {
    const { data } = await get('/api/invoices', token);
    if (!data.success) throw new Error(data.message);
    console.log(`   → ${data.data.total} invoices in DB`);
  });



  await test('Auth /me endpoint', async () => {
    const { data } = await get('/api/auth/me', token);
    if (!data.success) throw new Error(data.message);
    console.log(`   → Logged in as: ${data.data.name}`);
  });

  console.log('\n✅ API integration tests complete!\n');
})();
