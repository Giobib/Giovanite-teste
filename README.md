# Nexus Desk

Painel de automações construído **apenas com HTML5, CSS3 e JavaScript puro (ES6+)** —
sem frameworks, sem build, sem dependências.

Projeto completo (Prompts 1 a 5): estrutura, tela de login futurista,
dashboard, CRUD de automações e os componentes premium — arrastar para
reordenar, toasts, tema claro/escuro, skeleton loading e o JS separado em
módulos reutilizáveis.

## Como rodar

Basta abrir `index.html` no navegador (os scripts são clássicos, então o
protocolo `file://` funciona). Se preferir um servidor local:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

Use qualquer e-mail válido e uma senha de 6+ caracteres: a autenticação é
simulada e a "sessão" fica no LocalStorage.

## Árvore de diretórios

```
nexus-desk/
├── index.html              # Tela de login (ponto de entrada)
├── dashboard.html          # Painel principal
├── README.md
├── css/
│   ├── style.css           # Reset + variáveis globais (base de tudo)
│   ├── components.css      # Componentes reutilizáveis
│   ├── login.css           # Estilos da tela de login
│   └── dashboard.css       # Estilos do dashboard
├── js/
│   ├── storage.js          # Acesso ao LocalStorage
│   ├── auth.js             # Sessão simulada
│   ├── router.js           # Navegação e proteção de rota
│   ├── app.js              # Bootstrap comum + utilitários
│   ├── login.js            # Comportamento da tela de login
│   ├── dashboard.js        # Comportamento do dashboard
│   ├── automations.js      # CRUD de automações (Prompt 4)
│   ├── ui.js               # Helpers de interface (Prompts 3–5)
│   └── toast.js            # Notificações flutuantes (Prompt 5)
├── assets/
│   ├── icons/              # Ícones SVG (inclui favicon.svg)
│   ├── images/             # Imagens e ilustrações
│   └── fonts/              # Fontes locais
└── data/
    ├── automations.seed.json   # Automações mock iniciais
    └── categories.json         # Categorias e cores
```

## Responsabilidade de cada arquivo

### Páginas

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Ponto de entrada. Marcação semântica da tela de login: painel de marca, formulário (e-mail, senha com alternância de visibilidade, "Lembrar-me", "Criar conta") e a camada decorativa de fundo. Carrega `style.css`, `components.css`, `login.css` e a cadeia de scripts terminando em `login.js`. |
| `dashboard.html` | Painel: sidebar com dois grupos de navegação e cota de uso, header com busca global, notificações e perfil, resumo numérico e o FAB "Nova Automação". O grid chega vazio — `automations.js` o preenche a partir do LocalStorage. |

### CSS

| Arquivo | Responsabilidade |
| --- | --- |
| `css/style.css` | **Única fonte de verdade do design system.** Contém apenas duas seções: (1) CSS Reset — normaliza box model, margens, mídia, formulários, foco e `prefers-reduced-motion`; (2) Variáveis Globais — paleta dark/neon, glassmorphism, preenchimentos de superfície, cores semânticas, tipografia, espaçamentos (base 4px), raios, sombras, transições, layout e z-index, mais o bloco `[data-theme="light"]` que o botão de tema ativa. Não define componentes. |
| `css/components.css` | Componentes compartilhados: campo (`.field`), textarea, select, seletores de ícone e cor (`.picker`), botão (`.button`, com variantes primária e destrutiva), checkbox, link, alerta, botão de ícone, etiqueta (`.badge`), interruptor (`.switch`), menu suspenso (`.dropdown`), modal (`.modal`), avatar, marca (`.brand`) e a atmosfera de fundo (`.aurora`). |
| `css/login.css` | Layout da tela de login: cartão de vidro com `backdrop-filter`, painel de marca, entrada escalonada dos elementos e os pontos de quebra do responsivo. |
| `css/dashboard.css` | Estilos específicos do painel: sidebar recolhível, header fixo, grid responsivo de cards e FAB. |

### JavaScript

Os scripts são carregados na ordem `storage → auth → router → app → script da página`
e compartilham o namespace `window.NexusDesk`, evitando variáveis globais soltas.

| Arquivo | Responsabilidade |
| --- | --- |
| `js/storage.js` | Wrapper de LocalStorage com serialização JSON e tratamento de erro. Centraliza as chaves (`nexus:session`, `nexus:theme`, `nexus:automations`, `nexus:automations:order`). Nenhum outro arquivo toca `localStorage` diretamente. |
| `js/auth.js` | Sessão **simulada**: `login()`, `logout()`, `getSession()`, `isAuthenticated()`. Não há backend nem validação de credenciais reais. |
| `js/router.js` | Mapa de rotas e navegação por `window.location`: `go(rota, delay)`, `requireAuth()` (protege o dashboard) e `redirectIfAuthenticated()` (pula o login de quem já entrou). |
| `js/app.js` | Bootstrap comum: metadados do app e os utilitários `$` / `$$`. O tema é responsabilidade do `ui.js`. |
| `js/login.js` | Validação por campo (e-mail com regex, senha de 6+ caracteres) com mensagens inline e `aria-invalid`, alternância de visibilidade da senha, estado de carregamento do botão e a autenticação simulada que redireciona para o dashboard. |
| `js/dashboard.js` | Protege a rota, exibe o usuário logado no header e trata o logout. Sidebar/header interativos vêm no Prompt 3. |
| `js/automations.js` | CRUD de automações: catálogos, repositório sobre o LocalStorage, renderização dos cards, modais de criar/editar e excluir, e a reordenação persistida. Consome `ui.js` para formatação, skeleton e arrasto, e `toast.js` para os avisos. Semeia 3 automações na primeira visita. |
| `js/ui.js` | Helpers de renderização: cards, modais, skeleton loading e toggle de tema. Prompts 3–5. |
| `js/toast.js` | Notificações flutuantes animadas para as ações do CRUD. Prompt 5. |

### Assets e dados

| Caminho | Responsabilidade |
| --- | --- |
| `assets/icons/` | Ícones SVG da interface, incluindo `favicon.svg`. |
| `assets/images/` | Imagens, ilustrações e planos de fundo. |
| `assets/fonts/` | Arquivos de fonte locais, caso não se use CDN. |
| `data/automations.seed.json` | As três automações mock em JSON legível. A cópia que roda está em `js/automations.js`: `fetch()` não funciona em `file://`, então o seed vive no script. |
| `data/categories.json` | Catálogo de categorias em JSON legível, espelhando o de `js/automations.js` pelo mesmo motivo. |

## Atalhos

| Tecla | Ação |
| --- | --- |
| `/` | Foca a busca global |
| `Esc` | Fecha menus, modais e o drawer |

## Fluxo de navegação (implementado)

```
index.html ──[submit com e-mail e senha]──► cria sessão ──► dashboard.html
index.html ──[sessão já existe]───────────────────────────► dashboard.html
dashboard.html ──[sem sessão]─────────────────────────────► index.html
dashboard.html ──[botão "Sair"]──► limpa sessão ─────────► index.html
```

## Entregue

- **Prompt 1** — estrutura do projeto, `style.css` base e navegação simulada.
- **Prompt 2** — tela de login futurista com glassmorphism, neon e validação.
- **Prompt 3** — dashboard com sidebar recolhível, header, grid responsivo e FAB.
- **Prompt 4** — CRUD de automações com LocalStorage e modais.
- **Prompt 5** — drag & drop, toasts, tema claro/escuro, skeleton e modularização.

