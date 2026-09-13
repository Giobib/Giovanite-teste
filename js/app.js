/**
 * Nexus Desk — app.js
 * Bootstrap comum a todas as páginas: metadados do app, tema persistido
 * e utilitários compartilhados. Carregado antes dos scripts de página.
 */
(function (global) {
  'use strict';

  const { storage } = global.NexusDesk;

  const APP = {
    name: 'Nexus Desk',
    version: '0.1.0',
  };

  /** Aplica o tema salvo (dark por padrão) no elemento raiz. */
  function applyStoredTheme() {
    const theme = storage.get(storage.KEYS.THEME, 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
  }

  /** Atalho para querySelector com escopo opcional. */
  function $(selector, scope = document) {
    return scope.querySelector(selector);
  }

  /** Atalho para querySelectorAll já convertido em Array. */
  function $$(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
  }

  applyStoredTheme();

  global.NexusDesk.app = { APP, applyStoredTheme, $, $$ };
})(window);
