# Mapeamento de agentes — 5 principais + subagentes

Contexto completo em [`main.md`](./main.md); decisões relacionadas em [`decisoes.md`](./decisoes.md)
itens 1-2. Fonte primária: `src/lib/agents.ts` (27 agentes já implementados, lido na íntegra
durante o planejamento).

## Risco crítico antes de mexer em qualquer coisa

Os agentes em `src/lib/agents.ts` são um array, e a persona de cada um é resolvida por **posição
no array** (`PERSONA{index+1}.md` em `public/personas/`, via `buildPersonaContent` em
`src/lib/server/persona.ts`). **Nunca reordenar o array.** Renomear `id`/`name`/`systemPrompt`
in-place é seguro; mudar a posição de um agente reatribui silenciosamente o arquivo de persona de
outro agente.

Renomear os 4 ids que mudam (`orbyx`, `tesouro`, `estrategista`, `analista`) exige atualizar toda
referência hardcoded a esses ids fora de `agents.ts` — no momento do planejamento, o único lugar
encontrado foi `src/app/api/maestro-synthesis/route.ts` (usa `'maestro'` hardcoded). Fazer um grep
por `orbyx|tesouro|estrategista|analista|maestro` no repo inteiro antes e depois da mudança para
confirmar que não sobrou referência órfã.

## Os 5 agentes principais

| Principal | Agente-base existente | id atual → novo | modelAlias | Ajuste de persona necessário |
|---|---|---|---|---|
| **CAIO** | Maestro | `maestro` → `caio` | `angra.mt1` | Encaixe perfeito — já é descrito como "orquestração e síntese multi-agente", com roteamento dinâmico por especialização e agregação por consenso. Só renomear identidade/voz para CAIO; adicionar doutrina de handoff explícita (ver abaixo). |
| **MERKO** | Orbyx (agente já existente na frota de 27, categoria "conhecimento") | `orbyx` → `merko` | `angra.ob1` | Encaixe perfeito — já é "M&A Advisor: fusões, aquisições, valuation DCF/EV-EBITDA, due diligence, buy/sell-side, sinergias, turnaround distressed". Só renomear para MERKO. **Atenção**: o nome "Orbyx" usado aqui não tem relação com o "Orbyx" orquestrador do site público `strategy` — são conceitos diferentes em projetos diferentes; aqui vira MERKO e a ambiguidade desaparece. |
| **ASTEN** | Quorum | `tesouro` → `asten` | `angra.ts1` | Bom encaixe — já é "análise financeira: DCF/LBO/comparáveis, Monte Carlo, capital de giro/alavancagem, narrativa financeira executiva". Renomear + aprofundar persona com o conteúdo de WACC/CAPM/estrutura de capital de [`base-conhecimento.md`](./base-conhecimento.md). |
| **NOVAE** | Horizon | `estrategista` → `novae` | `angra.eg1` | Bom encaixe — já é "planejamento estratégico, cenários ponderados por probabilidade, inteligência competitiva, opções estratégicas, cascata OKR". Renomear + focar persona em crescimento/novos negócios/MVP (hoje o foco é mais amplo, "planejamento estratégico" genérico). |
| **TYCEN** | Metrics | `analista` → `tycen` | `angra.an1` | **Encaixe mais fraco dos 4** — hoje é só "BI/KPIs/dashboards". TYCEN precisa também de execução/PMO/turnaround, não só métricas. Expandir persona explicitamente para PMO, gestão de milestones, turnaround operacional (usar o "Plano 100 Dias" do projeto `semantix` — `C:\Users\Alceu Passos\angra\semantix\` — como referência de *conteúdo*, nunca copiar código). |

Fontes de conteúdo doutoral completo para portar (não recriar do zero): `C:\Users\Alceu Passos\
angra\strategy\caio.md`, `merko.md`, `novae.md`, `asten.md`, `tycen.md` — cada um já tem
fundamentos teóricos, modelos mentais e protocolo de resposta em nível doutoral. Fundir isso com o
rigor quantitativo de [`base-conhecimento.md`](./base-conhecimento.md) ao escrever os novos
`public/personas/PERSONA{N}.md` (índices: PERSONA23=CAIO, PERSONA27=MERKO, PERSONA10=ASTEN,
PERSONA22=NOVAE, PERSONA20=TYCEN — confirmar o índice exato lendo `agents.ts` no momento da
implementação, já que qualquer edição incidental de ordem do array muda esse número).

## Os ~22 restantes viram subagentes

Mesma categoria já existente no código (`chat`, `vendas`, `segurança`, `financeiro`,
`programação`, `conhecimento`) — não recriar categorias novas, só adicionar aos tipos um campo de
"a quem serve":

| Categoria | Subagentes (nome atual) | Serve o principal |
|---|---|---|
| conhecimento (infra/orquestração) | Router (Farol), Director (Curador), Anchor (Ancora) | **CAIO** — roteamento de intenção, governança/saúde da frota, RAG do dataroom (Anchor já promete "busca híbrida BM25+semântica" na sua persona — a Fase 2 de [`fases.md`](./fases.md) torna isso real) |
| conhecimento (M&A/legal/pesquisa) | Diligence (Auditor), Counsel (Jurista), Beacon (Pesquisador) | **MERKO** — due diligence financeira/jurídica, pesquisa de mercado |
| financeiro | Ledger (Contábil) | **ASTEN** — conciliação/BPO alimentando os modelos financeiros |
| conhecimento/vendas (crescimento) | Pitch (Vitrine), Chronicle (Redator) | **NOVAE** — proposta comercial, conteúdo para growth |
| programação | Forge (Forja), Codex (Revisor), Blueprint (Arquiteto), Pipeline (Estaleiro) | **TYCEN** — execução técnica de integração/transformação |
| chat | Relay (Maré), Consul (Brisa), Brief (Eco) | Todos — triagem/atendimento geral, primeira camada antes do roteamento de CAIO |
| vendas | Apex (Corsário), Titan (Negociador) | **NOVAE** / uso comercial geral |
| segurança | Aegis (Sentinela), Lex (Guardião), Sigma (Vigia) | Transversal — proteção de dados sensíveis do dataroom, compliance LGPD |
| conhecimento (idioma) | Lingua (Intérprete) | Transversal — bilíngue PT/EN em todos os módulos |

Implementação concreta (Fase 1 de [`fases.md`](./fases.md)): adicionar a `Agent` (em
`src/lib/types.ts`) os campos `tier: 'principal' | 'subagente'` e `servesPrincipal?: string`
(id do principal), e marcar todos os 27 agentes em `src/lib/agents.ts` de acordo com esta tabela.
Isso é o que já responde ao pedido original de "colocar os demais agentes na categoria
subagentes" — a estrutura de 27 agentes já existe, só precisa ganhar essa camada de metadado, não
ser recriada.
