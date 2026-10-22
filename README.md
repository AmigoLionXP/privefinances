# PrivéFinances — piloto privado v0.4

**Votre App Financière · Seu app financeiro.** Para quem trabalha e empreende na Suíça (piloto: cantão de Vaud), em português, francês e inglês.

> Usar **apenas dados e documentos fictícios** no piloto. Nenhuma cobrança real, nenhum pagamento executado, nenhuma publicação em produção.

## O que o app faz

| Área | Funções |
|---|---|
| Onboarding (7 etapas) | Perfil (comuna, situação, permis, imposto na fonte), rendimentos com 13º, família, despesas com frequências, diagnóstico e plano de economia; salva e retoma |
| Painel | Disponível no mês, a pagar em 30 dias, menor saldo previsto, projeção diária, vencimentos, alertas, meta, recomendações |
| Orçamento | Motor em centavos: confirmado × estimado, provisões para contas trimestrais/semestrais/anuais, sem recontar imposto na fonte |
| Scanner | QR-fatura (SIX v2.3) por foto, imagem, PDF ou texto; leitura no aparelho; revisão obrigatória; duplicados; ligação ao orçamento sem dupla contagem |
| Documentos | Faturas, recibos, holerites, cartas, contratos; arquivo cifrado; pastas por credor, ano fiscal e análise fiscal; termos como *commandement de payer* |
| Budget AI | Regras auditáveis: aumentos de custo, recorrentes fora do orçamento, meta, seguros, assinaturas; economia só conta depois de confirmada |
| Guia Suisse | Base de Vaud versionada (`public/canton-vd.mjs`) com fonte oficial, data de conferência e vigência; sem fonte, não responde de memória |
| Meu Negócio | Faturas emitidas, despesas, provisões AVS/imposto, alerta de TVA, fluxo de 13 semanas, CSV para o contador |
| Simulações | Crédito com taxa máxima legal e teste de 36 meses contra o orçamento; parcelas, LAMal, 3a, envio de dinheiro |
| Soluções | Serviço oficial gratuito → app → comparação → profissionais; parceiros ordenados sem comissão; encaminhamento só com consentimento |
| Planos | Essencial, Privé Plus, Privé Business (preços = hipóteses); só piloto sem cobrança até autorização |
| Privacidade | Exportar e excluir conta; consentimentos por finalidade; analytics opcional |

## Arquitetura

Monólito modular: **Worker Cloudflare** (`src/worker.mjs`) + **D1** (SQLite) + **R2** (arquivos), servido pela hospedagem Sites (`app/`). A interface é um PWA sem framework (`public/`). Os motores puros ficam em `public/` e são usados pelo servidor e pelo navegador:

| Módulo | Arquivo |
|---|---|
| Budget Engine | `public/budget-engine.mjs` |
| Document Engine (QR-fatura, duplicados, pastas, termos) | `public/qrbill.mjs`, `public/documents.mjs`, `src/documents*.mjs` |
| Swiss Rules (base de Vaud) | `public/canton-vd.mjs`, `src/guide.mjs` |
| Negócio e simulações | `public/business-engine.mjs`, `public/simulators.mjs` |
| Billing (planos/permissões) | `public/plans.mjs`, `src/phase3-routes.mjs` |
| Partner Service | `public/solutions.mjs`, `src/phase3-routes.mjs` |
| Analytics, auditoria, plano atual | `src/telemetry.mjs`, `public/experiments.mjs` |
| Agregado familiar | `src/household*.mjs` |

Dados pessoais cifrados com AES-256-GCM e contexto ligado ao dono. Migrações: `drizzle/` (produção) e `migrations/` (testes, mesmo esquema verificado por `tests/schema_test.py`). Bibliotecas no navegador: jsQR e pdf.js em `public/vendor/` (Apache-2.0).

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `DATA_KEYS`, `ACTIVE_DATA_KEY` | Chaves AES (JSON `{id: base64 32 bytes}`) e a chave ativa — obrigatórias |
| `APP_ORIGIN`, `PRIVACY_VERSION` | Origem aceita em escrita; versão do aviso de privacidade exigida nos consentimentos |
| `AUTH_MODE` | `sites` na hospedagem Sites; senão Cloudflare Access (`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`) |
| `ALLOW_LOCAL_DEV` | `true` só em desenvolvimento local |
| `ADMIN_EMAILS` | E-mails com acesso a `/api/admin/*` (parceiros e métricas) |
| `PAYMENTS_ENABLED`, `STRIPE_*` | Cobrança — manter `false` até autorização |
| `AI_ENABLED`, `GUIDE_AI_ENABLED`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | OCR e IA do guia — manter `false` até contrato, custos e privacidade |
| `DELIVERY_ENABLED`, `LEAD_API_*`, `NOTIFICATION_API_*` | Entrega de lembretes e contatos — desligado |
| `SHOW_DEMO_PARTNERS` | Mostra parceiros de demonstração (só testes) |
| `TODAY_OVERRIDE` | Data fixa para testes |

Arquivos `.dev.vars*` são ignorados pelo Git.

## Executar e testar

```sh
pnpm install
npm run check        # sintaxe, traduções FR, regras
npm test             # 73 testes (motores, API, segurança) + paridade de esquema
npm run build
# local: criar dist/server/.dev.vars, aplicar drizzle/*.sql no D1 local e
npm start            # http://127.0.0.1:8787
```

Testes de navegador (Playwright) foram executados contra o Worker local nas três fases; ver `docs/VALIDACAO-FASE1.md`, `-FASE2.md`, `-FASE3.md`.

## Documentos

- `docs/AUDITORIA.md` — auditoria inicial e arquitetura-alvo
- `docs/AUDITORIA-SEGURANCA.md` — auditoria de segurança e privacidade
- `docs/VALIDACAO-FASE1.md`, `docs/VALIDACAO-FASE2.md`, `docs/VALIDACAO-FASE3.md` — o que foi testado
- `docs/PENDENCIAS.md` — pendências e bloqueios
- `docs/MAINTENANCE.md` — revisão das fontes

Repositório: https://github.com/AmigoLionXP/privefinances
