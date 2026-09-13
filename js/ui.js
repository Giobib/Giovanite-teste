/**
 * Nexus Desk — ui.js
 * Helpers de interface reutilizáveis, sem conhecimento do domínio:
 * tema claro/escuro, skeleton loading, reordenação por arrastar e soltar
 * e as funções de formatação usadas na montagem de HTML.
 */
(function (global) {
  'use strict';

  const { storage } = global.NexusDesk;

  /* ================================================================== *
   * Tema claro / escuro
   * ================================================================== */

  const theme = {
    /** Tema salvo, ou o preferido do sistema na primeira visita. */
    current() {
      const saved = storage.get(storage.KEYS.THEME, null);
      if (saved) return saved;
      return global.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    },

    apply(value) {
      document.documentElement.setAttribute('data-theme', value);
      storage.set(storage.KEYS.THEME, value);
      return value;
    },

    toggle() {
      return theme.apply(theme.current() === 'dark' ? 'light' : 'dark');
    },

    /**
     * Liga um botão ao tema, mantendo rótulo e aria-pressed em dia.
     * @param {HTMLElement} button
     * @param {(value: string) => void} [onChange]
     */
    bindToggle(button, onChange) {
      if (!button) return;

      const sync = (value) => {
        const light = value === 'light';
        button.setAttribute('aria-pressed', String(light));
        button.setAttribute('aria-label', light ? 'Usar tema escuro' : 'Usar tema claro');
        if (onChange) onChange(value);
      };

      sync(theme.apply(theme.current()));
      button.addEventListener('click', () => sync(theme.toggle()));
    },
  };

  /* ================================================================== *
   * Skeleton loading
   * ================================================================== */

  const skeleton = {
    /** Preenche um contêiner com N cards fantasma. */
    cards(host, count = 3) {
      const block = `
        <article class="card card--skeleton" aria-hidden="true">
          <div class="card__top">
            <span class="skeleton skeleton--icon"></span>
            <div class="card__heading">
              <span class="skeleton skeleton--title"></span>
              <span class="skeleton skeleton--badge"></span>
            </div>
          </div>
          <span class="skeleton skeleton--line"></span>
          <span class="skeleton skeleton--line skeleton--short"></span>
          <div class="card__footer">
            <span class="skeleton skeleton--meta"></span>
            <span class="skeleton skeleton--switch"></span>
          </div>
        </article>`;
      host.insertAdjacentHTML('afterbegin', block.repeat(count));
    },

    clear(host) {
      host.querySelectorAll('.card--skeleton').forEach((node) => node.remove());
    },
  };

  /* ================================================================== *
   * Reordenação por arrastar e soltar (HTML5 Drag and Drop API)
   * ================================================================== */

  /**
   * Torna os filhos de `host` reordenáveis.
   * @param {HTMLElement} host
   * @param {{itemSelector: string, onReorder: (ids: string[]) => void}} options
   */
  function makeSortable(host, { itemSelector, onReorder }) {
    let dragged = null;

    host.querySelectorAll(itemSelector).forEach((item) => {
      item.draggable = true;
    });

    host.addEventListener('dragstart', (event) => {
      const item = event.target.closest(itemSelector);
      if (!item) return;

      dragged = item;
      item.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      // Firefox só inicia o arrasto se houver dado no dataTransfer.
      event.dataTransfer.setData('text/plain', item.dataset.id || '');
    });

    host.addEventListener('dragover', (event) => {
      if (!dragged) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';

      const target = event.target.closest(itemSelector);
      if (!target || target === dragged) return;

      // Antes ou depois do alvo, conforme o lado em que o cursor está.
      const box = target.getBoundingClientRect();
      const after = event.clientX > box.left + box.width / 2;
      target.parentNode.insertBefore(dragged, after ? target.nextSibling : target);
    });

    host.addEventListener('drop', (event) => {
      if (dragged) event.preventDefault();
    });

    host.addEventListener('dragend', () => {
      if (!dragged) return;
      dragged.classList.remove('is-dragging');
      dragged = null;

      const ids = Array.from(host.querySelectorAll(itemSelector)).map((item) => item.dataset.id);
      onReorder(ids);
    });
  }

  /* ================================================================== *
   * Formatação
   * ================================================================== */

  /** Escapa texto do usuário antes de ele entrar em uma string de HTML. */
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char]);
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  /** Monta um <svg> a partir do miolo de traços de um ícone. */
  function svg(body, className = '') {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  // Aplica o tema antes da primeira pintura, para a tela não piscar.
  theme.apply(theme.current());

  global.NexusDesk.ui = { theme, skeleton, makeSortable, escapeHtml, formatDate, svg };
})(window);
