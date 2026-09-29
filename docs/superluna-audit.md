# Auditoria pública do SuperLuna para o CompraFácil

**Data da auditoria:** 28/09/2026
**Escopo:** navegação pública normal, sem conta, sem tentativa de contornar bloqueios e sem coleta automatizada de produtos.

## Resultado executivo

**A integração automática de preços não foi implementada.** Não foi possível confirmar uma API/feed pública autorizada nem termos/documentação que permitam reutilizar o catálogo e os preços. A loja online devolveu **HTTP 403 da CloudFront**, informando que a distribuição bloqueia acesso a partir do país atual. O bloqueio foi respeitado.

## O que foi possível observar

- A loja online indicada pelo usuário é [superlunasupermercados.com.br](https://www.superlunasupermercados.com.br/).
- A navegação pública normal à loja retornou HTTP 403 da CloudFront. Por isso, não foi possível observar o catálogo renderizado nem as chamadas de rede feitas pelo frontend.
- A busca pública indexou uma página de busca de produtos (`https://www.superlunasupermercados.com.br/?busca=pao`) com o aviso de que as condições da loja online são exclusivas para compras pela internet e sujeitas a disponibilidade de estoque e alteração de preço sem aviso prévio. Esse aviso não constitui autorização para coleta nem especifica uma API.
- A busca pública também localizou `https://superlunasupermercados.com.br/politica.html`, identificada como política de privacidade. Não foi possível confirmar Termos de Uso da loja online ou uma licença/declaração autorizando coleta automatizada. Política de privacidade e aviso de preço/estoque não substituem essa autorização.
- O diretório corporativo independente [Lojas SuperLuna](https://superluna.com.br/lojas/) foi indexado publicamente com nomes de unidades como Eldorado (Contagem), Palmeiras (Ibirité), Sarzedo, Alcina Campos (Ibirité) e Cachoeira (Betim). **Endereços completos e identificadores de unidade usados pelo e-commerce não foram confirmados.** O app guarda esses nomes como referências de cadastro, não como lojas ou endereços verificados para preços online.

## API, endpoints e carregamento do frontend

| Pergunta | Resultado confirmado |
|---|---|
| Há API pública/documentada de produtos ou preços? | Nenhuma foi confirmada nas fontes públicas consultadas. |
| Há feed autorizado de catálogo/preços? | Nenhum foi confirmado. |
| Há endpoint de catálogo/preços que possa ser usado de forma autorizada? | Nenhum foi confirmado; não foi tentado enumerar endpoints. |
| Como o frontend carrega produtos, categorias e preços? | Não foi possível observar. O HTTP 403 impediu a inspeção da página e de seu tráfego normal; não se infere nem se inventa uma implementação de frontend. |
| Que campos reais de produto/preço podem ser obtidos? | Nenhum campo de preço foi obtido. Não foram importados produtos, marcas, tamanhos, categorias, valores ou disponibilidade. |
| Como preço online se associa a uma filial? | Não foi confirmado um identificador de filial do e-commerce, seleção de unidade ou vínculo entre unidade e preço. |
| Termos/condições autorizam coleta? | Nenhuma autorização para coleta automatizada foi confirmada. A política de privacidade indexada não é uma licença de uso do catálogo/preços. |

## Limitação exata e ações evitadas

O impedimento concreto é o **bloqueio geográfico HTTP 403 da CloudFront** no acesso público normal à loja online, combinado com a ausência de documentação/API/feed e de autorização confirmada para reutilização automática dos preços. Não houve tentativa de VPN, proxy, origem alternativa para contornar o bloqueio, CAPTCHA, login, repetição agressiva, enumeração de endpoints ou scraping.

## Como isso está representado no CompraFácil

- A rede e os nomes de unidades conhecidos permanecem cadastrados localmente, com endereços e IDs de filial explicitamente não confirmados.
- O catálogo inicial não contém produtos/preços do SuperLuna. Nenhum preço fictício é tratado como preço real.
- O modelo local guarda produto (incluindo marca e tamanho/unidade), loja/unidade, preço, origem do registro e timestamp; arroz de 1 kg e 5 kg têm identidades distintas. Alterações de preço manual registram histórico e podem alimentar eventos/notificações locais.
- Uma observação digitada pelo usuário fica marcada como manual; ela não é atribuída ao SuperLuna como valor verificado pelo supermercado.
- Não existe atualização automática nem tarefa em segundo plano de preços nesta versão.
- O ponto de extensão tipado está em `lib/price-provider.ts`: um adaptador futuro precisa declarar evidência HTTPS de documentação oficial ou autorização escrita, operações permitidas, data de revisão e intervalo mínimo de atualização. O contrato prevê filial, produto com marca/tamanho/unidade e oferta com preço, moeda, disponibilidade, fonte e timestamp. `activePriceProviders` permanece intencionalmente vazio; não há classe/cliente, endpoint ou chamada SuperLuna ativa.

## Condição para uma futura integração

Reavaliar somente quando o SuperLuna fornecer documentação de API/feed ou autorização expressa para acesso automatizado. Antes de implementar, confirmar escopo/termos de uso, limites e frequência permitidos, categorias/campos disponíveis e um identificador documentado para cada filial. O adaptador futuro deve chamar apenas essa interface autorizada, persistir fonte e timestamp por preço/unidade, registrar histórico apenas em alterações e acionar notificações conforme a preferência Android. Até lá, manter a integração desligada.
