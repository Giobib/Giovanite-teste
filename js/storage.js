/**
 * Nexus Desk — storage.js
 * Camada única de acesso ao LocalStorage.
 * Nenhum outro arquivo deve chamar window.localStorage diretamente.
 */
(function (global) {
  'use strict';

  const KEYS = {
    SESSION: 'nexus:session',
    REMEMBERED_EMAIL: 'nexus:remembered-email',
    THEME: 'nexus:theme',
    AUTOMATIONS: 'nexus:automations',
    ORDER: 'nexus:automations:order',
  };

  /** Lê e desserializa um valor; devolve `fallback` se ausente ou inválido. */
  function get(key, fallback = null) {
    try {
      const raw = global.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      console.warn(`[storage] Falha ao ler "${key}":`, error);
      return fallback;
    }
  }

  /** Serializa e grava um valor. Retorna true em caso de sucesso. */
  function set(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`[storage] Falha ao gravar "${key}":`, error);
      return false;
    }
  }

  /** Remove uma chave. */
  function remove(key) {
    try {
      global.localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`[storage] Falha ao remover "${key}":`, error);
      return false;
    }
  }

  global.NexusDesk = global.NexusDesk || {};
  global.NexusDesk.storage = { KEYS, get, set, remove };
})(window);
