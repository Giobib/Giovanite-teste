/**
 * Nexus Desk — dashboard.js
 * Painel principal: proteção de rota, sidebar recolhível (com o estado
 * lembrado), drawer no mobile, menus suspensos do header e busca global.
 *
 * Os cards são estáticos nesta etapa — o Prompt 4 passa a renderizá-los
 * a partir do LocalStorage.
 */
(function (global) {
  'use strict';

  const { app, auth, router, storage } = global.NexusDesk;
  const { $, $$ } = app;

  const MOBILE_QUERY = '(max-width: 860px)';

  let elements = {};

  function init() {
    // Sem sessão ativa, volta para o login.
    if (!router.requireAuth()) return;

    elements = {
      layout: $('#layout'),
      sidebar: $('#sidebar'),
      scrim: $('#scrim'),
      collapseButton: $('#sidebar-toggle'),
      drawerButton: $('#drawer-toggle'),
      search: $('#global-search'),
      grid: $('#automations-grid'),
      empty: $('#grid-empty'),
      subtitle: $('.content__subtitle'),
      logout: $('#logout-button'),
    };

    showCurrentUser();
    restoreSidebarState();

    elements.collapseButton.addEventListener('click', toggleCollapsed);
    elements.drawerButton.addEventListener('click', () => setDrawerOpen(true));
    elements.scrim.addEventListener('click', () => setDrawerOpen(false));
    elements.logout.addEventListener('click', handleLogout);
    elements.search.addEventListener('input', filterCards);

    setupDropdowns();
    setupKeyboardShortcuts();

    // O CRUD recria os cards; o filtro em vigor precisa valer para os novos.
    document.addEventListener('automations:rendered', filterCards);

    // Navegar no drawer fecha o drawer.
    $$('.sidebar__link').forEach((link) => {
      link.addEventListener('click', () => {
        if (isMobile()) setDrawerOpen(false);
      });
    });
  }

  function isMobile() {
    return global.matchMedia(MOBILE_QUERY).matches;
  }

  /* ------------------------------------------------------------------ *
   * Usuário
   * ------------------------------------------------------------------ */

  function showCurrentUser() {
    const session = auth.getSession();
    if (!session) return;

    $('#current-user').textContent = session.email;
    $('#user-initial').textContent = (session.name || session.email).charAt(0);
  }

  function handleLogout() {
    auth.logout();
    router.go('login');
  }

  /* ------------------------------------------------------------------ *
   * Sidebar
   * ------------------------------------------------------------------ */

  /** Recolhe a sidebar conforme a preferência salva (desktop apenas). */
  function restoreSidebarState() {
    if (storage.get(storage.KEYS.SIDEBAR_COLLAPSED, false)) {
      setCollapsed(true);
    }
  }

  function toggleCollapsed() {
    setCollapsed(!elements.layout.classList.contains('is-collapsed'));
  }

  function setCollapsed(collapsed) {
    elements.layout.classList.toggle('is-collapsed', collapsed);
    elements.collapseButton.setAttribute('aria-expanded', String(!collapsed));
    elements.collapseButton.setAttribute(
      'aria-label',
      collapsed ? 'Expandir menu' : 'Recolher menu'
    );
    storage.set(storage.KEYS.SIDEBAR_COLLAPSED, collapsed);
  }

  /** No mobile a sidebar vira um drawer sobreposto, com véu por trás. */
  function setDrawerOpen(open) {
    elements.sidebar.classList.toggle('is-open', open);
    elements.scrim.hidden = !open;
    // Deixa o véu pintar antes de animar a opacidade.
    global.requestAnimationFrame(() => {
      elements.scrim.classList.toggle('is-visible', open);
    });
    elements.drawerButton.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('is-drawer-open', open);
    document.body.style.overflow = open ? 'hidden' : '';

    if (open) {
      elements.sidebar.querySelector('.sidebar__link').focus();
    }
  }

  /* ------------------------------------------------------------------ *
   * Menus suspensos (notificações e perfil)
   * ------------------------------------------------------------------ */

  function setupDropdowns() {
    const dropdowns = $$('[data-dropdown]');

    dropdowns.forEach((dropdown) => {
      const toggle = $('[data-dropdown-toggle]', dropdown);
      const panel = $('[data-dropdown-panel]', dropdown);

      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        const willOpen = panel.hidden;
        closeAllDropdowns();
        if (willOpen) openDropdown(toggle, panel);
      });

      // Cliques dentro do painel não fecham o menu por conta do handler global.
      panel.addEventListener('click', (event) => event.stopPropagation());
    });

    // Clicar fora ou apertar Esc fecha o que estiver aberto.
    document.addEventListener('click', closeAllDropdowns);
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      closeAllDropdowns();
      if (isMobile()) setDrawerOpen(false);
    });
  }

  function openDropdown(toggle, panel) {
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
  }

  function closeAllDropdowns() {
    $$('[data-dropdown]').forEach((dropdown) => {
      $('[data-dropdown-panel]', dropdown).hidden = true;
      $('[data-dropdown-toggle]', dropdown).setAttribute('aria-expanded', 'false');
    });
  }

  /* ------------------------------------------------------------------ *
   * Busca global
   * ------------------------------------------------------------------ */

  /** Filtra os cards pelo nome e pela categoria, sem tocar no storage. */
  function filterCards() {
    const term = elements.search.value.trim().toLowerCase();
    const cards = $$('.card', elements.grid);
    let visible = 0;

    cards.forEach((card) => {
      const haystack = `${card.dataset.name} ${card.dataset.category}`.toLowerCase();
      const matches = !term || haystack.includes(term);
      card.hidden = !matches;
      if (matches) visible += 1;
    });

    elements.empty.hidden = visible > 0;
    elements.empty.textContent = cards.length
      ? 'Nenhuma automação corresponde à busca.'
      : 'Nenhuma automação ainda. Use o botão “Nova automação” para criar a primeira.';

    if (term) {
      elements.subtitle.textContent = `${visible} de ${cards.length} automações correspondem à busca.`;
    } else {
      elements.subtitle.textContent =
        cards.length === 1
          ? '1 automação configurada nesta conta.'
          : `${cards.length} automações configuradas nesta conta.`;
    }
  }

  /* ------------------------------------------------------------------ *
   * Atalhos
   * ------------------------------------------------------------------ */

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);

      // "/" foca a busca, como em muitos painéis.
      if (event.key === '/' && !typing) {
        event.preventDefault();
        elements.search.focus();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
