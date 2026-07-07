# Deploy — PLAYGROUND STRATEGY PARTNER

Domínio de produção: **`hub.strategypartners.com.br`** (alias: `angrahub.angra.io`).
Stack: Next.js 16 (standalone) em Docker, atrás de **Caddy** (HTTPS automático via Let's Encrypt),
na **mesma VPS** do projeto `semantix` — Postgres compartilhado como instância, **schema isolado
`strategy_partners`** (nunca o schema do `semantix`).

> O certificado TLS é emitido e renovado **automaticamente pelo Caddy**. Não há certbot manual:
> assim que o DNS de `hub.strategypartners.com.br` apontar para o IP da VPS e as portas 80/443
> estiverem abertas, o Caddy provisiona o cert no primeiro acesso.

## 0. Pré-requisitos (uma vez)
- VPS com Docker + Docker Compose e um **Caddy** já rodando como reverse proxy na rede Docker
  externa `angrahub_default` (o mesmo que serve os outros apps).
- **DNS**: criar registro **A** `hub.strategypartners.com.br → <IP_DA_VPS>` (e abrir 80/443 no firewall).
- Postgres da VPS acessível; extensão pgvector habilitada no banco:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```

## 1. Variáveis de ambiente
Na VPS, crie `strategy-partners-console/.env.production` a partir de `.env.production.example`
(NÃO commitar — está no `.gitignore`/`.dockerignore`). Mínimo para subir:
- `DEEPSEEK_API_KEY` — chat funciona só com isso (login via código diário; dealflow em modo demo).

Para funcionalidades completas:
- `DATABASE_URL=postgresql://user:senha@host:5432/strategy_partners` (schema isolado)
- `GEMINI_API_KEY` (embeddings do RAG/dataroom)
- `ANTHROPIC_API_KEY` + `USE_ANTHROPIC_TIERS=true` (opcional — camada Opus/Fable/Sonnet)
- `AUTH_SECRET` (NextAuth) — gere com `openssl rand -base64 32`
- `ADMIN_BOOTSTRAP_TOKEN` — para criar o 1º admin
- `LEGACY_DAILY_CODE_AUTH=true` (mantém o código diário durante a migração — decisão 7)

## 2. Migrações do banco (só com DATABASE_URL)
```bash
cd strategy-partners-console
DATABASE_URL="postgresql://..." npx drizzle-kit migrate   # aplica migrations/0000..0003
# confirmar no psql que os schemas coexistem, independentes:
#   \dn   → deve listar 'semantix' E 'strategy_partners'
```

## 3. Subir o container
```bash
cd strategy-partners-console
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f console   # acompanhar healthcheck
```
O serviço `console` entra na rede `angrahub_default` e expõe internamente `console:3000`.

## 4. Reverse proxy + certificado (Caddy)
O `Caddyfile` deste repo já tem o bloco de `hub.strategypartners.com.br, angrahub.angra.io`.
Aplique-o ao Caddy compartilhado da VPS e recarregue:
```bash
# se o Caddyfile é montado no container do Caddy:
docker exec <caddy_container> caddy reload --config /etc/caddy/Caddyfile
```
No primeiro acesso a `https://hub.strategypartners.com.br`, o Caddy emite o certificado
automaticamente (requer DNS já apontado + 80/443 abertas).

## 5. Verificação (go-live)
```bash
curl -I https://hub.strategypartners.com.br            # 200/302 + HSTS
echo | openssl s_client -connect hub.strategypartners.com.br:443 -servername hub.strategypartners.com.br 2>/dev/null | openssl x509 -noout -issuer -dates
```
Primeiro admin (só com DB + token):
```bash
curl -X POST https://hub.strategypartners.com.br/api/admin/bootstrap \
  -H 'Content-Type: application/json' \
  -d '{"token":"<ADMIN_BOOTSTRAP_TOKEN>","email":"admin@strategypartners.com.br","name":"Admin","password":"<senha forte>"}'
```
Depois: logar em `/login` (modo email+senha) → `/admin`.

## 6. Rollback
```bash
docker compose -f docker-compose.prod.yml down
# subir a imagem/tag anterior, ou:
git checkout <commit-anterior> && docker compose -f docker-compose.prod.yml up -d --build
```

## Notas
- Marca exibida ao usuário: **PLAYGROUND STRATEGY PARTNER**; nomes de pasta/repo permanecem técnicos.
- Sem acoplamento em runtime com `semantix`/`strategy` (sem API/banco/deploy compartilhado além da
  instância Postgres, em schema separado).
- Sem `DATABASE_URL`, as rotas de dados degradam graciosamente (503/fallback demo) — o app sobe mesmo assim.
