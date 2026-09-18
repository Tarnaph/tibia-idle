const http = require('http');
const { execSync } = require('child_process');

async function req(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('1. Login como ADMIN (teste@teste.com)...');
  const loginRes = await req('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'teste@teste.com', password: 'qweqwe' });

  console.log('Login status:', loginRes.status);
  const setCookies = loginRes.headers['set-cookie'];
  const cookieHeader = Array.isArray(setCookies) ? setCookies.map(c => c.split(';')[0]).join('; ') : (setCookies || '');
  const loginJson = JSON.parse(loginRes.body);
  const adminToken = loginJson.data?.token;
  const adminAccount = loginJson.data?.account;
  console.log('Admin account role:', adminAccount?.role, 'Token present:', !!adminToken);

  console.log('2. Criar conta temporária de teste para promoção...');
  const rand = Math.floor(Math.random() * 100000);
  const testEmail = 'gm_test_' + rand + '@cavebound.local';
  const regRes = await req('http://127.0.0.1:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: testEmail, password: 'password123' });
  const regJson = JSON.parse(regRes.body);
  const testToken = regJson.data?.token;
  const testAccountId = regJson.data?.account?.id;
  console.log('Test player account created:', testAccountId);

  const letters = 'abcdefghijklmnopqrstuvwxyz';
  let randSuffix = '';
  for (let i = 0; i < 5; i++) randSuffix += letters.charAt(Math.floor(Math.random() * letters.length));
  const charName = 'GmTest' + randSuffix.charAt(0).toUpperCase() + randSuffix.slice(1);

  const charRes = await req('http://127.0.0.1:3000/api/characters', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + testToken,
      'Cookie': 'auth_token=' + testToken
    }
  }, { name: charName, vocationId: 1 });
  console.log('charRes status:', charRes.status, 'body:', charRes.body);
  const charJson = JSON.parse(charRes.body);
  const testCharId = charJson.data?.id;
  console.log('Test char created:', testCharId, 'with name:', charName);

  console.log('3. Promover conta teste a GM usando token ADMIN...');
  const promoteRes = await req('http://127.0.0.1:3000/api/admin/players', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + adminToken,
      'Cookie': cookieHeader
    }
  }, { action: 'promote_gm', characterId: testCharId });
  console.log('Promote status:', promoteRes.status, promoteRes.body);

  console.log('4. Verificar integridade no banco dev.db...');
  const dbCheck = execSync('sqlite3 /root/tibia-idle/prisma/dev.db "SELECT a.role, c.adminTitle FROM accounts a JOIN characters c ON c.accountId = a.id WHERE c.id = \x27' + testCharId + '\x27;"').toString().trim();
  console.log('DB State after promote (expected GM|GM):', dbCheck);
  if (dbCheck !== 'GM|GM') throw new Error('DB check failed: expected GM|GM but got ' + dbCheck);

  console.log('5. Tentar rebaixar GOD Wolfy (deve falhar com 400)...');
  const wolfyId = execSync('sqlite3 /root/tibia-idle/prisma/dev.db "SELECT id FROM characters WHERE name = \x27Wolfy\x27;"').toString().trim();
  const failDemoteWolfy = await req('http://127.0.0.1:3000/api/admin/players', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + adminToken,
      'Cookie': cookieHeader
    }
  }, { action: 'demote_gm', characterId: wolfyId });
  console.log('Demote Wolfy status (expected 400):', failDemoteWolfy.status, failDemoteWolfy.body);
  if (failDemoteWolfy.status !== 400) throw new Error('Wolfy was not protected!');

  console.log('6. Rebaixar conta teste de volta a PLAYER...');
  const demoteRes = await req('http://127.0.0.1:3000/api/admin/players', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + adminToken,
      'Cookie': cookieHeader
    }
  }, { action: 'demote_gm', characterId: testCharId });
  console.log('Demote status:', demoteRes.status, demoteRes.body);

  const dbCheckAfter = execSync('sqlite3 /root/tibia-idle/prisma/dev.db "SELECT a.role, c.adminTitle FROM accounts a JOIN characters c ON c.accountId = a.id WHERE c.id = \x27' + testCharId + '\x27;"').toString().trim();
  console.log('DB State after demote (expected PLAYER|):', dbCheckAfter);
  if (dbCheckAfter !== 'PLAYER|') throw new Error('DB check failed: expected PLAYER| but got ' + dbCheckAfter);

  console.log('7. Limpar conta e personagem de teste...');
  execSync('sqlite3 /root/tibia-idle/prisma/dev.db "DELETE FROM characters WHERE id = \x27' + testCharId + '\x27; DELETE FROM accounts WHERE email = \x27' + testEmail + '\x27;"');
  console.log('Cleaned up test account.');

  console.log('=== TODOS OS TESTES ONLINE DO BLOCO C PASSARAM COM SUCESSO NA VPS ===');
}

run().catch(err => {
  console.error('ERRO:', err);
  process.exit(1);
});
