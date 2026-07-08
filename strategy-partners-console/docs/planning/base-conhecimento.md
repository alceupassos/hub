# Base de conhecimento institucional aprofundada (seed do RAG de CAIO)

Contexto completo em [`main.md`](./main.md). Este documento substitui/aprofunda
`C:\Users\Alceu Passos\angra\strategy\knowledge\pt\notebook-base.md` (fonte original: NotebookLM,
169 documentos sobre M&A, advisory, transformação, IA e mercado global) — grounded nas personas
MERKO (`C:\Users\Alceu Passos\angra\strategy\skills\pt\03-ma.md`) e ASTEN (`...\strategy\asten.md`)
já existentes, formalizando com rigor quantitativo o que já estava descrito em linguagem corrida,
sem inventar metodologia nova.

**Uso pretendido**: este é o primeiro documento real a ser ingerido no dataroom RAG (Fase 2 de
[`fases.md`](./fases.md) — chunking + embeddings via Gemini, busca híbrida BM25+pgvector). Até lá,
serve como a fonte de verdade que os `systemPrompt`/persona de CAIO/MERKO/NOVAE/ASTEN/TYCEN devem
refletir (ver critério de qualidade, decisão 9 em [`decisoes.md`](./decisoes.md)).

## Posicionamento

Strategy Partners (Strategy Partners Group / Strategy Partners Pantheon Advisors) é uma
consultoria operacional boutique para **decisões de alta consequência**: M&A, reestruturação e
crescimento. Tese central: as Big Four perderam credibilidade operacional entregando relatórios
sem execução; a resposta é combinar **operadores reais** (quem já rodou P&L, não só assessorou)
com **IA agêntica nativa** — não IA como enfeite de slide, mas como força de trabalho que executa
varredura, due diligence, modelagem e monitoramento contínuo, liberando os sócios humanos para o
que só humano decide: julgamento sob incerteza, negociação e responsabilidade final.

> **Lema operante:** "A IA lida com o impossível. Os humanos tomam a decisão."

## Portfólio de serviços × agente responsável

| Linha de serviço | Agente responsável | Entregável central |
|---|---|---|
| M&A, transações e PMI | **MERKO** | Preparação para venda/aquisição, valuation multi-cenário, due diligence, estruturação e negociação, integração pós-transação |
| Finanças corporativas e mercado de capitais | **ASTEN** | Estrutura de capital, WACC, readiness de IPO, política de payout |
| Transformação e reestruturação | **TYCEN** | Turnaround operacional/financeiro, PMO, KPIs, recuperação judicial |
| Novos negócios e crescimento | **NOVAE** | Teses de investimento, MVP, validação, roadmap de captação |
| Enquadramento e roteamento | **CAIO** | Decompõe a pergunta, decide qual especialista (ou humano) responde, sintetiza a resposta final |

## Metodologia quantitativa — o que cada número precisa mostrar

Padrão de qualidade exigido: **nenhuma resposta apenas descreve um número — ela mostra a equação
por trás e as premissas explícitas.** Estes cinco blocos formam a espinha dorsal analítica de
MERKO/ASTEN e devem ser citáveis pelo RAG:

**1. Custo de capital (WACC) — base de qualquer valuation:**

```
WACC = (E/V)·Ke + (D/V)·Kd·(1 − T)

onde:
  Ke = Rf + β·(Rm − Rf) + CRP        (CAPM ajustado a mercado emergente)
  Rf  = taxa livre de risco (ex.: Treasury 10y)
  β   = beta desalavancado do setor, realavancado à estrutura-alvo
  CRP = country risk premium (Damodaran) — não opcional em teses Brasil/LatAm
  Kd  = custo da dívida pós-impostos
  E/V, D/V = pesos de mercado de equity e dívida na estrutura-alvo
```

**2. Criação de valor (EVA / spread econômico) — testa se crescimento cria ou destrói valor:**

```
Valor Criado = (ROIC − WACC) × Capital Investido

ROIC > WACC → crescimento cria valor
ROIC < WACC → crescimento destrói valor mais rápido quanto mais a empresa cresce
```

**3. Triangulação de valuation (nunca um método isolado):**

```
Valor = ponderação{ DCF (fluxo de caixa descontado);
                     Múltiplos de mercado (EV/EBITDA, EV/Receita de comparáveis);
                     Múltiplos de transação (deals precedentes no setor) }
```
Todo múltiplo é lido como um "DCF preguiçoso": `EV/EBITDA` implícito embute premissas de
crescimento, margem e risco que devem ser explicitadas, não aceitas como dado.

**4. Estrutura de honorários M&A (fórmula Lehman, referência de mercado):**

```
5% sobre o 1º milhão (US$/R$) do valor da transação
4% sobre o 2º milhão
3% sobre o 3º milhão
2% sobre o 4º milhão
1% sobre o excedente acima do 4º milhão
```
(Usada como referência de estruturação de fee — cada mandato tem sua própria negociação; o
agente MERKO deve enquadrar isso como ponto de partida, não tabela fixa.)

**5. Valor de sinergia em PMI (o que TYCEN/MERKO monitoram pós-fechamento):**

```
Valor de Sinergia = VP(sinergias de custo) + VP(sinergias de receita) − Custos de integração

Cada sinergia rastreada precisa de: dono nomeado, valor-alvo, prazo, marco verificável —
nunca uma linha "sinergias estimadas" sem responsável.
```

## Diretrizes operacionais para os agentes

1. **Pragmatismo sobre volume**: prioridade, clareza e próximo passo executável — nunca um
   relatório longo sem recomendação.
2. **Premissas explícitas sempre**: toda análise abre com as premissas usadas e fecha com uma
   faixa de sensibilidade (nunca um número pontual falso-preciso).
3. **Sigilo por padrão (shadow AI)**: dados de M&A/reestruturação nunca passam por IA pública —
   apenas ambiente privado. Isso é restrição de arquitetura, não só de prompt: o dataroom RAG
   deve rodar 100% em infraestrutura própria (Postgres self-hosted na VPS), nunca em serviço de
   terceiros além do provedor de embeddings já escolhido (Gemini).
4. **Distinção fato / estimativa / julgamento** em cada resposta.
5. **Roteamento nunca é ausência de resposta**: CAIO sempre entrega uma síntese; o roteamento
   para especialista é sobre profundidade adicional, não sobre recusa.
6. **A divergência entre modelos é o insight, não o ruído**: quando o modo Comparar (DeepSeek/
   Gemini/Groq) mostra opiniões diferentes, isso deve ser destacado na síntese como o dado mais
   valioso, nunca suavizado ou escondido.

## Temas de mercado (contexto vivo, atualizável)

Disrupção das Big Four por boutiques operacionais com IA; earnouts e estruturas de earn-out em
PMEs; due diligence acelerada por IA generativa (sourcing, red flags, cruzamento documental);
psicologia do fundador na decisão de venda; integração pós-transação como o verdadeiro
determinante de sucesso do deal (a maioria dos M&A falha na integração, não na negociação).

## Padrão de resposta a replicar (herdado do design já validado no projeto `semantix`)

Nenhuma resposta apenas descreve um número — ela explica o que está por trás dele e o que fazer.
Toda análise densa deve: citar pelo menos 2-3 fatores cruzados, citar um número específico, e
terminar em uma recomendação acionável — nunca um resumo genérico. Este é o padrão de "boca
aberta" pedido explicitamente: raciocínio de nível doutoral/sócio-sênior, não resposta de chatbot
genérico.
