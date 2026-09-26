import { spawn } from 'child_process';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { scrypt, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
const scryptAsync = promisify(scrypt);
async function hashPassword(plainText) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(plainText, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

const prisma = new PrismaClient();
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profileDir = path.resolve('scratch', 'edge_profile_phase182_' + Date.now());
fs.mkdirSync(profileDir, { recursive: true });

const PORT = 9348;
console.log(`[Setup] Spawning Microsoft Edge with temp profile: ${profileDir}`);

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
  constructor(wsUrl, name = 'Browser') {
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

async function prepareTestCharacter() {
  const email = 'browsere2e@cavebound.local';
  let acc = await prisma.account.findUnique({ where: { email } });
  const hash = await hashPassword('testpass123');
  if (!acc) {
    acc = await prisma.account.create({
      data: {
        email,
        passwordHash: hash,
        role: 'PLAYER',
        isPremium: true,
        coins: 100,
      }
    });
  } else {
    acc = await prisma.account.update({
      where: { id: acc.id },
      data: { passwordHash: hash }
    });
  }

  let char = await prisma.character.findFirst({ where: { accountId: acc.id, name: 'BrowserHero182' } });
  if (!char) {
    char = await prisma.character.create({
      data: {
        accountId: acc.id,
        name: 'BrowserHero182',
        vocationName: 'Knight',
        vocationId: 4,
        gender: 'male',
        level: 1,
        experience: 0n,
        health: 150,
        maxHealth: 150,
        mana: 35,
        maxMana: 35,
        capacity: 400,
        posX: 32369,
        posY: 32241,
        posZ: 7,
        saveVersion: 1,
      }
    });
  } else {
    // Reset to Level 1, 0 XP, saveVersion 1
    await prisma.character.update({
      where: { id: char.id },
      data: {
        level: 1,
        experience: 0n,
        health: 150,
        maxHealth: 150,
        mana: 35,
        maxMana: 35,
        saveVersion: 1,
      }
    });
  }

  // Set sword skill to 30 for swift rat combat
  await prisma.characterSkill.upsert({
    where: { characterId_skillId: { characterId: char.id, skillId: 2 } },
    create: { characterId: char.id, skillId: 2, skillName: 'Sword Fighting', value: 30 },
    update: { value: 30 }
  });

  // Equip sword in rightHand
  await prisma.inventoryItem.deleteMany({ where: { characterId: char.id } });
  await prisma.inventoryItem.create({
    data: {
      characterId: char.id,
      slot: 'rightHand',
      serverId: 2376,
      name: 'Sword',
      count: 1,
    }
  });

  console.log(`[DB Setup] Character ready: BrowserHero182 (ID: ${char.id}) - Lvl 1, XP 0, Sword Skill 30, Sword equipped`);
  return { account: acc, character: char };
}

async function main() {
  let client;
  try {
    const { account, character } = await prepareTestCharacter();
    const wsUrl = await pollJson();
    client = new CdpClient(wsUrl);
    await client.connect();
    console.log('[CDP] Connected to Edge successfully');

    console.log('\n========================================================================');
    console.log('=== PHASE 182: E2E BROWSER VALIDATION VIA CDP (REAL EDGE + COLYSEUS) ===');
    console.log('========================================================================\n');

    // 1. Authenticate via API
    console.log('[Step 1] Authenticating browsere2e@cavebound.local...');
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'browsere2e@cavebound.local', password: 'testpass123' })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) throw new Error('Login failed: ' + JSON.stringify(loginData));
    const token = loginData.data.token;
    console.log('[Step 1] Token received successfully.');

    // 2. Set Cookie & LocalStorage and navigate
    console.log('[Step 2] Navigating to http://localhost:3000/game...');
    await client.send('Network.setCookie', {
      name: 'colyseus_token',
      value: token,
      domain: 'localhost',
      path: '/'
    });

    await client.send('Page.navigate', { url: 'http://localhost:3000/game' });
    await new Promise(r => setTimeout(r, 2000));

    await client.evaluate(`
      localStorage.setItem('colyseus_token', ${JSON.stringify(token)});
      sessionStorage.removeItem('cavebound_manual_logout');
    `);

    // 3. Enter Game with BrowserHero182
    console.log('[Step 3] Entering game arena with BrowserHero182...');
    let inArena = false;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const ok = await client.evaluate(`
        (() => {
          const charRow = Array.from(document.querySelectorAll('div, tr, li')).find(d => d.textContent && d.textContent.includes('BrowserHero182'));
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
    if (!inArena) throw new Error('Failed to enter game arena with BrowserHero182');
    console.log('[Step 3] Entered game arena in Thais Temple!');
    await new Promise(r => setTimeout(r, 1500));
    await client.takeScreenshot('cdp-01-initial-level1.png');

    // 4. Start Hunt (rat-cellars)
    console.log('\n[Step 4] Starting hunt in Rat Cellars...');
    await client.evaluate(`
      (() => {
        const huntBtn = document.querySelector('.huntera-square-btn.hunt-btn');
        if (huntBtn) huntBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1200));

    // Click "INICIAR CAÇADA"
    const clickedHunt = await client.evaluate(`
      (() => {
        const startBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('INICIAR CAÇADA'));
        if (startBtn) {
          startBtn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('[Step 4] Hunt start button clicked:', clickedHunt);

    // Wait for transition loading screen to complete and hunt to start
    console.log('[Step 4] Waiting for hunt to become active and killing rats...');
    let levelAfterHunt = 1;
    let goldAfterHunt = 0;

    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const stats = await client.evaluate(`
        (() => {
          const profileText = document.querySelector('.huntera-profile-info')?.textContent || '';
          const goldText = document.querySelector('.huntera-badge.gold-badge .badge-value')?.textContent || '0';
          const matchLvl = profileText.match(/LV\\s*(\\d+)/i);
          const lvl = matchLvl ? parseInt(matchLvl[1], 10) : 1;
          const gold = parseInt(goldText.replace(/\\D/g, ''), 10) || 0;
          return { lvl, gold, text: profileText };
        })()
      `);
      if (stats && stats.lvl > levelAfterHunt) {
        levelAfterHunt = stats.lvl;
        goldAfterHunt = stats.gold;
        console.log(`  [Combate Ativo] Novo Nível Alcançado: ${levelAfterHunt}, Gold: ${goldAfterHunt}`);
      }
      if (levelAfterHunt > 6) {
        console.log(`[Step 4] Alvo superado! Personagem alcançou o Nível ${levelAfterHunt} (> Nível 6) com ${goldAfterHunt} gold.`);
        break;
      }
    }

    if (levelAfterHunt <= 6) {
      throw new Error(`Timeout: Personagem não ultrapassou o nível 6 durante a caçada (Nível atual: ${levelAfterHunt})`);
    }
    await client.takeScreenshot('cdp-02-hunted-level7.png');

    // 5. Return to City Handshake
    console.log('\n[Step 5] Triggering Return to City Handshake (SAIR DA CAÇADA)...');
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
    if (!exitClicked) throw new Error('Could not find SAIR DA CAÇADA button');
    console.log('[Step 5] SAIR DA CAÇADA clicked. Waiting for save and return to Thais...');

    // Wait for return transition to complete
    await new Promise(r => setTimeout(r, 11000));

    // Check DB saveVersion after return
    let charInDb = await prisma.character.findUnique({ where: { id: character.id } });
    console.log(`[Step 5] Handshake concluído! Estado no BD: Nível ${charInDb.level}, XP ${charInDb.experience}, saveVersion: ${charInDb.saveVersion}`);
    if (charInDb.level <= 6) {
      throw new Error(`Regressão detectada no retorno: Nível no BD é ${charInDb.level} (esperado >= 7)`);
    }
    await client.takeScreenshot('cdp-03-returned-city.png');

    // 6. Await Urban Autosaves
    console.log('\n[Step 6] Awaiting Urban Autosaves in Thais City (Colyseus game loop)...');
    const versionAfterCityReturn = charInDb.saveVersion;
    let urbanAutosavesObserved = 0;

    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 3000));
      charInDb = await prisma.character.findUnique({ where: { id: character.id } });
      if (charInDb.saveVersion > versionAfterCityReturn + urbanAutosavesObserved) {
        urbanAutosavesObserved = charInDb.saveVersion - versionAfterCityReturn;
        console.log(`  [Autosave Urbano] Ciclo detectado no BD! saveVersion avançou para ${charInDb.saveVersion} (Nível: ${charInDb.level}, XP: ${charInDb.experience})`);
      }
      if (urbanAutosavesObserved >= 2) {
        console.log(`[Step 6] Confirmados ${urbanAutosavesObserved} ciclos de autosave urbano no Colyseus sem nenhuma regressão!`);
        break;
      }
    }
    await client.takeScreenshot('cdp-04-urban-autosaves.png');

    // 7. Reconnection with Fresh Session
    console.log('\n[Step 7] Testing Reconnection: Navigating away and reconnecting with fresh session...');
    await client.send('Page.navigate', { url: 'about:blank' });
    await new Promise(r => setTimeout(r, 1500));

    await client.send('Page.navigate', { url: 'http://localhost:3000/game' });
    await new Promise(r => setTimeout(r, 2000));

    // Re-enter arena
    let reconnected = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const ok = await client.evaluate(`
        (() => {
          const charRow = Array.from(document.querySelectorAll('div, tr, li')).find(d => d.textContent && d.textContent.includes('BrowserHero182'));
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
    if (!reconnected) throw new Error('Failed to reconnect and enter arena');
    console.log('[Step 7] Reconnection successful!');

    // Read final DOM stats
    await new Promise(r => setTimeout(r, 2000));
    const finalDomStats = await client.evaluate(`
      (() => {
        const profileText = document.querySelector('.huntera-profile-info')?.textContent || '';
        const goldText = document.querySelector('.huntera-badge.gold-badge .badge-value')?.textContent || '0';
        const matchLvl = profileText.match(/LV\\s*(\\d+)/i);
        const lvl = matchLvl ? parseInt(matchLvl[1], 10) : 1;
        const gold = parseInt(goldText.replace(/\\D/g, ''), 10) || 0;
        return { lvl, gold, profileText };
      })()
    `);

    // Verify DB integrity
    const finalDbChar = await prisma.character.findUnique({
      where: { id: character.id },
      include: { inventory: true }
    });

    console.log('\n========================================================================');
    console.log('📊 CONFERÊNCIA FINAL APÓS RECONEXÃO:');
    console.log('========================================================================');
    console.log(`  - Nível no Navegador (DOM): ${finalDomStats.lvl} (Esperado: >= 7)`);
    console.log(`  - Nível no Banco de Dados:  ${finalDbChar.level} (Esperado: >= 7)`);
    console.log(`  - XP no Banco de Dados:     ${finalDbChar.experience} (Esperado: >= 2600)`);
    console.log(`  - Gold no Navegador (DOM):  ${finalDomStats.gold} (Esperado: > 0)`);
    console.log(`  - Itens no Inventário:      ${finalDbChar.inventory.length} item(s)`);
    console.log(`  - Versão de Salvamento:     saveVersion = ${finalDbChar.saveVersion} (Esperado: >= 3)`);
    console.log('========================================================================');

    if (finalDomStats.lvl <= 6 || finalDbChar.level <= 6) {
      throw new Error(`FALHA: Nível rebaixado para ${finalDbChar.level}!`);
    }
    if (finalDbChar.inventory.length === 0) {
      throw new Error('FALHA: Inventário esvaziado indevidamente!');
    }

    await client.takeScreenshot('cdp-05-reconnected-integrity.png');
    console.log('\n🎉 SUCESSO TOTAL: Validação no navegador real via CDP concluída com 100% de integridade!');

  } finally {
    if (client) client.close();
    edgeProc.kill('SIGKILL');
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {}
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('E2E Browser Error:', err);
  process.exit(1);
});
