/**
 * Nexus Desk — dashboard.js
 * Script da tela principal (dashboard.html).
 * Nesta etapa cuida apenas do fluxo: protege a rota, mostra quem está
 * logado e trata o logout. Sidebar, header e grid vêm no Prompt 3.
 */
(function (global) {
  'use strict';

  const { app, auth, router } = global.NexusDesk;
  const { $ } = app;

  function init() {
    // Sem sessão ativa, volta para o login.
    if (!router.requireAuth()) return;

    const session = auth.getSession();
    const userLabel = $('#current-user');
    if (userLabel && session) {
      userLabel.textContent = session.email;
    }

    const logoutButton = $('#logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        auth.logout();
        router.go('login');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
