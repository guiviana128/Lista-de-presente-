# Lista de desejos · Rayza & Guilherme

Lista compartilhada de presentes em Node.js, HTML, CSS e JavaScript.

## O que dá para fazer

- Criar, editar e apagar presentes; buscar, filtrar, reservar e marcar como comprado.
- Adicionar imagens por link, arquivo, arrastar/soltar ou copiar e colar na área de imagem.
- Personalizar as fotos de Rayza e Guilherme nas mesmas três modalidades.
- Usar no celular ou computador, com prévias, mensagens de erro e indicação de salvamento.

## Rodar localmente

Requer Node.js 24 ou superior.

```sh
npm install
npm start
```

Abra http://localhost:3000. Os dados locais são gravados em `data/wishlist.json`, e as imagens em `data/images/`.

```sh
npm test
```

A suíte cobre CRUD, imagens e perfil, persistência após nova instância, conflitos de gravação, falha de leitura de imagem e conclusão de uploads após fechar o editor.

## Vercel

Conecte um **Vercel Blob privado** ao projeto com a variável `BLOB_READ_WRITE_TOKEN`. A credencial fica exclusivamente no servidor.

Na Vercel, dados e imagens ficam no armazenamento privado permanente. O documento de dados é lido sem cache e atualizado com ETag para evitar perda de alterações concorrentes. Nunca é gravado em SQLite temporário. O endpoint legado de sincronização não restaura backups do navegador, evitando o retorno de presentes apagados.

Produção usa `wishlist/v1/data.json`; previews usam `wishlist/preview/data.json`. As imagens são arquivos independentes com nomes únicos.

`seed.json` contém a cópia inicial dos presentes existentes para migrar na primeira gravação. Depois que o documento permanente existe, ele passa a ser a fonte dos dados; o seed não o sobrescreve.

As fotos são otimizadas pelo navegador antes do envio (até 1400 px); o servidor valida o formato e limita a imagem final a 2 MB. JPG, PNG, WebP e GIF são aceitos; o envio otimizado transforma GIF em imagem estática. Links externos dependem de o site de origem permitir a exibição.

## Observação sobre perfis

O seletor identifica quem está navegando. Este projeto mantém o modelo existente de lista compartilhada por quem conhece o endereço; ele não implementa uma área privada com autenticação de sessão.
