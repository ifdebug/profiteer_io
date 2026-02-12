/**
 * Modal system — open/close with backdrop, keyboard escape, focus trapping.
 */

let activeModal = null;

function trapFocus(el) {
  const focusable = el.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  function handleTab(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  el.addEventListener('keydown', handleTab);
  return () => el.removeEventListener('keydown', handleTab);
}

export function openModal(options = {}) {
  const { title = '', content = '', footer = '', onClose, className = '' } = options;

  closeModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-panel ${className}" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">${content}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);
  activeModal = { overlay, onClose };

  // Close handlers
  overlay.querySelector('.modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  const removeTrap = trapFocus(overlay.querySelector('.modal-panel'));
  activeModal.removeTrap = removeTrap;

  function handleEsc(e) {
    if (e.key === 'Escape') closeModal();
  }
  document.addEventListener('keydown', handleEsc);
  activeModal.handleEsc = handleEsc;

  // Focus first input or close button
  const firstInput = overlay.querySelector('input, select, textarea');
  if (firstInput) {
    firstInput.focus();
  } else {
    overlay.querySelector('.modal-close').focus();
  }

  return overlay.querySelector('.modal-panel');
}

export function closeModal() {
  if (!activeModal) return;

  const { overlay, onClose, removeTrap, handleEsc } = activeModal;
  if (removeTrap) removeTrap();
  if (handleEsc) document.removeEventListener('keydown', handleEsc);

  overlay.classList.add('closing');
  setTimeout(() => {
    overlay.remove();
    if (onClose) onClose();
  }, 150);

  activeModal = null;
}
