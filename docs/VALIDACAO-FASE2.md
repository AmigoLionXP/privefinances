# Relatório de validação — Fase 2 (scanner, documentos, Budget AI, Guia Suisse, base de Vaud)

Data: 22.10.2026 · Branch `feat/fase2-scanner-guia` (sobre a Fase 1)

## Implementado e testado

| Item | Como foi verificado |
|---|---|
| **Leitor de QR-fatura** (`public/qrbill.mjs`) conforme SIX IG QR-bill v2.3 (válida desde 21.11.2025): cabeçalho SPC/0200/1, IBAN CH/LI com módulo 97, QR-IBAN (IID 30000–31999), referência QRR (módulo 10 recursivo) e SCOR (ISO 11649), regras QR-IBAN↔QRR, valor/moeda, endereço estruturado S (K antigo só com aviso), EPD, limite de 140 caracteres, esquemas alternativos, informações Swico S1 (vencimento sugerido) | testes unitários com valores de exemplo da SIX e casos de erro |
| **Leitura no navegador**: foto (câmera), imagem, PDF (pdf.js, até 3 páginas) e texto colado; decodificação local com BarcodeDetector ou jsQR — a imagem não sai do aparelho para ser lida | Playwright: PNG, foto JPEG girada de uma página A4 e PDF A4, desktop e celular (caminho jsQR, pois o Chromium de teste não tem BarcodeDetector) |
| **Revisão obrigatória** antes de registrar; nenhum pagamento é executado | E2E: rascunho não altera o orçamento; só a confirmação registra |
| **Duplicados**: mesma referência, mesmo arquivo, mesmo documento (bloqueia sem confirmação explícita) e mesmo credor/valor em datas próximas (aviso) | testes de API e E2E (conta e modo local) |
| **Ligação ao orçamento sem contar duas vezes**: conta pontual nova, ligação a despesa existente ou só arquivo; EUR não entra no orçamento em CHF; excluir o documento remove a linha | testes de API e E2E |
| **Gestão documental**: tipos fatura QR, fatura, recibo, holerite, documento fiscal, contrato, carta; arquivo cifrado (AES-256-GCM) no R2; marcar paga; baixar; excluir; exportação inclui documentos; isolamento entre usuários | testes de API (`tests/documents.test.mjs`) |
| **Pastas virtuais** por credor, por ano fiscal e “para análise fiscal” (sem confirmar dedução) | testes unitários e E2E |
| **Termos administrativos** reconhecidos: commandement de payer (prazo de oposição de 10 dias), sommation, rappel, subside, impôt à la source, fiche de salaire, déclaration/acompte — com alerta no painel | testes e E2E |
| **Budget AI** (motor de regras, sem modelo de linguagem): aumentos de custo e contas recorrentes a partir de documentos confirmados, assinaturas, seguros, meta bloqueada, prioridade por impacto/facilidade; 8 campos por recomendação; economia realizada só depois de o usuário confirmar o novo valor | testes unitários e E2E (CHF 50/mês confirmado) |
| **Guia Suisse**: base versionada `vd-2026.10.2` com 11 entradas (subsídio LAMal VD, troca de LAMal, imposto na fonte/TOU, declaração VD, holerite, 3a, poursuites, rappel/sommation, taxa de referência, QR-fatura, método do orçamento); cada entrada tem fonte oficial, data de conferência, vigência e aviso de profissional quando necessário; sem fonte, não responde de memória e indica os portais oficiais | testes e E2E (PT e EN) |
| **IA opcional do guia**: só reescreve as entradas recuperadas; sem entrada não chama o modelo; exige consentimento e fontes revisadas | testes unitários (modelo não chamado) |
| **Inglês** em todo o app (tradução revisada do francês) | E2E: painel, scanner e guia em inglês |
| Celular sem rolagem horizontal | E2E (`scrollWidth` 390) |

Totais: `npm run check` OK · `npm test` 64/64 · E2E Playwright contra o Worker local com D1 local: todos os itens verificados.

## Parcial
- **OCR de texto** (fatura sem QR, recibo, holerite): segue a integração de IA já existente, desligada por padrão e não testada com provedor real; sem ela, os dados são digitados e conferidos pelo usuário.
- **PDFs no modo de teste sem conta**: só os dados ficam no aparelho, não o arquivo.
- **Termos administrativos**: reconhecidos por palavras-chave no texto digitado/colado; não leem a imagem.
- Recomendações “aumento de custo” e “conta recorrente” dependem de pelo menos duas faturas confirmadas do mesmo credor.

## Pendente (Fase 3)
- Módulo Business, simuladores avançados, marketplace de parceiros, assinaturas e permissões (sem cobrança real), analytics, testes de conversão, auditoria final de segurança.
- Notificações push/e-mail de vencimentos.

## Bloqueado / depende de decisão
- IA do guia e OCR em produção: exigem chave do provedor, decisão sobre processamento fora da Europa e texto de privacidade.
- Residência dos dados na UE/Suíça: não comprovada na hospedagem atual.
- Revisão jurídica da base de Vaud por profissional habilitado antes de uso público.

## Bibliotecas de terceiros
- jsQR 1.4.0 (Apache-2.0) e pdf.js 4.10.38 (Apache-2.0), em `public/vendor/` com as licenças.
