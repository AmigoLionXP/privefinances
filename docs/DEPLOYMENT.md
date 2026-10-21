# Configuração e entrada em operação

Nenhuma conta/recurso foi criado, nenhum gasto foi realizado e nenhum serviço externo foi ativado por esta entrega.

## GitHub

A conexão consultada disponibilizou `AmigoLionXP/AmigoLion`, `AmigoLionXP/d1-get-started` e `AmigoLionXP/moovicity-app`. Não há destino ImpotFacile identificado. O conjunto de ferramentas disponível não cria novos repositórios. Não usar um projeto alheio como destino implícito.

Criar/identificar um repositório privado na organização pretendida e disponibilizá-lo à conexão. Na pasta do projeto, depois de confirmar a URL:

```sh
git init -b main
git add .
git commit -m "Initial ImpotFacile pilot"
git remote add origin https://github.com/ORGANIZACAO/impotfacile.git
git push -u origin main
```

Não há segredos no pacote. `.dev.vars`, `.env*`, estado Wrangler e dependências são ignorados. A CI verifica código, traduções, migrações, regras e testes sem segredos. Implantação não é automática na CI.

## Cloudflare

1. Configurar conta, domínio e versão fixada do Wrangler. Substituir `APP_ORIGIN` e todos os placeholders no `wrangler.toml`.
2. Criar D1 com jurisdição **eu**, usando a opção de jurisdição do painel/CLI atual. Um location hint sozinho não é garantia de jurisdição. Registrar o `database_id` real. Verificar jurisdição antes de migrar.
3. Criar bucket R2 privado com jurisdição **eu**, confirmar no painel e no binding. Não expor URL pública `r2.dev`. A configuração `jurisdiction="eu"` seleciona o bucket correspondente; não migra um bucket existente.
4. Cloudflare Workers pode processar solicitações em infraestrutura global. D1/R2 na UE não garante todo o processamento na UE. Se o contrato exigir processamento integralmente europeu, contratar/configurar os controles regionais pertinentes e auditar cada suboperador.
5. Configurar aplicação Cloudflare Access para o domínio da interface e API, método de login e políticas de acesso para o piloto. Preencher `ACCESS_TEAM_DOMAIN` e `ACCESS_AUD`. O Worker valida a assinatura JWT por JWKS, issuer, audiência e expiração. Chaves JWKS têm cache de cinco minutos; uma rotação pode exigir nova tentativa após expirar o cache. **Excluir apenas `/api/stripe/webhook` da proteção Access** para permitir callbacks Stripe assinados; manter o resto protegido. Não expor origem alternativa sem validação.
6. Gerar 32 bytes aleatórios por chave. Configurar `DATA_KEYS` como mapa JSON base64 e `ACTIVE_DATA_KEY` por segredos Wrangler. Guardar recuperação em cofre externo. Para rotação: manter as chaves antigas para leitura, mudar chave ativa, migrar dados cifrados e testar restauração antes de retirar a chave antiga. Não há processo automático de recifragem nesta versão.
7. Aplicar migrações em ambiente de teste. Testar código com dados fictícios e `npm run check`, `npm test`, `wrangler deploy --dry-run`. Só depois executar migrações remotas e implantar no domínio protegido. `workers_dev=false` é intencional; configurar rota/custom domain na conta.
8. Fazer testes reais D1/R2, acesso por dois usuários, exclusão/retry e casos de limite de tamanho. A exclusão em D1/R2 não é transacional entre serviços; fortalecer coordenação de uploads/exclusões antes de grande concorrência. Testar restauração e aplicar o procedimento de tombstones ao restaurar backups para não ressuscitar dados excluídos.

## Claude

Definir `ANTHROPIC_API_KEY` e `ANTHROPIC_MODEL` de visão compatível com a conta. Confirmar contratos, regiões, transferência internacional, retenção e política de dados. A API direta `api.anthropic.com` desta versão não assegura processamento europeu. Para requisito estrito europeu, selecionar oferta regional contratualmente compatível e adaptar/testar o transporte, antes de ativar.

`AI_ENABLED=true` somente depois dessas decisões. Consentimento específico por imagem. Campos são não confiáveis até confirmação. Imagem em outra moeda ou leitura incerta vira revisão manual. Não enviar faturas médicas reais antes da revisão de proteção de dados.

## Stripe

Definir produtos, preços CHF, termos, entrega, tratamento tributário comercial, revisão humana contratada e política de cancelamento/reembolso. Criar Price IDs e segredos de **test mode**. Preencher três Price IDs no servidor, nunca no frontend. Endpoint de webhook: `/api/stripe/webhook`, com `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.

O handler valida os bytes originais e consulta o estado atual da assinatura para eventos desse tipo. Ainda faltam portal de cancelamento, reembolso/disputa, acesso aos produtos e reconciliação integral entre provedores e ledger. Estes são requisitos de liberação: manter `PAYMENTS_ENABLED=false` até implementá-los. Não usar dados reais de cartão para teste. Retorno do Checkout não prova pagamento.

## Entrega de leads e e-mails

`LEAD_API_URL`, `NOTIFICATION_API_URL` e respectivos tokens são endpoints HTTPS fixados pelo operador, nunca URLs fornecidas pelo usuário. Devem ter contrato e parceiro identificados. Os gateways recebem `Idempotency-Key` e `trackingId` e **precisam deduplicar**, incluindo em retries após timeouts. Cinco tentativas no cron diário; após isso, intervenção operacional.

Leads contêm somente nome, e-mail, vertical, finalidade, versão de privacidade e ID. Os comprovantes e perfil fiscal não são anexados. O gateway pode entregar ao marketplace ou enviar e-mail; o app não inclui adaptador SMTP. Revogação cancela pendentes; não recupera mensagem já entregue nem impede envio que já esteja em voo. Fortalecer coordenação/locking se a garantia de revogação estrita for necessária.

Lembretes por e-mail são pessoais, com data digitada. Calendário oficial só aparece quando a regra está aprovada. O cron é 07:00 UTC, sujeito a horário de verão quando convertido para a Suíça. Não usar como única fonte de cumprimento de prazos.

Web Push/VAPID, gestão de subscriptions push, números WhatsApp verificados, opt-in específico, templates e transporte WhatsApp não foram implementados. As solicitações para esses canais retornam erro explícito.

## Referências técnicas

- D1: https://developers.cloudflare.com/d1/configuration/data-location/
- R2: https://developers.cloudflare.com/r2/reference/data-location/
- Access: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- Claude Vision: https://platform.claude.com/docs/en/build-with-claude/vision
- Stripe: https://docs.stripe.com/webhooks
