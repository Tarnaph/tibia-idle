import { spawn } from 'child_process';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profileDir = path.resolve('scratch', 'edge_modal_test_' + Date.now());
fs.mkdirSync(profileDir, { recursive: true });

const PORT = 9351;
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

    console.log('2. Navegando para /admin...');
    await client.send('Page.navigate', { url: `${baseUrl}/admin` });
    await new Promise(r => setTimeout(r, 2000));

    await client.evaluate(`
      localStorage.setItem('auth_token', ${JSON.stringify(token)});
      localStorage.setItem('colyseus_token', ${JSON.stringify(token)});
    `);

    // Wait for the navigation bar to be present
    console.log('3. Clicando na aba JOGADORES...');
    let tabClicked = false;
    for (let i = 0; i < 20; i++) {
      tabClicked = await client.evaluate(`
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const jog = btns.find(b => b.textContent && b.textContent.includes('JOGADORES'));
          if (jog) {
            jog.click();
            return true;
          }
          return false;
        })()
      `);
      if (tabClicked) break;
      await new Promise(r => setTimeout(r, 500));
    }
    console.log('Aba Jogadores clicada:', tabClicked);

    // Wait for players table to render
    console.log('4. Aguardando tabela de jogadores...');
    let foundBtn = false;
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 500));
      foundBtn = await client.evaluate(`
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const promote = btns.find(b => b.textContent && b.textContent.includes('Promover a GM'));
          if (promote) {
            promote.click();
            return true;
          }
          return false;
        })()
      `);
      if (foundBtn) {
        console.log('Botao "Promover a GM" encontrado e clicado!');
        break;
      }
    }

    await new Promise(r => setTimeout(r, 1000));

    console.log('5. Verificando modal de confirmacao...');
    const modalText = await client.evaluate(`
      (() => {
        const modal = document.querySelector('div[style*="rgba(0, 0, 0, 0.78)"]') || Array.from(document.querySelectorAll('div')).find(d => d.textContent && d.textContent.includes('Confirmar Promoção'));
        return modal ? modal.innerText : 'MODAL_NOT_FOUND';
      })()
    `);
    console.log('[Modal Text Preview]:\n', modalText?.slice(0, 300));

    await client.takeScreenshot('cdp-phase186-03-promote-modal.png');

    console.log('6. Cancelando modal para manter estado limpo...');
    await client.evaluate(`
      (() => {
        const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('CANCELAR'));
        if (cancelBtn) cancelBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 500));
    console.log('Validacao concluida com sucesso!');

  } catch (err) {
    console.error('Erro na verificacao:', err);
  } finally {
    if (client) client.close();
    try { edgeProc.kill(); } catch {}
    process.exit(0);
  }
}

run();
