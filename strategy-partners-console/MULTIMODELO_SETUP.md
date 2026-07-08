# Frota multimodelo de verdade — DeepSeek + Gemini + Groq

Objetivo: sair de "1 modelo em fantasias" para **3 modelos independentes** (linhagens diferentes),
com prompts que **reduzem alucinação** em vez de forçá-la.

Os três falam o mesmo dialeto (`/chat/completions` compatível com OpenAI), então o código muda pouco.

---

## 1. O que pôr no `.env.local`

```bash
# ── DeepSeek (já tem) ─────────────────────────────────────────────
DEEPSEEK_API_KEY=sk-xxxxxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-reasoner

# ── Google Gemini ─────────────────────────────────────────────────
# Pegue a chave (grátis) em: https://aistudio.google.com/apikey
GEMINI_API_KEY=AIzaxxxxxxxx
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
GEMINI_MODEL=gemini-2.5-flash        # ou gemini-2.5-pro para mais qualidade

# ── Groq (Llama/GPT-OSS, grátis e rápido) ─────────────────────────
# 1) Crie conta em https://console.groq.com
# 2) Menu "API Keys" → "Create API Key" → copie o gsk_...
GROQ_API_KEY=gsk_xxxxxxxx
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=openai/gpt-oss-120b       # llama-3.3-70b-versatile foi descontinuado em jun/2026
```

> Os três endpoints são compatíveis com OpenAI: mesma rota `/chat/completions`,
> mesmo corpo `{ model, messages, max_tokens }`, só muda `baseURL`, `apiKey` e `model`.
> Ou seja: um único helper `callModel(provider, messages)` atende os três.

---

## 2. Prompt por modelo (substitui o de `agent-query`)

Trocas-chave vs. o atual: **ancoragem nos anexos**, permissão explícita de dizer
"não tenho dado", e fim do tamanho mínimo forçado (que era o que induzia invenção).

**System:**
```
Você é um analista estratégico sênior da Strategy Partners.
Responda com rigor de comitê executivo: preciso, sóbrio, sem floreio.

REGRAS DE FUNDAMENTAÇÃO (inquebráveis):
- Baseie toda afirmação factual ou numérica nos DOCUMENTOS DE CONTEXTO fornecidos.
- Se um dado não está no contexto, escreva "[sem dado no material]" — NUNCA invente número,
  valuation, data ou estatística.
- Separe claramente FATO (vem do material) de INFERÊNCIA (seu raciocínio) e de SUPOSIÇÃO.
- Se a pergunta não puder ser respondida com o material disponível, diga isso primeiro.
```

**User (template):**
```
PERGUNTA: {pergunta}

DOCUMENTOS DE CONTEXTO:
{trechos_relevantes_dos_anexos}     ← se vazio, escreva "Nenhum documento anexado."

Responda nesta estrutura, omitindo qualquer seção sem base no material:
1. Leitura do problema (1 parágrafo)
2. Evidências do material (cite o trecho/arquivo; se não houver, diga)
3. Riscos relevantes (só os que o material ou a lógica sustentam)
4. Recomendação + sua confiança (0–100%) e o PORQUÊ da confiança ser essa
Termine com: "Lacunas de dado:" listando o que falta para decidir melhor.
```

> Faça os 3 modelos responderem **a mesma pergunta com o mesmo contexto**, em paralelo.
> A confiança deve ser estimada pelo próprio modelo — não `Math.random()` (como está hoje).

---

## 3. Perguntas específicas por agente (é isto que aumenta a acurácia)

Você está certo: o salto de acurácia vem de **cada agente ter uma pergunta dirigida ao
que ele faz melhor**, em vez dos 3 recebendo a mesma pergunta genérica. Duas formas de fazer:

**(a) Especialização por agente** — cada agente recebe um recorte da pergunta:

```
Agente Risco     → "Liste só os riscos materiais desta decisão, com severidade e o trecho
                    do material que sustenta cada um. Sem riscos especulativos."
Agente Financeiro→ "Avalie só os números: valuation, fluxo, sensibilidade cambial.
                    Use apenas valores do material; marque o que faltar como [sem dado]."
Agente Timing    → "Avalie só o 'quando': janela, gatilhos, o que esperar antes de agir.
                    Aponte o dado que decidiria o timing."
```

Isso é melhor que uma pergunta única porque cada modelo foca, cita e erra menos — e a
divergência entre eles fica interpretável (cada um falando do seu eixo).

**(b) Decomposição automática** — antes de chamar a frota, um passo decompõe a pergunta
do usuário em 2–4 sub-perguntas dirigidas, e distribui uma para cada agente. Mais trabalho,
mas é o que dá precisão de consultoria.

Regra de ouro nos dois casos: **pergunta estreita + obrigação de citar a fonte = menos alucinação.**

---

## 4. Prompt de síntese (substitui o de `maestro-synthesis`)

O atual exige 700+ palavras, 6 seções fixas, matriz de risco e tabela de valuation
**sempre** — mesmo sem dado. Isso é fábrica de alucinação. O novo é **condicional** e
**rastreável**: só afirma o que veio dos 3 modelos, e expõe a discordância real entre eles.

**System:**
```
Você é o sintetizador estratégico da Strategy Partners. Recebe as análises de 3 modelos
INDEPENDENTES sobre a mesma pergunta e produz uma leitura consolidada para um C-level.

REGRAS:
- Use APENAS o que os 3 modelos disseram + os documentos de contexto. Não acrescente fatos novos.
- Quando os modelos DIVERGEM, isso é o sinal mais valioso: mostre quem disse o quê e por quê.
- Convergência só conta quando os modelos chegam lá por caminhos diferentes — sinalize isso.
- Não há tamanho mínimo. Seja tão curto quanto a evidência permitir.
- Toda recomendação carrega um nível de confiança e as condições em que ela muda.
- Se os 3 não dão base para uma recomendação segura, diga "Sem consenso suficiente" e explique.
```

**User (template):**
```
PERGUNTA: {pergunta}

ANÁLISE — Modelo A (DeepSeek):
{resposta_deepseek}

ANÁLISE — Modelo B (Gemini):
{resposta_gemini}

ANÁLISE — Modelo C (GPT-OSS / Groq):
{resposta_groq}

Produza a síntese nesta ordem, OMITINDO qualquer seção sem base:

## Recomendação
A diretriz única e acionável — OU "Sem consenso suficiente" se for o caso.
Inclua nível de confiança (0–100%) e em que condição a recomendação se inverteria.

## Onde os 3 concordam
Só pontos sustentados por ≥2 modelos. Diga quantos e quais.

## Onde divergem (o que mais importa)
Para cada divergência: qual modelo defende o quê, e qual dado decidiria a disputa.

## Riscos
Só os levantados pelos modelos ou pelo material. Marque os especulativos como tal.

## Lacunas de dado
O que falta no material para fechar a decisão com segurança.
```

> A "concordância 2/3" da tela passa a ser **calculada** a partir das posições reais dos
> 3 modelos — não mais hardcoded em `models.ts`.

---

## 5. O que ainda precisa mudar no código (pequeno)

1. `lib/models.ts`: os 3 cards apontam para `deepseek | gemini | groq` reais (e param de usar
   `stance/text/conf` fixos — esses viram resultado da chamada).
2. Um helper `callModel(provider, messages, maxTokens)` que injeta `baseURL/apiKey/model` por provider.
3. `agent-query`: dispara os 3 em `Promise.all`, cada um com sua pergunta dirigida (seção 3).
4. `maestro-synthesis`: recebe as 3 respostas e usa o prompt da seção 4.
5. Confiança real (vinda do texto do modelo), não `Math.random()`.
6. Decisão de marca: ou os rótulos da UI passam a ser "DeepSeek / Gemini / GPT-OSS",
   ou você assume modelos pagos (Claude/GPT) de verdade. Rotular DeepSeek como "Claude" é o risco.
