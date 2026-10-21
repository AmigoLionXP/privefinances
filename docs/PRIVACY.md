# Proteção de dados — especificação para revisão

Este arquivo é documentação de implementação, não uma política jurídica final. O operador, contato de privacidade, parceiros e prazos efetivos de retenção ainda não foram definidos.

## Dados e finalidade

- Usuário: ID derivado do subject verificado do login; e-mail criptografado. O Access é o provedor de identidade do piloto; cadastro/login públicos próprios não foram implementados.
- Perfil e simulações: valores financeiros, composição familiar e resultados, cifrados em D1.
- Comprovantes: conteúdo cifrado em R2 e metadados extraídos cifrados em D1. Apenas imagens JPEG/PNG. Um arquivo de até 5 MB vira base64 e pode exigir memória considerável no Worker: validar concorrência/carga.
- Regras e status de entrega: não incluem detalhes das faturas; IDs/pseudônimos continuam sendo dados pessoais potencialmente correlacionáveis.
- Leads: somente nome e e-mail, área e finalidade do pedido. Consentimento por pedido/vertical, versão de aviso, data e revogação.
- OCR: autorização específica por imagem, registrada com versão e horário. A API de IA só é chamada se habilitada pelo operador e autorizada pelo usuário. Nenhuma dedutibilidade é delegada à IA.
- Stripe: Checkout hospedado evita passagem de dados de cartão pelo app. Dados de transação são retidos pelo provedor segundo seus deveres e contratos.

## Segurança implementada

TLS na implantação; AES-256-GCM na aplicação com IV aleatório e AAD ligado a proprietário/recurso; chaves fora do repositório; consultas preparadas; checagem de proprietário; proteção de origem nas mutações; assinatura Stripe; validação de campos; rate limit autenticado básico; cabeçalhos CSP; nenhuma cache de API no service worker. O service worker guarda somente a interface, sem extratos, faturas ou respostas de API. A PWA offline apresenta a interface, mas não oferece processamento offline de dados pessoais.

Não é criptografia ponta a ponta: o servidor precisa decifrar os documentos para leitura e transmissão autorizada à IA. Operadores com acesso aos segredos podem decifrar; definir controles de acesso e segregação operacional.

São necessários testes de penetração, gestão de acesso administrativo, plano de incidente, monitoramento sem dados sensíveis e avaliação da necessidade de análise de impacto, sobretudo se forem recebidos documentos de saúde. Não registrar imagens, conteúdo das requisições, chaves ou respostas da IA em logs de plataforma.

## Exclusão e direitos

A interface oferece exportação JSON/XLSX, exclusão individual de comprovante e exclusão da conta. A exclusão de conta marca o usuário para limpeza, cancela pendências, remove objetos R2 do prefixo do proprietário e remove dados ativos em cascata. Falhas de limpeza são retomadas pelo cron. Uma assinatura ativa precisa de cancelamento por suporte: portal self-service ainda pendente.

Backups, retenção legal de faturamento, Access, Stripe, IA e destinatários externos exigem procedimentos próprios. Exclusão do banco ativo não é promessa de apagar instantaneamente backups ou mensagens já entregues. Estabelecer prazo de resposta, expiração de backups, tombstones de restauração e retenção legal antes de publicar a política.

Não há ainda exclusão automática por inatividade nem endpoint administrativo de gestão de direitos por suporte. Definir retenções proporcionais à finalidade e programar os jobs correspondentes após revisão jurídica.

## Localização e subcontratação

Configurar D1/R2 na jurisdição UE. Isso não assegura que Workers, observabilidade, suporte, IA, pagamentos ou gateways processem exclusivamente na Europa. A conformidade nLPD depende dos contratos, finalidade, informações dadas, segurança, transferências e gestão efetiva dos direitos; não é obtida só com um bucket europeu ou uma caixa de consentimento.

Fontes primárias consultadas em 21/10/2026:

- PFPDT: https://www.edoeb.admin.ch/fr/traitement-de-donnees-dans-un-nuage-informatique
- PFPDT: https://www.edoeb.admin.ch/fr/communication-de-donnees-a-letranger
- Cloudflare D1/R2: referências em DEPLOYMENT.md.

Antes de habilitar qualquer envio, identificar o destinatário real no aviso apresentado ao usuário. O consentimento genérico de piloto não autoriza divulgar dados a uma lista indeterminada de parceiros.
