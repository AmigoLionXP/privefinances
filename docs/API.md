# Contrato HTTP v0.1

Todas as rotas `/api/*`, exceto health e webhook Stripe, exigem JWT Cloudflare Access verificado. Nas mutações de usuário, `Origin` deve coincidir com `APP_ORIGIN`. Corpo JSON. Respostas e arquivos pessoais usam `Cache-Control: no-store`. Valores financeiros internos são inteiros em cêntimos CHF; taxas em pontos-base.

| Método | Rota | Uso |
|---|---|---|
| GET | `/api/health` | Versão, disponibilidade e `productionReady=false` |
| GET | `/api/me` | Identidade, versão de aviso e flags |
| GET/PUT | `/api/profile` | Perfil financeiro central |
| POST | `/api/simulations` | Mesmo objeto do perfil; persiste entradas e resultado com versão/hash |
| GET | `/api/rules?year=2026` | JSON versionado, fonte e revisão |
| GET | `/api/deadlines` | Regras aprovadas aplicáveis ao perfil salvo |
| GET/POST | `/api/receipts` | Lista ou upload `{image:base64,aiConsent:boolean,privacyVersion}` |
| POST | `/api/receipts/:id/confirm` | `{supplier,amount,date:YYYY-MM-DD,category}` |
| GET | `/api/receipts/:id/file` | Arquivo privado decifrado para seu proprietário |
| DELETE | `/api/receipts/:id` | Remove objeto e registro próprios |
| GET | `/api/debts?stage=poursuite&lang=fr` | Etapas `reminder,poursuite,saisie,faillite` |
| POST | `/api/leads` | `{name,vertical,consent:true,privacyVersion}`; e-mail vem do login |
| GET | `/api/consents` | Autorizações e status dos pedidos próprios |
| DELETE | `/api/consents/:id` | Revoga e cancela envios pendentes |
| GET/POST | `/api/reminders` | Cria `{label,date,channel:email,locale,consent:true,privacyVersion}` |
| DELETE | `/api/reminders/:id` | Cancela lembrete próprio |
| POST | `/api/checkout` | `{product:pack|review|subscription}`; flags/Price IDs do servidor |
| POST | `/api/stripe/webhook` | Corpo original + `Stripe-Signature`; sem Access/Origin |
| GET | `/api/billing` | Ledger próprio de pagamentos/assinatura |
| GET | `/api/export` | Dados próprios em JSON; frontend também gera XLSX |
| DELETE | `/api/account` | `{confirm:DELETE}`; cancela filas e remove dados ativos |

Categorias de faturas: `pillar3a,medical,childcare,transport,training,other`. Confirmação dos dados não significa confirmação de dedutibilidade.

Verticais: `lamal,pillar3a,credit,leasing,fiduciary,legal`. Toda solicitação cria uma autorização independente e um tracking ID. Nunca reutilizar consentimento de LAMal para crédito.

Perfil: ver `src/validation.mjs` e fixture em `tests/fixtures.mjs`. Campos `annualIncome,monthlyIncome,monthlyExpenses,pillar3aPaid,loanPrincipal,loanAprBps,loanMonths,lamalMonthly,leasingMonthly,children,taxYear` são números. `hasPension,hasEligibleEarnedIncome` são booleanos. `household=single|married`; `taxStatus=unlimited|limited|departure`; `municipality` texto. Valores mensais não devem duplicar LAMal/leasing em monthlyExpenses.

Erros: `{error:code}`, com 400 validação, 401 identidade, 403 origem, 404 recurso, 409 conflito, 413 tamanho, 429 limite, 502 provedor e 503 indisponibilidade/configuração. Não há detalhes sensíveis de exceções em respostas públicas.
