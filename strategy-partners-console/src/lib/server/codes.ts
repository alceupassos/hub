import 'server-only'

// ─────────────────────────────────────────────────────────────────────────────
// Autenticação por "código diário" — APOSENTADA (Fase A · segurança).
//
// A antiga tabela anual de 365 códigos em texto puro e os dois códigos permanentes
// de desenvolvedor eram um BACKDOOR: qualquer pessoa com acesso ao código (ou ao
// código-fonte) entrava na plataforma sem sessão autenticada — inaceitável para um
// sistema que hospeda deals confidenciais de M&A.
//
// O ÚNICO caminho de autenticação suportado agora é NextAuth (email + senha, RBAC).
// Estas funções são mantidas apenas para não quebrar imports existentes
// (`/api/access/verify`) e SEMPRE negam acesso.
// ─────────────────────────────────────────────────────────────────────────────

/** Aposentado: nunca concede acesso. Autenticação real é via NextAuth. */
export function validateCode(_submitted: string): boolean {
  return false
}

/** Chave de data BR (mantida por compatibilidade; o cookie legado não é mais honrado). */
export function getTodayKey(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}
