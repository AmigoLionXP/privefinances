# Homologação fiscal e jurídica

Referência da pesquisa: 21/10/2026. Revisão profissional **não realizada**. Não há regra aprovada no banco inicial.

## Separação entre dados e código

`rules/vaud-2025.v1.json` e `rules/vaud-2026.v1.json` contêm fontes e parâmetros em rascunho. A tabela D1 `rulesets` contém o JSON exato e seu SHA-256. Cada simulação armazena id/hash da versão e cópia cifrada de entradas e resultado.

Mudanças em valores, tetos, bandas ou fórmulas suportadas pelo intérprete são atualizações de dados. Novas categorias legais, novos fatos necessários, exceções não representáveis e novos métodos exigem extensão do esquema/código e novos testes. A promessa de “nunca alterar código” não seria correta para toda mudança legislativa.

O intérprete só aceita números, campos próprios e operações `add`, `subtract`, `multiply`, `divide`, `min`, `max`, `round`, `floor`. Profundidade máxima 24; não há `eval`, JavaScript em banco ou acesso a protótipos. Modelos completos precisam indicar explicitamente populações suportadas e componentes de imposto. Exemplos de taxas nos testes são fictícios e nunca vão para as regras produtivas.

O modelo tributável está incompleto: rendas, base ICC/IFD, patrimônio e casos familiares devem ser especificados e representados antes de aprovar uma população. O total não é uma decisão de tributação; mesmo homologado será uma estimativa com escopo expresso.

## Revisão do fiduciaire

Para cada ano, município e população:

1. Confirmar fonte primária, vigência, método de cálculo, arredondamento e versão oficial. Arquivar o documento fonte e referência documental profissional.
2. Separar ICC, imposto comunal, IFD e patrimônio. Especificar bases, abatimentos, coeficientes, quociente familiar, tetos e interações. Não usar uma única taxa média arbitrária.
3. Validar dupla atividade, estado civil, filhos/guarda, atividade independente, fonte/ordinária ulterior, mudança de residência, rendimentos estrangeiros e outros limites de população. Bloquear o que não estiver coberto.
4. Deduções: custos efetivos versus forfait, reembolsos, elegibilidade, idades, limites por pessoa/casal, limites ICC/IFD, categoria e documentação. A soma das faturas não equivale à dedução.
5. 3a: confirmar renda elegível, filiação ao 2º pilar, valor efetivamente certificado, montante ordinário e condições de rachat. Nunca somar o atestado e a fatura do mesmo pagamento.
6. Prazos: distinguir ano fiscal e ano de entrega, sujeição ilimitada/limitada, tolerância, prorrogação solicitada versus concedida, fim de sujeição e notificações individuais. Não presumir concessão.
7. Comparar resultados com casos de referência oficiais e aceitação do fiduciaire: zero renda, tetos ±0,01, fronteiras das bandas, perfis familiares, comunas e anos distintos. Registrar entradas, resultados esperados e tolerância permitida.
8. Preencher `review.reviewer`, `reference`, `approvedAt`, `validUntil`, assinatura externa/ata da homologação e `status=approved` apenas após aprovação. No sistema de produção, limitar publicação a responsáveis, com dupla revisão e trilha imutável.

`seed-rules.mjs` gera a migração inicial; não alterar uma migração já aplicada. Atualizações devem gerar **nova migração**, aposentar a regra anterior e inserir nova versão com hash, na mesma implantação transacional. A restrição do banco impede duas versões aprovadas do mesmo ano. Restaurar versão somente por nova publicação rastreável.

## Fontes oficiais consultadas

- OFAS: https://www.bsv.admin.ch/fr/votre-cotisation-au-3e-pilier — valores 3a de CHF 7.258 e, sem 2º pilar, 20% até CHF 36.288; não resolve todos os critérios individuais de elegibilidade.
- OFAS: https://www.bsv.admin.ch/fr/le-troisieme-pilier — rachat/catch-up e condições específicas a partir de 2026; não implementado.
- Vaud: https://www.vd.ch/etat-droit-finances/impots/impots-pour-les-individus/demander-un-delai-pour-deposer-ma-declaration-dimpot — calendário e extensão.
- Diretiva anual: https://www.vd.ch/fileadmin/user_upload/organisation/dfin/aci/fichiers_pdf/Directive_D%C3%A9lai_d%C3%A9p%C3%B4t_DI_PP_Demandes_unitaires.pdf — entrega do ano fiscal 2025 em 2026. Documento mutável: arquivar a versão aplicável antes de homologar.
- Vaud: https://www.vd.ch/economie/poursuites-et-faillites/procedure-de-poursuite-ordinaire/vous-etes-poursuivi-debiteur — oposição em poursuite ordinária, em regra 10 dias da notificação. O app não calcula uma data individual, pois documento, exceções e suspensões exigem análise.
- Vaud: https://www.vd.ch/prestation/demander-un-plan-de-recouvrement-personne-physique-ou-morale — acordo de pagamento.
- Vaud: https://www.vd.ch/aides-financieres-et-soutien-social/2023-parlons-cash-dettes-et-surendettement — assistência gratuita.

O módulo de dívidas informa opções. Não apresenta uma opposition, não promete remise, não calcula minimum vital e não recomenda faillite automaticamente. A revisão jurídica do texto continua necessária antes da publicação comercial.
