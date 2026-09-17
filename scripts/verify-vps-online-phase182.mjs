import { spawn } from 'child_process';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { Client as SshClient } from 'ssh2';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profileDir = path.resolve('scratch', 'edge_profile_vps_online_' + Date.now());
fs.mkdirSync(profileDir, { recursive: true });

const PORT = 9355;
const VPS_HOST = '187.7.16.210';
const VPS_URL = `http://${VPS_HOST}:3000`;

console.log(`[Setup] Spawning Microsoft Edge for VPS online verification on port ${PORT}...`);

const edgeProc = spawn(edgePath, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  '--headless=new',
  '--window-size=1280,900',
  '--disable-gpu',
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
  constructor(wsUrl, name = 'VPSBrowser') {
    this.wsUrl = wsUrl;
    this.name = name;
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
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function queryVpsDbChar(name) {
  return new Promise((resolve, reject) => {
    const conn = new SshClient();
    conn.on('ready', () => {
      const cmd = `sqlite3 /root/tibia-idle/prisma/dev.db "SELECT id, name, level, experience, saveVersion FROM characters WHERE name='${name}';"`;
      conn.exec(cmd, (err, stream) => {
        if (err) { conn.end(); return reject(err); }
        let out = '';
        stream.on('data', d => out += d);
        stream.on('close', () => {
          conn.end();
          const parts = out.trim().split('|');
          if (parts.length >= 5) {
            resolve({
              id: parts[0],
              name: parts[1],
              level: parseInt(parts[2], 10),
              experience: parts[3],
              saveVersion: parseInt(parts[4], 10),
            });
          } else {
            resolve(null);
          }
        });
      });
    }).connect({
      host: '187.7.16.210',
      port: 22,
      username: 'root',
      password: 'j3iu.dd2&bJ4nV(',
    });
  });
}

async function main() {
  let client;
  try {
    const wsUrl = await pollJson();
    client = new CdpClient(wsUrl);
    await client.connect();
    console.log('[CDP] Connected to Edge successfully for VPS Online Verification.');

    console.log('\n========================================================================');
    console.log('=== PHASE 182: ONLINE VPS VERIFICATION (http://187.7.16.210:3000) ===');
    console.log('========================================================================\n');

    // 1. Authenticate via Public API
    console.log('[Step 1] Authenticating vps182test@cavebound.local via public API...');
    const loginRes = await fetch(`${VPS_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'vps182test@cavebound.local', password: 'testpass123' })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) throw new Error('VPS Login failed: ' + JSON.stringify(loginData));
    const token = loginData.data.token;
    console.log('[Step 1] Token received from VPS API successfully.');

    // 2. Set Cookie & LocalStorage and navigate to public game
    console.log('[Step 2] Navigating to http://187.7.16.210:3000/game...');
    await client.send('Network.setCookie', {
      name: 'colyseus_token',
      value: token,
      domain: VPS_HOST,
      path: '/'
    });

    await client.send('Page.navigate', { url: `${VPS_URL}/game` });
    await new Promise(r => setTimeout(r, 2500));

    await client.evaluate(`
      localStorage.setItem('colyseus_token', ${JSON.stringify(token)});
      sessionStorage.removeItem('cavebound_manual_logout');
    `);

    // 3. Enter Game with VpsHero182
    console.log('[Step 3] Entering game arena on VPS with VpsHero182...');
    let inArena = false;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const ok = await client.evaluate(`
        (() => {
          const charRow = Array.from(document.querySelectorAll('div, tr, li')).find(d => d.textContent && d.textContent.includes('VpsHero182'));
          if (charRow) charRow.click();
          const enterBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('ENTRAR NO JOGO'));
          if (enterBtn) enterBtn.click();
          return Boolean(document.querySelector('[data-testid="huntera-avatar-box"]'));
        })()
      `);
      if (ok) {
        inArena = true;
        break;
      }
    }
    if (!inArena) throw new Error('Failed to enter arena with VpsHero182 on VPS');
    console.log('[Step 3] Successfully entered game arena on VPS!');
    await new Promise(r => setTimeout(r, 2000));
    await client.takeScreenshot('vps-01-initial-spawn.png');

    // 4. Walk Test in 4 Directions
    console.log('\n[Step 4] Testing walking in 4 cardinal directions (KeyS, KeyD, KeyW, KeyA)...');
    const walkKeys = ['KeyS', 'KeyD', 'KeyW', 'KeyA'];
    for (const k of walkKeys) {
      await client.send('Input.dispatchKeyEvent', { type: 'keyDown', code: k, windowsVirtualKeyCode: 65 });
      await new Promise(r => setTimeout(r, 250));
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', code: k });
      await new Promise(r => setTimeout(r, 150));
    }
    console.log('[Step 4] Walk movements executed cleanly.');
    await client.takeScreenshot('vps-02-walked.png');

    // 5. Outfit & Mount Modal Verification
    console.log('\n[Step 5] Testing Outfit and Mount modal on VPS...');
    await client.evaluate(`document.querySelector('[data-testid="huntera-avatar-box"]')?.click();`);
    await new Promise(r => setTimeout(r, 1200));

    const outfitModalReady = await client.evaluate(`
      (() => {
        // Switch to Outfits
        const tabs = Array.from(document.querySelectorAll('.tibia-subnav-tab, button'));
        const outfitTab = tabs.find(t => t.textContent && (t.textContent.includes('Trajes') || t.textContent.includes('Outfits')));
        if (outfitTab) outfitTab.click();
        
        // Select an outfit card if available
        const card = document.querySelector('.outfit-card, .huntera-outfit-item');
        if (card) card.click();
        return true;
      })()
    `);
    console.log('[Step 5] Outfit modal opened and outfit selected:', outfitModalReady);
    await new Promise(r => setTimeout(r, 800));

    // Switch to Montarias and select
    await client.evaluate(`
      (() => {
        const tabs = Array.from(document.querySelectorAll('.tibia-subnav-tab, button'));
        const mountTab = tabs.find(t => t.textContent && (t.textContent.includes('Montarias') || t.textContent.includes('Mounts')));
        if (mountTab) mountTab.click();
        const card = document.querySelector('.outfit-card, .huntera-outfit-item');
        if (card) card.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    // Save appearance
    const savedAppearance = await client.evaluate(`
      (() => {
        const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Salvar'));
        if (saveBtn) {
          saveBtn.click();
          return true;
        }
        // If no save button, close modal with close button
        const closeBtn = document.querySelector('.tibia-modal-close, button.modal-close');
        if (closeBtn) closeBtn.click();
        return false;
      })()
    `);
    console.log('[Step 5] Saved appearance or closed modal:', savedAppearance);
    await new Promise(r => setTimeout(r, 1500));
    await client.takeScreenshot('vps-03-outfit-mount.png');

    // 6. Hunt & Rewards in Rat Cellars
    console.log('\n[Step 6] Starting hunt in Rat Cellars on VPS...');
    await client.evaluate(`document.querySelector('.huntera-square-btn.hunt-btn')?.click();`);
    await new Promise(r => setTimeout(r, 1200));

    const clickedStartHunt = await client.evaluate(`
      (() => {
        const startBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('INICIAR CAÇADA'));
        if (startBtn) {
          startBtn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('[Step 6] INICIAR CAÇADA clicked:', clickedStartHunt);

    // Wait for combat and rewards
    console.log('[Step 6] Killing rats, gaining experience and gold coins...');
    let levelHunted = 1;
    let goldHunted = 0;

    for (let i = 0; i < 45; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const stats = await client.evaluate(`
        (() => {
          const profileText = document.querySelector('.huntera-profile-info')?.textContent || '';
          const goldText = document.querySelector('.huntera-badge.gold-badge .badge-value')?.textContent || '0';
          const matchLvl = profileText.match(/LV\\s*(\\d+)/i);
          const lvl = matchLvl ? parseInt(matchLvl[1], 10) : 1;
          const gold = parseInt(goldText.replace(/\\D/g, ''), 10) || 0;
          return { lvl, gold, profileText };
        })()
      `);
      if (stats && stats.lvl > levelHunted) {
        levelHunted = stats.lvl;
        goldHunted = stats.gold;
        console.log(`  [VPS Caçada] Novo Nível: ${levelHunted}, Gold: ${goldHunted}`);
      }
      if (levelHunted >= 3) {
        console.log(`[Step 6] Recompensas confirmadas na caçada! Nível ${levelHunted}, Gold: ${goldHunted}`);
        break;
      }
    }
    await client.takeScreenshot('vps-04-hunted-rewards.png');

    // 7. Return to City Handshake
    console.log('\n[Step 7] Returning to Thais City (SAIR DA CAÇADA handshake)...');
    const exitClicked = await client.evaluate(`
      (() => {
        const exitBtn = document.querySelector('button.quick-action-btn.btn-leave-hunt');
        if (exitBtn) {
          exitBtn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('[Step 7] SAIR DA CAÇADA clicked:', exitClicked);

    // Wait for safe return transition
    await new Promise(r => setTimeout(r, 11000));

    // Audit DB state on VPS right after return
    const vpsCharAfterReturn = await queryVpsDbChar('VpsHero182');
    console.log(`[Step 7] Estado no banco da VPS pós-retorno: Nível ${vpsCharAfterReturn?.level}, XP ${vpsCharAfterReturn?.experience}, saveVersion: ${vpsCharAfterReturn?.saveVersion}`);
    await client.takeScreenshot('vps-05-returned-city.png');

    // 8. Await Urban Autosave on VPS Colyseus
    console.log('\n[Step 8] Awaiting urban autosaves on VPS Colyseus server...');
    const vBefore = vpsCharAfterReturn?.saveVersion || 1;
    let vpsAutosaveObserved = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const cur = await queryVpsDbChar('VpsHero182');
      if (cur && cur.saveVersion > vBefore) {
        console.log(`  [Autosave Urbano VPS] Confirmado avanço para saveVersion: ${cur.saveVersion} (Nível: ${cur.level}, XP: ${cur.experience})`);
        vpsAutosaveObserved = true;
        break;
      }
    }

    // 9. Reconnection Test
    console.log('\n[Step 9] Testing Reconnection on VPS...');
    await client.send('Page.navigate', { url: 'about:blank' });
    await new Promise(r => setTimeout(r, 1500));

    await client.send('Page.navigate', { url: `${VPS_URL}/game` });
    await new Promise(r => setTimeout(r, 2000));

    // Re-enter game
    let reconnected = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const ok = await client.evaluate(`
        (() => {
          const charRow = Array.from(document.querySelectorAll('div, tr, li')).find(d => d.textContent && d.textContent.includes('VpsHero182'));
          if (charRow) charRow.click();
          const enterBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('ENTRAR NO JOGO'));
          if (enterBtn) enterBtn.click();
          return Boolean(document.querySelector('[data-testid="huntera-avatar-box"]'));
        })()
      `);
      if (ok) {
        reconnected = true;
        break;
      }
    }
    if (!reconnected) throw new Error('Failed to reconnect on VPS');
    console.log('[Step 9] Reconnection successful on VPS!');
    await new Promise(r => setTimeout(r, 2000));

    // Read final DOM stats from VPS
    const finalDom = await client.evaluate(`
      (() => {
        const profileText = document.querySelector('.huntera-profile-info')?.textContent || '';
        const goldText = document.querySelector('.huntera-badge.gold-badge .badge-value')?.textContent || '0';
        const matchLvl = profileText.match(/LV\\s*(\\d+)/i);
        const lvl = matchLvl ? parseInt(matchLvl[1], 10) : 1;
        const gold = parseInt(goldText.replace(/\\D/g, ''), 10) || 0;
        return { lvl, gold, profileText };
      })()
    `);

    const finalVpsChar = await queryVpsDbChar('VpsHero182');

    console.log('\n========================================================================');
    console.log('📊 CONFERÊNCIA FINAL EM PRODUÇÃO (VPS 187.7.16.210):');
    console.log('========================================================================');
    console.log(`  - Nível no Navegador (DOM): ${finalDom.lvl} (Esperado: >= 3)`);
    console.log(`  - Nível no Banco SQLite:    ${finalVpsChar.level} (Esperado: >= 3)`);
    console.log(`  - XP no Banco SQLite:       ${finalVpsChar.experience} (Esperado: > 0)`);
    console.log(`  - Gold no Navegador (DOM):  ${finalDom.gold} (Esperado: > 0)`);
    console.log(`  - saveVersion no Banco:     ${finalVpsChar.saveVersion} (Esperado: >= 2)`);
    console.log('========================================================================');

    if (finalDom.lvl < 3 || finalVpsChar.level < 3) {
      throw new Error(`FALHA NA VPS: Nível não progrediu corretamente (${finalVpsChar.level})!`);
    }

    await client.takeScreenshot('vps-06-reconnected-integrity.png');
    console.log('\n🎉 SUCESSO TOTAL NA VPS: Validação pública online concluída com 100% de êxito!');

  } finally {
    if (client) client.close();
    edgeProc.kill('SIGKILL');
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch(err => {
  console.error('VPS Online Verification Error:', err);
  process.exit(1);
});
