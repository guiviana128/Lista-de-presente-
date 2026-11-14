# 🎁 Lista de Presentes & Desejos - Rayza & Guilherme 💖

Um site completo, romântico, moderno e responsivo para você e a Rayza adicionarem links de presentes, acompanharem desejos, preços, fotos, descrições e marcarem compras e reservas secretas!

---

## ✨ Funcionalidades

- **💾 Banco de Dados SQL Permanente (SQLite)**:
  - Todos os presentes, links, descrições, preços, categorias e status ficam salvos no arquivo `presentes.db`.
  - Mesmo fechando o navegador ou desligando o computador, nada se perde!
- **🔗 Inserção de Links e Detalhes**:
  - Salva o link direto de qualquer loja (Amazon, Shopee, Mercado Livre, Zara, Sephora, Shein, etc.).
  - Botão **"Ver na Loja"** para abrir o link com 1 clique e botão **"Copiar Link"** rápido.
  - Imagem do produto com preview automático (e imagem ilustrativa por categoria se não tiver foto).
  - Preço estimado formatado em Reais (R$).
  - Descrição detalhada (tamanho, cor, cupom, observações).
- **💑 Perfis do Casal**:
  - Alterne facilmente entre o perfil da **Rayza 🌸** e do **Guilherme 💙** no topo da página.
  - Identificação de quem pediu o presente ("Para Rayza", "Para Guilherme" ou "Para Nós Dois").
- **🤫 Reserva Secreta de Surpresa**:
  - Quer dar o presente de surpresa sem ela saber ou para evitar comprar repetido? Basta clicar em **"Reservar"**!
  - O site avisa com sigilo quem reservou para garantir que o outro não compre igual.
- **🎉 Status de Comprado**:
  - Marque como comprado quando o presente for adquirido, com direito a faixa de celebração!
- **🔍 Filtros e Busca em Tempo Real**:
  - Pesquise por nome, loja, marca ou detalhes.
  - Filtre por destinatário (Todos / Rayza / Guilherme / Nós Dois).
  - Filtre por categoria (Beleza & Perfumaria, Roupas, Tech, Livros, Experiências, Decoração, etc.).
  - Filtre por status (Disponíveis, Reservados, Já Comprados).
  - Ordene por Menor Preço, Maior Preço, Prioridade ou Mais Recentes.

---

## 🚀 Como Iniciar o Site

### Opção 1: Pelo arquivo executável (Mais Fácil)
Dê um duplo clique no arquivo:
👉 **`iniciar.bat`**

O servidor será iniciado e seu navegador abrirá automaticamente em `http://localhost:3000`.

---

### Opção 2: Pelo Terminal / PowerShell
Abra a pasta do projeto no terminal e execute:
```bash
npm start
```
ou diretamente:
```bash
node server.js
```

E acesse no seu navegador:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📁 Estrutura de Arquivos

```
c:\LISTA DE PRESENTE\
├── presentes.db        # Banco de dados SQL com todos os presentes e usuários
├── database.js         # Módulo SQLite nativo do Node.js
├── server.js           # Servidor web e API REST
├── package.json        # Configuração do projeto
├── iniciar.bat         # Atalho para iniciar com 2 cliques
└── public/             # Interface visual do site
    ├── index.html      # Estrutura da página
    ├── style.css       # Estilo romântico e responsivo
    └── app.js          # Lógica interativa do site
```

---

Feito com carinho para **Rayza** e **Guilherme**! 💖

