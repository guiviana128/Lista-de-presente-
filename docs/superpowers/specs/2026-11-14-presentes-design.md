# Presentes e perfis de Rayza e Guilherme

Implementar as alterações solicitadas no site existente, preservando os presentes atuais e o endereço de produção.

- Corrigir cadastro, edição e exclusão com identidades estáveis e armazenamento permanente.
- Aceitar imagens por URL, seleção de arquivo e copiar/colar, com prévia e otimização.
- Usar os mesmos controles para as fotos de Rayza e Guilherme e manter as fotos ao trocar o perfil.
- Renovar o layout para celular e desktop, com fundo creme, vinho, rosa suave, fotos maiores e cartões organizados.
- Manter busca, filtros, reservas e marcação de comprado.
- Testar CRUD, persistência, exclusão sem restauração automática, imagens e fotos antes do commit e deploy.

## Abordagem

Preservar Node.js e HTML/CSS/JavaScript existentes. Usar Vercel Blob privado, já conectado ao projeto, para dados e imagens. Atualizações do documento de dados usam ETag para impedir perda de alterações concorrentes. Arquivos de imagens são independentes; fotos não aumentam o documento dos presentes.

SQLite temporário mantém a causa do defeito e foi descartado. Um novo fornecedor de banco SQL exigiria configurar outro serviço; para esta lista pequena de duas pessoas, o armazenamento privado na Vercel atende com menos configuração. Se a lista crescer muito, migrar os dados para SQL será apropriado.

## Proposta visual

Cabeçalho simples com o nome do casal, área de apresentação com fotos dos dois, estatísticas discretas, filtros compactos e cartões com imagens valorizadas. Editor de imagens com link, arquivo e área para colar, prévia visível, remover foto e mensagens claras durante o salvamento.

## Publicação

Preservar os dois presentes atualmente encontrados na API em uma migração inicial, testar uma versão de preview e publicar no endereço https://lista-de-presente-sandy.vercel.app/. Fazer commit no GitHub com as alterações verificadas.
