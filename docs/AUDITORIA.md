# Auditoria técnica e arquitetura — PrivéFinances

Data: 22/10/2026 · Branch: `feat/fase1-orcamento-onboarding` (a partir de `feat/onboarding-perfil-acoes`, PR #1).

## 1. Estado atual

**Stack.** Cloudflare Worker (`src/worker.mjs`) servido pela hospedagem "Sites" (`app/route.ts`, `vinext`), D1 (SQLite) e R2. Frontend estático em `public/` (HTML + módulos JS sem framework, PWA). Sem dependências de runtime no frontend.

**Autenticação.** Três modos em `src/auth.mjs`: cabeçalho da plataforma Sites (`AUTH_MODE=sites`), Cloudflare Access (JWT RS256 validado por JWKS) e usuário local só em `localhost` com `ALLOW_LOCAL_DEV=true`. Identidade guardada como hash SHA-256; e-mail cifrado.

**Dados.** Todos os payloads pessoais cifrados com AES-256-GCM, chave por versão (`DATA_KEYS`/`ACTIVE_DATA_KEY`) e contexto ligado ao usuário e ao recurso (impede trocar um registro de usuário). Exclusão em cascata por chave estrangeira.

**Testes.** 47 testes Node (D1 simulado com `node:sqlite`) + verificação Python das migrações e da paridade com o esquema de produção (Drizzle). CI no GitHub.

**Duas bases de frontend.** O app do repositório (`public/`) usa a API real; o PWA de teste entregue em 21/10 (arquivo único, `localStorage`) tem a experiência mais nova (fotos, Vida na Suíça, holerite, cartas, câmbio, envio, negócio). Manter as duas é dívida: a Fase 1 converge para o repositório.

## 2. Matriz de componentes

| Componente | Existe? | Funciona? | Ação | Prioridade |
|---|---|---|---|---|
| Autenticação | Sim (Sites/Access) | Sim, testada | Manter | Alta |
| Onboarding | Parcial (perfil de 3–6 perguntas) | Sim | **Criar fluxo de 7 etapas com retomada** | Alta |
| Dashboard | Parcial (3 cartões) | Sim | **Responder disponível / a pagar / economizar; menor saldo 30 dias** | Alta |
| Orçamento | Sim (mensal/anual/pontual) | Sim | **Motor v2: trimestral/semestral, datas, 13º, confirmado × estimado, provisões, projeção** | Alta |
| Persistência | Sim, cifrada | Sim | **Nova tabela do agregado familiar + histórico de alterações** | Alta |
| Scanner | Parcial (foto + digitação; IA desligada) | Sim (manual) | Fatura QR suíça (SPC) + confirmação + duplicados | Alta (Fase 2) |
| Documentos | Sim (pastas por credor e ano fiscal) | Sim | Integrar ao scanner e às obrigações | Alta (Fase 2) |
| Assistente IA | Adaptador pronto, desligado | Não ativo | Guia com fontes versionadas; ativar só com contrato/consentimento | Alta (Fase 2) |
| Regras de Vaud | Sim, versionadas (rascunho) | Bloqueadas sem homologação | Manter bloqueio até revisão do fiduciaire | Alta |
| Simuladores | Sim (parcelas, 3a no PWA) | Sim | Expandir (franquia LAMal, envio, negócio) | Média |
| Marketplace / leads | Sim (consentimento por vertical) | Envio desligado | Cadastro de parceiros e ordem por adequação | Média (Fase 3) |
| Assinaturas | Stripe preparado, desligado | Não ativo | Permissões por plano; sem cobrança real | Média (Fase 3) |
| Lembretes | Agenda no app; cron preparado | Envio desligado | .ics já no PWA; e-mail/push na Fase 2 | Média |
| Idiomas | PT/FR | Sim | **EN pendente** | Média |

## 3. Problemas encontrados

1. **Orçamento sem datas.** Não há dia de pagamento nem vencimento, então não é possível projetar o saldo ao longo do mês nem alertar saldo negativo antes que aconteça.
2. **Frequências limitadas.** Só mensal, anual e pontual; faltam trimestral e semestral (comuns em seguros e impostos).
3. **Sem distinção confirmado × estimado** nas rendas, nem saldo inicial confirmado.
4. **Provisões misturadas com pagamentos.** Uma despesa anual entra como 1/12 por mês, mas não aparece no mês em que é paga; a projeção de caixa fica errada no mês do pagamento.
5. **Sem meta de economia nem histórico de alterações.**
6. **Duas bases de frontend** divergentes (ver acima).
7. **Hospedagem:** o README já registra que a residência integral dos dados na Europa não está comprovada. Bloqueia dados reais.

## 4. Arquitetura alvo (monólito modular)

Um único Worker e um único banco; módulos separados por arquivo, cada um com funções puras testáveis e uma camada fina de rotas.

| Camada | Módulo | Arquivo | Estado |
|---|---|---|---|
| 1. Controle | Agregado familiar e onboarding | `src/household.mjs` | **Fase 1** |
| 1. Controle | Motor de orçamento v2 | `src/budget-engine.mjs` | **Fase 1** |
| 1. Controle | Documentos e faturas | `src/organizer*.mjs` | Existe; QR na Fase 2 |
| 2. Inteligência | Diagnóstico e recomendações | `src/budget-engine.mjs` | **Fase 1 (regras determinísticas)** |
| 2. Inteligência | Regras cantonais versionadas | `src/rules.mjs`, `rules/` | Existe |
| 2. Inteligência | Guia Suisse (fontes + IA) | `src/guide.mjs` | Existe, IA desligada |
| 3. Soluções | Leads com consentimento | `src/worker.mjs` | Existe, envio desligado |
| 3. Soluções | Parceiros e assinaturas | `src/integrations.mjs` | Fase 3 |

**Entidades.** As entidades do prompt (Households, IncomeSources, Obligations, SavingsGoals…) ficam num único documento cifrado por usuário (`households`), validado por esquema no servidor; o histórico vai para `household_events`. Motivo: o cálculo do orçamento precisa do conjunto inteiro, o volume por usuário é pequeno, e um documento cifrado evita expor colunas financeiras em claro. Se o volume justificar, as listas podem virar tabelas próprias sem mudar a API.

**Regras de cálculo.** Centavos inteiros em todo o servidor. O salário informado é sempre **líquido**: o motor recusa uma despesa de "imposto na fonte" para não descontar duas vezes. Provisões (1/12 de uma despesa anual) aparecem no orçamento mensal, mas a projeção de caixa usa a data real de cada pagamento; as duas visões nunca se somam.

## 5. Custos e dependências

Sem novas dependências de runtime nesta fase. Custos variáveis futuros: API de IA (desligada), Stripe (desligado), e-mail/push (desligado). Nenhum serviço pago foi ativado.

## 6. Fora do escopo desta entrega

Publicação em produção, cobrança real, envio a parceiros e ativação de IA exigem autorização expressa e as revisões descritas em `docs/DEPLOYMENT.md`, `docs/PRIVACY.md` e `docs/FISCAL_REVIEW.md`.
