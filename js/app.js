/**
 * Nexus Desk — app.js
 * Bootstrap comum a todas as páginas: metadados do app e utilitários
 * compartilhados. Carregado antes dos scripts de página. O tema fica a
 * cargo de ui.js.
 */
(function (global) {
  'use strict';

  const APP = {
    name: 'Nexus Desk',
    version: '0.1.0',
  };

  /** Atalho para querySelector com escopo opcional. */
  function $(selector, scope = document) {
    return scope.querySelector(selector);
  }

  /** Atalho para querySelectorAll já convertido em Array. */
  function $$(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
  }

  global.NexusDesk.app = { APP, $, $$ };
})(window);
