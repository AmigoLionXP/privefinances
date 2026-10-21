# Manutenção do piloto

Escopo: impostos Vaud, assurances e prévoyance. Interface PT/FR, marca PrivéFinances. Apenas dados fictícios até validar residência e tratamento de dados.

## Revisão semanal

Consultar fontes oficiais já listadas em `src/guide.mjs`, inclusive AFC, Vaud, OFSP, OFAS e Priminfo. Verificar links, novidades e prazos relevantes. Registrar fontes consultadas, data, mudanças e pendências em relatório versionado. Atualizar `checkedAt` apenas para fontes efetivamente conferidas, preservando avisos quando uma fonte não puder ser verificada. Não inferir aprovação profissional.

## Revisão mensal

Revisar orçamento, cenários de economia, parcelas, acessibilidade, tradução, dependências e testes. Verificar o estado das regras anuais, consentimentos, retenção e integrações. Preparar mudanças rastreáveis e relatório com pendências. Não ativar serviços pagos ou alterar audiência/privacidade.

## Acesso e publicação

A fonte canônica é o repositório gerido por Sites associado ao projeto em `.openai/hosting.json`; GitHub `AmigoLionXP/privefinances` espelha as alterações. Uma tarefa futura deve abrir o Site existente com as ferramentas Sites, renovar credencial efêmera e usar o helper de fonte descrito no skill Sites. Nunca armazenar credenciais, depender de sessão de navegador ou de arquivos locais transitórios. Fonte e writer foram acessados com sucesso durante a preparação desta versão.

Para mudanças autorizadas de interface e referências, executar `npm run check`, `npm test`, sincronizar HTML (`scripts/sync-ui.mjs`) e build pelo helper Sites; salvar e publicar no mesmo projeto privado. Ler a publicação de volta pelo resultado nativo. Espelhar GitHub usando atualização com lease; não sobrescrever contribuições concorrentes. Se acesso ou ferramenta falhar, registrar impedimento e não afirmar publicação. Operações de dados pessoais dependem do usuário autenticado, não de uma tarefa de manutenção.

## Regras fiscais e fontes

Uma mudança legal pode exigir análise profissional: manter tabelas em rascunho até aprovação identificada do fiduciaire. Não aprovar automaticamente alíquotas, deduções, elegibilidade ou prazos. Não renovar a data da revisão sem consultar a fonte. Nenhuma tarefa pode transmitir documentos de usuários à IA, parceiros ou terceiros.

As datas no centro de atualizações são metas de revisão, não comprovação de tarefas concluídas. O estado dos agendamentos é fornecido pelo serviço de tarefas ligado ao Site e precisa ser conferido antes de criar outro.
