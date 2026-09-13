/**
 * Nexus Desk — login.js
 * Script da tela de login (index.html).
 * Nesta etapa cuida apenas do fluxo: valida o mínimo, cria a sessão mock
 * e redireciona para o dashboard. A validação rica vem no Prompt 2.
 */
(function (global) {
  'use strict';

  const { app, auth, router } = global.NexusDesk;
  const { $ } = app;

  function init() {
    // Já autenticado? Vai direto para o dashboard.
    if (!router.redirectIfAuthenticated()) return;

    const form = $('#login-form');
    const emailField = $('#email');
    const passwordField = $('#password');
    const rememberField = $('#remember');
    const feedback = $('#login-feedback');

    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const email = emailField.value.trim();
      const password = passwordField.value;

      if (!email || !password) {
        showFeedback(feedback, 'Preencha e-mail e senha para continuar.');
        return;
      }

      auth.login(email, { remember: rememberField.checked });
      showFeedback(feedback, 'Autenticado. Redirecionando…');
      router.go('dashboard', 400);
    });
  }

  function showFeedback(element, message) {
    if (!element) return;
    element.textContent = message;
    element.hidden = false;
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
