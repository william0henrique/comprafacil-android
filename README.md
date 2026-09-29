# CompraFácil — Android

O **CompraFácil** organiza listas de compras, registra preços informados pela própria pessoa e compara o total conhecido entre supermercados. A versão Android **1.1.0** é local-first: não exige conta nem login. O SQLite do aparelho continua sendo a fonte principal; existe um backup remoto **opcional**, criptografado no Android e ativado apenas por consentimento.

> **Transparência de preços:** nesta versão, os únicos preços utilizados são os digitados manualmente. Não há preço automático de supermercado, referência ativa do Mercado Livre, estimativa baseada em anúncios ou preço fictício apresentado como real.

## Download

- [Abrir a página de Releases](https://github.com/william0henrique/comprafacil-android/releases)

**Ainda não há um APK 1.1.0 gerado e validado publicado.** O código está preparado para a geração Android pelo Dashboard do projeto Mobile; a página de Releases só deve receber o APK correspondente depois que esse build terminar e sua versão for conferida. Um arquivo APK anterior, inclusive um arquivo chamado `v1.0.1`, não é considerado build da fonte 1.1.0.

Quando uma Release verificada estiver disponível, baixe o APK anexado à Release. No Android, abra o arquivo baixado, permita a instalação para o aplicativo de origem quando solicitado e confirme. Instale apenas APKs anexados a Releases deste repositório.

## O que o app faz

- Cria e mantém listas no Android, com produtos, marca, categoria, tamanho, unidade e quantidade.
- Mantém produtos de tamanhos diferentes separados, por exemplo, arroz de 1 kg e arroz de 5 kg.
- Calcula subtotais multiplicando quantidade pelo preço registrado. Itens sem preço são identificados e não recebem valores estimados ou inventados.
- Registra manualmente um preço por produto e unidade de supermercado, com origem explícita e data/hora.
- Compara listas usando somente preços manuais registrados naquela loja/unidade. Totais parciais informam itens ainda sem preço.
- Salva favoritos, preferências, histórico de alterações de preços e eventos localmente.
- Pode solicitar localização em primeiro plano quando a pessoa inicia uma busca ou comparação; a localização é opcional.
- Oferece notificações Android locais para eventos e limites associados a preços informados manualmente, quando a permissão é concedida.
- Oferece backup remoto opcional, cifrado no próprio Android antes de ser enviado ao MySQL gerenciado.

## Lista, quantidade e totais

Cada item da lista referencia um produto e guarda sua quantidade. Quando existe um preço manual para a loja escolhida, o subtotal do item é quantidade × preço unitário registrado; o total soma os subtotais conhecidos. Produtos sem preço permanecem sem estimativa e são indicados à parte. O total não representa uma cotação completa quando há itens sem preço.

## Comparação entre supermercados

A comparação considera as lojas/unidades salvas e apenas os preços manuais associados à unidade correspondente. Mostra quantos itens têm preço conhecido e quantos continuam sem preço, sem tratar um total parcial como cotação completa. Anúncios do Mercado Livre não entram em totais, ranking ou recomendação de supermercados.

## Localização

A localização é solicitada somente após uma ação iniciada pela pessoa e é usada em primeiro plano. A distância pode influenciar a recomendação de loja ou ser usada para abrir uma rota. Uma consulta ao serviço opcional de lojas próximas pode enviar as coordenadas daquela busca à API configurada; a posição atual não é guardada como rastreamento pelo app. Endereço e coordenadas de uma loja que a pessoa salvar podem permanecer no SQLite e, se o backup opcional for ativado, dentro do snapshot cifrado.

## Pesquisa de preços e estimativas

O app **não consulta preços de supermercado nem pesquisa anúncios do Mercado Livre**. Os produtos e preços utilizados para listas/comparações são inseridos manualmente. A integração automática do SuperLuna permanece desligada: o site respondeu HTTP 403 da CloudFront no acesso público normal e não foi confirmada uma API/feed autorizada. O bloqueio não foi contornado.

A documentação da GeckoAPI descreve tecnicamente uma extração do Mercado Livre, mas não foi encontrada autorização do Mercado Livre para coleta automatizada, cache, exibição ou estatísticas derivadas. Nenhuma busca ou importação de preços foi realizada. A fórmula futura de **70% média de preços primários + 30% média aparada do Mercado Livre** é apenas uma regra planejada e não é calculada nesta versão.

| Fonte | Estado | Efeito no app |
| --- | --- | --- |
| Preço informado pela pessoa | Ativo | Identificado como manual; pode alimentar subtotais, comparação, histórico e notificações locais. Não é preço verificado pela loja. |
| SuperLuna | Manual, sem integração automática | Loja/unidade cadastrável; nenhum preço real é importado automaticamente. |
| Mercado Livre via GeckoAPI | Desativado | Nenhuma consulta, anúncio ou preço ativo; não entra na comparação entre supermercados. |
| Outros supermercados | Manual, sem feed ativo | Lojas cadastráveis e preços digitados pela pessoa. |

Relatórios: [auditoria do SuperLuna](docs/superluna-audit.md), [auditoria GeckoAPI/Mercado Livre](docs/geckoapi-mercadolivre-audit.md) e [auditoria consolidada de fontes](docs/catalog-sources-audit.md).

## Histórico e notificações

Cada novo preço manual pode registrar a alteração no histórico local. Notificações são locais ao Android e dependem da permissão; podem avisar sobre mudanças/limites relacionados a preços que a própria pessoa registrou. Como não há feed externo ativo, o app não detecta promoções ou mudanças automáticas de preços de mercado.

## Dados e backup criptografado

Sem ativar o backup, listas, produtos, lojas, favoritos, preferências, preços e histórico permanecem no SQLite local. O backup remoto é opcional e não cria conta nem sincroniza aparelhos:

1. A pessoa autoriza o recurso nas Configurações.
2. O Android gera uma chave de cifragem e um token de acesso aleatórios e independentes, guardados no SecureStore/Android Keystore.
3. O snapshot é cifrado no Android com XChaCha20-Poly1305 e enviado por HTTPS. O MySQL guarda somente o envelope cifrado, o hash do token, a revisão e horários; o backend não consegue ler o conteúdo.
4. Depois de ativado, alterações são enviadas com o app em uso e há uma tentativa ao abrir. Não há execução agendada ou sincronização em segundo plano.

**Limites importantes:** não há recuperação da chave, transferência para outro aparelho ou histórico de versões. Perder a chave de cifragem torna o conteúdo irrecuperável. Perder o token impede que o app localize ou apague aquela cópia. Não há expiração automática; apague a cópia remota nas Configurações antes de desinstalar o app. Pausar o backup mantém a cópia; apagar a cópia remota não remove os dados locais. Falhas de rede não impedem o uso local.

Veja o [contrato de segurança do backup](docs/cloud-backup-security.md) para dados visíveis ao serviço, tamanho máximo, limites básicos de requisição e detalhes técnicos.

## Privacidade e autenticação

- Não há cadastro, conta, e-mail ou senha do CompraFácil.
- A localização em segundo plano não é usada.
- A chave de cifragem e o token de backup não são embutidos no APK nem enviados em texto claro ao servidor; o token é transmitido apenas em cabeçalho HTTPS.
- O SecureStore é excluído do Android Auto Backup. Reinstalar pode criar uma nova identidade de backup e deixar uma cópia antiga inacessível.
- A busca opcional de lojas próximas depende de configuração do servidor. Sem ela, listas e comparações locais continuam disponíveis.

## Instalação e desenvolvimento

### Requisitos

- Node.js 22 ou compatível com a versão Expo fixada no projeto.
- `pnpm`.
- Android Studio/emulador ou aparelho Android para executar o modo de desenvolvimento.

### Preparar o ambiente

```bash
pnpm install --frozen-lockfile
cp .env.example .env
```

Para desenvolvimento, configure `EXPO_PUBLIC_API_BASE_URL` com um endereço de API alcançável pelo dispositivo Android. A URL é pública e não deve conter credenciais. Para a busca opcional de supermercados próximos, o servidor precisa de `MANUS_API_URL` e `MANUS_API_KEY`; mantenha `MANUS_API_KEY` exclusivamente no ambiente protegido do servidor, nunca em `EXPO_PUBLIC_*`, no APK ou no Git. `DATABASE_URL` também é segredo exclusivamente do servidor/ambiente gerenciado.

**Não configure `GECKO_API_KEY` nem `GECKO_API_URL`:** a integração não está autorizada nem ativa, e o projeto não chama a GeckoAPI.

### Comandos

```bash
pnpm check   # verificação TypeScript
pnpm lint    # lint do Expo
pnpm test    # testes automatizados
pnpm build   # bundle do servidor; não gera APK
pnpm dev     # API local + Metro
pnpm android # desenvolvimento Android conectado/emulador
```

O projeto Mobile gerenciado gera o APK oficial pela ação **Build Android APK** no Dashboard. Preview, Expo Go e `pnpm build` não são um APK instalável. Para este código, a versão configurada é **1.1.0**, `versionCode` 2, Android mínimo API 24 e arquiteturas `armeabi-v7a`/`arm64-v8a`; isso descreve a configuração-fonte, não confirma que um APK foi gerado.

## Tecnologias

Expo, React Native, TypeScript, Expo Router, NativeWind, SQLite (`expo-sqlite`), Express, tRPC, Drizzle ORM, MySQL gerenciado, Expo SecureStore, Expo Crypto e `@noble/ciphers`.

## Estrutura principal

- `app/` — telas Android e rotas.
- `components/` — componentes visuais reutilizáveis.
- `lib/local-db.ts` — SQLite local, listas, lojas, preços, histórico, exportação/restauração de snapshot.
- `lib/domain.ts` — regras de moeda, comparação e recomendação.
- `lib/cloud-backup-client.ts`, `lib/cloud-backup-crypto.ts`, `lib/cloud-backup-snapshot.ts` — fluxo Android de backup, cifra e validação.
- `lib/price-provider.ts`, `lib/marketplace-provider.ts` — pontos de extensão com ativação fechada por padrão.
- `server/cloud-backup.ts` — API de snapshot cifrado; token nunca é salvo em claro.
- `server/` e `drizzle/` — API e schema/migrações do backend gerenciado.
- `tests/` — testes automatizados.
- `docs/` — auditorias de fontes de preços e documentação de segurança.

## Contribuições futuras

Issues e pull requests podem propor melhorias, correções ou fontes de dados autorizadas. Toda nova integração de preços deve apresentar autorização verificável para coleta, armazenamento, exibição e uso derivado, respeitando termos e limites; não contorne 403, CAPTCHA ou autenticação. Não publique segredos, dados pessoais, preços fictícios como reais nem builds sem correspondência com a fonte. O repositório ainda não inclui um arquivo `CONTRIBUTING.md`; combine as mudanças e seus testes no pull request.

## Licença

Este repositório **não contém um arquivo `LICENSE`**. A publicação pública não concede, por si só, permissão para reutilizar, modificar ou redistribuir o código. Uma licença deverá ser escolhida pelo titular antes de conceder esses direitos.
