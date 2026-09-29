# Direção de design — CompraFácil (Android)

## Direções consideradas

- **Feira Arejada** — uma feira de bairro leve, organizada e acolhedora, com verde folha, creme e limão. Probabilidade: 0,06.
- **Mercado Noturno** — uma experiência urbana e concentrada, com azul profundo, alto contraste e acento cítrico. Probabilidade: 0,04.
- **Economia de Bairro** — uma identidade calorosa e prática, com terracota, creme e verde escuro. Probabilidade: 0,05.

## Direção escolhida: Feira Arejada

- **Movimento de design:** utilitário editorial de mercado local; a interface deve parecer organizada como uma banca de feira bem cuidada, não uma loja de e-commerce.
- **Princípios centrais:** clareza de preços, ausência de surpresa, confiança na origem de dados, fluxo rápido com uma mão, acessibilidade e estados offline honestos.
- **Filosofia de cor:** verde folha `#1F6B45` para ação principal e economia; creme `#FFF8EC` como fundo quente; verde profundo `#183027` para texto; limão `#D7EA6A` para destaque pontual; âmbar `#D69A36` para desatualizado/atenção; coral `#CA6A53` para erros e aumentos. Nunca usar cor sozinha para comunicar um estado.
- **Paradigma de layout:** retrato Android, conteúdo em coluna, áreas seguras respeitadas, cartões compactos e acessíveis, barra de navegação inferior com destinos Início, Listas, Supermercados e Favoritos; alerta/caixa de entrada acessível pelo topo.
- **Elementos de assinatura:** resumo de lista com total e itens sem preço em destaque, etiquetas de fonte/estado, comparação com preço e distância lado a lado, controles de quantidade grandes, chips de supermercado e um ícone geométrico de cesta/folha.
- **Interação:** criar lista em poucos toques; steppers com alvos grandes; feedback imediato nos totais; confirmações claras para exclusão; mensagens explicam quando preço ou distância não existem. O acesso não pede conta. Preços inseridos pelo usuário são identificados como “Manual”, nunca como preço verificado do supermercado.
- **Animação:** transições discretas e rápidas para abertura de cartões, feedback do stepper e atualização de totais; respeitar redução de movimento do sistema; nada de animações que atrasem entrada de itens.
- **Tipografia:** família sans-serif nativa do Android (Roboto/sistema); títulos semibold, valores monetários tabulares/fortes, texto auxiliar legível e contraste AA quando possível.
- **Essência e voz:** simples, confiável e vizinha; falar de forma direta, sem prometer economia ou atualização de mercado que não foi comprovada.
- **Marca/ícone:** símbolo original sem texto — cesta de compras abstrata com uma folha geométrica ou dois produtos representados apenas por formas, silhueta forte em verde folha sobre fundo creme integral. Quadrado 1:1 opaco, sem cantos arredondados embutidos; mesma marca no splash e no ícone adaptativo Android. Não usar marcas de supermercados, produto reconhecível ou preço.
- **Cor assinatura:** verde folha `#1F6B45`.

## Telas e fluxos

1. **Início:** saudação curta; botão “Nova lista”; cartão da lista recente com total calculado apenas por preços efetivamente registrados; contador de produtos sem preço; acesso a favoritos; aviso informativo de que a integração de preço do SuperLuna está indisponível até existir fonte autorizada. Sem ofertas fictícias.
2. **Minhas listas:** listas locais, data de atualização, quantidade de itens e total parcial; criar, renomear, duplicar, favoritar e excluir com confirmação nativa Android.
3. **Detalhe da lista:** produtos, marca/tamanho/unidade, stepper de quantidade, preço unitário quando registrado, subtotal, origem e horário; adicionar produto cadastrado, manualmente ou por código de barras; preço manual exige escolher a loja/unidade e fica rotulado “Manual”; produto sem preço permanece visível e pode ser adicionado sem estimativa. Quando nenhum preço de loja for escolhido, só uma referência calculada de observações qualificadas e identificadas pode estimar o item; quando não houver dados elegíveis, preço e subtotal ficam indisponíveis.
4. **Comparar lista:** cards por supermercado com total calculado apenas sobre os preços manuais disponíveis naquela unidade, quantos faltam e itens ausentes; preferência por menor preço, menor distância ou equilíbrio; mostrar o motivo e não inventar preços ou distâncias. Um preço de referência não é atribuído a uma filial nem usado como preço de supermercado.
5. **Produtos/Meus produtos:** produtos criados localmente ou registrados; nome, marca, tamanho/unidade e categoria; EAN/GTIN quando informado, proveniência da metadata/imagem e horário de consulta; distinção rígida de tamanhos; favoritos; histórico só de entradas reais com fonte e data. Imagens aparecem somente quando associadas ao produto e autorizadas pela fonte; sem imagem verificada, não mostrar uma imagem substituta.
6. **Supermercados e unidades:** SuperLuna permanece cadastrado sem preço online; nomes de unidades citados em diretório público são exibidos sem inventar endereço ou identificador de filial do e-commerce. Busca de supermercados próximos é opcional e sob demanda; locais do Maps podem ser salvos neste aparelho, lojas manuais não são marcadas como verificadas e a rota só abre quando há endereço/coordenadas.
7. **Favoritos:** listas, produtos e supermercados favoritados, com atalhos para abrir.
8. **Alertas:** preferências locais para mudanças de preço e limite; caixa de entrada de eventos; solicitar permissão Android de notificação em contexto apropriado; explicar que não há alertas automáticos de mercado enquanto não existir fonte ativa.
9. **Configurações:** preferência de recomendação, versão do app, dados guardados localmente e painel de backup opcional criptografado no Android; explicar que não há conta, recuperação de chave ou sincronização entre aparelhos.
10. **Scanner de código de barras (Android):** acesso iniciado somente pelo botão “Escanear código de barras”; pedir permissão da câmera nesse toque, mostrar visor retrato com área de enquadramento, ler um EAN/GTIN e parar após o primeiro código. Procurar primeiro no cache SQLite local; mostrar produto, EAN, tamanho e fonte/proveniência. Exibir imagem somente se URL HTTPS e direitos da fonte estiverem confirmados. Se não houver correspondência, dizer “Não encontramos esse código de barras.” e oferecer pesquisa no catálogo local por nome, cadastro manual com o EAN ou nova leitura. Se a câmera for negada, explicar como habilitar em Configurações do Android; todo o resto do app continua funcionando.
11. **Confirmação e preços do scanner:** apresentar “Encontramos este produto”, metadados confirmados, fonte, imagem autorizada se existir e “É este produto?”; “Sim, adicionar” só então consulta os preços disponíveis. Mostrar manual/mercado em grupos distintos, supermercado com loja/unidade e horário, média/mínimo/máximo/contagem/consulta apenas sobre ofertas verificadas para o mesmo GTIN e embalagem; kits/tamanhos/unidades incompatíveis ficam fora. Quando houver os dois grupos autorizados, a referência futura segue 70% média primária + 30% média aparada do Mercado Livre, sem rotular Marketplace como supermercado. Se não houver preço elegível, dizer “Preço: não disponível”, deixar adicionar e não inventar valor; referência nunca é registrada como cotação de loja.

## Fluxos de toque

- **Criar lista:** Início → “Nova lista” → informar nome → abrir lista vazia → “Adicionar produto” → pesquisar/criar produto → definir quantidade → voltar à lista.
- **Escanear produto:** lista → “Adicionar produto” → “Escanear código de barras” → conceder permissão da câmera quando solicitada → posicionar um EAN/GTIN na moldura → parar na primeira leitura → procurar no cache local/fonte autorizada ativa → confirmar produto e metadados; se não encontrado, pesquisar por nome no catálogo local, cadastrar manualmente com o EAN ou tentar outra leitura → após “Sim, adicionar”, mostrar apenas preços reais qualificáveis, permitir selecionar uma oferta manual por supermercado ou usar uma referência derivada quando houver dados elegíveis → ajustar quantidade → adicionar. A câmera não é exigida para o cadastro manual.
- **Atualizar quantidade:** lista → `+`/`−` grande → recalcular subtotal e total imediatamente; item com preço ausente não altera total e contador de pendências é atualizado.
- **Registrar preço manual:** produto da lista → “Adicionar preço manual” → escolher supermercado/unidade já cadastrada → valor BRL → data/fonte “Informado manualmente” → salvar; comparar e registrar histórico local se mudou.
- **Comparar:** lista → “Comparar lista completa” → seleção de lojas → opcionalmente escolher critério e conceder localização → revisar faltantes e justificativa da recomendação.
- **Favoritar:** tocar estrela/coração em lista, produto ou supermercado → persistir localmente sem conta.
- **Localização:** Supermercados → “Buscar perto de mim” → solicitar permissão foreground Android; se negada, continuar com seleção manual sem distância.
- **Notificações:** Alertas → habilitar um tipo → explicar finalidade → solicitar POST_NOTIFICATIONS no Android no contexto; se negada, manter caixa de entrada local.
- **Backup criptografado:** Configurações → ler o aviso de envio e perda irrecuperável da chave → habilitar explicitamente → a cópia é cifrada no dispositivo antes do envio; depois disso, alterações são enviadas quando o app está ativo e uma tentativa é feita ao abrir o app. Offline, a edição local continua; restauração substitui os dados locais somente após confirmação; pausar mantém a cópia remota; excluir a cópia é ação separada e destrutiva.

## Restrições visuais e de dados

- Não incluir produto, imagem, preço, oferta, loja ou distância inventados como se fossem reais.
- Buscar externamente somente por provider explicitamente autorizado para consulta, armazenamento/cache, exibição e, conforme o caso, imagens/preços derivados; no estado atual, scanner consulta o catálogo local e ofertas manuais. Não carregar catálogo/preços copyleft/share-alike, não contornar 403/CAPTCHA e não chamar endpoint de fonte ainda não liberada.
- Cache de produto fica no mesmo SQLite local já existente e é indexado por EAN/GTIN; não criar banco separado para scanner. Reusar dados recentes, registrar última consulta/expiração e não fazer busca completa de novo enquanto o cache estiver válido.
- O cadastro SuperLuna deve deixar explícito que preço automático está indisponível; não criar coletor ou endpoint de fornecedor sem autorização confirmada.
- Não mostrar login, cadastro ou perfil. A chave de backup é da instalação e fica no Android; o servidor recebe somente um token de acesso e o snapshot cifrado. O backup não pode ser transferido para outro aparelho. Se a chave local for perdida, a cópia remota não pode ser recuperada.
- SQLite continua sendo a fonte local principal. Não executar sincronização sem consentimento; exibir claramente o estado e a última confirmação de envio. Não prometer execução agendada em segundo plano.
- Android apenas nesta versão; não investir em experiência iOS, navegador ou PWA.
