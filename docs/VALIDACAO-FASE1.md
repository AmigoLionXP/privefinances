# Relatório de validação — Fase 1 (orçamento + onboarding)

Data: 22.10.2026 · Branch `feat/fase1-orcamento-onboarding`

## Implementado e testado

| Item | Como foi verificado |
|---|---|
| Motor de orçamento v2 (`public/budget-engine.mjs`, compartilhado servidor/PWA): centavos inteiros, frequências mensal/trimestral/semestral/anual/pontual, confirmado × estimado, provisões separadas, 13º diluído e datado | `tests/budget.test.mjs` |
| Projeção de 30 dias por data real, menor saldo e data, alerta de saldo negativo | testes unitários + E2E (menor saldo CHF 800.00 em 22.10.2026) |
| Imposto na fonte não pode ser lançado de novo (`source_tax_already_deducted`) | teste de validação |
| Meta × capacidade, sem promessa; até 3 recomendações, economia só quando o usuário digita o valor-alvo, sem preço inventado | testes unitários |
| API `GET/PUT /api/household`, `GET /api/household/history`, `POST /api/household/recommendation`; agregado cifrado (AES-256-GCM) com contexto por usuário; histórico; export; isolamento entre usuários | teste de API com D1 em memória |
| Migração aditiva `0004_household.sql` (sem alteração destrutiva) e espelho Drizzle | `schema_test.py` / `npm run check` |
| Onboarding de 7 etapas no PWA, salvo no servidor e retomado após recarregar | Playwright contra o Worker local (wrangler dev + D1 local), desktop 1280px e celular 390px |
| Painel: disponível no mês, a pagar em 30 dias, menor saldo previsto, gráfico de 30 dias, próximos vencimentos, alertas, meta, recomendações, ações rápidas | E2E: CHF 5'416.67 − 2'280.00 = 3'136.67 conferido |
| Navegação Início / Orçamento / Scanner / Soluções / Perfil; sem rolagem horizontal no celular | E2E (`scrollWidth` = largura da tela) |
| Indicador "conta conectada" × "dados só neste aparelho" | E2E |

## Parcial
- Idiomas: PT e FR completos (checagem automática de traduções FR); EN ainda não.
- Recibos, holerites e cartas: funcionam no PWA, mas ficam só no aparelho (não sincronizados).
- Recomendações com estado são persistidas, mas o painel ainda não mostra o histórico de mudanças.

## Pendente (fases 2 e 3)
- Scanner de QR-bill (especificação SIX), detecção de duplicados, pastas fiscais.
- Budget AI e Guia Suisse AI com fontes oficiais versionadas.
- Módulo Business, simuladores avançados, marketplace de parceiros, permissões de assinatura (sem cobrança real), analytics.

## Bloqueado / depende de decisão
- Residência dos dados na UE/Suíça: não comprovada na hospedagem atual.
- Publicação em produção: não feita (fora do escopo autorizado).
- Cobrança real dos planos: não implementada (CHF 6.90 / 14.90 são hipóteses).
