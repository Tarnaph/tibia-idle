import { spawn } from 'child_process';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profileDir = path.resolve('scratch', 'edge_profile_reproduce_' + Date.now());
fs.mkdirSync(profileDir, { recursive: true });

const PORT = 9360;
const VPS_HOST = '187.7.16.210';
const VPS_URL = `http://${VPS_HOST}:3000`;

const edgeProc = spawn(edgePath, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  '--headless=new',
  '--window-size=1280,900',
  '--enable-webgl',
  '--use-gl=angle',
  '--use-angle=swiftshader',
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
    await this.send('Log.enable');
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
      console.error('[Eval Exception]', res.exceptionDetails);
    }
    return res.result?.value;
  }

  async takeScreenshot(filename) {
    const scr = await this.send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(scr.data, 'base64');
    const outPath = path.resolve('scratch', filename);
    fs.writeFileSync(outPath, buf);
    console.log(`[Screenshot] Saved scratch/${filename}`);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  try {
    const wsUrl = await pollJson();
    const client = new CdpClient(wsUrl);
    await client.connect();

    client.ws.on('message', data => {
      const msg = JSON.parse(data.toString());
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value ?? a.description ?? JSON.stringify(a)).join(' ');
        console.log(`[Browser Console ${msg.params.type}]`, text);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error(`[Browser EXCEPTION THROWN]`, JSON.stringify(msg.params.exceptionDetails, null, 2));
      }
    });

    console.log('[Step 1] Authenticating...');
    const loginRes = await fetch(`${VPS_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'vps182test@cavebound.local', password: 'testpass123' })
    });
    const loginData = await loginRes.json();
    console.log('[Step 1] Login response:', loginData.success);
    const token = loginData.data?.token;

    if (token) {
      await client.send('Network.setCookie', {
        name: 'colyseus_token',
        value: token,
        domain: VPS_HOST,
        path: '/'
      });
    }

    console.log('[Step 2] Navigating to /game...');
    await client.send('Page.navigate', { url: `${VPS_URL}/game` });
    await new Promise(r => setTimeout(r, 4000));

    if (token) {
      await client.evaluate(`
        localStorage.setItem('colyseus_token', ${JSON.stringify(token)});
        sessionStorage.removeItem('cavebound_manual_logout');
      `);
    }

    console.log('[Step 3] Looking for character list or enter button...');
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await client.evaluate(`
        (() => {
          const charRow = Array.from(document.querySelectorAll('div, tr, li')).find(d => d.textContent && d.textContent.includes('VpsHero182'));
          if (charRow) charRow.click();
          const enterBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('ENTRAR NO JOGO'));
          if (enterBtn) {
            enterBtn.click();
            return 'Clicked ENTRAR NO JOGO';
          }
          const hasCanvas = Boolean(document.querySelector('canvas'));
          const avatarBox = Boolean(document.querySelector('[data-testid="huntera-avatar-box"]'));
          const bodyText = (document.body ? document.body.innerText : '').slice(0, 200);
          return { hasCanvas, avatarBox, bodyText };
        })()
      `);
      console.log(`[Step 3] Poll ${i}:`, res);
      if (res === 'Clicked ENTRAR NO JOGO') {
        break;
      }
    }

    console.log('[Step 4] Waiting 8 seconds after entering game to capture state...');
    await new Promise(r => setTimeout(r, 8000));

    const finalState = await client.evaluate(`
      (() => {
        const canvases = Array.from(document.querySelectorAll('canvas')).map(c => ({
          width: c.width,
          height: c.height,
          style: c.getAttribute('style'),
          isConnected: c.isConnected
        }));
        return {
          canvases,
          avatarBox: Boolean(document.querySelector('[data-testid="huntera-avatar-box"]')),
          bodyText: (document.body ? document.body.innerText : '').slice(0, 300)
        };
      })()
    `);
    console.log('[Step 4] Final Game State:', JSON.stringify(finalState, null, 2));

    await client.takeScreenshot('game_screen_reproduced.png');

    client.close();
  } catch (err) {
    console.error('[Run Error]', err);
  } finally {
    edgeProc.kill();
  }
}

run();
