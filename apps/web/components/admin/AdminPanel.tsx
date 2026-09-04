'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/apps/web/auth/AuthProvider';
import { getBrowserSupabase } from '@/packages/auth/src/browser';
import type { GameUpdateRow } from '@/packages/auth/src/types';
import { slugifyUpdateTitle } from '@/packages/updates/src/slug';

interface UpdateDraft {
  id: string | null;
  title: string;
  summary: string;
  content: string;
  published: boolean;
  publishedAt: string | null;
}

const emptyDraft: UpdateDraft = { id: null, title: '', summary: '', content: '', published: false, publishedAt: null };

function rowToDraft(row: GameUpdateRow): UpdateDraft {
  return { id: row.id, title: row.title, summary: row.summary, content: row.content, published: row.published, publishedAt: row.published_at };
}

export function AdminPanel({ initialUpdates }: { initialUpdates: GameUpdateRow[] }) {
  const auth = useAuth();
  const [updates, setUpdates] = useState(initialUpdates);
  const [draft, setDraft] = useState<UpdateDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const { data, error } = await supabase
      .from('game_updates')
      .select('id, title, slug, summary, content, published_at, updated_at, published')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    setUpdates((data ?? []) as GameUpdateRow[]);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setMessage('Supabase não está configurado.');
      return;
    }
    const slug = slugifyUpdateTitle(draft.title);
    if (!slug) {
      setMessage('O título precisa gerar um slug válido.');
      return;
    }

    setBusy(true);
    setMessage(null);
    const payload = {
      title: draft.title.trim(),
      slug,
      summary: draft.summary.trim(),
      content: draft.content.trim(),
      published: draft.published,
      published_at: draft.published ? draft.publishedAt ?? new Date().toISOString() : null,
    };
    const result = draft.id
      ? await supabase.from('game_updates').update(payload).eq('id', draft.id)
      : await supabase.from('game_updates').insert(payload);

    if (result.error) {
      setMessage(result.error.code === '23505' ? 'Já existe uma atualização com este slug.' : result.error.message);
      setBusy(false);
      return;
    }
    await reload();
    setDraft(null);
    setMessage('Atualização salva.');
    setBusy(false);
  };

  const togglePublished = async (row: GameUpdateRow) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const publishing = !row.published;
    const { error } = await supabase.from('game_updates').update({
      published: publishing,
      published_at: publishing ? row.published_at ?? new Date().toISOString() : null,
    }).eq('id', row.id);
    if (error) setMessage(error.message);
    else await reload();
    setBusy(false);
  };

  const remove = async (row: GameUpdateRow) => {
    if (!window.confirm(`Excluir “${row.title}”? Esta ação não pode ser desfeita.`)) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.from('game_updates').delete().eq('id', row.id);
    if (error) setMessage(error.message);
    else await reload();
    setBusy(false);
  };

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link className="public-brand" href="/"><span>C</span><strong>CAVEBOUND</strong></Link>
        <div><span>ADMINISTRAÇÃO</span><b>{auth.viewer?.displayName}</b><Link href="/game">JOGO</Link><Link href="/">SITE</Link><button type="button" onClick={() => void auth.signOut()}>SAIR</button></div>
      </header>

      <section className="admin-content">
        <div className="admin-title-row">
          <div><span className="eyebrow">CONTEÚDO PÚBLICO</span><h1>Atualizações</h1><p>Crie rascunhos e publique notas que aparecem automaticamente na homepage.</p></div>
          <button className="primary-button" type="button" onClick={() => setDraft(emptyDraft)}>+ NOVA ATUALIZAÇÃO</button>
        </div>

        {message && <div className="admin-message" role="status">{message}</div>}

        {/* COLYSEUS GAME SERVER GM MONITOR SECTION */}
        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#1b222d', border: '1px solid #5a4b32', borderRadius: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <span className="eyebrow" style={{ color: '#d4a843' }}>COLLESEUS GAME SERVER</span>
              <h2 style={{ fontSize: '18px', color: '#fff', margin: '4px 0' }}>Painel do Game Server & GM Tools</h2>
              <p style={{ fontSize: '13px', color: '#8c8273', margin: 0 }}>
                Inspecione salas online, métricas de rede e envie comandos administrativos (GM).
              </p>
            </div>
            <a
              href="http://localhost:2567/colyseus"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(180deg, #ba8e54 0%, #7d5c2e 100%)',
                border: '1px solid #d4a843',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '12px',
                borderRadius: '4px',
                textDecoration: 'none',
              }}
            >
              Abrir @colyseus/monitor ↗
            </a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
            <div style={{ padding: '12px', background: '#11161d', border: '1px solid #2b3442', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#f3e5ab' }}>⚡ Teleportar GM (`/teleport`)</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>Mover GM para coordenadas (x, y, z) ou player específico.</div>
            </div>
            <div style={{ padding: '12px', background: '#11161d', border: '1px solid #2b3442', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#ff9999' }}>🚫 Expulsar / Kick (`/kick`)</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>Desconectar instantaneamente jogador da sala.</div>
            </div>
            <div style={{ padding: '12px', background: '#11161d', border: '1px solid #2b3442', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#ff6666' }}>🔨 Banir Conta (`/ban`)</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>Marcar is_banned = true no PostgreSQL via Prisma.</div>
            </div>
          </div>
        </div>

        <div className="admin-list" style={{ marginTop: '24px' }}>
          {updates.length === 0 && <div className="admin-empty">Nenhuma atualização cadastrada.</div>}
          {updates.map((update) => (
            <article key={update.id}>
              <span className={update.published ? 'publish-state published' : 'publish-state'}>{update.published ? 'PUBLICADO' : 'RASCUNHO'}</span>
              <div><h2>{update.title}</h2><p>{update.summary}</p><small>Slug: {update.slug}</small></div>
              <div className="admin-actions">
                <button type="button" onClick={() => setDraft(rowToDraft(update))}>EDITAR</button>
                <button type="button" disabled={busy} onClick={() => void togglePublished(update)}>{update.published ? 'DESPUBLICAR' : 'PUBLICAR'}</button>
                <button className="danger" type="button" disabled={busy} onClick={() => void remove(update)}>EXCLUIR</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {draft && (
        <div className="auth-backdrop" role="presentation">
          <section className="admin-editor" role="dialog" aria-modal="true" aria-labelledby="editor-title">
            <button className="modal-close" type="button" onClick={() => setDraft(null)} aria-label="Fechar">×</button>
            <span className="eyebrow">{draft.id ? 'EDITAR' : 'NOVA'} ATUALIZAÇÃO</span>
            <h2 id="editor-title">{draft.id ? draft.title : 'Registrar no diário'}</h2>
            <form className="admin-form" onSubmit={save}>
              <label>Título<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} minLength={3} maxLength={120} required /></label>
              <label>Resumo<textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} minLength={3} maxLength={320} rows={3} required /></label>
              <label>Conteúdo<textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} minLength={3} maxLength={20000} rows={10} required /></label>
              <label className="publish-check"><input type="checkbox" checked={draft.published} onChange={(event) => setDraft({ ...draft, published: event.target.checked })} /> Publicado</label>
              <div className="editor-actions"><button type="button" onClick={() => setDraft(null)}>CANCELAR</button><button className="primary-button" type="submit" disabled={busy}>{busy ? 'SALVANDO…' : 'SALVAR'}</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
