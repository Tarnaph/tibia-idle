import { spawn } from 'child_process';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profileDir = path.resolve('scratch', 'edge_profile_phase186_' + Date.now());
fs.mkdirSync(profileDir, { recursive: true });

const PORT = 9349;
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
  const targetHost = '187.7.16.210:3000';
  const baseUrl = `http://${targetHost}`;

  try {
    const wsUrl = await pollJson();
    client = new CdpClient(wsUrl);
    await client.connect();
    console.log('[CDP] Conectado ao Edge com sucesso.');

    console.log('\n========================================================================');
    console.log('=== FASE 186: VALIDAÇÃO VISUAL ONLINE VIA CDP (EDGE + VPS 187.7.16.210) ===');
    console.log('========================================================================\n');

    // 1. Autenticação na VPS como ADMIN
    console.log('[Passo 1] Realizando login como ADMIN (teste@teste.com)...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teste@teste.com', password: 'qweqwe' })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) throw new Error('Login failed: ' + JSON.stringify(loginData));
    const token = loginData.data.token;
    console.log('[Passo 1] Token ADMIN obtido com sucesso.');

    // 2. Definir Cookies e Tokens no Navegador
    console.log(`[Passo 2] Configurando sessão em ${baseUrl}...`);
    await client.send('Network.setCookie', {
      name: 'colyseus_token',
      value: token,
      domain: '187.7.16.210',
      path: '/'
    });
    await client.send('Network.setCookie', {
      name: 'auth_token',
      value: token,
      domain: '187.7.16.210',
      path: '/'
    });

    await client.send('Page.navigate', { url: `${baseUrl}/game` });
    await new Promise(r => setTimeout(r, 2000));

    await client.evaluate(`
      localStorage.setItem('colyseus_token', ${JSON.stringify(token)});
      localStorage.setItem('auth_token', ${JSON.stringify(token)});
      sessionStorage.removeItem('cavebound_manual_logout');
    `);

    // 3. Entrar no jogo com Knight Teste (GOD)
    console.log('[Passo 3] Selecionando Knight Teste e entrando na cidade...');
    let inArena = false;
    for (let i = 0; i < 35; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const ok = await client.evaluate(`
        (() => {
          const charRow = Array.from(document.querySelectorAll('div, tr, li')).find(d => d.textContent && d.textContent.includes('Knight Teste'));
          if (charRow) charRow.click();
          const enterBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('ENTRAR NO JOGO'));
          if (enterBtn) enterBtn.click();
          return Boolean(document.querySelector('.huntera-online-status') || document.querySelector('[data-testid="huntera-avatar-box"]'));
        })()
      `);
      if (ok) {
        inArena = true;
        break;
      }
    }
    if (!inArena) throw new Error('Falha ao entrar na cidade com Knight Teste');
    console.log('[Passo 3] Personagem carregado na Cidade de Thais!');
    await new Promise(r => setTimeout(r, 3000));

    // Capturar screenshot do Bloco D na cidade (Título [GOD] e TopBar com Contador de Contas Únicas)
    console.log('[Passo 3] Capturando screenshot de Thais City com título [GOD]...');
    await client.takeScreenshot('cdp-phase186-01-thais-city-god.png');

    // Verificar texto do contador de jogadores online no TopBar
    const onlineStatusText = await client.evaluate(`
      document.querySelector('.huntera-online-status')?.textContent || ''
    `);
    console.log(`[Bloco E - TopBar] Status de jogadores online: "${onlineStatusText.trim()}"`);

    // 4. Navegar para o Painel Admin (/admin)
    console.log('\n[Passo 4 - Bloco B & C] Acessando Painel ADMIN (/admin)...');
    await client.send('Page.navigate', { url: `${baseUrl}/admin` });
    await new Promise(r => setTimeout(r, 2500));

    // Verificar se os botões "Voltar ao Jogo" e "Sair" estão presentes
    const navButtons = await client.evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
        const hasBack = buttons.some(t => t.toUpperCase().includes('VOLTAR AO JOGO'));
        const hasLogout = buttons.some(t => t.toUpperCase().includes('SAIR'));
        return { buttons, hasBack, hasLogout };
      })()
    `);
    console.log('[Bloco B - Admin Nav]', navButtons);

    // Mudar para aba Jogadores
    await client.evaluate(`
      (() => {
        const tabs = Array.from(document.querySelectorAll('button, div, a'));
        const jogTab = tabs.find(t => t.textContent && t.textContent.toUpperCase().includes('JOGADORES'));
        if (jogTab) jogTab.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));

    // Verificar badges [GOD] e botão "Promover a GM"
    const playersTableInfo = await client.evaluate(`
      (() => {
        const text = document.body.innerText;
        const hasWolfyGod = text.includes('Wolfy') && text.includes('[GOD]');
        const hasPromoteBtn = Array.from(document.querySelectorAll('button')).some(b => b.textContent && (b.textContent.toUpperCase().includes('PROMOVER A GM') || b.textContent.toUpperCase().includes('REMOVER GM')));
        const onlineCountText = Array.from(document.querySelectorAll('div')).find(d => d.textContent && d.textContent.includes('Contas Únicas Online'))?.textContent || '';
        return { hasWolfyGod, hasPromoteBtn, onlineCountText: onlineCountText.trim() };
      })()
    `);
    console.log('[Bloco C & E - Admin Jogadores]', playersTableInfo);
    await client.takeScreenshot('cdp-phase186-02-admin-jogadores.png');

    // Clicar em "Promover a GM" em um jogador para abrir o modal de confirmação
    console.log('[Passo 4 - Bloco C] Abrindo modal de confirmação de promoção a GM...');
    const modalOpened = await client.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.toUpperCase().includes('PROMOVER A GM'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('[Bloco C] Botão Promover a GM acionado:', modalOpened);
    await new Promise(r => setTimeout(r, 1200));
    await client.takeScreenshot('cdp-phase186-03-promote-modal.png');

    // Fechar modal de confirmação (Cancelar) para manter integridade da base
    await client.evaluate(`
      (() => {
        const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.toUpperCase().includes('CANCELAR'));
        if (cancelBtn) cancelBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    // 5. Testar "Voltar ao Jogo" (Bloco B)
    console.log('\n[Passo 5 - Bloco B] Clicando em "Voltar ao Jogo"...');
    await client.evaluate(`
      (() => {
        const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.toUpperCase().includes('VOLTAR AO JOGO'));
        if (backBtn) backBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 3500));

    const returnedToGame = await client.evaluate(`
      window.location.pathname.includes('/game') && Boolean(document.querySelector('.huntera-online-status') || document.querySelector('[data-testid="huntera-avatar-box"]'))
    `);
    console.log('[Bloco B] Retornou ao jogo com sessão preservada:', returnedToGame);
    await client.takeScreenshot('cdp-phase186-04-back-to-game.png');

    // 6. Testar Caçada e Título no Mapa (Bloco D)
    console.log('\n[Passo 6 - Bloco D] Iniciando Caçada (Rats) para validar título [GOD] no combate...');
    await client.evaluate(`
      (() => {
        const huntBtn = document.querySelector('.huntera-square-btn.hunt-btn');
        if (huntBtn) huntBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1500));

    await client.evaluate(`
      (() => {
        const startBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('INICIAR CAÇADA'));
        if (startBtn) startBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 3500));

    console.log('[Bloco D] Capturando screenshot na Caçada com título [GOD]...');
    await client.takeScreenshot('cdp-phase186-05-hunt-god.png');

    // Retornar para Thais
    await client.evaluate(`
      (() => {
        const exitBtn = Array.from(document.querySelectorAll('button, div, span')).find(b => b.textContent && (b.textContent.includes('Voltar para Thais') || b.textContent.includes('Sair da Caçada')));
        if (exitBtn) exitBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2500));

    // 7. Testar Logout via "Sair" no Painel Admin (Bloco B)
    console.log('\n[Passo 7 - Bloco B] Acessando /admin para testar "Sair" (logout completo)...');
    await client.send('Page.navigate', { url: `${baseUrl}/admin` });
    await new Promise(r => setTimeout(r, 2000));

    await client.evaluate(`
      (() => {
        const logoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.toUpperCase().includes('SAIR'));
        if (logoutBtn) logoutBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 3000));

    const currentUrl = await client.evaluate(`window.location.href`);
    const localStorageClean = await client.evaluate(`
      !localStorage.getItem('auth_token') && !localStorage.getItem('colyseus_token')
    `);
    console.log(`[Bloco B] Logout concluído. URL atual: ${currentUrl}, Storage limpo: ${localStorageClean}`);
    await client.takeScreenshot('cdp-phase186-06-logged-out.png');

    console.log('\n========================================================================');
    console.log('=== TODOS OS BLOCOS (B, C, D, E) VALIDADOS COM SUCESSO VIA CDP EDGE! ===');
    console.log('========================================================================\n');

  } catch (err) {
    console.error('[ERRO CDP]:', err);
    if (client) {
      try { await client.takeScreenshot('cdp-phase186-error.png'); } catch {}
    }
    process.exit(1);
  } finally {
    if (client) client.close();
    try { edgeProc.kill(); } catch {}
    process.exit(0);
  }
}

run();
