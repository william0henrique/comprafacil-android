# CompraFácil — Android

O **CompraFácil** organiza listas de compras, salva produtos e favoritos, registra preços informados pela pessoa e mostra referências locais claramente identificadas. O código-fonte atual é **1.2.0** (`versionCode` 3). O armazenamento principal é o SQLite do Android; não há conta, login ou cadastro obrigatório. Um backup remoto opcional só é enviado depois de ativação expressa e criptografia no aparelho.

> **Transparência:** nenhum preço automático de supermercado ou anúncio está ativo. O app não inventa produtos, imagens ou preços. Preços manuais continuam identificados como informados pela pessoa; médias são referências, não cotações confirmadas por lojas.

## 1. Download e estado do APK

- [Abrir as Releases do CompraFácil no GitHub](https://github.com/william0henrique/comprafacil-android/releases)

Ainda não há um APK **1.2.0** publicado e verificado nesta documentação. Uma compilação de versão anterior não representa o código atual. A Release só deve ser criada depois de o APK ser obtido, conferido quanto à versão e integridade e associado ao commit correspondente.

Quando uma Release Android validada estiver disponível, baixe o APK anexado à Release. No Android, abra o arquivo, autorize a instalação para o aplicativo de origem se o sistema solicitar e confirme. Instale apenas APKs anexados às Releases deste repositório.

## 2. Objetivo

A primeira versão prioriza uma experiência móvel prática: criar listas, registrar quantidades e preços, comparar valores anotados entre lojas e manter dados no aparelho. Os preços automáticos dependem de autorização verificável do fornecedor e permanecem desligados enquanto essa autorização não existir.

## 3. Plataforma suportada

O aplicativo é **Android-only** nesta versão. iOS, navegador, Web e PWA não são plataformas de entrega ou build. A configuração fonte restringe as plataformas a Android.

## 4. Recursos principais

- Listas e itens locais, com produto, marca, categoria, tamanho, unidade e quantidade.
- Cadastro de produtos e favoritos no SQLite do aparelho.
- Scanner Android de código de barras aberto somente quando a pessoa toca em **Escanear código de barras**.
- Histórico de alterações de preços e notificações Android locais para entradas manuais, sujeitos à permissão do sistema.
- Comparação entre supermercados usando exclusivamente preços manuais daquela loja/unidade.
- Localização opcional em primeiro plano para recursos de proximidade.
- Backup remoto opcional, sem conta, cifrado no aparelho antes do envio.

## 5. Contas e autenticação

Não há cadastro, login, e-mail, senha ou provedor externo de autenticação. Listas, produtos e configurações podem ser usados localmente sem criar uma conta. O backup é opcional, não sincroniza aparelhos e não identifica a pessoa por uma conta.

## 6. Fluxo de leitura de código de barras

Na tela **Adicionar produto**, a pessoa pode escolher **Pesquisar produto** ou **Escanear código de barras**. O scanner abre a câmera traseira e uma moldura guia o enquadramento. A primeira leitura válida trava novas leituras até a tela seguinte, evitando múltiplos produtos adicionados por um único apontamento.

O app valida EAN/GTIN com dígito verificador e procura primeiro pelo código exato no catálogo local. A câmera suporta códigos EAN/GTIN compatíveis; códigos que não passam na validação não entram no cache.

## 7. Pesquisa por nome

**Pesquisar produto** filtra os produtos já cadastrados neste aparelho. Não consulta um catálogo remoto nesta versão. Se o código escaneado não existir localmente, a pessoa pode pesquisar o nome entre seus produtos, cadastrar os dados manualmente ou tentar outro código.

## 8. Dados do produto

Quando um produto local é encontrado, a confirmação mostra o nome, a marca, a descrição, a categoria, o tamanho/unidade e o EAN disponíveis no próprio cadastro. Dados ausentes continuam ausentes: o app não completa nem inventa campos. A origem da informação é identificada quando disponível.

## 9. Confirmação antes de adicionar

Antes de pesquisar preços e adicionar o produto, o app apresenta **“Encontramos este produto”** e pergunta **“É este produto?”**. A pessoa pode confirmar ou pedir nova leitura. Se não houver correspondência, aparece **“Não encontramos esse código de barras.”**, com ações para pesquisar no catálogo local por nome, adicionar manualmente ou tentar de novo.

## 10. Imagens e direitos de uso

Nenhuma imagem fictícia é gerada para representar um produto real. Uma imagem só pode ser exibida quando há URL HTTPS, origem identificada e direitos de exibição confirmados para o fornecedor. Como as fontes de catálogo auditadas ainda não comprovaram esses direitos para o uso pretendido, não há busca automática de imagens ativa.

## 11. Identificação e tamanhos de embalagem

O EAN/GTIN validado é a chave principal de busca local. O app também verifica nome, marca e embalagem antes de aceitar uma associação. Tamanhos incompatíveis, por exemplo arroz de 1 kg e arroz de 5 kg, permanecem separados; valores de kg/g e l/ml só são comparáveis após conversão de unidade equivalente. Para anúncios futuros, um resultado externo só poderá participar da média depois de passar pela validação estrita de código, nome, marca, tamanho e unidade. Kits, conjuntos e embalagens incompatíveis não devem ser mesclados.

## 12. Cache por código de barras

O produto, o EAN, os dados de origem, os campos da imagem autorizada, a última consulta e o resumo de preços têm colunas próprias no SQLite. Ao ler um código já cadastrado, o app reutiliza imediatamente o registro local e verifica sua validade. Um cache vencido é sinalizado; como não existe provedor autorizado ativo, o app não tenta atualizar pela rede.

O cadastro manual local não expira por padrão. Uma futura fonte remota precisará definir e respeitar um TTL autorizado e limitado antes de ser habilitada.

## 13. Busca de preços depois da confirmação

Depois da confirmação do produto, `PriceSearchService` lê somente observações de preço manual salvas no aparelho para **aquele mesmo registro de produto**. Nenhuma chamada a supermercado, Mercado Livre, GeckoAPI ou catálogo de terceiros é realizada. Quando não há observação elegível, a tela informa **“Preço: não disponível”** e ainda permite adicionar o produto sem preço.

## 14. Média, mínimo, máximo e quantidade de fontes

Quando existem preços locais elegíveis para o produto, a tela informa a média, o menor e o maior valor, a quantidade de observações e a data/hora da consulta local. A tela separa os grupos de fonte: uma oferta de marketplace nunca é apresentada como supermercado.

Se só houver preços primários, o resumo usa a média desse grupo. A regra futura já especificada de **70% da média primária + 30% da média aparada de marketplace** só pode ser aplicada quando ambos os grupos tiverem observações autorizadas e compatíveis. Como marketplace está desligado, a fórmula não produz hoje uma média com anúncios.

## 15. Preço de supermercado e escolha da loja

Preços manuais por loja/unidade aparecem separadamente, com a origem, a unidade cadastrada e a data/hora. A pessoa pode escolher um desses preços e a lista passa a usar aquela loja. Esses valores foram informados pela pessoa e **não foram verificados pelo supermercado**.

## 16. Preço de referência quando nenhuma loja é escolhida

Na ausência de uma loja escolhida para a lista, o app pode usar a média dos preços manuais locais compatíveis como **referência estimada**, sem atribuí-la a uma filial específica. Com uma loja selecionada, a observação manual daquela loja tem prioridade; a referência identificada pode preencher itens sem preço naquela unidade. A comparação entre supermercados continua usando apenas observações manuais associadas a cada loja.

## 17. Quantidade e subtotal

O subtotal do item é calculado automaticamente como **quantidade × preço disponível**. Por exemplo, 3 unidades de uma referência de R$ 24,40 correspondem a R$ 73,20. Se não houver preço elegível, o item continua na lista sem valor. Totais que misturam valores registrados e referências são identificados como parciais/estimados, não como cotação completa.

## 18. Comparação entre supermercados

A comparação soma somente preços manuais salvos para o produto e a unidade correspondentes em cada supermercado. Ela mostra a quantidade de itens com preço e sem preço. Uma referência média não é usada para afirmar que determinada filial vende aquele produto por esse valor; marketplace não entra em ranking ou recomendação de supermercado.

## 19. Histórico de preços

Ao registrar ou alterar um preço manual, o app pode guardar o valor anterior, o novo valor, a loja/unidade, a fonte manual e a data/hora no armazenamento local. O histórico não contém preços importados automaticamente.

## 20. Notificações Android

Notificações locais podem avisar sobre alteração ou limite associado a preço informado manualmente, desde que a permissão Android esteja concedida. Como não há feed automático ativo, o app não detecta promoções nem mudanças de mercado em segundo plano.

## 21. Localização

A localização é opcional e solicitada em primeiro plano somente após uma ação da pessoa. Não há rastreamento em segundo plano. Uma futura busca de lojas próximas pode enviar coordenadas à API configurada para aquela solicitação; a localização atual não é mantida como histórico de rastreamento.

## 22. SuperLuna

O SuperLuna permanece cadastrado como supermercado manual. Na auditoria pública anterior, o acesso normal ao site respondeu **HTTP 403 da CloudFront** e não foi confirmada API ou feed autorizado. O bloqueio não foi contornado, nenhum preço foi extraído e a integração automática continua desativada. Veja [auditoria do SuperLuna](docs/superluna-audit.md).

## 23. Mercado Livre e GeckoAPI

A integração via GeckoAPI permanece desligada. A disponibilidade técnica de uma API ou serviço de extração não comprova autorização para coleta, cache, exibição ou cálculo de estatísticas derivadas. Nenhuma consulta de anúncios foi executada; ofertas de marketplace não são apresentadas como preços de supermercado. Veja [auditoria GeckoAPI/Mercado Livre](docs/geckoapi-mercadolivre-audit.md).

## 24. Fontes de catálogo de produtos

A auditoria documental de GS1 Brasil, Barcode Lookup e EAN-Search não encontrou direitos suficientes e comprovados para habilitar consulta, cache, exibição de metadados/imagens e uso derivado no app. Os serviços exigem liberação, chave ou assinatura e/ou deixam os direitos de dados de terceiros indeterminados. Nenhuma conta/chave foi criada e nenhuma chamada de amostra foi feita. Veja [auditoria de fontes por código de barras](docs/barcode-product-source-audit.md).

## 25. Permissões do Android

- **Câmera:** solicitada somente ao tocar em **Escanear código de barras**. Se negada, o app explica como abrir as configurações; listas e cadastros manuais continuam disponíveis.
- **Localização:** opcional, em primeiro plano.
- **Notificações:** usadas somente para alertas locais, conforme permissão do sistema.
- **Microfone:** não é necessário nem solicitado pelo scanner.

## 26. Armazenamento local

SQLite no dispositivo mantém listas, itens, produtos, códigos de barras, imagens autorizadas com sua origem, lojas, preços manuais, histórico, favoritos, preferências, cache e configurações. Os códigos de barras não são enviados a um catálogo remoto nesta versão. A comparação entre supermercados usa somente o banco local.

## 27. Backup remoto criptografado

O backup é opcional, sem login e sem sincronização entre aparelhos. A chave de cifragem e o token aleatórios são guardados no Android SecureStore/Keystore. O snapshot, incluindo os dados do produto, é cifrado no aparelho com XChaCha20-Poly1305 antes do envio por HTTPS. O MySQL guarda somente o envelope cifrado e metadados técnicos mínimos; o servidor não consegue ler as listas.

Perder a chave torna o backup irrecuperável. Não há recuperação da chave, transferência para outro aparelho, histórico de versões ou expiração automática. Pausar mantém a cópia remota; apagar a cópia não remove os dados locais. Consulte o [contrato de segurança do backup](docs/cloud-backup-security.md).

## 28. Privacidade e rede

Não há autenticação nem solicitação de dados de conta. Scanner, pesquisa pelo nome e leitura de preços do catálogo local funcionam sem chamadas externas. Recursos de proximidade e backup opcional usam a rede apenas quando configurados/ativados. Segredos do servidor nunca devem estar em variáveis `EXPO_PUBLIC_*` nem no APK.

## 29. Instalação e uso

Use somente um APK anexado a uma Release validada do repositório. O Android pode pedir autorização para instalar arquivos do aplicativo pelo qual o APK foi baixado. O app mantém listas locais sem rede; a permissão da câmera só é necessária para leitura de código.

## 30. Requisitos de desenvolvimento

- Node.js 22 ou compatível com a versão Expo fixada.
- `pnpm`.
- Android Studio/emulador ou aparelho Android para desenvolvimento/teste.
- Não é necessário obter credenciais de catálogo para executar testes locais.

## 31. Preparar o ambiente

```bash
pnpm install --frozen-lockfile
cp .env.example .env
```

Para desenvolvimento, configure `EXPO_PUBLIC_API_BASE_URL` apenas com uma origem pública sem segredos. Para busca opcional de lojas próximas, `MANUS_API_URL` e `MANUS_API_KEY` pertencem exclusivamente ao servidor. `DATABASE_URL` também é segredo de backend.

## 32. Variáveis de provedores

**Não configure `GECKO_API_KEY`, `GECKO_API_URL` nem credenciais de catálogo** nesta versão. Não há fonte automática autorizada ativa. Nunca inclua chaves em código, `.env` público, log ou APK.

## 33. Comandos de desenvolvimento

```bash
pnpm check   # verificação TypeScript
pnpm lint    # lint do Expo
pnpm test    # testes automatizados
pnpm build   # bundle do servidor; não gera APK
pnpm dev     # API local + Metro
pnpm android # desenvolvimento Android conectado/emulador
```

## 34. Build Android e versão

A configuração-fonte atual é **1.2.0**, `versionCode` **3**, Android mínimo API 24, arquiteturas `armeabi-v7a` e `arm64-v8a`. Essa informação descreve o código; só uma compilação Android concluída e verificada pode ser chamada de APK 1.2.0. `pnpm build`, Preview e Expo Go não produzem por si só um APK instalável.

## 35. Arquitetura principal

- `app/` — rotas e telas Android.
- `components/barcode/BarcodeScanner.tsx` — leitor por câmera e controle de permissão/uma leitura.
- `lib/barcode/` — `ProductLookup`, `ProductMatcher`, `ProductImageResolver`, `PriceSearchService`, `PriceAggregator`, `ProductCache` e contrato de autorização.
- `lib/local-db.ts` — SQLite, código de barras, preços, histórico e snapshot de backup.
- `lib/price-provider.ts` e `lib/marketplace-provider.ts` — gates de preços externos, fechados por padrão.
- `lib/cloud-backup-client.ts`, `lib/cloud-backup-crypto.ts`, `lib/cloud-backup-snapshot.ts` — fluxo de backup cifrado.
- `server/cloud-backup.ts` — armazenamento remoto de conteúdo cifrado.
- `tests/` — testes unitários e de integração.

## 36. Testes e validação

`pnpm check` verifica os tipos TypeScript; `pnpm test` executa os testes automatizados. Testes do scanner/catálogo cobrem dígito verificador, tamanhos equivalentes/incompatíveis, gates de autorização, cache local, ausência de fontes externas e a regra 70/30. Antes de publicar um APK, é necessário verificar também assinatura/estrutura, pacote Android, versão e correspondência com o commit de origem.

## 37. Como propor uma fonte autorizada

Uma integração futura precisa trazer evidência verificável que cubra consulta automatizada, armazenamento/cache, exibição de metadados e imagens, e uso derivado de preços; deve documentar limites, TTL, atribuição, escopo geográfico e credenciais. Não contorne 403, CAPTCHA, login, limite ou outro controle. A ativação requer revisão explícita; adicionar um endpoint técnico não é, por si só, autorização.

## 38. Contribuições

Issues e pull requests podem propor correções e melhorias Android. Inclua motivação, testes, versão/configuração e fontes de dados autorizadas quando aplicável. Não publique credenciais, dados pessoais, imagens sem direitos ou preços fictícios como reais.

## 39. Licença do repositório

Este repositório **não contém arquivo `LICENSE`**. A publicação pública não concede por si só direito de reutilizar, modificar ou redistribuir o código. A licença precisa ser escolhida pelo titular antes de conceder esses direitos.
