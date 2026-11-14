# Plano de correção de presentes e imagens

**Objetivo:** corrigir a lista existente, permitir imagens nos presentes e perfis, renovar o layout e publicar.

**Arquitetura:** manter Node.js e interface sem framework. Usar Vercel Blob privado para documento de dados com ETag e imagens separadas.

**Spec:** ../specs/2026-11-14-presentes-design.md

- [x] Reproduzir restauração indevida de presente apagado em teste.
- [x] Trocar SQLite temporário por persistência privada e escrita condicional; manter armazenamento local para desenvolvimento.
- [x] Adaptar API assíncrona, identidades estáveis e validação de campos e arquivos.
- [x] Implementar imagens por link, arquivo, colagem e arrastar/soltar, com prévia nos presentes e perfis.
- [x] Renovar layout responsivo e preservar filtros e ações.
- [x] Revisar o código e corrigir falha de leitura de imagens e upload concluído num editor diferente.
- [x] Rodar testes de API, persistência, concorrência e regressões de uploads.
- [ ] Fazer commit em branch de revisão e construir preview na Vercel.
- [ ] Validar preview, integrar na main e publicar no endereço existente.

## Evidências

Seis testes locais passaram. A revisão independente encontrou dois problemas importantes, ambos cobertos por testes que falharam antes da correção e passaram depois.

A automação visual foi bloqueada pela indisponibilidade do host do navegador e pela autorização expirada do aplicativo Edge. Verificação visual completa permanece limitada nesta sessão.
