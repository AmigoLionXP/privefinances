# Relatório de validação — Fase 3 (negócio, simulações, marketplace, planos, analytics, segurança)

Data: 22.10.2026 · Branch `feat/fase3-negocio-marketplace` (sobre a Fase 2)

## Implementado e testado

| Item | Como foi verificado |
|---|---|
| **Planos e permissões** (Essencial grátis; Privé Plus CHF 6.90 e Business CHF 14.90 como hipóteses): ativação só como **piloto sem cobrança** enquanto `PAYMENTS_ENABLED` não for autorizado; cancelamento mantém os dados; MRR não conta pilotos | testes de API + E2E |
| Nunca bloqueado: orçamento, vencimentos, diagnóstico, guia oficial, alertas críticos, 3 principais recomendações, exportar/excluir | teste: saldo negativo aparece no plano gratuito; documentos existentes seguem acessíveis no limite |
| Limites do Essencial: 20 documentos e 3 recomendações (Plus/Business: completos) | testes + E2E |
| **Meu Negócio**: faturas emitidas (rascunho/enviada/paga), despesas com comprovante, faturas atrasadas, resultado, provisão AVS prudente (mínimo de CHF 530 abaixo de CHF 10 100; 10 % como teto entre 10 100 e 60 500; 10 % a partir de 60 500 — mémento 2.02, 01.01.2026), provisão de imposto só com taxa definida pelo usuário, alerta de TVA (CHF 100 000), fluxo de 13 semanas, pacote CSV para o contador | testes unitários e de API + E2E |
| **Simulador de crédito**: taxa máxima legal (10 % crédito em dinheiro, 12 % cheque especial, desde 01.01.2026), teste de 36 meses (LCC art. 28) contra a sobra do orçamento | testes + E2E (taxa de 12,9 % sinalizada) |
| **Marketplace**: escada serviço oficial gratuito → app → comparação → profissionais; ordenação por adequação, qualidade, transparência e custo, **sem comissão** (teste prova que mudar a comissão não muda a ordem); parceiro com identidade, especialidade, regiões, idiomas, serviços, condição comercial divulgada, classe regulatória separada (informação, comparação, lead, aconselhamento regulado, intermediação) e habilitação verificada obrigatória para atividade regulada | testes + E2E com parceiro fictício de demonstração |
| **Encaminhamento consentido**: consentimento por parceiro e versão de privacidade; só os campos marcados são compartilhados; retirada a qualquer momento | testes + E2E |
| **Analytics com consentimento**: lista branca de eventos e propriedades, sujeito pseudônimo, retirada apaga eventos; métricas de resolução de problemas, monetização e indicador norteador (benefício verificável + uso contínuo) | testes + E2E (painel de métricas do administrador) |
| **Testes de conversão**: experimento `upgrade_copy` (benefício × lista), atribuição determinística, exposição medida só com consentimento | testes |
| **Auditoria e retenção**: `audit_events` sem dados pessoais; limpeza de rascunhos, analytics e auditoria | testes (job de retenção) |
| **Segurança**: CSP e cabeçalhos na página, atualização do Next.js, limites de taxa novos, isolamento entre contas | ver `docs/AUDITORIA-SEGURANCA.md` |
| PT, FR e EN; celular sem rolagem horizontal | E2E |

Totais: `npm run check` OK · `npm test` 73/73 · E2E das três fases contra o Worker local: tudo verificado · `npm audit --omit=dev`: 0 vulnerabilidades.

## Parcial
- Simulações avançadas cobrem crédito e meta; leasing e seguros continuam no simulador simples.
- Métricas de receita por parceiro, receita líquida, CAC, custo de IA/atendimento e margem: estrutura pronta, sem dados reais.
- Painel de métricas existe só como API de administrador (sem tela).

## Pendente / bloqueado
Ver `docs/PENDENCIAS.md`.
