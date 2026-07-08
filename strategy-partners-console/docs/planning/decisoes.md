# Decisões fechadas — não reabrir sem confirmação explícita do usuário

Contexto completo em [`main.md`](./main.md). Cada item abaixo já foi decidido e confirmado pelo
usuário (Alceu Passos) durante o planejamento — trate como requisito, não como sugestão.

1. **Branding dos 5 agentes principais**: orquestrador = **CAIO** (não "Orbyx" — corrigido
   explicitamente pelo usuário). Especialistas: **MERKO** (M&A/Transações), **NOVAE** (Growth),
   **ASTEN** (Finanças), **TYCEN** (Transformação/Execução). Ver [`agentes.md`](./agentes.md)
   para o mapeamento completo dentro da frota de 27 agentes já existente.

2. **Mapeamento de identidade**: renomear in-place (nunca reordenar o array de
   `src/lib/agents.ts`) os agentes que já cumprem cada papel — Maestro→CAIO, Orbyx→MERKO,
   Quorum→ASTEN, Horizon→NOVAE, Metrics→TYCEN. Os ~22 agentes restantes viram **subagentes**,
   organizados pelas categorias já existentes no código (chat/vendas/segurança/financeiro/
   programação/conhecimento), cada um a serviço de um dos 5 principais.

3. **Estratégia de modelo — dois eixos ortogonais, ambos mantidos**:
   - **Eixo A (já existe, não mexer)**: o modo "Comparar" continua multi-provedor — DeepSeek +
     Gemini + Groq rodando em paralelo (`MULTIMODELO_SETUP.md`), comparando opiniões
     independentes de provedores diferentes. Não substituir por Claude.
   - **Eixo B (novo, adicionar)**: CAIO (orquestrador) → **Opus 4.8**; MERKO/NOVAE/ASTEN/TYCEN
     (persona/tom de conversa) → **Fable 5**; enxame de subagentes de execução (due diligence,
     extração de documento, cálculos) → **Sonnet 5**. Isso é uma dimensão diferente
     ("qual modelo Anthropic responde como qual agente"), não concorrente com o Eixo A.
   - Adicionar o provedor Anthropic atrás de uma feature flag (`USE_ANTHROPIC_TIERS`, desligada
     por padrão) para não quebrar o comportamento atual enquanto as chaves não estão
     provisionadas.

4. **RAG / dataroom**: Postgres + **pgvector**, self-hosted, na mesma VPS que já hospeda o
   projeto `semantix` — mas em **schema/banco Postgres próprio e isolado**, nunca compartilhado
   ou misturado com o schema do `semantix`. Embeddings via **Gemini** (já é um provedor em uso no
   projeto, tem endpoint nativo de embeddings — decisão fechada, não usar OpenAI/serviço
   terceiro de embeddings).

5. **Sem acoplamento em runtime com `semantix` ou `strategy`**: esses dois projetos são
   referência de código/marca **somente leitura**. Nunca criar chamada de API entre os projetos,
   banco de dados compartilhado, dashboard cruzado, ou dependência de deploy. Este console deve
   rodar, evoluir e ser implantado de forma 100% independente dos outros dois.

6. **Remoção da narrativa "Alceu Passos = Criador Supremo"**: o código atual (`chat/route.ts`,
   bloco `IDENTITY_GUARD`) e todos os arquivos `public/personas/PERSONA*.md` contêm uma história
   de origem tratando Alceu Passos como autoridade incondicional/divina sobre os agentes. Isso é
   um vetor de risco (qualquer um que alegue ser "Alceu Passos" em texto ganharia prioridade
   máxima). **Decisão: remover completamente** essa narrativa dos prompts de sistema — os agentes
   ficam focados só em conteúdo profissional de M&A, sem mitologia de fundador. Autoridade real
   de administrador vem exclusivamente de sessão autenticada (ver Fase 5 em
   [`fases.md`](./fases.md)), nunca de uma afirmação no texto do chat.

7. **Transição de autenticação — corte suave**: hoje o acesso ao console é um código diário
   compartilhado (cookie `sp_access`), sem usuários reais. A Fase 5 introduz login real
   (NextAuth + RBAC). Os dois sistemas devem conviver atrás de uma flag até que todos os usuários
   reais estejam cadastrados no novo sistema — **não fazer corte direto** (desligar o código
   diário de uma vez só) sem essa migração completa primeiro.

8. **Nome de marca exibido ao usuário**: **"PLAYGROUND STRATEGY PARTNER"** — em todo lugar
   visível ao usuário final (título da aba do navegador, cabeçalho do console, splash/vídeo de
   entrada, landing page, relatórios gerados). Os nomes de pasta/repo (`angrahub`,
   `strategy-partners-console`) continuam como identificadores técnicos internos, não mudam.

9. **Critério de qualidade de resposta (requisito de aceite, não estético)**: toda resposta de
   MERKO/ASTEN/TYCEN sobre valuation, estrutura de capital ou sinergia precisa mostrar a equação
   por trás do número (ver [`base-conhecimento.md`](./base-conhecimento.md)), nunca só o
   resultado. Os `systemPrompt` atuais em `src/lib/agents.ts` são de 1 linha só (ex.: "Você é
   Quorum, especialista financeiro...") — **isso precisa virar o DNA intelectual completo**
   (fundamentos teóricos, modelos mentais, protocolo de resposta) equivalente ao que já existe em
   `C:\Users\Alceu Passos\angra\strategy\asten.md` e `merko.md`, fundido com o rigor quantitativo
   do Anexo A. Sempre usar a camada de raciocínio mais profunda disponível para perguntas
   complexas de M&A/financeiro. A divergência entre modelos no modo Comparar é o próprio insight
   de maior valor — nunca esconder ou suavizar essa divergência na síntese.

10. **UI — modal de ação dos agentes por projeto**: quando a pergunta do usuário se referir a um
    projeto/mandato específico (não uma pergunta genérica solta), CAIO deve disparar um modal
    mostrando graficamente, ao vivo, quais agentes estão ativos naquele projeto, o que cada um
    está fazendo agora, e o handoff entre eles. Isso deve evoluir a infraestrutura visual já
    existente do modo Maestro (`ComparareView.tsx`/`TimelineView.tsx`/`SinteseView.tsx` e o
    estado já presente em `src/app/page.tsx`), não recriar um sistema de status paralelo do zero.

11. **HeroUI**: introduzir de forma escopada, só nas telas novas e pesadas em dados (admin,
    due diligence) — nunca envolver o app inteiro no tema do HeroUI, já que o design atual
    (Tailwind 4 + variáveis CSS customizadas) já tem identidade visual própria e funciona.
