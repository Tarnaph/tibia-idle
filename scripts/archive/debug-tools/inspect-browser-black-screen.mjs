import { spawn } from 'child_process';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profileDir = path.resolve('scratch', 'edge_profile_blackscreen_' + Date.now());
fs.mkdirSync(profileDir, { recursive: true });

const PORT = 9355;
console.log(`[Setup] Spawning Microsoft Edge via CDP on port ${PORT}...`);

const edgeProc = spawn(edgePath, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  '--headless=new',
  '--window-size=1366,900',
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
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.pending.set(id, (res) => {
        if (res.error) reject(new Error(`${method} failed: ${JSON.stringify(res.error)}`));
        else resolve(res.result);
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  try {
    const wsUrl = await pollJson();
    console.log('[CDP] Connected to Edge CDP endpoint');
    const cdp = new CdpClient(wsUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');

    cdp.ws.on('message', data => {
      const msg = JSON.parse(data.toString());
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value ?? a.description ?? JSON.stringify(a)).join(' ');
        console.log(`[Browser Console ${msg.params.type}]`, text);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error(`[Browser Exception]`, msg.params.exceptionDetails);
      }
      if (msg.method === 'Log.entryAdded') {
        console.log(`[Browser Log ${msg.params.entry.level}]`, msg.params.entry.text);
      }
    });

    console.log('[CDP] Navigating to http://187.7.16.210:3000 ...');
    await cdp.send('Page.navigate', { url: 'http://187.7.16.210:3000' });

    await new Promise(r => setTimeout(r, 6000));

    // Check if there is an enter game / Jogar Agora button or character selection
    console.log('[CDP] Evaluating page DOM state...');
    const stateEval = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const html = document.body ? document.body.innerText : '';
        const hasCanvas = Boolean(document.querySelector('canvas'));
        const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText);
        return {
          title: document.title,
          buttons,
          textSample: html.slice(0, 300),
          hasCanvas
        };
      })()`,
      returnByValue: true
    });
    console.log('[CDP] Page DOM State:', JSON.stringify(stateEval.result?.value, null, 2));

    // Try clicking Jogar Agora or Enter Game if present
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const playBtn = btns.find(b => b.innerText.includes('Jogar') || b.innerText.includes('Entrar'));
        if (playBtn) {
          playBtn.click();
          return 'Clicked ' + playBtn.innerText;
        }
        return 'No play button found';
      })()`,
      returnByValue: true
    }).then(res => console.log('[CDP] Play Click Result:', res.result?.value));

    await new Promise(r => setTimeout(r, 6000));

    // Check DOM state again
    const postPlayEval = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const hasCanvas = Boolean(document.querySelector('canvas'));
        const canvases = Array.from(document.querySelectorAll('canvas')).map(c => ({ width: c.width, height: c.height, style: c.getAttribute('style') }));
        return {
          textSample: (document.body ? document.body.innerText : '').slice(0, 300),
          hasCanvas,
          canvases
        };
      })()`,
      returnByValue: true
    });
    console.log('[CDP] Post-Play DOM State:', JSON.stringify(postPlayEval.result?.value, null, 2));

    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/black_screen_evidence.png', Buffer.from(shot.data, 'base64'));
    console.log('[CDP] Screenshot saved to scratch/black_screen_evidence.png');

    cdp.close();
  } catch (err) {
    console.error('[CDP] Error:', err);
  } finally {
    edgeProc.kill();
  }
}

run();
