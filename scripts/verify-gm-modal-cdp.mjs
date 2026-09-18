import { spawn } from 'child_process';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profileDir = path.resolve('scratch', 'edge_profile_modal_' + Date.now());
fs.mkdirSync(profileDir, { recursive: true });

const PORT = 9350;
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

    console.log('2. Acessando /admin...');
    await client.send('Page.navigate', { url: `${baseUrl}/admin` });
    await new Promise(r => setTimeout(r, 2000));

    await client.evaluate(`
      localStorage.setItem('auth_token', ${JSON.stringify(token)});
      localStorage.setItem('colyseus_token', ${JSON.stringify(token)});
    `);

    console.log('3. Indo para aba Jogadores...');
    await client.evaluate(`
      (() => {
        const navBtns = Array.from(document.querySelectorAll('nav button'));
        const jogTab = navBtns.find(b => b.textContent && b.textContent.includes('JOGADORES'));
        if (jogTab) {
          jogTab.click();
          jogTab.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      })()
    `);
    
    // Wait for the table to be visible
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      const hasTable = await client.evaluate(`!!document.querySelector('table')`);
      if (hasTable) {
        console.log('Tabela de jogadores carregada!');
        break;
      }
    }

    console.log('4. Clicando no botao Promover a GM...');
    const clicked = await client.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Promover a GM'));
        if (btn) {
          btn.click();
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return true;
        }
        return false;
      })()
    `);
    console.log('Botao clicado:', clicked);
    await new Promise(r => setTimeout(r, 1000));

    console.log('5. Capturando screenshot do modal de confirmacao...');
    await client.takeScreenshot('cdp-phase186-03-promote-modal.png');

    console.log('5b. Fechando modal clicando em CANCELAR...');
    await client.evaluate(`
      (() => {
        const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('CANCELAR'));
        if (cancelBtn) {
          cancelBtn.click();
          cancelBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 1000));

    console.log('6. Testando clique em Voltar ao Jogo...');
    await client.evaluate(`
      (() => {
        const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('VOLTAR AO JOGO'));
        if (backBtn) {
          backBtn.click();
          backBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      })()
    `);
    
    // Wait for /game to load and connect
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const curPath = await client.evaluate(`window.location.pathname`);
      if (curPath === '/game') {
        const hasCanvas = await client.evaluate(`!!document.querySelector('canvas')`);
        if (hasCanvas) {
          console.log('Canvas do jogo renderizado!');
          break;
        }
      }
    }

    const path = await client.evaluate(`window.location.pathname`);
    console.log('Path apos clicar em Voltar ao Jogo:', path);
    await new Promise(r => setTimeout(r, 2000));
    await client.takeScreenshot('cdp-phase186-04-back-to-game.png');

  } catch (err) {
    console.error(err);
  } finally {
    if (client) client.close();
    try { edgeProc.kill(); } catch {}
    process.exit(0);
  }
}

run();
