# Auditoria de segurança e privacidade — PrivéFinances 0.4.0

Data: 22.10.2026 · Escopo: código deste repositório (Worker, PWA, migrações). Não cobre a infraestrutura da hospedagem nem um teste de intrusão externo.

## Resultado

| Controle (prompt mestre §15) | Situação | Evidência |
|---|---|---|
| Autenticação segura | OK | Identidade vem da plataforma (Sites) ou de Cloudflare Access (JWT RS256 com audiência, emissor e validade verificados); modo local só em localhost com flag explícita | `src/auth.mjs`, `tests/security.test.mjs` |
| Autorização por usuário e por recurso | OK | Toda consulta filtra por `user_id`; testes de isolamento entre contas para agregado, documentos, negócio e encaminhamentos | `tests/budget.test.mjs`, `tests/documents.test.mjs`, `tests/phase3.test.mjs` |
| Administração | OK, com ressalva | Rotas `/api/admin/*` só para e-mails em `ADMIN_EMAILS`; ressalva: sem segundo fator próprio — depende do login da plataforma | `src/phase3-routes.mjs` |
| Criptografia em trânsito | OK na hospedagem | HTTPS da plataforma; nenhuma chamada externa em HTTP |
| Criptografia em repouso | OK | AES-256-GCM com IV aleatório e contexto ligado ao dono (`household:`, `doc:`, `docfile:`, `business:`, `referral:`), rotação de chaves | `src/crypto.mjs` |
| Isolamento de documentos | OK | Arquivos no R2 sob prefixo do usuário, cifrados; download só pelo dono; hash de arquivo ligado ao usuário | `src/documents-routes.mjs` |
| Armazenamento privado / PWA offline | OK | O service worker guarda só a interface; nunca `/api/`; documentos e dados pessoais não ficam em cache | `public/sw.js` |
| Logs de auditoria | Implementado | `audit_events` sem conteúdo pessoal (sujeito pseudônimo): exportação, exclusão de conta, plano, encaminhamento, parceiro, documento, consentimento | `src/telemetry.mjs` |
| Política de retenção | Implementado | Rascunhos 30 dias (com arquivo), analytics 400 dias, auditoria 24 meses, rate limits expirados | `src/jobs.mjs` |
| Exportação e exclusão | OK | `/api/export` (inclui documentos, negócio, plano, encaminhamentos) e `/api/account` com purge do R2 | `src/worker.mjs` |
| Consentimentos granulares | OK | Separados por finalidade: IA/OCR, contato com parceiro (por parceiro), lembretes, analytics; retirada revoga e, para analytics, apaga os eventos | `tests/phase3.test.mjs` |
| Segredos | OK | Chaves só em variáveis do servidor; nenhuma chave no frontend (busca por padrões no `public/`) |
| Custos de IA/APIs | OK | IA e OCR desligados por padrão; limites por hora (geral 300, guia 15, upload 30/60, eventos 120, encaminhamentos 10) |
| Duplicações | OK | Duplicados de faturas bloqueados sem confirmação; eventos de cobrança idempotentes |
| Injeção de prompt | Mitigado | Guia: o modelo só recebe trechos da base oficial e a pergunta é marcada como não confiável; sem trecho, o modelo não é chamado. OCR: imagem tratada como não confiável e saída validada por esquema |
| Cabeçalhos de segurança | **Corrigido nesta fase** | A página HTML era servida sem CSP. Agora: CSP (`script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`), `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` via `_headers`, meta CSP e rota | `public/_headers`, `public/index.html`, `app/route.ts` |
| Dependências | **Corrigido nesta fase** | `next` 16.3.4 tinha avisos críticos (GHSA-vcvr-r3jv-pc5j e outros) → atualizado para 16.3.8; `npm audit --omit=dev`: 0 vulnerabilidades | `package.json`, `pnpm-lock.yaml` |
| Bibliotecas de terceiros no navegador | OK | jsQR 1.4.0 e pdf.js 4.10.38 servidos do próprio domínio, versão fixa, licenças incluídas; pdf.js com `isEvalSupported:false` | `public/vendor/` |

## Riscos residuais
1. `style-src 'unsafe-inline'` é necessário porque a interface usa atributos `style`; scripts continuam restritos ao próprio domínio.
2. Modo de teste sem conta guarda dados (inclusive miniaturas de recibos) no `localStorage` do aparelho — avisado na interface; não usar em aparelho compartilhado.
3. Residência dos dados (UE/Suíça) da hospedagem atual não comprovada.
4. Sem teste de intrusão externo nem revisão de um DPO/jurista (LPD).
5. Encaminhamento a parceiros grava o pedido, mas a entrega ao parceiro ainda não existe; quando existir, precisa de contrato de tratamento de dados.
