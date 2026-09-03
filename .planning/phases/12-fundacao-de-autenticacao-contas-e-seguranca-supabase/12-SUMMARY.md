---
phase: 12-fundacao-de-autenticacao-contas-e-seguranca-supabase
plan: 01
subsystem: auth-and-security
tags: [supabase-auth, google-oauth, rls, postgresql, admin-panel, updates]
provides:
  - Integração com Supabase Auth (Email/Senha e Google OAuth com fluxo seguro PKCE)
  - Schema PostgreSQL com tabelas `profiles` e `game_updates`
  - Políticas de segurança Row Level Security (RLS) impedindo elevação de privilégios de role
  - Painel administrativo `/admin` para postagem e gerenciamento de notícias e atualizações
  - Guarda de rota `/game` redirecionando visitantes não autenticados
  - Rota de desenvolvimento `/game-preview` liberando acesso direto ao protótipo sem exigir Supabase
tech-stack:
  added: [@supabase/ssr, @supabase/supabase-js]
  patterns: [pkce-oauth, row-level-security, development-preview-fallback]
key-files:
  created:
    - supabase/migrations/202609010001_account_auth_foundation.sql
    - packages/auth/src/index.ts
    - packages/updates/src/server.ts
    - app/game/page.tsx
    - app/game-preview/page.tsx
    - app/admin/page.tsx
    - tests/auth-foundation.test.ts
completed: 2026-09-02
---

# Phase 12: Fundação de Autenticação, Contas e Segurança (Supabase) Summary

Implementação da camada de autenticação, contas, segurança com Row Level Security (RLS), gerenciamento de notícias e rota preview.

## Realizações
- Criada migration SQL completa com `profiles`, `game_updates`, triggers automáticos de criação de perfil e políticas estritas de RLS.
- Garantido que a coluna `role` nunca receba grant de `UPDATE` para clientes públicos, prevenindo invasões de permissão de admin.
- Integrado Supabase Auth com suporte a Email e Google OAuth através de troca de código PKCE em `/auth/callback`.
- Criado painel `/admin` restrito a contas com `role = 'admin'` para publicação de notas de atualização do jogo.
- Landing page pública com listagem das 5 atualizações mais recentes e diálogo modal de login/cadastro.
- Criada a rota de desenvolvimento `/game-preview` permitindo testes e jogo imediato sem necessidade de configuração do Supabase localmente.
- Testes automatizados cobrindo autorização de rotas, ordenação de updates, slugs seguros e conformidade com RLS (`tests/auth-foundation.test.ts`).
