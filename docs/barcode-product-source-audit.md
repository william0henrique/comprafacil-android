# Auditoria de fontes de produto por código de barras — CompraFácil

- **Data:** 2026-09-29
- **Escopo:** Brasil; metadados por GTIN/EAN, imagens de produto, preços e ofertas.
- **Usos pretendidos:** consultar por código, cache local, exibir no app, eventualmente calcular referências e persistir no backup cifrado do usuário.
- **Restrição:** não usar fontes com obrigação copyleft/share-alike; não inventar produtos, imagens ou preços.
- **Amostras/API calls:** não realizadas. Esta auditoria avaliou documentação e termos públicos; nenhum cadastro, chave, plano ou autorização foi obtido.

## Conclusão executiva

Nenhuma fonte examinada pode ser ativada agora para consulta automática, cache, exibição de imagens ou preços no CompraFácil. A GS1 Brasil informa que APIs requerem liberação prévia e autenticação, e que consultas Verified by GS1 dependem de plano; isso ainda não está contratado/autorizado. Barcode Lookup oferece metadados, imagens e campos de lojas/preço, mas seus termos reservam direitos de conteúdo de terceiros (incluindo imagens), exigem exclusão de dados em cache ao encerrar o serviço e não confirmam adequação de cobertura/preços para supermercados brasileiros; o plano inicial publicado custa US$ 99/mês. EAN-Search oferece API paga para metadados/categorias, mas os termos consultados não comprovam direitos de cache, exibição ou redistribuição de dados de terceiros, e não documentam imagens reais de produto ou preços de supermercados.

O scanner pode, portanto, ler EAN/GTIN e procurar no catálogo SQLite local, com cadastro manual e cache local de dados que a própria pessoa confirmou. Preços automáticos, imagens remotas e metadados remotos continuam desligados até que direitos e credenciais adequados sejam confirmados. Os únicos preços ativos seguem sendo os que a pessoa informa manualmente.

## Matriz

| Fonte | Dados documentados | Acesso/condições | Direitos para o uso pretendido | Veredito |
|---|---|---|---|---|
| GS1 Brasil — API CNP / Verified by GS1 | Consulta de produtos por GTIN; a página consultada não apresenta preço de supermercado nem confirma os campos de imagem para este uso | OAuth 2.0, credenciais após liberação; API CNP para associados/provedores; consultas Verified by GS1 requerem plano | A liberação, termos de armazenamento/cache e direitos de imagem/exibição para o CompraFácil não foram obtidos/confirmados | **Requer autorização/contrato** |
| Barcode Lookup | A documentação descreve código, título, categoria, marca, tamanho, imagens e `stores` com preço/moeda/link/data | API key e assinatura; plano Starter anunciado com 5.000 chamadas por US$ 99/mês; até 100 chamadas/minuto; parâmetro `geo` documentado só para US, GB, CA e EU | Termos concedem licença limitada para usar o serviço; imagens/descrições podem ser conteúdo de terceiros sem direitos concedidos pelos termos; ao encerrar, exige excluir Product Data inclusive cache/backups. Não comprova direito de exibir/guardar cada imagem nem cobertura de varejo brasileiro | **Indeterminada / requer contrato** |
| EAN-Search | Busca de EAN/GTIN/UPC e nome; categorias em parte do catálogo; saída XML/JSON. A página descreve geração de imagens de código de barras, não fotos reais de produto nem preços de supermercados | API registrada; Trial 100 consultas/mês por €1 no primeiro mês e depois €9/mês; Pro 5.000 consultas/mês por €19 | Termos permitem automação pela API oficial, mas não esclarecem suficientemente armazenamento/cache, exibição pública ou direitos sobre dados fornecidos por terceiros | **Indeterminada / requer autorização** |
| SuperLuna | Nenhuma API/feed autorizado confirmado na auditoria pública anterior | A navegação pública recebeu HTTP 403 CloudFront | Não contornar bloqueio, autenticação ou qualquer controle; nenhum dado coletado | **Bloqueada** |
| Mercado Livre via GeckoAPI | A integração técnica foi descrita em auditoria anterior; isso não prova direito de consultar, armazenar, exibir ou derivar médias | Sem autorização confirmada para este app | Provider e consulta permanecem desligados | **Indeterminada / desligada** |

## Evidência e limites

1. **GS1 Brasil:** o portal oficial descreve API CNP e API Verified by GS1, informa que a CNP é para associados/provedores de dados, que Verified by GS1 requer plano de consultas e que todas as APIs exigem OAuth 2.0 e liberação prévia. A página não publica um endpoint de preços de supermercados. A página pública de Termos de Uso extraída nesta verificação mostra proteção de direitos autorais, mas não forneceu texto suficiente para validar permissões específicas de cache, redistribuição ou imagem. [1][2]
2. **Barcode Lookup:** página e documentação oficiais descrevem pesquisa por barcode e campos de produto, imagens e lojas/preços; os filtros geográficos apresentados são US/GB/CA/EU. A documentação publica rate limit de 100 chamadas/minuto e quotas determinadas pelo plano. Os planos listados começam em US$ 99/mês por 5.000 chamadas. Os Termos concedem licença limitada, revogável, não sublicenciável e não transferível para uso da API/dados; dizem que imagens/descrições de terceiros não são licenciadas por esses termos e exigem apagar Product Data, inclusive cache/backups, ao encerrar a assinatura. Nenhuma chave foi criada e nenhuma chamada de amostra foi feita. [3][4][5]
3. **EAN-Search:** a página oficial descreve API REST paga (5.000 consultas/mês por €19 no plano Pro) e retorno de identificadores, nome/categoria em parte dos produtos e XML/JSON. Os Termos vedam bots/scrapers fora das ferramentas fornecidas e dizem que a maioria dos dados vem de terceiros, sem garantir completude/legalidade; não encontramos autorização explícita suficiente para cache/exibição de dados do catálogo no aplicativo. Nenhuma conta foi criada e nenhuma chamada foi feita. [6][7][8]
4. **SuperLuna e Mercado Livre:** a auditoria SuperLuna existente registra 403 CloudFront sem contorno. A auditoria GeckoAPI/Mercado Livre existente não confirma autorização de coleta/armazenamento/exibição. [9][10]

## Decisão de implementação

- Ativar apenas leitura da câmera após ação explícita e busca exata no cache SQLite do próprio aparelho.
- Permitir cadastro manual com EAN/GTIN confirmado pela pessoa; não criar imagens ou metadados fictícios.
- Ao não encontrar código localmente, informar que não foi encontrado e oferecer busca local por nome, cadastro manual e nova tentativa.
- Mostrar ofertas/preços apenas quando forem entradas manuais locais ou vierem futuramente de fonte cuja autorização cubra consulta, armazenamento, cache, exibição e uso derivado; manter Marketplace separado de supermercado.
- Não calcular nem mostrar preço médio/menor/maior quando não existirem observações qualificadas para aquele produto exato. Não misturar tamanhos, unidades, kits ou embalagens incompatíveis.

## Referências oficiais

[1] https://portalapi.gs1br.org/ — Portal APIs GS1 Brasil; acesso, APIs e autenticação.
[2] https://www.gs1br.org/termos-de-uso — Termos de Uso GS1 Brasil.
[3] https://www.barcodelookup.com/api — Barcode Lookup API; campos e planos.
[4] https://www.barcodelookup.com/api-documentation — Endpoints, resposta, limites e campos.
[5] https://www.barcodelookup.com/terms-and-conditions — Termos Barcode Lookup.
[6] https://www.ean-search.org/ean-database-api.html — Planos e API EAN-Search.
[7] https://www.ean-search.org/tos.html — Termos EAN-Search.
[8] https://www.ean-search.org/ — Descrição da base e API.
[9] https://www.superlunasupermercados.com.br/ — Site auditado; resultado HTTP 403 registrado em [docs/superluna-audit.md](superluna-audit.md).
[10] [docs/geckoapi-mercadolivre-audit.md](geckoapi-mercadolivre-audit.md) — auditoria de autorização da fonte Marketplace.
