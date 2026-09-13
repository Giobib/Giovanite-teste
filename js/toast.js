/**
 * Nexus Desk — toast.js
 * Notificações flutuantes. Módulo autônomo: cria o próprio contêiner na
 * primeira chamada e não conhece nenhuma outra parte do sistema.
 *
 *   NexusDesk.toast.success('Automação criada.');
 *   NexusDesk.toast.show('Falhou.', { type: 'error', duration: 6000 });
 */
(function (global) {
  'use strict';

  const DEFAULT_DURATION = 3600;
  const MAX_VISIBLE = 4;

  const ICONS = {
    success: '<path d="M20 6 9 17l-5-5"/>',
    error: '<path d="M6 6l12 12M18 6 6 18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  };

  let container = null;

  function getContainer() {
    if (container && document.body.contains(container)) return container;

    container = document.createElement('div');
    container.className = 'toasts';
    // Região viva: leitores de tela anunciam sem roubar o foco.
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
    return container;
  }

  /**
   * @param {string} message
   * @param {{type?: 'success'|'error'|'info', duration?: number}} options
   */
  function show(message, { type = 'info', duration = DEFAULT_DURATION } = {}) {
    const host = getContainer();

    // Mantém a pilha curta: o mais antigo sai para o novo entrar.
    while (host.children.length >= MAX_VISIBLE) {
      dismiss(host.firstElementChild);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
             stroke-linecap="round" stroke-linejoin="round">${ICONS[type] || ICONS.info}</svg>
      </span>
      <p class="toast__message"></p>
      <button class="toast__close" type="button" aria-label="Fechar aviso">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
      <span class="toast__bar" style="animation-duration: ${duration}ms"></span>
    `;
    // textContent: a mensagem pode vir de nome digitado pelo usuário.
    toast.querySelector('.toast__message').textContent = message;

    host.appendChild(toast);

    const timer = global.setTimeout(() => dismiss(toast), duration);

    toast.querySelector('.toast__close').addEventListener('click', () => {
      global.clearTimeout(timer);
      dismiss(toast);
    });

    return toast;
  }

  /** Anima a saída e remove o nó ao fim (ou na hora, se não houver animação). */
  function dismiss(toast) {
    if (!toast || toast.dataset.leaving) return;
    toast.dataset.leaving = 'true';
    toast.classList.add('is-leaving');

    const done = () => toast.remove();
    toast.addEventListener('animationend', done, { once: true });
    // Rede de segurança: com prefers-reduced-motion não há animação.
    global.setTimeout(done, 400);
  }

  global.NexusDesk = global.NexusDesk || {};
  global.NexusDesk.toast = {
    show,
    success: (message, options) => show(message, { ...options, type: 'success' }),
    error: (message, options) => show(message, { ...options, type: 'error' }),
    info: (message, options) => show(message, { ...options, type: 'info' }),
  };
})(window);
