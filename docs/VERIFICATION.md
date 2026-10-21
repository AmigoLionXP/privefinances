# Resultado da verificação — 21/10/2026

- `npm run check`: aprovado. Sintaxe de todos os módulos, cobertura das chaves de interface em francês e regeneração determinística do seed.
- `npm test`: **24 testes JavaScript aprovados**, mais verificação Python das migrações SQLite e do arquivo XLSX.
- SQLite real em memória, com schema e migrações da aplicação. Adaptador D1 executa SQL preparado e transações para `batch`.
- R2 em memória e respostas de integrações simuladas. Nenhum envio, cobrança ou dado real de usuário foi utilizado.

## Comportamentos verificados

Perfil → simulação persistida → exportação; criptografia AES-GCM e contexto de proprietário; rotação de chave para leitura; Access JWT com assinatura RSA/audiência/expiração; rejeição de origem indevida e JSON excessivo; ausência de bypass local em host remoto; upload sem confirmação automática; isolamento entre proprietários; confirmação/exclusão de comprovante; bloqueio fiscal para regras rascunho/inexistentes/expiradas/ano errado; integridade SHA-256; tetos 3a básicos; exclusão de comprovantes de ano diferente; acumulação de teto/limiar; não duplicação de 3a; cálculo progressivo sintético e fronteiras; fórmulas declarativas sem execução de código; orçamento e crédito sem juros; consentimentos separados e revogáveis; entrega desabilitada por padrão; payload mínimo e chave idempotente no gateway; retries limitados; assinatura Stripe sobre bytes originais e tolerância temporal; deduplicação de evento e pagamento; exclusão de conta em cascata; XLSX com CRC e XML válidos sem células de fórmula injetadas.

## Limites da verificação

Wrangler e recursos Cloudflare não estão provisionados neste ambiente. Não foi realizado deploy, dry-run de bundle, ensaio no runtime real de Workers, integração com contas Stripe/Claude, auditoria nLPD ou homologação fiscal/jurídica. A interface ainda não passou por QA visual em navegador nem teste de instalação em celulares. O estado fiscal permanece bloqueado por desenho até homologação. Estes resultados não significam liberação para produção.
