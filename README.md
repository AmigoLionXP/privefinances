# PrivéFinances — piloto privado v0.3

**Votre App Financière**. Foco inicial: impostos, assurances e prévoyance, em português e francês.

## Disponível para teste com dados fictícios

- Orçamento detalhado: salário líquido, rendas extras, despesas por categoria, provisões anuais e lançamentos pontuais por mês. Saldo instantâneo, persistência cifrada e exportação Excel/JSON.
- Comprovantes com confirmação: arquivo por credor e por ano fiscal, agenda geral de pagamentos, vencimento e situação. Um documento tem duas vistas sem duplicar o valor no orçamento. Pasta fiscal indica análise pendente, não dedução aprovada.
- Ficha salarial confirmada pode substituir explicitamente o salário-base líquido. Importações repetidas não somam o mesmo salário.
- Guia de referência PT/FR para funcionalidades e temas selecionados de fontes oficiais suíças. Adaptador de IA preparado, mas desativado sem provedor/configuração e consentimento específico.
- Guia de economia determinístico: compara preços alternativos fornecidos pelo usuário, custos de troca e prioridades de revisão. Sem cotações de mercado, recomendações personalizadas por IA ou cancelamentos automáticos.
- Parcelas: equivalente mensal de prêmio de seguro, contribuições de prévoyance sem retorno projetado, amortização de crédito e leasing com residual hipotético. Sem oferta comercial, taxa efetiva regulatória, aprovação de crédito ou economia fiscal prometida.
- Centro de revisões semanais e mensais, agenda pessoal, exclusão de documentos e conta de teste.
- PWA PT/FR com cache apenas do shell; dados financeiros e API não ficam no cache offline.

## Limites do piloto

Usar **apenas dados e documentos fictícios**. Impostos reais e deduções continuam bloqueados: tabelas anuais em rascunho aguardam homologação profissional. OCR, geração por IA, Stripe, envio de alertas e encaminhamento a parceiros não estão ativos. A organização automática ocorre depois de identificar/preencher os campos; a extração da imagem exige ativação do provedor. Não há detecção entre duas fotos diferentes da mesma fatura.

A revisão semanal/mensal é manutenção editorial e técnica. Datas previstas não comprovam execução, nem aprovam leis automaticamente. Ver `docs/MAINTENANCE.md`. Não há atualização contínua de cotações ou sincronização bancária.

## Arquitetura e privacidade

Cloudflare Workers, D1 e R2. Dados estruturados e arquivos cifrados com AES-256-GCM, associados ao usuário e ao recurso. Pastas são vistas lógicas sobre o mesmo arquivo; caminhos físicos opacos. Chaves de execução nunca vão ao Git. A identidade Sites só é aceita no adaptador atrás do despacho autenticado da plataforma. Para Cloudflare próprio, usar Access JWT e origem configurada.

O provisionamento atual **não comprova residência integral na Europa**; localização e condições contratuais dos provedores precisam ser verificadas antes de dados reais.

- `public/`: interface, identidade visual, PWA, exportador XLSX.
- `src/organizer.mjs`: cálculo do orçamento, economia e parcelas.
- `src/organizer-routes.mjs`: plano cifrado, arquivo e agenda documental.
- `src/guide.mjs`: referências datadas e adaptador de IA com limites de fontes.
- `src/worker.mjs`: API autenticada, regras, consentimentos e integrações.
- `db/schema.ts`, `drizzle/`: esquema e migrações de produção.
- `migrations/`: esquema SQLite dos testes; não aplicar na hospedagem Sites.
- `rules/`: regras anuais versionadas. Rascunhos não geram imposto devido.

## Validação

```sh
npm run check
npm test
npm run build
```

37 testes JavaScript, validação Python de SQLite/XLSX e paridade entre schema de produção e fixtures. Incluem orçamento anual/pontual, parcelas, vencimento de fontes, consentimento de IA, isolamento de usuários, cifragem, arquivo idempotente por documento, salário sem duplicação e exclusão em cascata. A sessão de navegador local não possui identidade Sites: a gravação é verificada por testes da API, não por um login local. Instalação em celulares e aceite no endereço privado ainda precisam de teste em dispositivos reais.

Segredos e flags: `DATA_KEYS`, `ACTIVE_DATA_KEY`, `APP_ORIGIN`, `PRIVACY_VERSION`; `AI_ENABLED` para OCR, `GUIDE_AI_ENABLED` para guia, ambos também exigem `ANTHROPIC_API_KEY` e `ANTHROPIC_MODEL`. Manter falsos até configurar contrato, custos, tratamento de dados e testes do provedor. Arquivos `.dev.vars*` são ignorados.

Repositório: https://github.com/AmigoLionXP/privefinances
