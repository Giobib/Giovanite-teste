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
    const calmo = global.matchMedia('(prefers-reduced-motion: reduce)');

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

    /* ---------------- FLIP: os vizinhos deslizam ---------------- */

    /**
     * Executa `mutate` e anima a diferença de posição de cada item.
     * Sem isto o grid recalcula e os cards teleportam.
     */
    function flip(mutate) {
      if (calmo.matches) {
        mutate();
        return;
      }

      const antes = new Map(items().map((node) => [node, node.getBoundingClientRect()]));
      mutate();

      items().forEach((node) => {
        const a = antes.get(node);
        if (!a || node.classList.contains('is-placeholder')) return;

        const b = node.getBoundingClientRect();
        const dx = a.left - b.left;
        const dy = a.top - b.top;
        if (!dx && !dy) return;

        node.style.transition = 'none';
        node.style.transform = `translate(${dx}px, ${dy}px)`;

        global.requestAnimationFrame(() => {
          node.style.transition = 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)';
          node.style.transform = '';
        });
      });
    }

    /** Tira os estilos que o FLIP deixou, para não brigarem com o CSS. */
    function limparFlip() {
      items().forEach((node) => {
        node.style.transition = '';
        node.style.transform = '';
      });
    }

    /* ---------------- O card flutuante e sua física ---------------- */

    /*
     * O card arrastado sai do fluxo e vira um clone `position: fixed` que
     * segue o ponteiro. A inclinação é uma mola de segunda ordem: o alvo
     * vem da velocidade horizontal, e a mola persegue esse alvo com
     * aceleração e amortecimento — por isso o card passa do ponto, volta
     * e só então assenta, em vez de acompanhar o cursor rigidamente.
     */
    const MOLA = 0.16;       // rigidez: o quanto puxa em direção ao alvo
    const AMORTECIMENTO = 0.72;
    const INCLINACAO = 0.7;  // graus por pixel/quadro de velocidade
    const INCLINACAO_MAX = 14;
    const ATRITO = 0.8;      // a velocidade decai quando o ponteiro para

    let fantasma = null;

    function pegar(item, clientX, clientY) {
      const caixa = item.getBoundingClientRect();
      const clone = item.cloneNode(true);

      clone.classList.add('is-ghost');
      clone.classList.remove('is-dragging', 'is-grabbed');
      clone.removeAttribute('id');
      clone.style.width = `${caixa.width}px`;
      clone.style.height = `${caixa.height}px`;
      document.body.appendChild(clone);

      item.classList.add('is-placeholder');

      fantasma = {
        el: clone,
        item,
        // Onde o ponteiro pegou o card, para ele não saltar para o centro.
        pegaX: clientX - caixa.left,
        pegaY: clientY - caixa.top,
        x: caixa.left,
        y: caixa.top,
        ultimoX: clientX,
        velocidade: 0,
        angulo: 0,
        anguloVel: 0,
        raf: 0,
      };

      desenhar();
      if (!calmo.matches) fantasma.raf = global.requestAnimationFrame(quadro);
    }

    function mover(clientX, clientY) {
      if (!fantasma) return;

      // Velocidade suavizada: mistura o deslocamento novo com o anterior.
      const delta = clientX - fantasma.ultimoX;
      fantasma.velocidade = fantasma.velocidade * 0.6 + delta * 0.4;
      fantasma.ultimoX = clientX;

      fantasma.x = clientX - fantasma.pegaX;
      fantasma.y = clientY - fantasma.pegaY;

      if (calmo.matches) desenhar();
    }

    /** Um passo da mola, uma vez por quadro. */
    function quadro() {
      if (!fantasma) return;

      const alvo = Math.max(
        -INCLINACAO_MAX,
        Math.min(INCLINACAO_MAX, fantasma.velocidade * INCLINACAO)
      );

      const aceleracao = (alvo - fantasma.angulo) * MOLA - fantasma.anguloVel * AMORTECIMENTO;
      fantasma.anguloVel += aceleracao;
      fantasma.angulo += fantasma.anguloVel;
      fantasma.velocidade *= ATRITO;

      desenhar();
      fantasma.raf = global.requestAnimationFrame(quadro);
    }

    function desenhar() {
      const { el, x, y, angulo } = fantasma;
      el.style.transform =
        `translate3d(${x}px, ${y}px, 0) rotate(${calmo.matches ? 0 : angulo}deg) scale(1.04)`;
    }

    /** Solta: o card voa até a vaga final e assenta com a mola zerando. */
    function soltar() {
      if (!fantasma) return;

      const { el, item, raf } = fantasma;
      global.cancelAnimationFrame(raf);

      item.classList.remove('is-placeholder');
      const destino = item.getBoundingClientRect();

      if (calmo.matches) {
        el.remove();
        fantasma = null;
        return;
      }

      el.classList.add('is-landing');
      el.style.transform = `translate3d(${destino.left}px, ${destino.top}px, 0) rotate(0deg) scale(1)`;

      const fim = () => {
        el.remove();
        item.classList.remove('is-landing-slot');
      };
      el.addEventListener('transitionend', fim, { once: true });
      global.setTimeout(fim, 420);

      fantasma = null;
    }

    /** Insere o item arrastado antes ou depois de `target`, conforme o lado. */
    function encaixar(item, target, clientX) {
      if (!target || target === item || target.classList.contains('is-ghost')) return;
      const box = target.getBoundingClientRect();
      const depois = clientX > box.left + box.width / 2;
      flip(() => host.insertBefore(item, depois ? target.nextSibling : target));
    }

    /* ---------------- 1 e 2. ponteiro: mouse e toque ---------------- */

    /*
     * Um caminho só, em Pointer Events, para mouse e toque.
     *
     * A HTML5 Drag and Drop API ficou de fora: ela não dispara em toque,
     * e sua miniatura de arraste é um bitmap estático que não aceita
     * transform. Dava para escondê-la e desenhar este mesmo clone por
     * cima, mas seriam duas implementações do mesmo gesto — uma para
     * mouse e outra para toque — com a física duplicada nas duas.
     *
     * No toque o arrasto sai só da alça: puxar o corpo do card roubaria a
     * rolagem da página. No mouse o card inteiro arrasta, depois de um
     * limiar de alguns pixels que separa arrastar de clicar para editar.
     */
    const LIMIAR = 5;

    let pendente = null;   // pressionado, ainda sem passar do limiar
    let ativo = null;      // arrasto em andamento
    let arrastouAgora = false;

    host.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      const item = event.target.closest(itemSelector);
      if (!item) return;

      const naAlca = Boolean(event.target.closest(handleSelector));

      // No toque, só a alça arrasta; o resto do card continua rolando.
      if (event.pointerType !== 'mouse' && !naAlca) return;

      // Controles do card (lixeira, interruptor) não iniciam arrasto.
      if (!naAlca && event.target.closest('button, input, label, a')) return;

      pendente = { item, x: event.clientX, y: event.clientY, pointerId: event.pointerId };

      // Pela alça o arrasto começa na hora: o gesto já é inequívoco.
      if (naAlca) iniciar(event);
    });

    function iniciar(event) {
      ativo = pendente.item;
      pendente = null;

      host.setPointerCapture(event.pointerId);
      document.body.classList.add('is-sorting');
      pegar(ativo, event.clientX, event.clientY);
    }

    host.addEventListener('pointermove', (event) => {
      if (pendente) {
        const dist = Math.hypot(event.clientX - pendente.x, event.clientY - pendente.y);
        if (dist < LIMIAR) return;
        iniciar(event);
      }

      if (!ativo) return;
      event.preventDefault();

      mover(event.clientX, event.clientY);

      // O clone tem pointer-events: none, então quem responde ao ponto é
      // o card de baixo.
      const abaixo = document.elementFromPoint(event.clientX, event.clientY);
      encaixar(ativo, abaixo && abaixo.closest(itemSelector), event.clientX);
    });

    function encerrar() {
      pendente = null;
      if (!ativo) return;

      soltar();
      limparFlip();
      ativo = null;
      arrastouAgora = true;
      document.body.classList.remove('is-sorting');
      commit();
    }

    host.addEventListener('pointerup', encerrar);
    host.addEventListener('pointercancel', encerrar);

    // Soltar o ponteiro dispara um clique: sem isto, terminar um arrasto
    // sobre o card abriria o modal de edição.
    host.addEventListener(
      'click',
      (event) => {
        if (!arrastouAgora) return;
        arrastouAgora = false;
        event.stopPropagation();
        event.preventDefault();
      },
      true
    );

    /* ---------------- 3. teclado: pegar, mover, soltar ---------------- */

    /*
     * Enter/Espaço na alça "pega" o card; as setas movem; Enter/Espaço
     * solta e Esc desfaz. Cada passo é anunciado pela região viva.
     */
    let pego = null;
    let vagaOriginal = null;
    let reposicionando = false;

    function segurar(item, handle) {
      pego = item;
      vagaOriginal = item.nextElementSibling;
      item.classList.add('is-grabbed');
      handle.setAttribute('aria-pressed', 'true');
      announce(
        `${label(item)} pego. Use as setas para mover, Enter para soltar, Escape para cancelar.`
      );
    }

    function largar(item, handle, { cancel = false } = {}) {
      if (cancel) {
        reposicionando = true;
        flip(() => host.insertBefore(item, vagaOriginal));
        handle.focus();
        reposicionando = false;
      }

      item.classList.remove('is-grabbed');
      handle.setAttribute('aria-pressed', 'false');
      pego = null;
      vagaOriginal = null;
      limparFlip();

      if (cancel) {
        announce('Movimento cancelado.');
        return;
      }

      commit();
      announce(`${label(item)} solto na posição ${posicao(item)} de ${items().length}.`);
    }

    function posicao(item) {
      return items().indexOf(item) + 1;
    }

    /**
     * Move e devolve o foco à alça. A trava precisa envolver o moveTo:
     * reinserir o nó tira o foco de dentro dele e dispararia o focusout,
     * que soltaria o card logo na primeira seta.
     */
    function passo(item, handle, delta) {
      const de = items().indexOf(item);

      reposicionando = true;
      flip(() => moveTo(item, de + delta));
      handle.focus();
      reposicionando = false;

      announce(`Posição ${posicao(item)} de ${items().length}.`);
    }

    host.addEventListener('keydown', (event) => {
      const handle = event.target.closest(handleSelector);
      if (!handle) return;

      const item = handle.closest(itemSelector);
      if (!item) return;

      const colunas = columnCount();

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (pego === item) {
          largar(item, handle);
        } else {
          segurar(item, handle);
        }
        return;
      }

      if (pego !== item) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        largar(item, handle, { cancel: true });
        return;
      }

      const deltas = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -colunas,
        ArrowDown: colunas,
      };

      if (event.key in deltas) {
        event.preventDefault();
        passo(item, handle, deltas[event.key]);
      }
    });

    // Sair do card com Tab confirma a posição, em vez de perdê-la.
    host.addEventListener(
      'focusout',
      (event) => {
        if (reposicionando || !pego) return;
        const handle = event.target.closest(handleSelector);
        if (handle && handle.closest(itemSelector) === pego) {
          largar(pego, handle);
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
