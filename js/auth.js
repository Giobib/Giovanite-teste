/**
 * Nexus Desk — auth.js
 * Sessão *simulada* (mock). Não há backend nem credenciais reais:
 * o objetivo é apenas controlar o fluxo de navegação entre as telas.
 */
(function (global) {
  'use strict';

  const { storage } = global.NexusDesk;

  /** Cria a sessão mock a partir de um e-mail. */
  function login(email, { remember = false } = {}) {
    const session = {
      email,
      name: email.split('@')[0] || 'usuário',
      remember,
      createdAt: new Date().toISOString(),
    };
    storage.set(storage.KEYS.SESSION, session);
    return session;
  }

  /** Encerra a sessão. */
  function logout() {
    storage.remove(storage.KEYS.SESSION);
  }

  /** Sessão atual ou null. */
  function getSession() {
    return storage.get(storage.KEYS.SESSION, null);
  }

  /** Há alguém "autenticado"? */
  function isAuthenticated() {
    return Boolean(getSession());
  }

  global.NexusDesk.auth = { login, logout, getSession, isAuthenticated };
})(window);
