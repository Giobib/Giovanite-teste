/**
 * Nexus Desk — automations.js
 * CRUD de automações: modelo de dados, persistência no LocalStorage,
 * renderização dos cards e os modais de criar/editar e de exclusão.
 *
 * O catálogo de categorias e a lista inicial existem também em /data como
 * JSON legível. A cópia autoritativa em tempo de execução é esta, porque
 * `fetch()` não funciona quando o projeto é aberto por file://.
 */
(function (global) {
  'use strict';

  const { app, storage } = global.NexusDesk;
  const { $, $$ } = app;

  /* ------------------------------------------------------------------ *
   * Catálogos
   * ------------------------------------------------------------------ */

  const CATEGORIES = [
    { id: 'infraestrutura', nome: 'Infraestrutura' },
    { id: 'monitoramento', nome: 'Monitoramento' },
    { id: 'relatorios', nome: 'Relatórios' },
    { id: 'integracoes', nome: 'Integrações' },
  ];

  const ACTION_TYPES = [
    { id: 'agendada', nome: 'Agendada' },
    { id: 'webhook', nome: 'Webhook' },
    { id: 'manual', nome: 'Manual' },
  ];

  const COLORS = ['#00f0ff', '#7b5cff', '#22e39a', '#ffb547', '#ff4d6d', '#4da3ff'];

  /** Miolo dos SVGs, desenhados no mesmo traço dos ícones das telas. */
  const ICONS = {
    database:
      '<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>',
    bell:
      '<path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5Z"/><path d="M10.5 19a1.8 1.8 0 0 0 3 0"/>',
    chart: '<path d="M4 20h16"/><path d="M7 20v-7M12 20V5M17 20v-10"/>',
    sync:
      '<path d="M20 11.5A8 8 0 0 0 6 7L4 9"/><path d="M4 5v4h4"/><path d="M4 12.5A8 8 0 0 0 18 17l2-2"/><path d="M20 19v-4h-4"/>',
    mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 7 9 6 9-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.3-3 8-7.5 9.5-4.5-1.5-7.5-5.2-7.5-9.5V6L12 3Z"/>',
    zap: '<path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z"/>',
  };

  const ICON_NAMES = Object.keys(ICONS);

  /** Lista inicial usada quando o storage está vazio. */
  const SEED = [
    {
      nome: 'Backup diário',
      descricao: 'Copia os arquivos do projeto para o storage às 02h.',
      categoria: 'infraestrutura',
      icone: 'database',
      cor: '#00f0ff',
      tipoAcao: 'agendada',
    },
    {
      nome: 'Alerta de falha',
      descricao: 'Notifica o time no chat quando um job termina com erro.',
      categoria: 'monitoramento',
      icone: 'bell',
      cor: '#ff4d6d',
      tipoAcao: 'webhook',
    },
    {
      nome: 'Relatório semanal',
      descricao: 'Envia o resumo de execuções por e-mail toda segunda-feira.',
      categoria: 'relatorios',
      icone: 'chart',
      cor: '#7b5cff',
      tipoAcao: 'agendada',
    },
  ];

  /* ------------------------------------------------------------------ *
   * Repositório (LocalStorage)
   * ------------------------------------------------------------------ */

  const repo = {
    /** Todas as automações, na ordem salva. */
    all() {
      return storage.get(storage.KEYS.AUTOMATIONS, []);
    },

    saveAll(list) {
      storage.set(storage.KEYS.AUTOMATIONS, list);
      return list;
    },

    find(id) {
      return repo.all().find((item) => item.id === id) || null;
    },

    create(data) {
      const automation = {
        id: generateId(),
        criadaEm: new Date().toISOString(),
        ativa: true,
        ...data,
      };
      repo.saveAll([automation, ...repo.all()]);
      return automation;
    },

    update(id, data) {
      const list = repo.all().map((item) => (item.id === id ? { ...item, ...data } : item));
      repo.saveAll(list);
      return repo.find(id);
    },

    remove(id) {
      repo.saveAll(repo.all().filter((item) => item.id !== id));
    },

    /**
     * Semeia as automações mock na primeira visita.
     * O teste é pela ausência da chave, não pelo tamanho da lista: quem
     * apagou todas as automações não quer vê-las de volta no F5.
     */
    seedIfEmpty() {
      if (storage.get(storage.KEYS.AUTOMATIONS, null) !== null) return;
      const now = Date.now();
      repo.saveAll(
        SEED.map((item, index) => ({
          id: generateId(),
          // Datas escalonadas para a lista não nascer toda no mesmo instante.
          criadaEm: new Date(now - (SEED.length - index) * 86400000).toISOString(),
          ativa: true,
          ...item,
        }))
      );
    },
  };

  function generateId() {
    return `atm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  /* ------------------------------------------------------------------ *
   * Helpers de apresentação
   * ------------------------------------------------------------------ */

  function categoryName(id) {
    const found = CATEGORIES.find((item) => item.id === id);
    return found ? found.nome : id;
  }

  function actionName(id) {
    const found = ACTION_TYPES.find((item) => item.id === id);
    return found ? found.nome : id;
  }

  function iconSvg(name, className) {
    const body = ICONS[name] || ICONS.zap;
    return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  /** Escapa texto vindo do usuário antes de entrar no HTML. */
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

  /* ------------------------------------------------------------------ *
   * Renderização dos cards
   * ------------------------------------------------------------------ */

  let grid;

  function render() {
    const list = repo.all();

    grid.querySelectorAll('.card').forEach((card) => card.remove());

    const html = list.map((automation, index) => cardHtml(automation, index)).join('');
    grid.insertAdjacentHTML('afterbegin', html);

    updateStats(list);
    // A busca do dashboard.js reaplica o filtro sobre os cards novos.
    document.dispatchEvent(new CustomEvent('automations:rendered'));
  }

  function cardHtml(automation, index) {
    const nome = escapeHtml(automation.nome);
    const ativa = automation.ativa !== false;

    return `
      <article class="card" data-id="${automation.id}"
               data-name="${nome}" data-category="${escapeHtml(categoryName(automation.categoria))}"
               style="--card-color: ${escapeHtml(automation.cor)}; --delay: ${index * 60}ms">
        <div class="card__top">
          <span class="card__icon" aria-hidden="true">${iconSvg(automation.icone, '')}</span>
          <div class="card__heading">
            <h2 class="card__title">${nome}</h2>
            <div class="card__badges">
              <span class="badge" style="color: ${escapeHtml(automation.cor)}">${escapeHtml(categoryName(automation.categoria))}</span>
              <span class="badge badge--muted">${escapeHtml(actionName(automation.tipoAcao))}</span>
            </div>
          </div>
          <button class="icon-button card__menu" type="button" data-action="delete"
                  aria-label="Excluir ${nome}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 7h16"/><path d="M9.5 7V5.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5V7"/>
              <path d="M6.5 7 7 19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l.5-12"/>
            </svg>
          </button>
        </div>
        <p class="card__description">${escapeHtml(automation.descricao || 'Sem descrição.')}</p>
        <div class="card__footer">
          <span class="card__meta">
            ${iconSvg('clock', '')}
            criada em ${formatDate(automation.criadaEm)}
          </span>
          <label class="switch" data-action="toggle">
            <input type="checkbox" ${ativa ? 'checked' : ''} aria-label="Ativar ${nome}">
            <span class="switch__track" aria-hidden="true"></span>
            <span>${ativa ? 'Ativa' : 'Pausada'}</span>
          </label>
        </div>
      </article>
    `;
  }

  function updateStats(list) {
    const ativas = list.filter((item) => item.ativa !== false).length;
    const categorias = new Set(list.map((item) => item.categoria)).size;

    $('#stat-active').textContent = ativas;
    $('#stat-paused').textContent = list.length - ativas;
    $('#stat-categories').textContent = categorias;
  }

  /* ------------------------------------------------------------------ *
   * Modal de criar / editar
   * ------------------------------------------------------------------ */

  /**
   * Monta e abre o modal. Sem `automation` é criação; com, é edição.
   * O <dialog> nativo cuida do foco preso, do Esc e do fundo inerte.
   */
  function openForm(automation) {
    const editing = Boolean(automation);
    const data = automation || {
      nome: '',
      descricao: '',
      categoria: CATEGORIES[0].id,
      icone: ICON_NAMES[0],
      cor: COLORS[0],
      tipoAcao: ACTION_TYPES[0].id,
    };

    const dialog = document.createElement('dialog');
    dialog.className = 'modal';
    dialog.innerHTML = `
      <form class="modal__form" novalidate>
        <header class="modal__header">
          <div>
            <h2 class="modal__title">${editing ? 'Editar automação' : 'Nova automação'}</h2>
            <p class="modal__subtitle">${
              editing ? 'As mudanças valem na hora.' : 'Defina o que ela faz e como ela dispara.'
            }</p>
          </div>
          <button class="icon-button modal__close" type="button" data-close aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>

        <div class="modal__body">
          <div class="field" id="field-nome">
            <label class="field__label" for="automation-nome">Nome</label>
            <div class="field__control">
              <input class="field__input" type="text" id="automation-nome" name="nome"
                     placeholder="Backup diário" value="${escapeHtml(data.nome)}"
                     autocomplete="off" maxlength="60">
            </div>
            <p class="field__error" id="nome-error" role="alert"></p>
          </div>

          <div class="field">
            <label class="field__label" for="automation-descricao">Descrição</label>
            <textarea class="field__textarea" id="automation-descricao" name="descricao"
                      maxlength="180" placeholder="O que essa automação faz?">${escapeHtml(data.descricao)}</textarea>
          </div>

          <div class="modal__row">
            <div class="field">
              <label class="field__label" for="automation-categoria">Categoria</label>
              <select class="field__select" id="automation-categoria" name="categoria">
                ${CATEGORIES.map(
                  (item) =>
                    `<option value="${item.id}" ${item.id === data.categoria ? 'selected' : ''}>${item.nome}</option>`
                ).join('')}
              </select>
            </div>
            <div class="field">
              <label class="field__label" for="automation-tipo">Tipo de ação</label>
              <select class="field__select" id="automation-tipo" name="tipoAcao">
                ${ACTION_TYPES.map(
                  (item) =>
                    `<option value="${item.id}" ${item.id === data.tipoAcao ? 'selected' : ''}>${item.nome}</option>`
                ).join('')}
              </select>
            </div>
          </div>

          <div class="field">
            <span class="field__label">Ícone</span>
            <div class="picker">
              ${ICON_NAMES.map(
                (name) => `
                <label>
                  <input type="radio" name="icone" value="${name}" ${name === data.icone ? 'checked' : ''}>
                  <span class="picker__option">${iconSvg(name, '')}</span>
                </label>`
              ).join('')}
            </div>
          </div>

          <div class="field">
            <span class="field__label">Cor</span>
            <div class="picker picker--color">
              ${COLORS.map(
                (color) => `
                <label>
                  <input type="radio" name="cor" value="${color}" ${color === data.cor ? 'checked' : ''}>
                  <span class="picker__option" style="--swatch: ${color}"
                        title="${color}"></span>
                </label>`
              ).join('')}
            </div>
          </div>
        </div>

        <footer class="modal__footer">
          <button class="button" type="button" data-close>Cancelar</button>
          <button class="button button--primary" type="submit">
            ${editing ? 'Salvar alterações' : 'Criar automação'}
          </button>
        </footer>
      </form>
    `;

    document.body.appendChild(dialog);
    dialog.showModal();
    $('#automation-nome', dialog).focus();

    const form = $('form', dialog);

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const values = Object.fromEntries(new FormData(form));
      values.nome = values.nome.trim();
      values.descricao = values.descricao.trim();

      if (values.nome.length < 3) {
        setNameError(dialog, 'Dê um nome de pelo menos 3 caracteres.');
        $('#automation-nome', dialog).focus();
        return;
      }

      if (editing) {
        repo.update(automation.id, values);
      } else {
        repo.create(values);
      }

      render();
      close(dialog);
    });

    $('#automation-nome', dialog).addEventListener('input', () => setNameError(dialog, null));
    wireClose(dialog);
  }

  function setNameError(dialog, message) {
    $('#field-nome', dialog).classList.toggle('field--invalid', Boolean(message));
    $('#nome-error', dialog).textContent = message || '';
  }

  /* ------------------------------------------------------------------ *
   * Modal de exclusão
   * ------------------------------------------------------------------ */

  function openConfirm(automation) {
    const dialog = document.createElement('dialog');
    dialog.className = 'modal modal--confirm';
    dialog.innerHTML = `
      <form class="modal__form" novalidate>
        <header class="modal__header">
          <span class="modal__danger-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 8.5v5"/><path d="M12 17h.01"/>
              <path d="M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>
            </svg>
          </span>
          <div>
            <h2 class="modal__title">Excluir automação</h2>
            <p class="modal__subtitle">
              “${escapeHtml(automation.nome)}” sai da lista e do armazenamento. Não dá para desfazer.
            </p>
          </div>
        </header>
        <footer class="modal__footer">
          <button class="button" type="button" data-close>Cancelar</button>
          <button class="button button--danger" type="submit">Excluir</button>
        </footer>
      </form>
    `;

    document.body.appendChild(dialog);
    dialog.showModal();
    $('[data-close]', dialog).focus();

    $('form', dialog).addEventListener('submit', (event) => {
      event.preventDefault();
      repo.remove(automation.id);
      render();
      close(dialog);
    });

    wireClose(dialog);
  }

  /* ------------------------------------------------------------------ *
   * Ciclo de vida dos modais
   * ------------------------------------------------------------------ */

  function wireClose(dialog) {
    $$('[data-close]', dialog).forEach((button) => {
      button.addEventListener('click', () => close(dialog));
    });

    // Clique no fundo (fora do formulário) fecha.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) close(dialog);
    });

    // Esc dispara "cancel" no <dialog>; limpamos o nó depois.
    dialog.addEventListener('close', () => dialog.remove());
  }

  function close(dialog) {
    dialog.close();
  }

  /* ------------------------------------------------------------------ *
   * Integração com o dashboard
   * ------------------------------------------------------------------ */

  function init() {
    grid = $('#automations-grid');
    if (!grid) return;

    repo.seedIfEmpty();
    render();

    $('#new-automation').addEventListener('click', () => openForm());

    // Delegação: os cards são recriados a cada render.
    grid.addEventListener('click', (event) => {
      const card = event.target.closest('.card');
      if (!card) return;

      const automation = repo.find(card.dataset.id);
      if (!automation) return;

      if (event.target.closest('[data-action="delete"]')) {
        openConfirm(automation);
        return;
      }

      // O interruptor cuida de si mesmo no evento change.
      if (event.target.closest('[data-action="toggle"]')) return;

      openForm(automation);
    });

    grid.addEventListener('change', (event) => {
      const toggle = event.target.closest('[data-action="toggle"] input');
      if (!toggle) return;

      const card = toggle.closest('.card');
      repo.update(card.dataset.id, { ativa: toggle.checked });
      render();
    });
  }

  global.NexusDesk.automations = { repo, render, openForm, openConfirm, CATEGORIES, ACTION_TYPES };

  document.addEventListener('DOMContentLoaded', init);
})(window);
