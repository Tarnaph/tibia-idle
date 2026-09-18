import { spawn } from 'child_process';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profileDir = path.resolve('scratch', 'edge_visible_test_' + Date.now());
fs.mkdirSync(profileDir, { recursive: true });

const PORT = 9355;
const edgeProc = spawn(edgePath, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  '--headless=new',
  '--window-size=1366,900',
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank'
], { stdio: 'ignore' });

async function pollJson() {
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      const list = await res.json();
      const pageTarget = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (pageTarget) return pageTarget.webSocketDebuggerUrl;
    } catch {}
  }
  throw new Error(`Timeout waiting for Edge CDP on port ${PORT}`);
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
    });

    this.ws.on('message', data => {
      const msg = JSON.parse(data.toString());
      if (msg.id && this.pending.has(msg.id)) {
        this.pending.get(msg.id)(msg);
        this.pending.delete(msg.id);
      }
    });

    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('DOM.enable');
    await this.send('Network.enable');
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.pending.set(id, res => {
        if (res.error) reject(res.error);
        else resolve(res.result);
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async takeScreenshot(filename) {
    const scr = await this.send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(scr.data, 'base64');
    const outPath = path.resolve('scratch', filename);
    fs.writeFileSync(outPath, buf);
    console.log(`[Screenshot] Saved scratch/${filename} (${(buf.length / 1024).toFixed(1)} KB)`);
    return outPath;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  let client = null;
  const baseUrl = 'http://187.7.16.210:3000';

  try {
    const wsUrl = await pollJson();
    client = new CdpClient(wsUrl);
    await client.connect();

    console.log('1. Login como ADMIN...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teste@teste.com', password: 'qweqwe' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data.token;

    await client.send('Network.setCookie', {
      name: 'auth_token',
      value: token,
      domain: '187.7.16.210',
      path: '/'
    });
    await client.send('Network.setCookie', {
      name: 'colyseus_token',
      value: token,
      domain: '187.7.16.210',
      path: '/'
    });

    console.log('2. Acessando /game...');
    await client.send('Page.navigate', { url: `${baseUrl}/game` });
    await new Promise(r => setTimeout(r, 2000));

    await client.evaluate(`
      localStorage.setItem('auth_token', ${JSON.stringify(token)});
      localStorage.setItem('colyseus_token', ${JSON.stringify(token)});
      sessionStorage.removeItem('cavebound_manual_logout');
    `);

    // Wait for character to be loaded in the city
    console.log('3. Aguardando personagem carregar na cidade...');
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const isLoaded = await client.evaluate(`
        Boolean(document.querySelector('.huntera-online-status') || document.querySelector('[data-testid="huntera-avatar-box"]'))
      `);
      if (isLoaded) {
        console.log(`Personagem carregado na cidade após ${i+1}s!`);
        break;
      }
    }

    // Wait 3 more seconds for PixiJS to render all frames
    await new Promise(r => setTimeout(r, 3000));

    console.log('4. Capturando screenshot do personagem visivel na cidade...');
    await client.takeScreenshot('cdp-phase186-07-character-visible.png');
    console.log('Sucesso!');

  } catch (err) {
    console.error('Erro na verificacao:', err);
  } finally {
    if (client) client.close();
    try { edgeProc.kill(); } catch {}
    process.exit(0);
  }
}

run();
