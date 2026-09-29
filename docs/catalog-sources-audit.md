# Auditoria final de fontes de catálogo e preços — CompraFácil

**Escopo da síntese original.** Este relatório preserva a síntese dos nove resultados estruturados recebidos (GS1 Brasil, Kodebar, Datakick, BH Supermercados, Supernosso, Mart Minas, Apoio Mineiro, Carrefour Brasil e Assaí) e da auditoria pública SuperLuna existente em `docs/superluna-audit.md`, datada de 28/09/2026. As seções históricas não foram reavaliadas. O adendo datado de 29/09/2026 acrescenta a auditoria separada Mercado Livre via GeckoAPI; ele não altera os resultados das fontes anteriores. Bloqueios, erros e resultados incompletos foram preservados como limitações. Nenhuma conta foi criada, nenhum plano contratado, nenhum valor pago, nenhum segredo usado e nenhuma integração ativada.

## Critério de decisão

Uma fonte só seria classificada como **autorizada** se houvesse evidência expressa e aplicável às operações necessárias do CompraFácil — inclusive **armazenamento, cache, sincronização/atualização e exibição** — além de método documentado, campos, filiais, limites e escopo. Página pública, preço visível, endpoint tecnicamente acessível, política de privacidade ou seleção de loja não constituem, isoladamente, licença para reutilizar dados. Catálogo de metadados (nome, marca, GTIN, tamanho, unidade e categoria) também não é catálogo de ofertas/preços.

Fontes ODbL, share-alike/copy-left ou equivalentes foram excluídas integralmente. Open Food Facts/ODbL não foi consultado nem usado. Uma menção a CC0 não supera, sem resolver conflito contratual, termos que proíbam cópia ou exploração.

## Resumo executivo

- **Fonte de metadados autorizada para ativação:** nenhuma.
- **Fonte de preços autorizada para ativação:** nenhuma.
- **Catálogo/preços do SuperLuna:** não integrados. A auditoria existente registrou HTTP 403 da CloudFront, ausência de API/feed público confirmado e ausência de autorização para coleta/reutilização; o bloqueio não foi contornado. [52] [53] [54]
- **Sincronização diária autorizada:** não. `daily_sync_authorized = false`.
- **Decisão operacional:** manter todos os provedores automáticos desligados; usar somente cadastro manual e, quando apropriado, links para as páginas oficiais. Não tratar ofertas HTML observadas como preços persistíveis do CompraFácil.
- **Volume real autorizado:** nenhum. As contagens abaixo são declarações ou amostras dos pesquisadores, não volume que possa ser ingerido no app.

## Fontes auditadas

### 1. GS1 Brasil — Cadastro Nacional de Produtos, Verified by GS1 e Other Keys

| Campo | Evidência sintetizada e decisão |
|---|---|
| Método/API e autorização | Há APIs REST documentadas para CNP/Provedor, Verified by GS1 e Other Keys. O acesso exige OAuth 2.0, usuário/credenciais, liberação prévia e, em Provider/Other Keys, contrato/plano. Não foi feita chamada. A autorização para o uso pretendido permanece **indeterminada/não autorizada**. [1] [2] [3] |
| Catálogo versus preço | É fonte de metadados/verificação de produto; a documentação não apresenta preço, moeda, oferta, estoque ou preço por loja. `deliveryPurchasingInformation` é quantidade mínima/múltipla, não preço. Não serve, sozinha, como fonte de preços. [2] [5] |
| Campos | GTIN, descrição, marca, imagens/URLs, status, país/mercado, peso/conteúdo líquido, dimensões, GPC/NCM/CEST, hierarquia/quantidades, embalagem, nutrientes, alergênicos, identificadores adicionais, `dateUpdated/lastChangeDate`, `licenseeGLN` e localização GS1, entre outros; não há campo de preço. [5] [7] |
| Contagem e amostra | A página GS1 divulga mais de 550 milhões de produtos para Verified by GS1, mas o conteúdo era dinâmico e a cifra não foi independentemente verificável no acesso. Não há contagem brasileira, mineira ou de Betim. **Sample bytes: não medido/indisponível**, pois a resposta exigiria autenticação/liberação/contrato. [3] [6] |
| Cobertura/filiais | GLN identifica localização GS1, não uma lista pública de filiais varejistas. Não foram encontrados filtro municipal, enumeração de lojas ou cobertura de Betim/MG. A fonte não garante cobertura completa do Brasil nem preço/estoque regional. [5] [7] |
| Frequência/limites | Token documentado de 10.800 segundos/3 horas e reset diário UTC do plano Provider. Não foram encontrados números de quota, RPS, SLA, ETag ou feed de mudanças. PATCH individual e menções a atualização do CNP/CCG não equivalem a delta para o app. [1] [3] [5] |
| Custo/licença/armazenamento | Associação GS1, usuário/liberação e, em Provider/Other Keys, contrato e pagamento/plano. Preço/franquia exatos não estavam legíveis. Os Termos concedem licença limitada ao destinatário, não exclusiva, intransferível e não sublicenciável, com restrições de distribuição/reprodução; não confirmam cache, persistência, sincronização ou exibição a consumidores. [3] [4] [7] |
| Decisão | **Não integrar.** Só reconsiderar com contrato/autorização escrita cobrindo metadados, retenção/cache, sincronização, exibição no app, atribuição, escopo geográfico e limites. Mesmo autorizada, seria fonte de metadados; seria necessária outra fonte de preços, estoque e filiais. |
| Limitações/falhas | Não houve chamada nem dataset; versões dos manuais diferem; contagem global é divulgação não verificada; cobertura de Betim, limites numéricos, delta e direitos de redistribuição não foram comprovados. |

### 2. Kodebar/Korven — API de GTIN/EAN

| Campo | Evidência sintetizada e decisão |
|---|---|
| Método/API e autorização | API REST oficial com lookup, busca, autocomplete, bulk, misses resolvidos e webhooks. Lookup exige `X-API-Key`/Bearer e conta; não houve cadastro nem lookup. A única tentativa permitida ao `/health` público retornou 403, sem repetição ou contorno. [8] [9] [10] |
| Catálogo versus preço | Produto por GTIN/EAN, não ofertas. Metadados incluem GTIN, nome, miniatura, marca quando disponível, NCM/GPC, qualidade, origem e URLs; não há preço, histórico, estoque ou preço por filial documentado. [9] [11] |
| Campos | `gtin`, nome, thumbnail, NCM, marca, GPC, `quality_score`, `source`, URLs, `cached` e campos de conta/bulk; categorias formais e campos de loja não foram encontrados. |
| Contagem e amostra | Não foi encontrada contagem total confiável; `/public/stats` não foi chamado. **Sample bytes: não medido/indisponível**: lookup exige chave e o `/health` respondeu 403. Exemplos de produtos na documentação não são inventário. [8] [9] |
| Cobertura/filiais | A Kodebar afirma cobertura brasileira/nacional e produtos regionais alimentados por PDVs, mas não publica contagem, distribuição por UF/município, Betim, IDs de filial ou endereço. [8] |
| Frequência/limites | Quota diária por chave e reset à meia-noite de Brasília; bulk varia por plano; há webhooks `gtin.updated`, `gtin.created` e `miss.resolved`, mas não um delta geral. A cota de teste diverge entre páginas oficiais: 50/dia em uma e 100/dia em `llms-full.txt`; deve ser esclarecida. A base é descrita como alimentada continuamente/diariamente, sem SLA de atualização. [9] [10] |
| Custo/licença/armazenamento | Cadastro com nome/e-mail; plano teste aparece como gratuito, com conflito de quota, e planos publicados de R$29, R$79 e R$249/mês. Os Termos permitem integração no próprio software e exibição/uso interno, e permitem cache interno, mas proíbem cópia em massa, revenda/redistribuição e cache para concorrência; não há licença aberta nem matriz de proveniência. Sem conta e sem confirmação escrita para o caso comercial específico, não é autorização suficiente. [8] [10] |
| Decisão | **Não ativar.** No máximo, piloto condicional de metadados em backend, após confirmar por escrito retenção/cache, uso comercial, proveniência dos dados de fallback, cobertura Betim e a quota vigente. Nunca usar como fonte de preços/filiais. |
| Limitações/falhas | 403 no endpoint público; conflito de quotas; ausência de contagem, filial, preço, município e licença downstream detalhada; ausência de delta genérico; nenhum plano foi contratado. |

### 3. Datakick / GTIN Search

| Campo | Evidência sintetizada e decisão |
|---|---|
| Método/API e autorização | API REST v1 documentada por `GET /api/items/{UPC-ou-EAN}`, sem registro e com autenticação opcional; o dataset completo é anunciado em CSV, mas não foi baixado. [12] [13] [14] |
| Catálogo versus preço | Metadados, nutrição, ingredientes e alguns dados editoriais; nenhuma resposta observada/documentada contém preço, moeda, promoção, estoque ou filial. Não é fonte de preço. [13] [17] |
| Campos | `id`, `user_id`, `gtin14`, marca, nome, tamanho, ingredientes, porções, nutrientes, autor/publicador, páginas, álcool, `created_at` e `updated_at`. Imagens têm titulares/licença separada e não foram consideradas reutilizáveis como CC0. [13] [17] |
| Contagem e amostra | A página Download declara **6.561 itens**. Foram medidos somente pequenos retornos documentados: `[]` com **2 bytes** e um item com **564 bytes**; nenhum dataset completo foi baixado. [14] [17] |
| Cobertura/filiais | Não há estabelecimento, município, UF, geolocalização, preço por loja ou ID de filial. Betim/MG e cobertura de varejo nacional não são verificáveis. [14] [17] |
| Frequência/limites | A documentação diz não haver rate limit, mas respostas observadas exibiram `X-RateLimit-Limit: 60`; a contradição impede assumir chamadas ilimitadas. Não há cadência de atualização, delta, cursor ou webhook; `updated_at` isolado não cria sincronização incremental. [13] [15] [17] |
| Custo/licença/armazenamento | A página Download declara CC0 1.0 para dados, inclusive uso comercial, mas os Termos da mesma origem proíbem reproduzir/copiar/vender/explorar sem permissão escrita e também proíbem spider/crawl/scrape. O conflito entre CC0 e contrato não foi resolvido; imagens têm instrução CC-BY-SA 3.0 separada. Não há autorização segura para cache/sincronização/exibição até confirmação escrita. [14] [15] [16] |
| Decisão | **Não integrar em produção.** Só considerar metadados não-imagem após confirmação escrita sobre prevalência da CC0, termos, armazenamento, cache, sincronização e exibição. Excluir imagens ou obter autorização própria; não usar como fonte de preço. |
| Limitações/falhas | Domínio original `datakick.org` aparece como indisponível; exemplos retornaram `[]`; a contagem 6.561 não traz data/completude; limite observado contradiz a documentação; uma página pública de item retornou 403 e não foi repetida/contornada. |

### 4. BH Supermercados / Meu BH

| Campo | Evidência sintetizada e decisão |
|---|---|
| Método/API e autorização | Foram vistos HTML público de ofertas, folhetos, localizador e aplicativo Meu BH; não foi encontrada API/feed/SDK/schema ou endpoint autorizado. O app pede cadastro para benefícios e ofertas exclusivas. [18] [19] [20] |
| Catálogo versus preço | Páginas expõem textos de ofertas e preços em reais, com nome, marca/embalagem quando no texto e período de validade. Isso é conteúdo de oferta, não feed autorizado, nem preço estruturado estável. [19] [20] |
| Campos | Nome/descritivo, marca, peso/volume/unidade, cidade/região, validade e disponibilidade textual; preço promocional e período. Não foram encontrados preço regular estruturado, GTIN/SKU, estoque ou histórico. |
| Contagem e amostra | Não há contagem de catálogo. A instituição declara mais de 400 lojas (360 em 114 municípios de MG e 43 em 13 municípios do ES), que é contagem de lojas, não produtos. **Sample bytes: não medido/indisponível**, pois não havia resposta de API documentada e permitida. [21] |
| Cobertura/filiais | Betim aparece nos seletores de ofertas, folhetos e lojas; não foram expostos endereço, telefone, ID ou filial de Betim no resultado observado. Cobertura regional MG/ES foi declarada, não cobertura nacional. [19] [21] |
| Frequência/limites | Não há quotas, limites, SLA, ETag, janela de refresh ou delta. Datas de validade de ofertas são vigência editorial, não cadência de API. |
| Custo/licença/armazenamento | Nenhum contrato/licença de catálogo, permissão de cache, armazenamento, sincronização, exibição ou redistribuição foi encontrado. A política de cookies trata navegação; o PDF de privacidade vinculado retornou “Página não encontrada”. Não houve cadastro, pagamento ou credencial. [19] [22] |
| Decisão | **Não integrar, raspar, cachear ou sincronizar.** Solicitar autorização escrita/API/feed com IDs de filial, schema, escopo de Betim, limites, atualização e direitos de armazenamento/exibição. |
| Limitações/falhas | Política de privacidade indisponível; conteúdo dinâmico; nenhum schema, API, contagem de catálogo, delta ou limite; seleção de Betim não comprova oferta/filial disponível. |

### 5. Supernosso

| Campo | Evidência sintetizada e decisão |
|---|---|
| Método/API e autorização | Há HTML público de home, categorias e páginas de produto. Não há API/feed/exportação documentado; a rota `/api` retornou erro de backend, não documentação. Nenhuma API foi chamada. [23] [24] [25] |
| Catálogo versus preço | HTML mostra nome, categoria, referência, preço normal, oferta Prime, preço por unidade e limite promocional. São dados de loja sujeitos a mudança e estoque confirmado na separação; não constituem feed autorizado. [23] [24] |
| Campos | Nome/título, ID visível, breadcrumb/categoria, descrição, marca/sabor/embalagem no texto, URL; preços normal/promocional, R$/kg e limite por CPF. Não há schema público de estoque, filial ou histórico. |
| Contagem e amostra | A instituição diz “milhares de itens”, sem contagem exata. **Sample bytes: não medido/indisponível**: não havia resposta de API documentada e permitida; `/api` não foi tratado como endpoint de dados. [23] [26] |
| Cobertura/filiais | Delivery declarado para toda Belo Horizonte e parte da região metropolitana; cobertura depende de CEP no carrinho. Betim e IDs de filial não foram confirmados; não há evidência de cobertura nacional. [26] [27] |
| Frequência/limites | Não encontrados limites, quota, SLA, cadência, webhook, ETag ou delta. O aviso de alteração sem aviso não autoriza polling nem define refresh. [23] [26] |
| Custo/licença/armazenamento | Navegação não exige cadastro, mas compra exige; não há contrato de dados, licença, plano ou permissão para guardar/cachear/sincronizar/exibir. A política de privacidade trata dados pessoais e afirma propriedade da base do Supernosso, não licença de catálogo. [27] |
| Decisão | **Não integrar por scraping nem espelhar/cachear.** Solicitar autorização/contrato cobrindo metadados e preços, armazenamento, uso comercial, filiais/Betim, limites, cadência e delta. |
| Limitações/falhas | `/api` com erro de backend; cobertura de Betim não confirmada; “milhares” não é contagem; preço/estoque variam e podem divergir das lojas físicas; robots foi apenas respeitado. |

### 6. Mart Minas / Mart Mais

| Campo | Evidência sintetizada e decisão |
|---|---|
| Método/API e autorização | Site oficial e Mart Mais exibem HTML/ofertas com seleção manual de loja; não há OpenAPI/Swagger, feed, exportação, webhook ou contrato de integração. O checkout expôs somente marcador público e não foi explorado. Mart Mais sinaliza cadastro para ofertas exclusivas. [28] [29] [30] |
| Catálogo versus preço | Vitrine mostra nome, embalagem/unidade e “Por R$”/“De R$”; não há schema de moeda, vigência, estoque ou preço por filial. É oferta pública, não catálogo autorizado. |
| Campos | Nome/descrição textual, marca, tamanho/embalagem, unidade, contexto de loja/localidade e rótulo promocional; preço atual/anterior em texto. Sem IDs/SKUs ou schema formal. |
| Contagem e amostra | Institucional declara **mais de 10.000 itens**, **80 lojas** em cidades de MG e cerca de **700 cidades atendidas**; são agregados institucionais, não exportação. **Sample bytes: não medido/indisponível** porque não havia API pública documentada e permitida. [28] |
| Cobertura/filiais | Seletores listam Betim, Betim (Duque de Caxias), Laranjeiras e Senhora das Graças; há divergência entre templates/cache sobre Ingá versus Via Expressa. Endereço/CEP/horário podem aparecer para unidade, mas não há ID de filial. [29] |
| Frequência/limites | Não há limite, quota, janela, ETag, webhook, SLA ou delta. “Ofertas Semanais” é rótulo editorial, não cadência de sincronização. [30] |
| Custo/licença/armazenamento | Não foi encontrada licença de dados ou permissão para guardar/cachear/sincronizar/reexibir. A política de privacidade trata dados pessoais e não catálogo. Termos completos do Mart Mais não ficaram verificáveis; não houve conta ou custo contratado. [31] |
| Decisão | **Não integrar automaticamente.** Pedir autorização escrita específica, termos completos, licença/atribuição, API/feed, IDs de filial, cobertura Betim, retenção, limites e delta. |
| Limitações/falhas | Divergência de nomes de filiais; página Hortifrúti retornou 302 e não forneceu amostra verificável; ausência de API, catálogo completo, validade e estoque; números institucionais não são contagem reutilizável. |

### 7. Apoio Mineiro / Apoio Entrega

| Campo | Evidência sintetizada e decisão |
|---|---|
| Método/API e autorização | Vitrine HTML oficial (rodapé VTEX), categorias e detalhe de produto; não há API/feed/exportação/SDK/contrato documentado. CEP, login/cadastro e conta entram no fluxo de compra, mas nenhuma credencial foi usada. [32] [33] [34] |
| Catálogo versus preço | Página de cervejas e produto expõem metadados, preço corrente/anterior, promoção, indisponibilidade, peso variável e condições de pagamento. Não há feed autorizado nem estabilidade de preço/estoque. [35] [36] |
| Campos | Nome, código público, URL/imagem, marca, categoria/subcategoria, descrição, ingredientes, alergênicos, nutrição, peso/volume/unidade, múltiplos, peso variável, disponibilidade e avaliações; preço corrente/anterior/unitário, promoções e frete dependente de CEP. |
| Contagem e amostra | Home divulga **mais de 11 mil itens**; categoria Cervejas exibiu **130 resultados** e página Coca exibiu **1 produto indisponível**. Não é dataset completo. **Sample bytes: não medido/indisponível**, pois nenhuma API/feed permitida foi identificada. [32] [35] |
| Cobertura/filiais | Entregas declaradas somente em MG; “Sobre nós” cita 13 lojas físicas em BH, região metropolitana e Sete Lagoas. Betim, filial e IDs não foram nomeados/verificados; cobertura não pode ser inferida só por região metropolitana. [33] [34] |
| Frequência/limites | Sem limites, quota, SLA, janela, delta, ETag, cursor ou webhook. Preço/condição/estoque podem mudar sem aviso e dependem de CEP/pedido. [32] [34] |
| Custo/licença/armazenamento | Não foi encontrada licença Creative Commons, permissão de redistribuição ou contrato de integração. Política de privacidade cobre dados pessoais, não catálogo. Rotas de termos exibiram apenas casca genérica, sem cláusula de licença verificável. Nenhuma conta/plano foi criado. [37] |
| Decisão | **Não integrar nesta fase.** Solicitar autorização escrita/API/feed que cubra catálogo, preço, CEP/filial, armazenamento/cache/exibição, limites, cadência e deltas. |
| Limitações/falhas | Rotas de termos não trouxeram termos; nenhuma API foi examinada; contagens dependem da renderização; preços dependem de CEP/promoção/estoque; Betim e IDs não foram confirmados. |

### 8. Carrefour Brasil — loja online e Marketplace

| Campo | Evidência sintetizada e decisão |
|---|---|
| Método/API e autorização | HTML público de coleção/busca expõe metadados e preços. A API existente é de seller Marketplace, exige pré-cadastro, CNPJ, portal, integrador homologado e chave de segurança; não é API pública de catálogo/preços. [38] [39] [40] |
| Catálogo versus preço | Coleção pública mostrou nome, marca, departamento, facetas, vendedor, preço Pix/parcelado e promoção; é página HTML, não feed autorizado. Não há schema público para catálogo consumidor. [41] |
| Campos | Nome/URL/identificador visível, departamento/categoria/subcategoria, marca, atributos/facetas, vendedor, SKU no fluxo seller, descrição, preço Pix, preço anterior, desconto, parcelamento e frete dependente de CEP. Sem autorização para persistir. |
| Contagem e amostra | Coleção de pneus consultada exibiu **40 produtos**, 15 por página, não o catálogo Carrefour. Contagem nacional não encontrada. **Sample bytes: não medido/indisponível**: nenhuma API pública documentada/permissível foi chamada. [41] |
| Cobertura/filiais | Política de entregas declara entrega para todo o Brasil, mas estoque, prazo, modalidade e frete dependem de produto/CEP. Localizador consultado mostrou zero lojas antes de filtros e não confirmou Betim/ID; disponibilidade em loja varia por região. [42] [43] |
| Frequência/limites | Sem quota, SLA, freshness, cadência, delta, cursor, webhook ou ETag para feed público. Prazos de pedidos/integração seller não são refresh de catálogo. |
| Custo/licença/armazenamento | Termos do site/app proíbem engenharia reversa, mineração, spiders e ferramentas automatizadas; conteúdos são protegidos e reprodução depende de autorização, com exceção informativa que não autoriza catálogo persistente. Marketplace exige vendedor/CNPJ e a comissão de 16% é custo de vender, não plano de dados. [38] [39] [40] |
| Decisão | **Rejeitar integração direta.** Solicitar autorização/licença específica para guardar, cachear, sincronizar e exibir no CompraFácil, incluindo finalidade comercial, campos, filiais/Betim, limites, cadência, delta e atribuição. |
| Limitações/falhas | Página individual apresentou erro de carregamento; contagem de 40 é uma coleção; localizador não confirmou Betim; API seller autenticada não pode ser presumida como fonte do app; nenhum cadastro/segredo foi usado. |

### 9. Assaí Atacadista — site, App Meu Assaí e canais oficiais

| Campo | Evidência sintetizada e decisão |
|---|---|
| Método/API e autorização | Não foi encontrada API/feed, documentação de desenvolvedor, schema, catálogo para download ou contrato de dados. O Assaí informa que não possui loja online própria e que compras online passam por parceiros; esses parceiros não foram usados como fonte licenciada do Assaí. [45] [46] |
| Catálogo versus preço | Há ofertas, folhetos, descontos e conceitos de varejo/atacado; não há catálogo de produtos/preços estruturado, completo ou autorizado. Preços e sortimento variam por loja. [46] [48] |
| Campos | Loja/slug, endereço, CEP, cidade/UF, telefone, horários, serviços, seleção de loja e categorias de sortimento; ofertas/descontos, limites e validade de desconto. Não há SKU/GTIN, schema de produto, preço atual completo, timestamp ou disponibilidade via API. |
| Contagem e amostra | Contato declara **mais de 8.000 itens por loja**; instituição declara **313 lojas em 24 estados e DF**. Matéria de 2022 cita mais de 6.000 itens e números históricos de parceiros, que não devem ser tratados como atuais. **Sample bytes: não medido/indisponível**, sem API/feed permitido. [46] [49] |
| Cobertura/filiais | Página oficial confirma Assaí Betim, endereço em Betim/MG e dados de contato; “loja213” aparece em e-mail, mas não é ID de API documentado. Não há matriz pública de produto/preço por filial. [47] [49] |
| Frequência/limites | Sem limite, quota, SLA, janela, delta, cursor, ETag ou webhook. “Ofertas da semana” e validade de desconto por loja/data são cadência editorial/operacional, não sincronização de catálogo. [48] [50] |
| Custo/licença/armazenamento | App exige cadastro para determinadas funções; não há plano de dados, chave ou contrato de desenvolvedor. Termos protegem o conteúdo e vedam reprodução, distribuição, modificação, uso comercial ou exploração sem autorização prévia e expressa. Não há licença aberta nem direito explícito de cache/sincronização/exibição. [45] [51] |
| Decisão | **Não integrar.** Solicitar autorização escrita/contrato e API/feed que cubra dados de produto, preço, filial Betim, limites, cadência, retenção/cache, sincronização, exibição e atribuição. |
| Limitações/falhas | Contagens de parceiros são históricas; página pública não prova sortimento/preço de Betim; não há API; nenhuma conta, credencial, pagamento ou endpoint não documentado foi usado. |

### 10. SuperLuna — auditoria pública existente

| Campo | Evidência sintetizada e decisão |
|---|---|
| Método/API e autorização | A auditoria de 28/09/2026 foi feita por navegação pública normal, sem conta e sem contornar bloqueios. A loja online devolveu HTTP 403 da CloudFront por bloqueio geográfico; não foi possível observar frontend, tráfego, catálogo ou endpoint. Nenhuma API/feed público autorizado foi confirmado. [52] [53] |
| Catálogo versus preço | Nenhum produto, marca, tamanho, categoria, valor, disponibilidade ou campo de preço foi importado. O aviso indexado de alteração de preço/estoque não é API nem autorização para coleta. [53] |
| Campos | Nenhum campo real de produto/preço obtido. O contrato interno futuro prevê produto com marca/tamanho/unidade, filial, oferta, preço, moeda, disponibilidade, fonte e timestamp, mas isso não é evidência de que o SuperLuna forneça tais campos. |
| Contagem e amostra | **Catálogo: não medido; contagem: não encontrada; sample bytes: não medido/indisponível.** Não houve resposta permissível nem coleta de produtos. |
| Cobertura/filiais | Diretório corporativo indexou nomes como Eldorado/Contagem, Palmeiras/Ibirité, Sarzedo, Alcina Campos/Ibirité e Cachoeira/Betim, mas endereços completos e identificadores usados pelo e-commerce não foram confirmados. [54] |
| Frequência/limites | Nenhum limite, frequência ou delta foi confirmado. O 403 foi respeitado; não houve VPN, proxy, CAPTCHA, login, enumeração de endpoint ou scraping agressivo. [52] |
| Custo/licença/armazenamento | Não foram confirmados Termos de Uso ou licença que autorizem coleta automatizada, armazenamento, cache, sincronização ou exibição. A política de privacidade não substitui essa autorização. [53] [55] |
| Decisão | **Não integrar e manter desligado.** Reavaliar somente com documentação oficial/API/feed ou autorização expressa que cubra operações, direitos de armazenamento/exibição, limites, frequência, campos e identificadores de filial. |
| Limitações/falhas | O 403 impede qualquer conclusão sobre o frontend ou existência técnica de endpoints; não se deve inferir ausência absoluta de API, nem usar nomes de diretório como filiais verificadas para preços. |

## Contagens, volumes e amostras — leitura correta

| Fonte | Medida citada pelos pesquisadores | O que pode ser concluído |
|---|---:|---|
| GS1 Brasil | Mais de 550 milhões divulgados para Verified by GS1 | Cifra global divulgada, dinamicamente apresentada e não independentemente verificada; não é volume brasileiro/Betim nem volume autorizado para download. |
| Kodebar | Contagem total não encontrada | Sem volume catalogal verificável; exemplos não são inventário. |
| Datakick | 6.561 itens divulgados; respostas de 2 e 564 bytes medidas | Pequena base divulgada e amostras medidas na API; direitos permanecem conflitantes e não há preço/filial. |
| BH | Mais de 400 lojas, 360 em MG e 43 no ES | Volume de lojas, não de produtos; Betim aparece como seletor, sem filial/IDs confirmados. |
| Supernosso | “Milhares de itens” | Alegação sem contagem exata; sem API e sem volume reutilizável. |
| Mart Minas | Mais de 10.000 itens; 80 lojas; cerca de 700 cidades | Alegações institucionais agregadas, não dataset nem contagem por filial. |
| Apoio Mineiro | Mais de 11.000 itens; 130 cervejas; 1 item Coca | Contagens de páginas/alegações mutáveis, não catálogo completo nem volume licenciado. |
| Carrefour | 40 produtos na coleção de pneus | Apenas uma coleção, não catálogo nacional. |
| Assaí | Mais de 8.000 itens por loja; 313 lojas; números históricos de 2022 | Declarações institucionais; não demonstram preço/sortimento por filial nem feed atual. |
| SuperLuna | Nenhuma contagem ou amostra | 403 e ausência de resposta permissível; registrar como não medido. |
| Mercado Livre via GeckoAPI | Nenhuma; nenhuma chamada foi feita | Só há schemas e exemplos documentais; não existe volume de anúncios observado nem autorização qualificada para ingestão. |

Nenhuma contagem acima deve ser somada. Não existe, com as evidências recebidas, um **volume real autorizado** para baixar, armazenar ou exibir no CompraFácil.

## Conclusão e requisitos para eventual reavaliação

1. **Não integrar nenhuma das nove fontes, o SuperLuna ou a rota Mercado Livre via GeckoAPI agora.** Uma página pública ou documentação técnica do scraper não é, por si só, autorização para coleta e reutilização.
2. **Nenhuma fonte de preço está qualificada.** Várias páginas mostram preços, porém não oferecem contrato/API/feed com direitos de armazenamento, atualização e exibição.
3. **Nenhuma fonte de metadados está qualificada para ativação automática sob o critério conservador.** GS1 exige contrato e limita a licença; Kodebar é condicional e tem restrições de cache/cópia; Datakick tem conflito CC0–Termos; as redes não têm licença/API aplicável.
4. **Não ativar sincronização diária ou tarefa em segundo plano.** Frequência editorial (“ofertas semanais”), validade de promoção ou `updated_at` sem contrato não autoriza polling. A auditoria SuperLuna registra expressamente que não há atualização automática ativa. [52] [55]
5. Um futuro provedor deve apresentar, por escrito ou em documentação oficial vinculante: operações permitidas; direitos de armazenamento/cache, atualização incremental e exibição consumer-facing; campos e identificadores de produto; IDs e cobertura de cada filial; limites/quotas, intervalo mínimo e SLA; custo/plano; atribuição; retenção e revogação; e tratamento de preços, estoque e disponibilidade.
6. Segredos, chaves e credenciais devem permanecer no backend. Não criar conta, contratar plano ou ativar credencial sem autorização e decisão explícitas. Até lá, usar cadastro manual rotulado, sem atribuir observação do usuário a preço verificado pelo supermercado.

## Adendo de 29/09/2026 — Mercado Livre via GeckoAPI

A documentação da GeckoAPI descreve uma PLP que transforma páginas públicas do Mercado Livre em JSON, mas afirma que a GeckoAPI é independente e não afiliada à plataforma. Seus Termos dizem que não concedem autorização para acessar sistemas de terceiros e que o cliente precisa obter permissões para coleta, armazenamento, uso e compartilhamento. A política de uso responsável também condiciona a extração às regras do terceiro. [56] [57] [59] [60]

O Programa de Desenvolvedores do Mercado Livre contém restrição expressa a scraping para participantes; a documentação oficial consultada também mostra chamadas de busca de itens/vendedores com Bearer. Isso não comprova autorização para pesquisa genérica pelo scraper, guardar resultados no aparelho, exibir anúncios ou calcular a média 70/30. A conclusão operacional é **autorização não comprovada; manter a integração desativada**, sem chamada, chave, cache ou preços de exemplo. [63] [64]

A PLP documenta título, preço, moeda, condição, SKU, EAN quando exposto, vendedor, URL, paginação e `extractedAt`; não documenta estoque por anúncio. Preço exato por chamada e quota numérica da PLP não foram confirmados. A GeckoAPI informa logs operacionais e retenção sem prazo numérico específico. O relatório completo, com os limites de campos, custo, privacidade e condição para reavaliação, está em [docs/geckoapi-mercadolivre-audit.md](geckoapi-mercadolivre-audit.md). [57] [61] [62]

## References

[1]: https://portalapi.gs1br.org/ "Portal de APIs GS1 Brasil"
[2]: https://portalapi.gs1br.org/pageApiCnp "API CNP / Provedor de Dados — GS1 Brasil"
[3]: https://portalapi.gs1br.org/pageApiProvider "API Verified by GS1 — GS1 Brasil"
[4]: https://servicos.gs1br.org/terms-of-use "Termos de Uso da Plataforma Serviços e Soluções GS1 Brasil"
[5]: https://gs1portalstoragecdncms.blob.core.windows.net/strapi/strapi-assets/API_de_Cadastro_e_Consulta_CNP_v3_a58fa2d310.pdf "Manual de Uso das APIs do CNP — GS1 Brasil"
[6]: https://www.gs1br.org/home "GS1 Brasil — página inicial"
[7]: https://gs1portalstoragecdncms.blob.core.windows.net/strapi/strapi-assets/Manual_do_Usuario_API_Verified_by_GS_1_R1_31_1_a534922ec8.pdf "Manual de Uso da API Verified by GS1 — GS1 Brasil"
[8]: https://kodebar.korvensistemas.com.br/ "Kodebar — página oficial"
[9]: https://kodebar.korvensistemas.com.br/docs/ "API Reference — Kodebar"
[10]: https://kodebar.korvensistemas.com.br/llms-full.txt "Kodebar API — documentação completa"
[11]: https://kodebar.korvensistemas.com.br/docs/openapi.json "OpenAPI Specification 3.1 — Kodebar"
[12]: https://www.gtinsearch.org/ "Datakick — The open product database"
[13]: https://www.gtinsearch.org/api "Datakick API — Version 1"
[14]: https://www.gtinsearch.org/download "Datakick Download e License"
[15]: https://www.gtinsearch.org/terms "Terms of Service — GTIN Search"
[16]: https://www.gtinsearch.org/privacy "Privacy Policy — GTIN Search"
[17]: https://www.gtinsearch.org/api/items/00025000056031 "Resposta JSON da API para GTIN 00025000056031"
[18]: https://www.supermercadosbh.com.br/ "Supermercados BH — página inicial"
[19]: https://www.supermercadosbh.com.br/ofertas/ "Ofertas — Supermercados BH"
[20]: https://meubh.com.br/ "Meu BH — site oficial"
[21]: https://www.supermercadosbh.com.br/institucional/ "Institucional — Supermercados BH"
[22]: https://www.supermercadosbh.com.br/wp-content/uploads/2025/04/Politica-de-Privacidade.pdf "Política de Privacidade — link oficial indisponível na consulta"
[23]: https://www.supernosso.com/ "Supernosso — supermercado com entrega em Belo Horizonte"
[24]: https://www.supernosso.com/217061-achocolatado-em-po-toddy-original-370g/p "Achocolatado em pó Toddy Original 370g"
[25]: https://www.supernosso.com/api "/api — Supernosso"
[26]: https://www.supernosso.com/sobre-nos "Supernosso BH — sobre nós"
[27]: https://www.supernosso.com/politica-de-privacidade "Política Geral de Privacidade de Dados — Supernosso"
[28]: https://www.martminas.com.br/quem-somos/ "Quem Somos — Mart Minas"
[29]: https://www.martminas.com.br/lojas/ "Lojas — Mart Minas"
[30]: https://martmais.martminas.com.br/ "Mart Mais — Mart Minas"
[31]: https://www.martminas.com.br/politica-de-privacidade/ "Política de Privacidade — Mart Minas"
[32]: https://www.apoioentrega.com/ "Apoio Entrega — página oficial"
[33]: https://www.apoioentrega.com/institucional/quem-somos "Sobre nós — Apoio Mineiro"
[34]: https://www.apoioentrega.com/institucional/ajuda/entregas "Entregas — Apoio Entrega"
[35]: https://www.apoioentrega.com/bebidas-alcoolicas/cervejas "Cervejas — categoria oficial Apoio Entrega"
[36]: https://www.apoioentrega.com/cerveja-original-pilsen-473ml-lata/p "Cerveja Original Pilsen 473ml Lata"
[37]: https://www.apoioentrega.com/termos-e-condicoes "Termos & Condições — Apoio Entrega"
[38]: https://www.carrefour.com.br/termos-de-uso "Termos e Condições de Uso — Carrefour.com"
[39]: https://www.carrefour.com.br/app/termos-de-uso "Termos e Condições de Uso — Aplicativo Carrefour"
[40]: https://www.carrefour.com.br/marketplace/espaco-do-seller/saiba-como-trocar-de-integrador-de-forma-correta "Integração de seller — Carrefour Marketplace"
[41]: https://www.carrefour.com.br/colecao/14685?map=productClusterIds&order= "Coleção oficial 14685 — pneus"
[42]: https://www.carrefour.com.br/politica-de-entregas "Política de Entregas — Carrefour"
[43]: https://www.carrefour.com.br/localizador-de-lojas "Localizador de lojas — Carrefour"
[44]: https://www.carrefour.com.br/atendimento/faq-loja-fisica/como-faco-para-saber-a-disponibilidade-de-um-produto-em-loja "FAQ — disponibilidade de produto em loja Carrefour"
[45]: https://www.assai.com.br/sites/default/files/termos_e_condicoes_gerais_de_uso_sendas_distribuidora.pdf "Termos e Condições Gerais de Uso — Assaí"
[46]: https://www.assai.com.br/contato "Fale Conosco — Assaí"
[47]: https://www.assai.com.br/loja/assai-betim "Assaí Betim"
[48]: https://www.assai.com.br/ofertas "Ofertas — Assaí"
[49]: https://www.assai.com.br/marcas-exclusivas "Página institucional do Assaí"
[50]: https://www.assai.com.br/whatsapp "WhatsApp e ofertas — Assaí"
[51]: https://www.assai.com.br/app-meu-assai "App Meu Assaí"
[52]: https://www.superlunasupermercados.com.br/ "SuperLuna — loja online"
[53]: https://www.superlunasupermercados.com.br/?busca=pao "Busca pública de produtos — SuperLuna"
[54]: https://superluna.com.br/lojas/ "Lojas SuperLuna — diretório corporativo"
[55]: https://superlunasupermercados.com.br/politica.html "Política de privacidade — SuperLuna"
[56]: https://geckoapi.com.br/api-mercadolivre/ "GeckoAPI — API Mercado Livre: Produtos, Preços e Sellers"
[57]: https://geckoapi.com.br/docs/mercadolivre-com-br-plp/ "GeckoAPI — documentação Mercado Livre PLP"
[58]: https://geckoapi.com.br/docs/mercadolivre-com-br-pdp/ "GeckoAPI — documentação Mercado Livre PDP"
[59]: https://geckoapi.com.br/uso-responsavel/ "GeckoAPI — Política de Uso Responsável"
[60]: https://geckoapi.com.br/termos-de-uso/ "GeckoAPI — Termos de Uso"
[61]: https://geckoapi.com.br/politica-de-privacidade/ "GeckoAPI — Política de Privacidade"
[62]: https://geckoapi.com.br/precos/ "GeckoAPI — preços e créditos"
[63]: https://global-selling.mercadolibre.com/devsite/mercado-libre-global-selling-developer-terms-and-conditions "Mercado Livre — Developer Terms and Conditions"
[64]: https://developers.mercadolivre.com.br/pt_br/itens-e-buscas "Mercado Livre Developers — Busca de itens"
