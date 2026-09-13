/**
 * Nexus Desk — router.js
 * Navegação simulada entre as páginas do projeto (redirecionamento real
 * via window.location) e proteção de rota baseada na sessão mock.
 */
(function (global) {
  'use strict';

  const { auth } = global.NexusDesk;

  const ROUTES = {
    login: 'index.html',
    dashboard: 'dashboard.html',
  };

  /** Redireciona para uma rota nomeada, com atraso opcional (ms). */
  function go(routeName, delay = 0) {
    const target = ROUTES[routeName];
    if (!target) {
      console.error(`[router] Rota desconhecida: "${routeName}"`);
      return;
    }
    if (delay > 0) {
      global.setTimeout(() => {
        global.location.href = target;
      }, delay);
      return;
    }
    global.location.href = target;
  }

  /**
   * Exige sessão ativa: sem sessão, manda de volta para o login.
   * @returns {boolean} true se pode permanecer na página.
   */
  function requireAuth() {
    if (auth.isAuthenticated()) return true;
    go('login');
    return false;
  }

  /**
   * Usado na tela de login: se já existe sessão, pula direto pro dashboard.
   * @returns {boolean} true se permaneceu no login.
   */
  function redirectIfAuthenticated() {
    if (!auth.isAuthenticated()) return true;
    go('dashboard');
    return false;
  }

  global.NexusDesk.router = { ROUTES, go, requireAuth, redirectIfAuthenticated };
})(window);
