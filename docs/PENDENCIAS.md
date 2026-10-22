# Relatório de pendências — PrivéFinances após as Fases 1, 2 e 3

Data: 22.10.2026 · Versão 0.4.0 · PRs encadeados: #1 → #2 → #3 → #4 (mesclar nesta ordem)

Legenda: ✅ implementado e testado · 🟡 parcial · ⏳ pendente (desenvolvimento) · ⛔ bloqueado (decisão, credencial ou revisão externa)

## 1. Critérios de aceite do MVP (prompt mestre §20)

| # | Critério | Situação | Observação |
|---|---|---|---|
| 1 | Criar conta e iniciar sessão | 🟡 | Login vem da plataforma (Sites) ou do Cloudflare Access; testado com identidade simulada. Login no endereço real ainda não foi testado; não há cadastro próprio |
| 2 | Concluir onboarding | ✅ | 7 etapas, retomada |
| 3 | Registrar salário líquido | ✅ | Com 13º e data de recebimento |
| 4 | Adicionar rendas extras | ✅ | Confirmadas × estimadas, variáveis |
| 5 | Criar orçamento | ✅ | |
| 6 | Registrar despesas | ✅ | Mensais a anuais e pontuais |
| 7 | Importar fatura QR | ✅ | Foto, imagem, PDF, texto (SIX v2.3) |
| 8 | Confirmar dados extraídos | ✅ | Revisão obrigatória |
| 9 | Arquivar documentos | ✅ | Cifrados, pastas por credor/ano/fiscal |
| 10 | Visualizar vencimentos | ✅ | Painel e documentos |
| 11 | Receber alertas | 🟡 | Alertas dentro do app funcionam; envio por e-mail/push não está ativo |
| 12 | Projetar saldo e fluxo de caixa | ✅ | 30 dias (pessoal) e 13 semanas (negócio) |
| 13 | Registrar meta | ✅ | Comparada com a capacidade |
| 14 | Sugestões verificáveis | ✅ | 8 campos, economia só confirmada |
| 15 | Orientações oficiais de Vaud | 🟡 | 11 temas com fonte e vigência; falta revisão por profissional habilitado |
| 16 | Exportar e excluir dados | ✅ | |

Também entregues e verificados: próximo salário e faturas atrasadas no painel; rendimentos extraordinários como renda pontual; despesas que travam a meta (Budget AI).

Testes complementares: celular ✅ (emulado, não em aparelho real) · idiomas PT/FR/EN ✅ · dados incompletos ✅ · leitura incorreta ✅ (QR inválido recusado; OCR de texto não ativo) · duplicados ✅ · faturas anuais ✅ · 13º ✅ · renda variável 🟡 (campo existe, sem projeção de variação) · mês negativo ✅ · falha de rede 🟡 (modo local de reserva, sem teste sistemático) · atualização do PWA 🟡 (versão de cache, não testada em aparelho) · acesso entre usuários ✅ · cancelamento de assinatura ✅.

## 2. Bloqueado — depende de decisão sua ou de terceiros ⛔

| Item | O que falta | Quem decide |
|---|---|---|
| Cobrança real dos planos | Validar preços (hoje hipóteses CHF 6.90 / 14.90), conta Stripe, preços configurados, TVA sobre assinaturas, condições gerais e de cancelamento; depois ligar `PAYMENTS_ENABLED` | Marcelo + fiduciária |
| IA (OCR de recibos e reescrita do guia) | Contrato com o provedor, decisão sobre tratamento fora da Europa, teto de custo, aviso de privacidade atualizado | Marcelo + jurídico |
| Residência dos dados na Europa/Suíça | Hospedagem atual não comprova; decidir hospedagem própria (Cloudflare com jurisdição UE ou alternativa suíça) | Marcelo |
| Publicação em produção e domínio | Só depois dos itens acima e de testes com usuários piloto | Marcelo |
| Parceiros reais | Contratos, verificação de habilitação (registro FINMA para intermediários de seguros, autorização cantonal LCC para intermediários de crédito, fiduciárias), acordo de tratamento de dados, divulgação de comissão | Marcelo + jurídico |
| Enquadramento regulatório do PrivéFinances | Avaliar se encaminhamentos e comparações tornam o app intermediário (FINMA/LSA, LCC) e obrigações da LPD | Advogado |
| Base cantonal e textos | Revisão da base de Vaud (11 temas), política de privacidade e termos por profissional habilitado | Fiduciária / jurista |
| Cálculo de imposto devido | Tabelas fiscais em rascunho (`rules/`) aguardando homologação; o app não calcula imposto | Fiduciária |

## 3. Pendente — desenvolvimento ⏳

Prioridade alta
1. **Revisão semanal das fontes da base de Vaud**: as fontes jurídicas foram conferidas em 21–22.10.2026 e vencem em 7 dias; depois disso a IA do guia fica bloqueada (o guia de referência continua funcionando, com o aviso “fonte em revisão”).
2. **Notificações** de vencimentos e prazos (e-mail/push) com consentimento — falta o provedor de envio.
3. **Testes em aparelhos reais** (iPhone/Safari sem BarcodeDetector, Android, câmera, instalação do PWA) e auditoria de acessibilidade (WCAG).
4. **Tela de administração** (parceiros e métricas) — hoje só existe a API.
5. **Entrega do encaminhamento ao parceiro** (e-mail/API) e portal do parceiro — hoje o pedido fica registrado, sem envio.

Prioridade média
6. **Transações bancárias**: importação de extrato (CSV/camt.053) para conciliar o previsto com o realizado — entidade “Transactions” do prompt ainda não existe.
7. **Módulos de soluções** (§11): Minha Carreira ⏳ não iniciado; Minha Habitação 🟡 (taxa de referência); Meu Futuro 🟡 (3a básico; faltam AVS/LPP); Economize nos Seguros 🟡 (LAMal); Minhas Simulações 🟡 (crédito avançado; leasing e seguros no modo simples); Impostos sem Mistério ⛔ (depende das tabelas).
8. **Sincronizar com a conta** as funções antigas que ainda ficam só no aparelho: conferência de holerite, lembretes manuais, checklists de chegada/saída, envio de dinheiro.
9. **Histórico** de recomendações e de metas alcançadas na interface (os dados já são guardados).
10. **OCR sem IA** como alternativa (no aparelho) para faturas sem código QR.

11. **Cenários de orçamento** (§7, regra 6): simular aumento ou redução de uma despesa/renda e ver o efeito na projeção — não implementado.
12. **Revisão de contratos** (§4 e §10): apontar contratos que merecem revisão (prazos de rescisão de seguros, telefone, aluguel) e incluir os temas “contratos” e “trabalho” na base de Vaud.
13. **Alertas avançados do Privé Plus** (§13): a permissão existe, mas ainda não há alertas extras (ex.: aviso X dias antes de cada vencimento, aumento de fatura) que diferenciem o plano.
14. **Dívidas e prestações** (§11 “Minhas Contas”): faturas em aberto, atrasos, guia de dívidas e simulador de crédito existem; falta um registro de dívidas/prestações com plano de pagamento.
15. **Performance**: medir carregamento e peso do PWA (Lighthouse) em celular; o pdf.js (≈1,8 MB) já só carrega ao abrir um PDF.
16. **Monitorar a norma SIX** da QR-fatura (novas versões) dentro da revisão periódica de fontes.

Prioridade baixa
17. Outros cantões (motor já é versionado por cantão).
18. Métricas ainda sem dados: receita por parceiro, receita líquida, custo de aquisição, custo de IA/atendimento, margem.
19. Painel de métricas com gráficos; testes A/B adicionais.
20. Medir o critério de UX “registrar uma fatura e ver o saldo em poucos toques” em teste com usuários.

## 4. Riscos e observações
- Modo de teste sem conta guarda dados no navegador do aparelho (avisado na tela).
- `style-src 'unsafe-inline'` mantido por causa de estilos em atributos; scripts restritos ao domínio.
- A loja de parceiros está vazia de propósito: nenhum parceiro real foi inventado; o parceiro dos testes é fictício e só aparece com `SHOW_DEMO_PARTNERS`.
- Nenhum preço de mercado é exibido; economias só vêm de valores informados pelo usuário ou de documentos confirmados.

## 5. Próximos passos recomendados
1. Mesclar os PRs #1 → #4 depois de revisar, e publicar num ambiente de teste fechado.
2. Decidir hospedagem com dados na Europa/Suíça e a política de privacidade.
3. Rodar um piloto com 10–20 usuários reais com dados fictícios, medindo o indicador norteador (benefício verificável + uso contínuo).
4. Com o retorno do piloto, validar preços e só então autorizar a cobrança.
5. Fechar o primeiro parceiro (ex.: fiduciária) com contrato, habilitação verificada e divulgação de comissão.
