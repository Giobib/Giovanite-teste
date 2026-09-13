/**
 * Nexus Desk — login.js
 * Tela de login: validação dos campos, alternância de visibilidade da senha
 * e simulação de autenticação com redirecionamento para o dashboard.
 */
(function (global) {
  'use strict';

  const { app, auth, router, storage } = global.NexusDesk;
  const { $ } = app;

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const MIN_PASSWORD_LENGTH = 6;
  const FAKE_REQUEST_MS = 900;

  /** Regras de validação por campo. Devolvem a mensagem de erro ou null. */
  const rules = {
    email(value) {
      if (!value) return 'Informe seu e-mail.';
      if (!EMAIL_PATTERN.test(value)) return 'Digite um e-mail válido, como voce@empresa.com.';
      return null;
    },
    password(value) {
      if (!value) return 'Informe sua senha.';
      if (value.length < MIN_PASSWORD_LENGTH) {
        return `A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
      }
      return null;
    },
  };

  let elements = {};

  function init() {
    // Quem já tem sessão não vê o login.
    if (!router.redirectIfAuthenticated()) return;

    elements = {
      form: $('#login-form'),
      email: $('#email'),
      password: $('#password'),
      remember: $('#remember'),
      toggle: $('#toggle-password'),
      submit: $('#submit-button'),
      label: $('.button__label', $('#submit-button')),
      feedback: $('#login-feedback'),
    };

    if (!elements.form) return;

    prefillRememberedEmail();

    elements.form.addEventListener('submit', handleSubmit);
    elements.toggle.addEventListener('click', togglePasswordVisibility);

    // Valida ao sair do campo; limpa o erro assim que o usuário corrige.
    ['email', 'password'].forEach((name) => {
      elements[name].addEventListener('blur', () => validateField(name));
      elements[name].addEventListener('input', () => clearFieldError(name));
    });
  }

  /** Se o usuário marcou "Lembrar-me" antes, devolve o e-mail preenchido. */
  function prefillRememberedEmail() {
    const remembered = storage.get(storage.KEYS.REMEMBERED_EMAIL, '');
    if (!remembered) return;
    elements.email.value = remembered;
    elements.remember.checked = true;
    elements.password.focus();
  }

  /** Aplica a regra do campo e pinta o estado de erro. Retorna true se válido. */
  function validateField(name) {
    const input = elements[name];
    const error = rules[name](input.value.trim());
    setFieldError(name, error);
    return error === null;
  }

  function setFieldError(name, message) {
    const field = $(`#field-${name}`);
    const output = $(`#${name}-error`);
    const isInvalid = Boolean(message);

    field.classList.toggle('field--invalid', isInvalid);
    elements[name].setAttribute('aria-invalid', String(isInvalid));
    output.textContent = message || '';
  }

  function clearFieldError(name) {
    if (!$(`#field-${name}`).classList.contains('field--invalid')) return;
    setFieldError(name, null);
  }

  function togglePasswordVisibility() {
    const showing = elements.password.type === 'text';
    elements.password.type = showing ? 'password' : 'text';
    elements.toggle.setAttribute('aria-pressed', String(!showing));
    elements.toggle.setAttribute('aria-label', showing ? 'Mostrar senha' : 'Ocultar senha');
    elements.password.focus();
  }

  function handleSubmit(event) {
    event.preventDefault();

    // Valida os dois campos antes de decidir, para mostrar todos os erros.
    const emailOk = validateField('email');
    const passwordOk = validateField('password');

    if (!emailOk || !passwordOk) {
      showFeedback('Revise os campos destacados para continuar.', 'error');
      (emailOk ? elements.password : elements.email).focus();
      return;
    }

    authenticate(elements.email.value.trim(), elements.remember.checked);
  }

  /**
   * Autenticação simulada: não há backend, apenas um atraso para dar
   * feedback de carregamento antes de criar a sessão e redirecionar.
   */
  function authenticate(email, remember) {
    setLoading(true);
    hideFeedback();

    global.setTimeout(() => {
      auth.login(email, { remember });

      if (remember) {
        storage.set(storage.KEYS.REMEMBERED_EMAIL, email);
      } else {
        storage.remove(storage.KEYS.REMEMBERED_EMAIL);
      }

      showFeedback('Tudo certo. Abrindo seu painel…', 'success');
      router.go('dashboard', 400);
    }, FAKE_REQUEST_MS);
  }

  function setLoading(isLoading) {
    elements.submit.classList.toggle('is-loading', isLoading);
    elements.submit.disabled = isLoading;
    elements.label.textContent = isLoading ? 'Entrando…' : 'Entrar';
  }

  function showFeedback(message, kind) {
    const { feedback } = elements;
    feedback.textContent = message;
    feedback.classList.remove('alert--success', 'alert--error');
    feedback.classList.add(`alert--${kind}`);
    feedback.hidden = false;
  }

  function hideFeedback() {
    elements.feedback.hidden = true;
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
