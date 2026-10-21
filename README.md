# PrivéFinances - piloto privado v0.2

**Votre App Financière**. Identidade com coruja, azul-marinho, verde-petróleo e menta.

## Serviços disponíveis para teste

- Perfil e orçamento mensal com saldo atualizado durante o preenchimento.
- Exemplo fictício que preenche e guarda um orçamento de demonstração.
- Histórico da última simulação e restauração do perfil ao voltar ao app.
- Arquivo de imagens de comprovantes, preenchimento manual, confirmação, download e exclusão.
- Agenda pessoal consultável no app, sem envio externo.
- Exportação XLSX e JSON e exclusão do espaço de teste.
- Interface PT/FR, manifesto e service worker PWA; somente o shell é armazenado em cache.

O piloto é privado e usa a identidade de visitante fornecida pelo Sites. Registros estruturados são guardados em D1 e documentos em R2, cifrados com AES-256-GCM e contexto por usuário/recurso. Os segredos ficam na configuração de execução, nunca no repositório.

**Usar apenas dados e documentos fictícios.** O provisionamento do piloto não comprova residência integral de dados/processamento na Europa. A localização e as condições de tratamento precisam de verificação contratual antes de dados reais.

## Recursos que continuam desativados

Impostos reais/deduções, OCR externo, pagamentos, envios de e-mail/push/WhatsApp e encaminhamento a parceiros. Não há cobrança, promessa de economia fiscal ou transmissão de imagens à IA neste piloto. A agenda não executa alertas externos.

O motor fiscal e os adaptadores permanecem no código para as próximas fases. As tabelas anuais estão em rascunho. A passagem para produção exige homologação fiscal/jurídica, fluxos comerciais completos, configuração operacional e testes com provedores reais.

## Arquitetura

- `public/`: interface HTML/CSS/JS, PWA, logo e exportador XLSX.
- `src/`: núcleo Workers, regras, criptografia, identidade e integrações.
- `app/route.ts`: entrega do HTML; `app/api/[...path]/route.ts`: adaptação da API ao ambiente Sites.
- `db/schema.ts` e `drizzle/`: esquema e migrações de produção, gerados com Drizzle.
- `migrations/`: esquema SQLite de referência dos testes do núcleo e seed de teste; não é o diretório de migração da implantação Sites.
- `rules/`: tabelas anuais rastreáveis. O seed controlado de rascunhos é feito fora das migrações de schema.
- `tests/`: regras, segurança, API, isolamento, agenda, armazenamento e exportação.

## Desenvolvimento e validação

```sh
npm run check
npm test
npm run build
```

A instalação usa `pnpm-lock.yaml` e o package manager declarado. Preserve as integrações e scripts do starter Sites. A rota que aceita identidade `oai-authenticated-user-*` é exclusiva de hospedagem atrás do despacho autenticado Sites. Não publicar esse adaptador diretamente em uma origem aberta; na migração para Cloudflare próprio, usar a validação Access JWT do núcleo e configurar o domínio correto.

`DATA_KEYS`, `ACTIVE_DATA_KEY`, `APP_ORIGIN`, `PRIVACY_VERSION` e flags são configuração de execução. Arquivos `.dev.vars*` locais são ignorados. Não copiar chaves de teste para produção. A migração inicial de produção contém apenas schema; dados fiscais em rascunho são inseridos de forma controlada quando consultados.

## Verificação desta versão

29 testes JavaScript e verificações Python de SQLite e XLSX passaram. Build para Workers realizado. Revisão visual local confirmou a identidade e o saldo instantâneo com valores fictícios. A sessão de revisão local não tem identidade de visitante do Sites, portanto o caminho de gravação não foi confirmado por essa sessão de navegador; a API e a separação entre usuários foram testadas automatizadamente. Teste de instalação em dispositivos reais e aceite de usuário no endereço privado continuam necessários.

O endereço do piloto e o vínculo de fonte são geridos pelo manifesto `.openai/hosting.json`. O repositório GitHub próprio do usuário será conectado quando estiver disponível.
