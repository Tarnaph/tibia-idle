# Configuração do Supabase para o Cavebound

O código não contém credenciais nem utiliza `service_role`. A integração começa a funcionar quando o projeto Supabase e as variáveis locais forem configurados.

## 1. Criar o projeto e aplicar o schema

1. Crie um projeto em <https://supabase.com/dashboard>.
2. Abra **SQL Editor** no projeto.
3. Execute integralmente `supabase/migrations/202609010001_account_auth_foundation.sql`.

A migration cria `profiles`, `game_updates`, triggers de profile/timestamp, grants mínimos e todas as policies de RLS.

## 2. Variáveis locais

Copie `.env.example` para `.env.local` e preencha:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Os valores ficam no painel do Supabase em **Project Settings → API** (ou no diálogo **Connect**, dependendo da versão do painel). Projetos antigos podem usar `NEXT_PUBLIC_SUPABASE_ANON_KEY`; o código aceita os dois nomes. Não use `service_role` em nenhuma variável `NEXT_PUBLIC_*`.

Reinicie `npm run dev` depois de alterar o ambiente.

## 3. E-mail e senha

Em **Authentication → Providers → Email**, mantenha Email habilitado. Defina no painel se novos usuários precisam confirmar o e-mail. Se a confirmação estiver ativa, inclua estas URLs em **Authentication → URL Configuration → Redirect URLs**:

```text
http://localhost:3000/auth/callback
https://SEU-DOMINIO/auth/callback
```

Defina também o **Site URL** de produção. O Cavebound nunca grava senhas em `profiles`; elas são processadas exclusivamente pelo Supabase Auth.

## 4. Google OAuth

1. No Google Auth Platform, crie/configure um projeto e a tela de consentimento.
2. Crie um OAuth Client do tipo **Web application**.
3. Em **Authorized JavaScript origins**, adicione `http://localhost:3000` e o domínio de produção.
4. Em **Authorized redirect URIs**, adicione a callback exibida em **Supabase → Authentication → Providers → Google**. Para um projeto hospedado ela normalmente segue `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
5. Copie o Google Client ID e Client Secret para o provider Google no painel do Supabase e ative-o.
6. Garanta que `http://localhost:3000/auth/callback` e a callback do site publicado estejam na lista de redirects permitidos do Supabase.

O Client Secret do Google fica somente no painel do Supabase, nunca no `.env.local` do frontend.

## 5. Criar o primeiro administrador

Cadastre o usuário normalmente pela landing. Depois, no SQL Editor do Supabase, execute uma única vez como proprietário do projeto, substituindo o e-mail:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'voce@exemplo.com'
);
```

Confirme que uma linha foi atualizada. Saia e entre novamente; o link **ADMIN** aparecerá. Usuários comuns não têm grant de `UPDATE` para a coluna `role`, então não podem executar essa promoção pela API pública.

## 6. Publicar atualizações

Entre com a conta admin, abra `/admin`, clique em **+ Nova atualização**, preencha título/resumo/conteúdo, marque **Publicado** e salve. A homepage consulta somente as linhas publicadas e mostra as cinco mais recentes por `published_at`.

## 7. Verificação opcional com Supabase CLI

Quando o CLI fizer parte do fluxo do projeto, aplique migrations e execute testes de banco em um ambiente local/staging antes de produção. Nesta fase os testes automatizados do repositório validam os guards e o contrato SQL estaticamente; eles não tentam criar um projeto Supabase nem usam credenciais falsas.
