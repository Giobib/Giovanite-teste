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
   * Região viva para leitores de tela
   * ================================================================== */

  let liveRegion = null;

  /** Anuncia uma mensagem sem mover o foco nem alterar o layout. */
  function announce(message) {
    if (!liveRegion || !document.body.contains(liveRegion)) {
      liveRegion = document.createElement('div');
      liveRegion.className = 'sr-only';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      document.body.appendChild(liveRegion);
    }
    // Limpar antes garante que a mesma frase repetida seja anunciada de novo.
    liveRegion.textContent = '';
    global.setTimeout(() => {
      liveRegion.textContent = message;
    }, 60);
  }

  /* ================================================================== *
   * Reordenação: mouse (HTML5 Drag and Drop), toque (Pointer Events)
   * e teclado (setas). Os três terminam no mesmo onReorder.
   * ================================================================== */

  /**
   * Torna os filhos de `host` reordenáveis pelos três meios.
   * @param {HTMLElement} host
   * @param {{
   *   itemSelector: string,
   *   handleSelector: string,
   *   onReorder: (ids: string[]) => void,
   *   describe?: (item: HTMLElement) => string
   * }} options
   */
  function makeSortable(host, { itemSelector, handleSelector, onReorder, describe }) {
    const label = describe || ((item) => item.dataset.name || 'item');

    /* ---------------- comum aos três meios ---------------- */

    const items = () => Array.from(host.querySelectorAll(itemSelector));

    /** Quantas colunas o grid tem agora — para as setas cima/baixo. */
    function columnCount() {
      const tracks = global.getComputedStyle(host).gridTemplateColumns;
      return tracks && tracks !== 'none' ? tracks.split(' ').length : 1;
    }

    /**
     * Insere `item` na posição `index`, respeitando os limites.
     * O host pode ter filhos que não são itens (o estado vazio do grid),
     * então "no fim" significa depois do último item — não do contêiner.
     */
    function moveTo(item, index) {
      const list = items().filter((node) => node !== item);
      const target = Math.max(0, Math.min(index, list.length));
      const last = list[list.length - 1];
      host.insertBefore(item, target < list.length ? list[target] : (last ? last.nextSibling : null));
    }

    function commit() {
      onReorder(items().map((item) => item.dataset.id));
    }

    /** Insere o item arrastado antes ou depois de `target`, conforme o lado. */
    function placeBeside(item, target, clientX) {
      if (!target || target === item) return;
      const box = target.getBoundingClientRect();
      const after = clientX > box.left + box.width / 2;
      host.insertBefore(item, after ? target.nextSibling : target);
    }

    /* ---------------- 1. mouse: HTML5 Drag and Drop ---------------- */

    let dragged = null;

    items().forEach((item) => {
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
      placeBeside(dragged, event.target.closest(itemSelector), event.clientX);
    });

    host.addEventListener('drop', (event) => {
      if (dragged) event.preventDefault();
    });

    host.addEventListener('dragend', () => {
      if (!dragged) return;
      dragged.classList.remove('is-dragging');
      dragged = null;
      commit();
    });

    /* ---------------- 2. toque: Pointer Events ---------------- */

    /*
     * A HTML5 Drag and Drop API não dispara em toque. Aqui o arrasto é
     * refeito com Pointer Events, e só pela alça: arrastar o corpo do card
     * roubaria a rolagem da página. `touch-action: none` na alça (CSS) é o
     * que impede o navegador de rolar em vez de arrastar.
     */
    let touched = null;

    host.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;

      const handle = event.target.closest(handleSelector);
      if (!handle) return;

      const item = handle.closest(itemSelector);
      if (!item) return;

      touched = item;
      item.classList.add('is-dragging');
      // Captura: os eventos seguintes vêm para a alça mesmo fora dela.
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    host.addEventListener('pointermove', (event) => {
      if (!touched) return;
      event.preventDefault();

      // Sob o dedo: elementFromPoint, já que o alvo está capturado.
      const under = document.elementFromPoint(event.clientX, event.clientY);
      placeBeside(touched, under && under.closest(itemSelector), event.clientX);
    });

    const endTouch = () => {
      if (!touched) return;
      touched.classList.remove('is-dragging');
      touched = null;
      commit();
    };

    host.addEventListener('pointerup', endTouch);
    host.addEventListener('pointercancel', endTouch);

    /* ---------------- 3. teclado: pegar, mover, soltar ---------------- */

    /*
     * Enter/Espaço na alça "pega" o card; as setas movem; Enter/Espaço
     * solta e Esc desfaz. Cada passo é anunciado pela região viva.
     */
    let grabbed = null;
    let originalNext = null;
    let repositioning = false;

    function grab(item, handle) {
      grabbed = item;
      originalNext = item.nextElementSibling;
      item.classList.add('is-grabbed');
      handle.setAttribute('aria-pressed', 'true');
      announce(
        `${label(item)} pego. Use as setas para mover, Enter para soltar, Escape para cancelar.`
      );
    }

    function release(item, handle, { cancel = false } = {}) {
      if (cancel) {
        repositioning = true;
        host.insertBefore(item, originalNext);
        handle.focus();
        repositioning = false;
      }

      item.classList.remove('is-grabbed');
      handle.setAttribute('aria-pressed', 'false');
      grabbed = null;
      originalNext = null;

      if (cancel) {
        announce('Movimento cancelado.');
        return;
      }

      commit();
      announce(`${label(item)} solto na posição ${position(item)} de ${items().length}.`);
    }

    function position(item) {
      return items().indexOf(item) + 1;
    }

    /**
     * Move e devolve o foco à alça. A trava precisa envolver o moveTo:
     * reinserir o nó tira o foco de dentro dele e dispararia o focusout,
     * que soltaria o card logo na primeira seta.
     */
    function step(item, handle, delta) {
      const from = items().indexOf(item);

      repositioning = true;
      moveTo(item, from + delta);
      handle.focus();
      repositioning = false;

      announce(`Posição ${position(item)} de ${items().length}.`);
    }

    host.addEventListener('keydown', (event) => {
      const handle = event.target.closest(handleSelector);
      if (!handle) return;

      const item = handle.closest(itemSelector);
      if (!item) return;

      const columns = columnCount();

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (grabbed === item) {
          release(item, handle);
        } else {
          grab(item, handle);
        }
        return;
      }

      if (grabbed !== item) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        release(item, handle, { cancel: true });
        return;
      }

      const deltas = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -columns,
        ArrowDown: columns,
      };

      if (event.key in deltas) {
        event.preventDefault();
        step(item, handle, deltas[event.key]);
      }
    });

    // Sair do card com Tab confirma a posição, em vez de perdê-la.
    host.addEventListener(
      'focusout',
      (event) => {
        if (repositioning || !grabbed) return;
        const handle = event.target.closest(handleSelector);
        if (handle && handle.closest(itemSelector) === grabbed) {
          release(grabbed, handle);
        }
      },
      true
    );
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

  global.NexusDesk.ui = { theme, skeleton, makeSortable, announce, escapeHtml, formatDate, svg };
})(window);
