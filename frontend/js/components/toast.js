/**
 * Toast notification system — success/error/warning/info with auto-dismiss.
 */

const ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const DEFAULTS = { duration: 4000 };

let container = null;

function getContainer() {
  if (!container) {
    container = document.getElementById('toast-container');
  }
  return container;
}

function createToast(type, title, message, options = {}) {
  const duration = options.duration || DEFAULTS.duration;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', 'alert');
  el.innerHTML = `
    <span class="toast-icon">${ICONS[type]}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button class="toast-close" aria-label="Dismiss">&times;</button>
  `;

  const close = () => {
    el.classList.add('removing');
    setTimeout(() => el.remove(), 150);
  };

  el.querySelector('.toast-close').addEventListener('click', close);

  getContainer().appendChild(el);

  if (duration > 0) {
    setTimeout(close, duration);
  }

  return el;
}

export const toast = {
  success(title, message, opts) { return createToast('success', title, message, opts); },
  error(title, message, opts) { return createToast('error', title, message, opts); },
  warning(title, message, opts) { return createToast('warning', title, message, opts); },
  info(title, message, opts) { return createToast('info', title, message, opts); },
};
