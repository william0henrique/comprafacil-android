# Backup criptografado do CompraFácil

## Estado atual de publicação

A API de backup está ativa no domínio de produção. Em 29/09/2026, uma consulta somente de leitura com um token descartável retornou HTTP 200 e `exists: false`; nenhum backup de usuário foi lido nem escrito. O fluxo exige o cliente de backup incluído na fonte Android 1.1.0+ e consentimento explícito; a fonte atual é 1.2.0. As seções seguintes descrevem o contrato. A rota é anônima e tem limites de requisição em memória por processo, mas não possui quota global durável de armazenamento; antes de ampliar a distribuição do APK, é necessário definir uma política de quota e monitoramento.

## Decisão de segurança

O SQLite no Android continua sendo a fonte principal. O backup remoto é opcional e só começa após consentimento explícito nas Configurações. O app cria um snapshot JSON versionado no aparelho, cifra-o com **XChaCha20-Poly1305** e envia por HTTPS apenas um envelope com versão, algoritmo, nonce e texto cifrado. O backend não recebe listas, produtos, GTIN/EAN, metadados de produto, URLs/origens de imagem autorizada, cache/resumos de preços, lojas, endereços/coordenadas salvos, preços, histórico, favoritos ou preferências em texto legível.

A chave de cifragem e o token de acesso são aleatórios e independentes: cada um tem 32 bytes, gerados com `expo-crypto` e armazenados apenas no `expo-secure-store`, protegido pelo Android Keystore. O token é enviado somente no cabeçalho `Authorization: Bearer`; o MySQL guarda apenas o SHA-256 do token. O token não é uma chave de cifragem. Cada cifragem usa um nonce aleatório de 24 bytes.

O snapshot em texto claro fica limitado a 1.000.000 bytes no cliente. O envelope é validado dos dois lados, o endpoint limita o corpo a 3 MB e o servidor rejeita campos, formatos, algoritmos ou versões não suportados. A autenticação AEAD detecta alterações; o app valida e descriptografa o snapshot inteiro antes de iniciar a restauração. A restauração valida identificadores e vínculos entre tabelas e substitui os dados de usuário numa transação SQLite exclusiva.

## Dados e metadados

O snapshot inclui lojas salvas — inclusive endereço e coordenadas quando presentes —, listas, itens, produtos (incluindo EAN, origem de metadados/imagem, validade do cache e resumo local de preços), preços e histórico manual, preferências de alertas, eventos e preferência de recomendação. Chaves, token e estado local de sincronização ficam fora do snapshot. O servidor armazena o envelope cifrado, o hash de identificação, a revisão e o horário da atualização; a revisão é apenas um contador, não um histórico de versões.

O serviço processa o IP da requisição para rede/limitação de taxa; o código do endpoint não grava o IP junto ao registro de backup. A infraestrutura de rede pode processar metadados de conexão. Tamanho aproximado do payload, horários, hash de instalação, revisão, algoritmo e nonce não são ocultados pela cifragem.

A API aplica limites em memória por processo: até 600 solicitações por IP por minuto e 30 gravações por instalação por minuto. Esses limites são uma proteção básica de melhor esforço, não uma quota global durável nem um controle distribuído entre processos. O endpoint é anônimo e não possui quota global de armazenamento; por isso, o servidor público deve ser monitorado e os limites revistos antes de ampliar a distribuição. Respostas de backup usam `Cache-Control: no-store`; corpo, token e snapshot não são registrados pelo código da rota.

## Identidade, retenção e perda de chaves

O app não oferece cadastro, login, e-mail ou senha. O schema gerenciado ainda contém uma tabela `users` herdada do template, mas não é usada pelo CompraFácil nem referenciada pela tabela/rotas do backup. Cada instalação tem uma identidade independente: não existe transferência, sincronização ou recuperação entre aparelhos. O SecureStore é excluído do Android Auto Backup para impedir que dados cifrados sejam restaurados sem a chave correspondente do Keystore.

Perder a chave de cifragem torna o conteúdo remoto irrecuperável. Perder o token também impede que o app localize ou apague a linha correspondente. Reinstalar o app pode criar uma nova identidade e não localizar a cópia anterior. O serviço não define expiração automática: uma cópia órfã pode permanecer no banco até uma política administrativa futura; apague a cópia no app **antes** de desinstalar. O suporte não consegue recuperar o conteúdo nem descobrir o token original.

## Comportamento no Android

- A primeira gravação exige consentimento explícito e só ocorre após conexão com o backend.
- Se já existir uma cópia para o mesmo token, o app oferece restaurar ou substituir; não sobrescreve sem escolha.
- Após ativado, o app envia um snapshot cifrado após alterações monitoradas no SQLite, com debounce, e tenta sincronizar quando abre. Só opera enquanto o app está ativo; não há tarefa agendada, worker contínuo ou serviço de sincronização em segundo plano.
- Falhas de rede não bloqueiam nem revertem gravações locais.
- Restaurar substitui dados locais após confirmação e validação integral. Pausar interrompe novos envios, mas mantém a cópia remota. Apagar a cópia exige confirmação e não apaga os dados locais.
- Cada envio substitui a cópia vigente. A revisão numérica não permite recuperar versões anteriores.

## Formato da versão 1

```json
{
  "version": 1,
  "algorithm": "xchacha20poly1305",
  "nonceHex": "<24 bytes aleatórios em hexadecimal>",
  "ciphertextHex": "<snapshot UTF-8 cifrado e tag de autenticação em hexadecimal>"
}
```

O JSON cifrado contém `schemaVersion` e as tabelas do CompraFácil. A API rejeita algoritmos, versões, nonces, tamanhos e formatos não suportados.

## Referências técnicas

- A documentação oficial de `@noble/ciphers` descreve `xchacha20poly1305`, autenticação AEAD e nonces de 24 bytes: [repositório e README](https://github.com/paulmillr/noble-ciphers).
- A documentação oficial do Expo Crypto descreve `getRandomBytesAsync` e a geração nativa de bytes aleatórios: [Expo Crypto](https://docs.expo.dev/versions/latest/sdk/crypto/).
- A documentação oficial do Expo SecureStore descreve a proteção Android via Keystore e a exclusão do SecureStore do Auto Backup: [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).
