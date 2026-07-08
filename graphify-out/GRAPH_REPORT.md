# Graph Report - .  (2026-07-07)

## Corpus Check
- Large corpus: 504 files · ~220,716 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 971 nodes · 1274 edges · 93 communities (84 shown, 9 thin omitted)
- Extraction: 72% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 350 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- SSO & OIDC Authentication
- OpenAI-Compatible Providers
- Changelog: Model Releases
- Architecture & Contribution Guides
- Model List & Reasoning Features
- Agent Tasks & Gateway
- Object Storage & Embeddings
- JSON Schema Definitions
- Auth Provider Configuration
- Dev Tooling & Linting
- Layered Architecture & Data Flow
- LLM Provider Guides (AI21/302/360)
- Database Deployment (Docker)
- Bot Platform & Connectors
- Email Service & Better Auth
- Provider API Key Setup
- Major LLM Providers
- Auth Migration (Clerk→Better Auth)
- Messaging Channels (LINE/QQ/WeChat)
- UI Appearance & Misc Providers
- Deployment & Online Search
- Changelog: DeepSeek R1 & CoT
- Multimodal Generation & Pages
- Image Generation (FLUX/ComfyUI)
- Cloud Sandbox & Scheduled Tasks
- Messaging Channels (Discord/Feishu)
- Bot Usage on Platforms
- Changelog: Server DB & Flags
- Agent Builder & Memory
- Glossary Concepts
- Observability & Monitoring
- Claude Code & Codex
- Changelog: Custom Providers
- Provider Billing & Plans
- Ollama Local Models
- Cloud Provider API Keys (Bedrock/Spark)
- Topics & Conversation Sharing
- TTS/STT & Translation
- MCP & Skills
- Changelog: Database Docker Image
- Changelog: Artifacts & Code Interpreter
- Agent Marketplace
- Changelog: Plugins & TTS
- Changelog: Vision Models
- Analytics Integrations
- Redis Cache
- Changelog: Knowledge Base
- Task Lifecycle & Branching
- Cloud Sandbox & S3 Config
- Skills & Tools
- RAG & Knowledge Base
- Command Menu & Shortcuts
- Agent Groups
- Integrations & Plugins
- Desktop Sync
- Changelog: Persistent Sidebar
- Changelog: Export Formats
- Changelog Index Schema
- Claude Code Sub-agents
- GitHub Models
- Tongyi Qianwen (Qwen)
- URL Settings Sharing (keyVaults/language
- Changelog: OpenAI O1 Models (v1.17.0, en
- Conversation branching (continuation / s
- Data statistics dashboard & activity car
- BlueBubbles bridge (iMessage relay)
- Vercel Fluid Compute (300s max duration)
- pluginSelectors object
- DALL-E 3 Text-to-Image Changelog (2023-1
- Branching
- Cloudflare Workers AI (serverless AI on 
- Fireworks AI (generative model inference
- Gitee AI (Git-based AI dev platform, Ser
- SambaNova (AI hardware/software, Palo Al
- SiliconCloud (SiliconFlow, GenAI platfor
- StepFun
- Taichu (Institute of Automation, CAS)
- Together AI
- Upstage (Solar)
- Google Vertex AI
- Baidu Wenxin (ERNIE)
- xAI (Grok)
- 01.AI (Yi)
- Zhipu AI (GLM)
- Image & Video Generation Redesign
- Lighthouse Reports
- Channels
- Scheduled Task
- Configure Redis Cache Service
- Model Runtime & Auth Improvements (zh-CN
- Artifact
- Video Generation
- Workspace

## God Nodes (most connected - your core abstractions)
1. `LobeHub AI Agent Workspace` - 39 edges
2. `Better Auth (authentication framework)` - 23 edges
3. `Legacy Authentication (NextAuth & Clerk)` - 20 edges
4. `Authentication Service Environment Variables` - 20 edges
5. `API Key configuration flow` - 17 edges
6. `LobeHub Single Sign-On (Auth.js/NextAuth)` - 14 edges
7. `NextAuth / Auth.js` - 13 edges
8. `Technical Development Getting Started Guide (en)` - 12 edges
9. `S3-compatible Object Storage (RustFS/MinIO)` - 12 edges
10. `Auth Environment Variables (AUTH_SECRET, AUTH_SSO_PROVIDERS)` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Agent (Getting Started)` --semantically_similar_to--> `助理 (Agent, zh-CN)`  [INFERRED] [semantically similar]
  docs/usage/getting-started/agent.mdx → docs/usage/getting-started/agent.zh-CN.mdx
- `Changelog Index` --references--> `Plugin System Changelog (2023-09-09)`  [EXTRACTED]
  docs/changelog/index.json → docs/changelog/2023-09-09-plugin-system.mdx
- `Changelog Index` --references--> `GPT-4 Vision Changelog (2023-11-14)`  [EXTRACTED]
  docs/changelog/index.json → docs/changelog/2023-11-14-gpt4-vision.mdx
- `Changelog Index` --references--> `TTS & STT Changelog (2023-11-19)`  [EXTRACTED]
  docs/changelog/index.json → docs/changelog/2023-11-19-tts-stt.mdx
- `Changelog Index` --references--> `DALL-E 3 Text-to-Image Changelog (2023-12-22)`  [EXTRACTED]
  docs/changelog/index.json → docs/changelog/2023-12-22-dalle-3.mdx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **RAG / Semantic Search Pipeline** — docs_glossary_rag, docs_glossary_embedding, docs_glossary_file_chunk, docs_glossary_knowledge_base [INFERRED 0.85]
- **Terminal Coding Agents** — docs_glossary_claude_code, docs_glossary_codex, docs_glossary_sub_agents, docs_glossary_working_directory [INFERRED 0.85]
- **LobeHub Server Deployment Stack** — changelog_concept_server_database, changelog_concept_authentication, changelog_concept_docker_image, docs_glossary_self_hosting [INFERRED 0.85]
- **Reasoning models with chain-of-thought display** — changelog_deepseek_r1, changelog_claude_3_7_sonnet, changelog_openai_o3_mini, changelog_chain_of_thought [INFERRED 0.85]
- **November four new model providers** — changelog_gitee_ai, changelog_internlm, changelog_xai, changelog_cloudflare_workers_ai [INFERRED 0.95]
- **Server database self-hosting stack** — changelog_docker_database_image, changelog_postgres, changelog_nextauth, changelog_cloud_data_sync [INFERRED 0.75]
- **MCP Tool Ecosystem Evolution (desktop → marketplace → cloud endpoints)** — changelog_desktop_app_release, changelog_mcp_market_release, changelog_mcp_release, changelog_mcp_marketplace_concept [INFERRED 0.85]
- **AI Image Generation Rollout across releases** — changelog_image_generation_release, changelog_gemini_release, changelog_comfy_ui_release, changelog_image_generation_concept [INFERRED 0.75]
- **Claude Model Adoption Timeline (3.7 → 4 → Sonnet 4.5 → Haiku 4.5 → Opus 4.6)** — changelog_claude_4_release, changelog_python_release, changelog_comfy_ui_release, changelog_runtime_auth_release, changelog_claude_model_family [INFERRED 0.75]
- **Delegated Coding Agents (Claude Code & Codex) across releases** — concept_claude_code, concept_codex, concept_heterogeneous_agent, docs_changelog_2026_05_11_agent_tasks_ga [INFERRED 0.85]
- **Agent Task System from intro to GA to CAO orchestration** — concept_agent_tasks, docs_changelog_2026_03_30_agent_tasks, docs_changelog_2026_05_11_agent_tasks_ga, concept_cao [INFERRED 0.75]
- **Search & Agent Document storage foundation** — concept_bm25_search, concept_agent_documents, docs_changelog_2026_03_16_search [INFERRED 0.85]
- **Chat execution runtime stack** — concept_agent_runtime, concept_model_runtime, concept_general_chat_agent, concept_chat_service [INFERRED 0.85]
- **ComfyUI four-layer service architecture** — concept_comfyui, concept_prompt_builder, concept_flux_sd_models [INFERRED 0.85]
- **Code quality & release pipeline** — concept_gitmoji, concept_semantic_release, concept_lobehub_lint, concept_canary_branch [INFERRED 0.75]
- **Feature Development Full Chain** — basic_feature_drizzle_orm, basic_feature_layered_architecture, basic_feature_zustand, i18n_implementation_i18next [INFERRED 0.85]
- **Developer Onboarding Documentation Set** — docs_development_basic_setup_development, docs_development_basic_folder_structure, basic_contributing_guidelines_zhcn, docs_development_basic_test [INFERRED 0.75]
- **i18n Workflow** — i18n_implementation_i18next, i18n_lobe_i18n, i18n_i18nrc_config, i18n_glossary [INFERRED 0.85]
- **Self-Hosting Core Service Stack** — concept_postgres_pgvector, concept_redis, concept_s3_storage, concept_searxng [INFERRED 0.85]
- **Better Auth Authentication Flow** — concept_better_auth, concept_sso_providers, concept_smtp_email, concept_redis [INFERRED 0.85]
- **Knowledge Base RAG Pipeline** — concept_s3_storage, concept_openai_embedding, concept_postgres_pgvector, concept_unstructured_io [INFERRED 0.85]
- **S3-compatible storage backends** — concept_s3_storage, concept_cloudflare_r2, concept_rustfs, concept_tencent_cos [INFERRED 0.85]
- **LobeHub observability integrations** — concept_langfuse, concept_grafana_stack [INFERRED 0.75]
- **Self-hosting auth mechanisms** — concept_clerk, concept_email_service, concept_better_auth [INFERRED 0.75]
- **NextAuth SSO Provider Configuration** — concept_next_auth_sso_providers, provider_auth0, provider_github, provider_google, provider_keycloak, provider_microsoft_entra_id [INFERRED 0.85]
- **Webhook-capable identity providers** — concept_webhook_support, provider_casdoor, provider_logto [INFERRED 0.75]
- **Email service enabling verification and magic link** — concept_resend, concept_nodemailer_smtp, concept_email_verification, concept_magic_link [INFERRED 0.85]
- **LobeHub SSO provider integrations** — docs_self_hosting_auth_next_auth_okta, docs_self_hosting_auth_next_auth_zitadel, docs_self_hosting_auth_providers_auth0, docs_self_hosting_auth_providers_authelia, docs_self_hosting_auth_providers_authentik, docs_self_hosting_auth_providers_casdoor, docs_self_hosting_auth_providers_cloudflare_zero_trust, docs_self_hosting_auth_providers_cognito, docs_self_hosting_auth_providers_feishu, docs_self_hosting_auth_providers_apple [INFERRED 0.85]
- **OIDC-based auth providers for LobeHub** — docs_self_hosting_auth_next_auth_okta, docs_self_hosting_auth_next_auth_zitadel, docs_self_hosting_auth_providers_authelia, docs_self_hosting_auth_providers_authentik, docs_self_hosting_auth_providers_casdoor, docs_self_hosting_auth_providers_cloudflare_zero_trust, docs_self_hosting_auth_providers_cognito [INFERRED 0.85]
- **Shared AUTH_SECRET / AUTH_SSO_PROVIDERS env config** — auth_env_variables, docs_self_hosting_auth_next_auth_okta, docs_self_hosting_auth_providers_auth0, docs_self_hosting_auth_providers_cognito, docs_self_hosting_auth_providers_feishu [INFERRED 0.75]
- **OIDC-based SSO Providers** — docs_self_hosting_auth_providers_generic_oidc, docs_self_hosting_auth_providers_keycloak, docs_self_hosting_auth_providers_logto, docs_self_hosting_auth_providers_okta, docs_self_hosting_auth_providers_zitadel [INFERRED 0.85]
- **Shared SSO Env Vars (AUTH_SECRET, AUTH_SSO_PROVIDERS)** — docs_self_hosting_environment_variables_auth_env_auth_secret, docs_self_hosting_environment_variables_auth_env_sso_providers, envvars_auth [INFERRED 0.85]
- **LobeHub Analytics/Observability Integrations** — docs_self_hosting_environment_variables_analytics_vercel, docs_self_hosting_environment_variables_analytics_google, docs_self_hosting_environment_variables_analytics_posthog, docs_self_hosting_environment_variables_analytics_umami, docs_self_hosting_environment_variables_analytics_langfuse [INFERRED 0.75]
- **Self-Hosting Environment Variable Reference Set** — docs_self_hosting_environment_variables_basic, docs_self_hosting_environment_variables_model_provider, docs_self_hosting_environment_variables_s3, docs_self_hosting_environment_variables_redis, docs_self_hosting_environment_variables_cloud_sandbox [INFERRED 0.75]
- **Docs Sharing Model List Syntax** — docs_self_hosting_environment_variables_model_provider, docs_self_hosting_examples_azure_openai, concept_model_list_syntax [INFERRED 0.85]
- **LobeHub 2.0 Better Auth Migration** — docs_self_hosting_migration_v2_breaking_changes, concept_better_auth, environment-variables_auth_zhcn [INFERRED 0.85]
- **V2 Better Auth Migration (Clerk/NextAuth to Better Auth)** — docs_self_hosting_migration_v2_auth_clerk_to_betterauth, docs_self_hosting_migration_v2_auth_nextauth_to_betterauth, docs_self_hosting_migration_v2_auth_migration_internals, concept_better_auth [INFERRED 0.85]
- **Server DB Platform Deployment Guides** — docs_self_hosting_platform_docker_compose, docs_self_hosting_platform_docker, docs_self_hosting_platform_dokploy, docs_self_hosting_platform_sealos, docs_self_hosting_platform_vercel, docs_self_hosting_platform_zeabur [INFERRED 0.85]
- **Server DB Required Services (Postgres + S3 + Auth)** — concept_postgres, concept_s3_storage, concept_better_auth, concept_server_db_mode [INFERRED 0.75]
- **Coding agents delegated in desktop app** — docs_usage_agent_claude_code, docs_usage_agent_codex, concept_execution_device [INFERRED 0.85]
- **Built-in Agent Skills (Notebook/GTD/Sandbox)** — concept_notebook, concept_gtd, concept_cloud_sandbox [INFERRED 0.75]
- **Agent Group collaboration** — concept_agent_group, concept_moderator, concept_collaboration_modes [INFERRED 0.85]
- **Channel access policies shared across messaging platforms** — docs_usage_channels_discord_en, docs_usage_channels_feishu_en, docs_usage_channels_lark_en, channels_access_policy [INFERRED 0.85]
- **LobeHub messaging channel integrations** — docs_usage_channels_discord_en, docs_usage_channels_feishu_en, docs_usage_channels_lark_en, docs_usage_channels_imessage_en, docs_usage_channels_line_en [INFERRED 0.75]
- **Agent conversation productivity features** — docs_usage_agent_share_en, docs_usage_agent_topic_en, docs_usage_agent_translate_en, agent_ttsstt_en [INFERRED 0.75]
- **Messaging channel integrations** — docs_usage_channels_qq, docs_usage_channels_slack, docs_usage_channels_telegram, docs_usage_channels_wechat, channels_line_zhcn [INFERRED 0.85]
- **Cross-platform access policy model** — concept_access_policies, concept_pairing_approval, docs_usage_channels_overview, docs_usage_channels_qq, docs_usage_channels_slack, docs_usage_channels_telegram [INFERRED 0.75]
- **Skills and MCP ecosystem** — concept_skills, concept_mcp, docs_usage_community_mcp_market, docs_usage_community_custom_mcp, docs_usage_community_skill_management [INFERRED 0.85]
- **Getting Started onboarding surfaces** — docs_usage_getting_started_get_lobehub, docs_usage_getting_started_lobe_ai, docs_usage_getting_started_agent [INFERRED 0.75]
- **File → Resource Library → Agent grounding pipeline** — docs_usage_getting_started_file_upload, docs_usage_getting_started_resource, concept_semantic_search [INFERRED 0.85]
- **Skills, Tools and MCP capability stack** — concept_skill, concept_tool, concept_mcp [INFERRED 0.85]
- **Messenger Supported Platforms** — docs_usage_messenger_telegram, docs_usage_messenger_slack, docs_usage_messenger_discord [INFERRED 0.75]
- **API-Key Provider Setup Guides** — docs_usage_providers_ai21, docs_usage_providers_ai302, docs_usage_providers_ai360, docs_usage_providers_anthropic, docs_usage_providers_azure [INFERRED 0.75]
- **LLM chat providers configured via API key in LobeHub** — docs_usage_providers_baichuan, docs_usage_providers_deepseek, docs_usage_providers_fireworksai, docs_usage_providers_giteeai, docs_usage_providers_github_models, docs_usage_providers_google_gemini, docs_usage_providers_cloudflare, docs_usage_providers_bedrock [INFERRED 0.85]
- **Image/video generation providers in LobeHub** — docs_usage_providers_bfl, docs_usage_providers_fal, docs_usage_providers_comfyui, providers_image_generation [INFERRED 0.85]
- **Common API-key setup flow (obtain key then configure in Settings)** — providers_api_key_config, providers_ai_providers_settings, providers_lobehub [INFERRED 0.75]
- **LobeHub AI provider integration guides** — docs_usage_providers_groq, docs_usage_providers_mistral, docs_usage_providers_novita, docs_usage_providers_lmstudio, docs_usage_providers_modelscope [INFERRED 0.85]
- **China-market LLM providers** — docs_usage_providers_hunyuan_provider, docs_usage_providers_internlm_provider, docs_usage_providers_minimax_provider, docs_usage_providers_modelscope_provider, docs_usage_providers_moonshot_provider, docs_usage_providers_infiniai_provider [INFERRED 0.75]
- **OpenAI-compatible open-model hosts** — docs_usage_providers_modelscope_provider, docs_usage_providers_novita_provider, docs_usage_providers_lmstudio_provider [INFERRED 0.65]
- **Provider API-key integration flow in LobeHub** — providers_api_key_config, providers_ai_providers_settings, providers_lobehub [INFERRED 0.85]
- **Chinese LLM cloud providers** — docs_usage_providers_qwen_tongyi, docs_usage_providers_qiniu, docs_usage_providers_sensenova, docs_usage_providers_siliconcloud [INFERRED 0.75]
- **Open-source model API aggregators** — docs_usage_providers_openrouter, docs_usage_providers_ppio, docs_usage_providers_siliconcloud [INFERRED 0.65]
- **Chinese LLM Providers in LobeHub** — docs_usage_providers_spark, docs_usage_providers_stepfun, docs_usage_providers_taichu, docs_usage_providers_tencentcloud, docs_usage_providers_volcengine, docs_usage_providers_wenxin [INFERRED 0.75]
- **Self-hosted / Gateway Inference Endpoints** — docs_usage_providers_vllm, docs_usage_providers_vercel_ai_gateway, docs_usage_providers_togetherai [INFERRED 0.65]
- **Local Open Models via Ollama** — docs_usage_providers_ollama, docs_usage_providers_ollama_gemma, docs_usage_providers_ollama_qwen [EXTRACTED 1.00]
- **User Interface Customization Surface** — user_interface_theme, docs_usage_user_interface_command_menu, docs_usage_user_interface_shortcuts, docs_usage_user_interface_stats [INFERRED 0.75]

## Communities (93 total, 9 thin omitted)

### Community 0 - "SSO & OIDC Authentication"
Cohesion: 0.05
Nodes (69): Legacy Authentication (zh-CN), OpenID Connect (OIDC), Single Sign-On (SSO) Authentication, AUTH_SECRET / Auth.js session token key, Database Session Strategy, NEXT_AUTH_SSO_PROVIDERS env var, NextAuth / Auth.js, Single Sign-On (SSO) (+61 more)

### Community 1 - "OpenAI-Compatible Providers"
Cohesion: 0.06
Nodes (42): AI Providers Settings Panel, Alibaba Cloud account linking (mandatory for API access), Provider API Key, LPU Inference Engine, Image URL whitelist / base64 vision workaround, Local API service (port 1234, CORS enabled), ModelScope env vars (ENABLED_MODELSCOPE, MODELSCOPE_API_KEY, MODEL_LIST), OpenAI-compatible API format (+34 more)

### Community 2 - "Changelog: Model Releases"
Cohesion: 0.07
Nodes (40): Agent Builder, Agent Memory, Chain-of-Thought / Reasoning Display, Changelog: Prompt Variables & Claude 4 Reasoning Model Support, 更新日志: 提示词变量与 Claude 4 推理模型支持 (zh-CN), Claude Model Family (3.7 Sonnet, 4, Opus 4.1, Sonnet 4.5, Haiku 4.5, Opus 4.6), Changelog: ComfyUI Integration & Knowledge Base Improvements, 更新日志: ComfyUI 集成与知识库优化 (zh-CN) (+32 more)

### Community 3 - "Architecture & Contribution Guides"
Cohesion: 0.07
Nodes (38): Architecture Design (zh-CN), Chat API Client-Server Interaction Logic (zh-CN), ComfyUI Extension Development Guide (en), ComfyUI Extension Development Guide (zh-CN), Code Style and Contribution Guidelines, Adding New Image Models (en), Adding New Image Models (zh-CN), Agent Runtime (@lobechat/agent-runtime) (+30 more)

### Community 4 - "Model List & Reasoning Features"
Cohesion: 0.07
Nodes (37): Customizing Provider Model List (zh-CN), Artifacts (zh-CN), Chain of Thought (zh-CN), GTD Tools (zh-CN), Notebook (zh-CN), Azure OpenAI, Chain of Thought reasoning, GTD (Getting Things Done) (+29 more)

### Community 5 - "Agent Tasks & Gateway"
Cohesion: 0.08
Nodes (34): Search Optimization & Agent Documents (zh-CN), Agent Tasks and Agent Management (zh-CN), AI Auto-Completion & Real-Time Gateway (zh-CN), Agent Gateway & Customizable Sidebar (zh-CN), Daily Brief, Document History & Approval Flow (zh-CN), Coding Agent: Claude Code & Codex on Desktop (zh-CN), Delegate Claude Code and Codex (Review Tab) (zh-CN), Agent Tasks GA & Cloud Heterogeneous Agent (zh-CN) (+26 more)

### Community 6 - "Object Storage & Embeddings"
Cohesion: 0.09
Nodes (32): Feature Flags Configuration (zh-CN), Knowledge Base / File Upload (zh-CN), 配置 S3 存储服务 (zh-CN), Cloudflare R2, FEATURE_FLAGS variable, Agent Gateway Mode, INTERNAL_APP_URL, MinIO (+24 more)

### Community 7 - "JSON Schema Definitions"
Cohesion: 0.07
Nodes (31): additionalProperties, items, type, items, type, pattern, type, type (+23 more)

### Community 8 - "Auth Provider Configuration"
Cohesion: 0.13
Nodes (29): Apple JWT client secret (ES256, 180-day expiry), OAuth Callback URL Pattern (/api/auth/callback/<provider>), Casdoor Webhook user-data sync, Auth Environment Variables (AUTH_SECRET, AUTH_SSO_PROVIDERS), LobeHub (self-hosted AI workspace), LobeHub Single Sign-On (Auth.js/NextAuth), OpenID Connect (OIDC), Configure Okta Identity Verification for LobeHub (+21 more)

### Community 9 - "Dev Tooling & Linting"
Cohesion: 0.09
Nodes (24): canary Development Branch, Commitlint, Gitmoji Commit Convention, Code Style & Contributing Guidelines (zh-CN), @lobehub/lint, Semantic Release, Resources and References (zh-CN), Testing Guide (zh-CN) (+16 more)

### Community 10 - "Layered Architecture & Data Flow"
Cohesion: 0.10
Nodes (22): Feature Development Complete Guide (zh-CN), Drizzle ORM, Frontend/Backend Layered Architecture, RFC 021 - Custom Assistant Opening Guidance, Zustand State Management, Next.js App Router Route Groups, Layered Data Flow (UI->Store->Service->tRPC->DB), Hybrid Routing (Next.js + React Router DOM) (+14 more)

### Community 11 - "LLM Provider Guides (AI21/302/360)"
Cohesion: 0.10
Nodes (22): Using AI21 Labs in LobeHub, AI21 Labs (Jamba model series), Using AI21 Labs in LobeHub (zh-CN), Using 302.AI in LobeHub, 302.AI (pay-as-you-go AI aggregation platform), Using 302.AI in LobeHub (zh-CN), Using 360 Zhinao in LobeHub, 360 Zhinao (Qihoo 360 LLM) (+14 more)

### Community 12 - "Database Deployment (Docker)"
Cohesion: 0.14
Nodes (20): Auth Env Vars (AUTH_SECRET / JWKS_KEY), Casdoor (identity provider), Logto (IAM / auth provider), ParadeDB image (paradedb/paradedb:latest-pg17), pg_search (full-text search), pgvector (vector search), PostgreSQL, Server Database Mode (+12 more)

### Community 13 - "Bot Platform & Connectors"
Cohesion: 0.11
Nodes (19): Adding a New Bot Platform (en), Adding a New Bot Platform (zh-CN), Browser Pairing & Live Run Status (changelog, en), Browser Pairing & Live Run Status (changelog, zh-CN), Connectors & Connect Agents (changelog, en), Connectors & Connect Agents (changelog, zh-CN), Delivery Checks & Audio Messages (changelog, en), Delivery Checks & Audio Messages (changelog, zh-CN) (+11 more)

### Community 14 - "Email Service & Better Auth"
Cohesion: 0.14
Nodes (18): Email Service Configuration (zh-CN), New Authentication Provider Guide (en), New Authentication Provider Guide (zh-CN), Better Auth (authentication framework), Email Service (Nodemailer/Resend), Email Verification (AUTH_EMAIL_VERIFICATION), Magic Link Login (AUTH_ENABLE_MAGIC_LINK), Nodemailer (SMTP) (+10 more)

### Community 15 - "Provider API Key Setup"
Cohesion: 0.11
Nodes (18): Using Baichuan API Key in LobeHub (EN), Using Nvidia NIM in LobeHub, Nvidia NIM, Tencent Cloud (Hunyuan), Using Tencent Cloud in LobeHub, Vercel AI Gateway, Using Vercel AI Gateway in LobeHub, vLLM (+10 more)

### Community 16 - "Major LLM Providers"
Cohesion: 0.11
Nodes (18): DeepSeek (V3 / R1 open-source LLM), Using DeepSeek API Key in LobeHub (EN), Using Google Gemini API Key in LobeHub (EN), Google Gemini (Google AI multimodal LLM suite), OpenAI (GPT-4o/GPT-4-turbo), Using OpenAI in LobeHub, OpenRouter (multi-model API aggregator), Using OpenRouter in LobeHub (+10 more)

### Community 17 - "Auth Migration (Clerk→Better Auth)"
Cohesion: 0.19
Nodes (17): Migrating from Clerk to Better Auth (zh-CN), 配置 Clerk 身份验证服务 (zh-CN), Auth Migration Technical Deep Dive (zh-CN), Migrating from NextAuth to Better Auth (zh-CN), Clerk Authentication, Full Migration (accounts preserved), LobeHub 2.0, Migration tsx scripts (dry-run + verify) (+9 more)

### Community 18 - "Messaging Channels (LINE/QQ/WeChat)"
Cohesion: 0.18
Nodes (16): Connect LobeHub to LINE (zh-CN), Channels Overview (zh-CN), Connect LobeHub to QQ (zh-CN), Connect LobeHub to Slack (zh-CN), Connect LobeHub to Telegram (zh-CN), Connect LobeHub to WeChat (zh-CN), Access Policies (DM/Group Policy + Allowed Users), iLink Bot API (WeChat long-polling) (+8 more)

### Community 19 - "UI Appearance & Misc Providers"
Cohesion: 0.13
Nodes (15): Perplexity AI, Using Perplexity AI in LobeHub, SenseTime SenseNova, Using SenseTime SenseNova in LobeHub, Interface Appearance, Usage Statistics Dashboard, Usage Statistics, Wiki Home (moved to lobehub.com docs) (+7 more)

### Community 20 - "Deployment & Online Search"
Cohesion: 0.19
Nodes (13): Data Analytics Integration (zh-CN), Online Search Configuration (zh-CN), Docker Compose Deployment, SearXNG, Vercel Deployment, Vercel Analytics, Web Crawlers (Browserless/Firecrawl/Tavily/Jina), Data Analytics Integration (+5 more)

### Community 21 - "Changelog: DeepSeek R1 & CoT"
Cohesion: 0.23
Nodes (13): Changelog: DeepSeek R1 + CoT (v1.49.12, zh-CN), @AmAzing129 (contributor), @arvinxx (contributor), Chain-of-Thought reasoning display, Claude 3.7 Sonnet, DeepSeek R1 model, @hezhijie0327 (contributor), Online search & deep web crawling (+5 more)

### Community 22 - "Multimodal Generation & Pages"
Cohesion: 0.18
Nodes (13): Generation Models (DALL-E 3, Flux, Sora, Veo, Kling), Vision / OCR Multimodal Understanding, Pages Agent, Vector Semantic Search / Embeddings, File Upload & Management, Image & Video Generation, 图像与视频生成 (Generation, zh-CN), Pages (+5 more)

### Community 23 - "Image Generation (FLUX/ComfyUI)"
Cohesion: 0.18
Nodes (13): Black Forest Labs (FLUX image generation lab), Using Black Forest Labs API Key in LobeHub (EN), ComfyUI (node-based Stable Diffusion GUI), ComfyUI auth methods (None, Basic, Bearer, Custom), Using ComfyUI in LobeHub for Image Generation (EN), FLUX model series (Schnell, Dev, Kontext-dev), Comfy-Manager extension manager, Fal.ai (image/video inference: FLUX, Kling, HiDream) (+5 more)

### Community 24 - "Cloud Sandbox & Scheduled Tasks"
Cohesion: 0.21
Nodes (12): Cloud Sandbox isolated code execution, Cloud Sandbox (云沙箱), CronJob scheduled Agent execution, Scheduled Tasks, 定时任务 (Scheduled Tasks), Web Search, Search grounding & citations, 网络搜索 (Web Search) (+4 more)

### Community 25 - "Messaging Channels (Discord/Feishu)"
Cohesion: 0.27
Nodes (12): Channel access policies (DM Policy / Group Policy / Allowlist / Pairing), 将 LobeHub 连接到 Discord, Event Subscription im.message.receive_v1 webhook, 将 LobeHub 连接到飞书, 将 LobeHub 连接到 Lark, Platform User ID (pairing approval, AI tools push, anti-lockout), Connect LobeHub to Discord, Connect LobeHub to Feishu (飞书) (+4 more)

### Community 26 - "Bot Usage on Platforms"
Cohesion: 0.27
Nodes (12): Use LobeHub on Discord, Use LobeHub on Discord (zh-CN), Messenger Overview, Account Linking (OAuth-style link flow), Active Agent Switching (/agents), Channels (public agent, bring-your-own bot), Official LobeHub Bot, Messenger Overview (zh-CN) (+4 more)

### Community 27 - "Changelog: Server DB & Flags"
Cohesion: 0.27
Nodes (11): Authentication (next-auth / Clerk), Database Docker Image, Server-Side Database (Postgres), SSO / OAuth Auth Changelog (2024-02-08), SSO / OAuth Changelog (zh-CN), LobeHub 1.0 Changelog (2024-06-19), LobeHub 1.0 Changelog (zh-CN), Database Docker Image Changelog (2024-08-02) (+3 more)

### Community 28 - "Agent Builder & Memory"
Cohesion: 0.22
Nodes (11): Agent Builder, Memory Agent, System Prompt / System Role, Web Search (built-in skill), Agent (Getting Started), Getting LobeHub, 获取 LobeHub (zh-CN), Lobe AI (built-in assistant) (+3 more)

### Community 29 - "Glossary Concepts"
Cohesion: 0.18
Nodes (11): Agent, Agent Builder, Cloud Sandbox, Fork, LobeHub Glossary, Group (Agent Group), Lobe AI (Inbox), Memory (+3 more)

### Community 30 - "Observability & Monitoring"
Cohesion: 0.33
Nodes (10): 启动自动更新 (zh-CN), Docker / Docker Compose, Grafana/Prometheus/Tempo/OpenTelemetry, Langfuse, Vercel / Zeabur Deployment & Upstream Sync, Observability with Grafana, Prometheus, Tempo, Monitor LobeHub with Langfuse, Upstream Sync and Docker Deployment (+2 more)

### Community 31 - "Claude Code & Codex"
Cohesion: 0.31
Nodes (10): Claude Code (zh-CN), Codex (zh-CN), Artifacts (self-contained AI output), Claude Code CLI (Anthropic), Cloud Sandbox execution environment, Codex CLI (OpenAI), Execution Device (local/cloud/remote), Claude Code in LobeHub (+2 more)

### Community 32 - "Changelog: Custom Providers"
Cohesion: 0.24
Nodes (10): Changelog: Four New Providers (Nov, zh-CN), Changelog: Custom AI Provider Management (zh-CN), Cloudflare Workers AI provider, Custom AI provider/model management, Gitee AI provider, InternLM provider (Shanghai AI Laboratory), OpenAI-compatible API endpoint, xAI provider (Grok) (+2 more)

### Community 33 - "Provider Billing & Plans"
Cohesion: 0.20
Nodes (10): Ollama Local LLMs, Ollama Local Models Changelog (2024-02-14), Ollama Changelog (zh-CN), Budget, Credits, Custom API, LobeHub Provider, Model Provider (+2 more)

### Community 34 - "Ollama Local Models"
Cohesion: 0.20
Nodes (10): Ollama (local LLM framework), Gemma (Google open model), Using Gemma via Ollama in LobeHub, Using Ollama in LobeHub, OLLAMA_ORIGINS cross-origin env var, Qwen (Alibaba open model), Using Qwen via Ollama in LobeHub, Using Gemma via Ollama in LobeHub (zh-CN) (+2 more)

### Community 35 - "Cloud Provider API Keys (Bedrock/Spark)"
Cohesion: 0.22
Nodes (9): Baichuan AI, Amazon Bedrock (managed foundation model API), AWS IAM access keys (Access Key ID + Secret), Using Amazon Bedrock API Key in LobeHub (EN), iFLYTEK Spark, Using iFLYTEK Spark in LobeHub, AI Providers settings section, Using Amazon Bedrock API Key in LobeHub (zh-CN) (+1 more)

### Community 36 - "Topics & Conversation Sharing"
Cohesion: 0.32
Nodes (8): 分享会话 (Share Conversations), 话题 (Topics), Share Conversations, Conversation export formats (Screenshot/Text/PDF/JSON/Link), Topics, Topic conversation management (search/rename/favorite/duplicate), Notebook, Agent Marketplace

### Community 37 - "TTS/STT & Translation"
Cohesion: 0.32
Nodes (8): 会话翻译 (Conversation Translation), Microsoft Edge Speech (Azure Neural Voices), Text-to-Speech & Speech-to-Text, OpenAI Voices (Alloy/Echo/Fable/Onyx/Nova/Shimmer), Voice capabilities (TTS/STT/hands-free), 文字转语音与语音转文字 (TTS & STT), Translation Assistant (System Assistant model), Conversation Translation

### Community 38 - "MCP & Skills"
Cohesion: 0.39
Nodes (8): Custom MCP (zh-CN), MCP Marketplace (zh-CN), Composio Integrations, Model Context Protocol (MCP) tools, Skills, Custom MCP, MCP Marketplace, Skill Management

### Community 39 - "Changelog: Database Docker Image"
Cohesion: 0.29
Nodes (7): Changelog: Database Docker Image (v1.8.0, zh-CN), Auth0 / third-party SSO integration, Cloud data synchronization, Official Database Docker Image (90MB), LobeHub, NextAuth authentication, Server Postgres

### Community 40 - "Changelog: Artifacts & Code Interpreter"
Cohesion: 0.33
Nodes (7): Changelog: Artifacts Era (v1.19, zh-CN), Claude Artifacts feature (SVG, HTML, rich documents), @CloudPassenger (contributor), Python code execution / OpenAI Code Interpreter, Redesigned discovery page, GitHub Models provider, Changelog: Artifacts Era (v1.19, en-US)

### Community 41 - "Agent Marketplace"
Cohesion: 0.33
Nodes (7): Agent Marketplace (zh-CN), Community Creators (zh-CN), Publish Your Agent (zh-CN), Agent Marketplace (concept), Agent Marketplace, Community Creators, Publish Your Agent

### Community 42 - "Changelog: Plugins & TTS"
Cohesion: 0.29
Nodes (7): Plugin System Changelog (2023-09-09), Plugin System Changelog (zh-CN), TTS & STT Changelog (2023-11-19), TTS & STT Changelog (zh-CN), STT (Speech-to-Text), TTS (Text-to-Speech), Web Search

### Community 43 - "Changelog: Vision Models"
Cohesion: 0.29
Nodes (7): GPT-4 Vision Changelog (2023-11-14), GPT-4 Vision Changelog (zh-CN), GPT-4o Mini Changelog (2024-07-19), GPT-4o Mini Changelog (zh-CN), Model, OCR, Vision

### Community 44 - "Analytics Integrations"
Cohesion: 0.43
Nodes (7): Google Analytics, Langfuse LLM Observability, PostHog Analytics, Umami Analytics, Vercel Analytics, Integrating Analytics in LobeHub (Env Vars), Analytics Environment Variables (zh-CN)

### Community 45 - "Redis Cache"
Cohesion: 0.53
Nodes (6): 配置 Redis 缓存服务 (zh-CN), Redis (ioredis), Upstash Serverless Redis, Redis Cache Service Configuration, Configuring Upstash Redis Service, 配置 Upstash Redis 服务 (zh-CN)

### Community 46 - "Changelog: Knowledge Base"
Cohesion: 0.40
Nodes (6): Changelog: Knowledge Base (en-US), Changelog: Knowledge Base (zh-CN), Files sidebar / file management, Knowledge Base feature, Portal interaction pattern, Automatic chunking and vectorization

### Community 47 - "Task Lifecycle & Branching"
Cohesion: 0.33
Nodes (6): Agent (persistent teammate), Conversation Branching, Task Lifecycle (Backlog→In Progress→Pending Review→Done), Chat Interface & Branching, Task, 任务 (Task, zh-CN)

### Community 48 - "Cloud Sandbox & S3 Config"
Cohesion: 0.33
Nodes (6): Market Sandbox, Onlyboxes Sandbox Provider, Cloud Sandbox Config, Configuring S3 Storage Service, Cloud Sandbox Config (zh-CN), Configuring S3 Storage Service (zh-CN)

### Community 49 - "Skills & Tools"
Cohesion: 0.33
Nodes (6): Skill, Skill Store / Marketplace, Tool / Function Calling, 技能管理 (Skill Management, zh-CN), Skills and Tools, 助理 (Agent, zh-CN)

### Community 50 - "RAG & Knowledge Base"
Cohesion: 0.47
Nodes (6): Embedding, File Chunk, File Upload, Knowledge Base (Library), RAG (Retrieval-Augmented Generation), Resources

### Community 51 - "Command Menu & Shortcuts"
Cohesion: 0.33
Nodes (6): Command Menu (quick actions), Command Menu, Keyboard Shortcuts, Keyboard Shortcuts, Command Menu (zh-CN), Keyboard Shortcuts (zh-CN)

### Community 52 - "Agent Groups"
Cohesion: 0.60
Nodes (5): Agent Groups (zh-CN), Agent Group, Collaboration Modes (Sequential/Parallel/Iterative/Debate), Group Moderator, Agent Groups

### Community 53 - "Integrations & Plugins"
Cohesion: 0.50
Nodes (5): Integrations, MCP (Model Context Protocol), Skill (Plugin), Skill Store, Tool

### Community 54 - "Desktop Sync"
Cohesion: 0.50
Nodes (4): LobeHub Desktop Sync (zh-CN), LobeHub Desktop (Electron), OIDC / JWKS_KEY (Desktop Sync), Automatic Sync with LobeHub Desktop

### Community 55 - "Changelog: Persistent Sidebar"
Cohesion: 0.67
Nodes (4): Changelog: Persistent Agent Sidebar (v1.26.0, zh-CN), Persistent Agent sidebar, FEATURE_FLAGS=+pin_list, Changelog: Persistent Agent Sidebar (v1.26.0, en-US)

### Community 56 - "Changelog: Export Formats"
Cohesion: 0.67
Nodes (4): Changelog: Markdown/OpenAI JSON Export (v1.28.0, zh-CN), Conversation export (Markdown / OpenAI JSON), Tool Calling data structure, Changelog: Markdown/OpenAI JSON Export (v1.28.0, en-US)

### Community 57 - "Changelog Index Schema"
Cohesion: 0.50
Nodes (3): cloud, community, $schema

### Community 58 - "Claude Code Sub-agents"
Cohesion: 0.67
Nodes (4): Claude Code, Codex, Sub-agents, Working Directory

### Community 59 - "GitHub Models"
Cohesion: 0.50
Nodes (4): Using GitHub Models in LobeHub (EN), GitHub Models (marketplace model sandbox), GitHub Models rate limits (per model tier), Using GitHub Models in LobeHub (zh-CN)

### Community 60 - "Tongyi Qianwen (Qwen)"
Cohesion: 0.67
Nodes (4): DashScope Model Service, Using Tongyi Qianwen in LobeHub, Tongyi Qianwen (Qwen, Alibaba Cloud), Using Tongyi Qianwen in LobeHub (zh-CN)

### Community 61 - "URL Settings Sharing (keyVaults/language"
Cohesion: 1.00
Nodes (3): URL 分享设置参数 (zh-CN), URL Settings Sharing (keyVaults/languageModel), Share settings via URL

### Community 62 - "Changelog: OpenAI O1 Models (v1.17.0, en"
Cohesion: 1.00
Nodes (3): Changelog: OpenAI O1 Models (v1.17.0, en-US), Changelog: OpenAI O1 Models (v1.17.0, zh-CN), OpenAI O1 series (o1-preview, o1-mini)

### Community 63 - "Conversation branching (continuation / s"
Cohesion: 1.00
Nodes (3): Changelog: Branch Conversations (zh-CN), Conversation branching (continuation / standalone mode), Changelog: Branch Conversations (en-US)

### Community 64 - "Data statistics dashboard & activity car"
Cohesion: 1.00
Nodes (3): Changelog: Personal Statistics & Activity Sharing (zh-CN), Data statistics dashboard & activity card, Changelog: Personal Statistics & Activity Sharing (en-US)

### Community 65 - "BlueBubbles bridge (iMessage relay)"
Cohesion: 1.00
Nodes (3): BlueBubbles bridge (iMessage relay), 将 LobeHub 连接到 iMessage, Connect LobeHub to iMessage

### Community 66 - "Vercel Fluid Compute (300s max duration)"
Cohesion: 0.67
Nodes (3): Vercel Fluid Compute (300s max duration), Vercel AI Image Generation Timeout FAQ, Vercel AI Image Generation Timeout FAQ (zh-CN)

### Community 67 - "pluginSelectors object"
Cohesion: 1.00
Nodes (3): pluginSelectors object, Zustand Selectors, Data Store Selectors Module (zh-CN)

### Community 68 - "DALL-E 3 Text-to-Image Changelog (2023-1"
Cohesion: 0.67
Nodes (3): DALL-E 3 Text-to-Image Changelog (2023-12-22), DALL-E 3 Changelog (zh-CN), Image Generation

### Community 69 - "Branching"
Cohesion: 0.67
Nodes (3): Branching, Thread (Subtopic), Topic

### Community 70 - "Cloudflare Workers AI (serverless AI on "
Cohesion: 0.67
Nodes (3): Cloudflare Workers AI (serverless AI on global edge), Using Cloudflare Workers AI in LobeHub (EN), Using Cloudflare Workers AI in LobeHub (zh-CN)

### Community 71 - "Fireworks AI (generative model inference"
Cohesion: 0.67
Nodes (3): Fireworks AI (generative model inference platform), Using Fireworks AI in LobeHub (EN), Using Fireworks AI in LobeHub (zh-CN)

### Community 72 - "Gitee AI (Git-based AI dev platform, Ser"
Cohesion: 0.67
Nodes (3): Gitee AI (Git-based AI dev platform, Serverless API), Using Gitee AI in LobeHub (EN), Using Gitee AI in LobeHub (zh-CN)

### Community 73 - "SambaNova (AI hardware/software, Palo Al"
Cohesion: 0.67
Nodes (3): SambaNova (AI hardware/software, Palo Alto), Using SambaNova in LobeHub, Using SambaNova in LobeHub (zh-CN)

### Community 74 - "SiliconCloud (SiliconFlow, GenAI platfor"
Cohesion: 0.67
Nodes (3): SiliconCloud (SiliconFlow, GenAI platform), Using SiliconCloud in LobeHub, Using SiliconCloud in LobeHub (zh-CN)

### Community 75 - "StepFun"
Cohesion: 0.67
Nodes (3): StepFun, Using StepFun in LobeHub, Using StepFun in LobeHub (zh-CN)

### Community 76 - "Taichu (Institute of Automation, CAS)"
Cohesion: 0.67
Nodes (3): Taichu (Institute of Automation, CAS), Using Taichu in LobeHub, Using Taichu in LobeHub (zh-CN)

### Community 77 - "Together AI"
Cohesion: 0.67
Nodes (3): Together AI, Using Together AI in LobeHub, Using Together AI in LobeHub (zh-CN)

### Community 78 - "Upstage (Solar)"
Cohesion: 0.67
Nodes (3): Upstage (Solar), Using Upstage in LobeHub, Using Upstage in LobeHub (zh-CN)

### Community 79 - "Google Vertex AI"
Cohesion: 0.67
Nodes (3): Google Vertex AI, Using Google Vertex AI in LobeHub, Using Google Vertex AI in LobeHub (zh-CN)

### Community 80 - "Baidu Wenxin (ERNIE)"
Cohesion: 0.67
Nodes (3): Baidu Wenxin (ERNIE), Using Wenxin (ERNIE) in LobeHub, Using Wenxin (ERNIE) in LobeHub (zh-CN)

### Community 81 - "xAI (Grok)"
Cohesion: 0.67
Nodes (3): xAI (Grok), Using xAI (Grok) in LobeHub, Using xAI (Grok) in LobeHub (zh-CN)

### Community 82 - "01.AI (Yi)"
Cohesion: 0.67
Nodes (3): 01.AI (Yi), Using 01.AI (Yi) in LobeHub, Using 01.AI (Yi) in LobeHub (zh-CN)

### Community 83 - "Zhipu AI (GLM)"
Cohesion: 0.67
Nodes (3): Zhipu AI (GLM), Using Zhipu (GLM) in LobeHub, Using Zhipu (GLM) in LobeHub (zh-CN)

## Ambiguous Edges - Review These
- `Help & Support (zh-CN)` → `Migrate from v1.x Local Database to v2.x`  [AMBIGUOUS]
  docs/usage/migrate-from-local-database.mdx · relation: references

## Knowledge Gaps
- **406 isolated node(s):** `$schema`, `cloud`, `community`, `additionalProperties`, `type` (+401 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Help & Support (zh-CN)` and `Migrate from v1.x Local Database to v2.x`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `Better Auth (authentication framework)` connect `Email Service & Better Auth` to `SSO & OIDC Authentication`, `Architecture & Contribution Guides`, `Database Deployment (Docker)`, `Redis Cache`, `Auth Migration (Clerk→Better Auth)`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `Architecture Design (en)` connect `Architecture & Contribution Guides` to `Email Service & Better Auth`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `Model Context Protocol (MCP) tools` connect `MCP & Skills` to `Skills & Tools`, `Architecture & Contribution Guides`, `Model List & Reasoning Features`, `Bot Platform & Connectors`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Better Auth (authentication framework)` (e.g. with `Clerk Authentication` and `Email Verification (AUTH_EMAIL_VERIFICATION)`) actually correct?**
  _`Better Auth (authentication framework)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `cloud`, `community` to the rest of the system?**
  _406 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SSO & OIDC Authentication` be split into smaller, more focused modules?**
  _Cohesion score 0.05115089514066496 - nodes in this community are weakly interconnected._