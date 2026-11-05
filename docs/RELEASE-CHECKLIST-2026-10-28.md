# Checklist de publicação — comunicação help-first (2026-10-28)

## Escopo preparado
- Ramificação `proposal/communication-help-first-20261028` / PR #5.
- Alterações aditivas no overview, PT/FR e CSS; atalhos para budget, savings e guide.
- `app/ui-html.ts` sincronizado exatamente com `public/index.html`.
- Sem mudanças a rotas de API, base D1, objetos R2, cookies, permissões ou pagamentos.
- Sem afirmação de que OCR, IA, comparações em tempo real ou consultoria especializada já estão disponíveis.

## Validação estática feita via GitHub
- [x] `app/ui-html.ts` corresponde ao serializador de `public/index.html`.
- [x] IDs de destino de todos os `data-go` estão presentes.
- [x] Novas chaves de interface existem na tradução FR.
- [x] Entradas dos módulos `/app.mjs` e `/organizer-ui.mjs` preservadas.
- [x] Avisos do piloto com dados fictícios preservados.
- [x] Branch está 5 commits à frente de main e 0 atrás em 28/10/2026.

## Bloqueios restantes
- [ ] Aceder à **fonte canónica Sites** identificada em `.openai/hosting.json` e comparar com o espelho GitHub.
- [ ] Executar no ambiente canónico `npm run check`, `npm test`, `npm run build`.
- [ ] Validar PT/FR e botões em ecrãs desktop e mobile.
- [ ] Confirmar licenças e alegações sobre gratuitidade/monetização antes do site público.
- [ ] Publicar por meio do **mesmo** projeto Sites (não substituir por deployment de outro fornecedor).
- [ ] Ler e testar o resultado de publicação no URL pretendido.

## Segurança
Não mesclar e não publicar até confirmar os testes e a fonte canónica. Não usar dados reais no piloto. Se a fonte Sites estiver indisponível, conservar a PR como rascunho e registrar o bloqueio.
