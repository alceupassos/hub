# Product

## Register

product

## Users

C-level executives (CEO, CFO, COO) making high-stakes strategic decisions. They run a question through multiple AI models simultaneously and need to compare responses, surface consensus, and act quickly. They are data-literate but time-constrained — they trust the synthesis but want the raw comparisons available. Context is attached as business documents (spreadsheets, PDFs).

## Product Purpose

Strategy Partners Console is a multi-model AI workspace for executive decision-making. It sends a strategic question to multiple LLMs in parallel (Claude, GPT, Gemini, Grok, …), lets the user compare model responses side-by-side, inspect a consolidated synthesis with recommendation, and review the execution timeline and metadata. The goal is faster, better-grounded strategic decisions by aggregating AI perspectives rather than relying on a single model.

## Brand Personality

Precise. Authoritative. Understated.

The tone is that of a trusted senior advisor: confident without being loud, data-forward without being clinical. Nothing decorative that doesn't earn its place.

## Anti-references

- Consumer chatbot interfaces (ChatGPT, Claude.ai) — too casual, too much whitespace, conversation-first
- Startup-y SaaS dashboards with gradient hero metrics and teal accents
- "AI SaaS cream" aesthetic: warm-tinted near-white backgrounds, rounded-everything, soft shadows
- News/analytics dashboards that feel like Bloomberg Terminal clones (too dark, too dense)

## Design Principles

1. **Signal over noise.** Every element visible earns its presence; decorative layers are cut.
2. **Confident defaults.** The UI makes smart choices (default tab = Compare, inspector open, 3 models on) so the executive never starts from zero.
3. **Executive clarity.** Information hierarchy is strict: synthesis first, then detail. Never bury the recommendation.
4. **Traceable.** Every synthesis links back to its source models; the user can always inspect the "why".
5. **Measured motion.** Transitions (inspector collapse, tab switch) confirm interactions without distracting.

## Accessibility & Inclusion

- WCAG AA minimum contrast on all text
- Interactive elements have visible focus states
- Inspector collapse has aria-label; tab control uses proper button semantics
- Reduced-motion: transitions use `prefers-reduced-motion: reduce` override
