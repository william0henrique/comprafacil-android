# Auditoria — referência de preços do Mercado Livre via GeckoAPI

**Data:** 29/09/2026
**Veredito operacional:** autorização para as operações previstas **não comprovada**; não integrar nem consultar. O status é conservador: a documentação do provedor descreve tecnicamente uma extração, mas não concede direitos do Mercado Livre para fazê-la ou reutilizar seus resultados.

## O que a documentação da GeckoAPI descreve

A GeckoAPI se apresenta como serviço independente, não afiliado ou endossado pelo Mercado Livre, que transforma páginas públicas de busca e produto em JSON. Para busca de listagem (PLP), documenta `POST https://api.geckoapi.com.br/v1/extract`, com `target: "mercadolivre.com.br"`, `type: "plp"` e `keyword` ou URL; a página começa em 1 e pode ser paginada quando há próxima página. A autenticação é por chave da GeckoAPI no cabeçalho, portanto a chave ficaria no backend caso uma integração viesse a ser autorizada. [1] [2]

O schema PLP documenta, entre outros campos, título/nome do anúncio, SKU/ID, URL, condição, preço, moeda, EAN quando exposto, vendedor/ID do vendedor e localização do vendedor, avaliação, total de resultados, paginação e `data.extractedAt`. A documentação alerta que campos podem ser nulos ou ausentes. Os exemplos publicados são ilustrativos; **nenhuma resposta real de anúncio foi obtida nesta auditoria**. `extractedAt` seria o instante da consulta da GeckoAPI, não a data em que o vendedor alterou o anúncio. [2]

O schema PLP não documenta disponibilidade ou quantidade em estoque por anúncio. A documentação da PDP lista disponibilidade/estoque quando a página de origem os expõe, mas isso exigiria uma chamada adicional por página de produto, sem garantia de campo nem custo atual confirmado. Não foi feita chamada PLP, PDP ou MCP. Assim, a disponibilidade não poderia ser presumida a partir de uma listagem PLP. [1] [2] [3]

O vendedor de marketplace não é uma filial de supermercado. Mesmo com autorização futura, resultados do Mercado Livre teriam de permanecer identificados como **referência de marketplace**, separados de preços manuais ou verificados de lojas e excluídos do ranking por supermercado/distância.

## Direitos de acesso, armazenamento e uso

A Política de Uso Responsável da GeckoAPI cita análise de preços em páginas públicas como exemplo de uso, mas condiciona esse uso aos Termos do próprio serviço, à legislação e às regras de terceiros. Ela proíbe contornar autenticação, CAPTCHA, paywall, rate limits, bloqueios de IP/ASN e mecanismos anti-bot; também atribui ao cliente a responsabilidade por respeitar direitos e restrições de terceiros. [4]

Os Termos da GeckoAPI são explícitos: a empresa não concede autorização para acessar sistemas de terceiros; o cliente deve obter e manter as permissões necessárias para acessar, coletar, armazenar, usar e compartilhar os dados. As saídas são responsabilidade do cliente, e a GeckoAPI não garante conformidade com regras de terceiros. Portanto, contratar ou usar a API não equivale a uma licença do Mercado Livre para coleta, cache, exibição ou estatísticas derivadas. [5]

Os Termos oficiais do Programa de Desenvolvedores do Mercado Livre limitam o conteúdo fornecido pela API ao uso dentro do programa e, na seção 7.6, proíbem participantes de usar “robots, harvesters, spiders, scraping or other technology” para acessar o site/conteúdo ou obter informações não fornecidas pelo programa. A cláusula se aplica aos participantes do programa; não a estendo como conclusão jurídica automática a todo visitante. Porém, ela não autoriza o uso da GeckoAPI e reforça que uma rota de scraping não deve ser presumida como aprovada. [8]

A documentação oficial do Mercado Livre consultada descreve busca por itens e itens de vendedor com chamadas `Authorization: Bearer`, incluindo recursos associados a vendedor. Isso é uma superfície oficial distinta, sujeita ao programa, às permissões e à autenticação correspondentes; não foi comprovada ali uma licença pública, anônima e aplicável ao CompraFácil para pesquisar anúncios genéricos e guardar/exibir resultados. Não substituí a GeckoAPI por essa API. [9]

A página brasileira de Termos gerais do site abriu apenas a estrutura da página, sem o texto integral legível nesta consulta. Assim, não uso essa página como evidência de autorização ou de uma proibição adicional. A lacuna não muda o resultado: não foi localizada autorização escrita do Mercado Livre para a coleta da GeckoAPI nem autorização que cubra **consulta automatizada, cache local, atualização diária, exibição consumer-facing, cálculo de médias/estimativas e histórico**. [10]

## Custo, limites e privacidade

A página pública de preços da GeckoAPI anuncia 100 créditos iniciais sem cartão e planos mensais de 10.000 créditos por R$ 126,90 e 100.000 por R$ 999,90 (valores publicados em 27/07/2026). A página geral diz que a maioria dos endpoints consome um crédito, mas endpoints especializados podem custar mais; a documentação PLP manda consultar o custo vigente e **não publica o custo exato da PLP**. Não houve criação de conta, obtenção de chave, chamada ou contratação. [2] [7]

A GeckoAPI informa limites por cliente e por domínio/rota, cache e backoff, mas não publica nessa documentação um número verificável de requisições PLP por minuto/dia, SLA ou intervalo mínimo. O schema trata 429 como erro de limite. Sem custo individual e quota atuais, não seria possível definir com segurança o teto de consumo do app. [2] [4]

A Política de Privacidade da GeckoAPI informa que registra metadados operacionais como data/hora, status, latência e identificadores de execução, além de logs de erro. Diz que, em regra, evita registrar payloads e respostas completos, mas pode fazê-lo quando necessário tecnicamente; a retenção é descrita apenas como o tempo necessário, sem prazo numérico. Uma busca futura enviaria os atributos do produto ao provedor e não seria uma operação sem qualquer registro externo, mesmo que o CompraFácil não guardasse a busca no backend. Nenhuma busca de produto foi enviada nesta auditoria. [6]

## Decisão e caminho para reavaliação

A integração permanece desligada e sem qualquer chamada à GeckoAPI. Nenhum preço, anúncio, EAN, vendedor ou estoque foi importado; não há preço fictício tratado como real. O peso 70/30 aprovado pelo usuário permanece apenas como regra planejada: sem uma fonte autorizada e dados reais elegíveis, não há média, estimativa ou histórico de marketplace a calcular.

Para reavaliar, é necessária autorização verificável do titular da plataforma — por exemplo, confirmação escrita do Mercado Livre que cubra expressamente a coleta através da GeckoAPI, retenção/cache local, frequência de até uma consulta por produto por 24 horas, exibição, cálculo de derivados e histórico; ou uma integração pela API oficial com as permissões aplicáveis. A GeckoAPI também precisaria confirmar o custo por PLP, limites efetivos e retenção/logging relevantes. Documentação técnica, créditos gratuitos ou a política do próprio scraper, isoladamente, não suprem essa autorização.

Até lá, o CompraFácil continua local-first e manual-only para preços de supermercados. A referência de Mercado Livre aparece como **desativada**, não participa de comparação de lojas, não aciona atualização em segundo plano e não substitui valores informados pelo usuário.

## Referências

[1]: https://geckoapi.com.br/api-mercadolivre/ "GeckoAPI — API Mercado Livre: Produtos, Preços e Sellers"
[2]: https://geckoapi.com.br/docs/mercadolivre-com-br-plp/ "GeckoAPI — documentação Mercado Livre PLP"
[3]: https://geckoapi.com.br/docs/mercadolivre-com-br-pdp/ "GeckoAPI — documentação Mercado Livre PDP"
[4]: https://geckoapi.com.br/uso-responsavel/ "GeckoAPI — Política de Uso Responsável"
[5]: https://geckoapi.com.br/termos-de-uso/ "GeckoAPI — Termos de Uso"
[6]: https://geckoapi.com.br/politica-de-privacidade/ "GeckoAPI — Política de Privacidade"
[7]: https://geckoapi.com.br/precos/ "GeckoAPI — preços e créditos"
[8]: https://global-selling.mercadolibre.com/devsite/mercado-libre-global-selling-developer-terms-and-conditions "Mercado Livre — Developer Terms and Conditions"
[9]: https://developers.mercadolivre.com.br/pt_br/itens-e-buscas "Mercado Livre Developers — Busca de itens"
[10]: https://www.mercadolivre.com.br/ajuda/991 "Mercado Livre Brasil — Termos e condições gerais de uso do site"
