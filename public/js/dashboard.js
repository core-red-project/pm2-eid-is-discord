/**
 * PM2 EID Dashboard - Client-side interactive controller
 * Handles filtering, search, modal confirmation dialogs, live clock, and keyboard shortcuts.
 */

// Reactive Search & Status Filter Logic
let activeStatusFilter = 'all';
let activeSearchQuery = '';

function applyProcessFilters() {
  const rows = document.querySelectorAll('#process-table .process-row');
  rows.forEach((row) => {
    const name = (row.getAttribute('data-process') || '').toLowerCase();
    const id = (row.querySelector('.col-id')?.textContent || '').trim().toLowerCase();
    const status = (row.querySelector('.status-badge')?.textContent || '').trim().toLowerCase();

    const matchesSearch =
      !activeSearchQuery || name.includes(activeSearchQuery) || id.includes(activeSearchQuery);
    const matchesStatus = activeStatusFilter === 'all' || status === activeStatusFilter;

    row.style.display = matchesSearch && matchesStatus ? '' : 'none';
  });
}

const searchInput = document.getElementById('process-search-input');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    activeSearchQuery = e.target.value.trim().toLowerCase();
    applyProcessFilters();
  });
}

const chipsContainer = document.getElementById('status-filter-chips');
if (chipsContainer) {
  chipsContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;

    chipsContainer.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');

    activeStatusFilter = chip.getAttribute('data-status') || 'all';
    applyProcessFilters();
  });
}

// Reapply active filters whenever HTMX updates the process table
document.body.addEventListener('htmx:afterSwap', (event) => {
  if (event.target.id === 'process-table') {
    applyProcessFilters();
  }
});

// Ergonomic HTMX Confirmation Dialog Handler (Replaces native browser confirm)
const confirmModal = document.getElementById('confirm-modal');
const modalMessage = document.getElementById('confirm-modal-message');
const modalConfirmBtn = document.getElementById('confirm-modal-confirm');
const modalCancelBtn = document.getElementById('confirm-modal-cancel');
let pendingConfirmCallback = null;

if (confirmModal) {
  document.addEventListener('htmx:confirm', (event) => {
    if (!event.target.hasAttribute('hx-confirm')) return;
    event.preventDefault();

    const question = event.detail.question || 'Confirm this action?';
    if (modalMessage) modalMessage.textContent = question;

    // Danger actions (delete/stop) get highlighted button
    const isDanger =
      question.toLowerCase().includes('delete') ||
      question.toLowerCase().includes('stop') ||
      question.toLowerCase().includes('eliminar') ||
      question.toLowerCase().includes('detener');
    if (modalConfirmBtn) modalConfirmBtn.className = isDanger ? 'btn btn-delete' : 'btn btn-primary';

    pendingConfirmCallback = () => {
      event.detail.issueRequest(true);
    };

    confirmModal.showModal();
  });

  if (modalConfirmBtn) {
    modalConfirmBtn.addEventListener('click', () => {
      confirmModal.close();
      if (pendingConfirmCallback) {
        pendingConfirmCallback();
        pendingConfirmCallback = null;
      }
    });
  }

  if (modalCancelBtn) {
    modalCancelBtn.addEventListener('click', () => {
      confirmModal.close();
      pendingConfirmCallback = null;
    });
  }

  // Close modal on click outside backdrop
  confirmModal.addEventListener('click', (event) => {
    const rect = confirmModal.getBoundingClientRect();
    const isInDialog =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;
    if (!isInDialog) {
      confirmModal.close();
      pendingConfirmCallback = null;
    }
  });
}

// Live Clock
function updateServerTime() {
  const now = new Date();
  const timeEl = document.getElementById('server-time');
  if (timeEl) timeEl.textContent = now.toLocaleTimeString();
}
setInterval(updateServerTime, 1000);
updateServerTime();

// Dynamic Modal / Tab Close Handlers (eliminates inline onclick)
document.addEventListener('click', (e) => {
  // Log Viewer tab switching
  const tab = e.target.closest('.logs-actions .btn-tab');
  if (tab && tab.parentElement) {
    tab.parentElement.querySelectorAll('.btn-tab').forEach((b) => b.classList.remove('active'));
    tab.classList.add('active');
    return;
  }

  // Log Viewer close button
  const closeLogs = e.target.closest('#btn-close-logs, [data-action="close-logs"]');
  if (closeLogs) {
    const mount = document.getElementById('logs-mount');
    if (mount) mount.innerHTML = '';
    return;
  }

  // Detail Modal close button
  const closeDetail = e.target.closest('#btn-close-detail, [data-action="close-detail"]');
  if (closeDetail) {
    const mount = document.getElementById('detail-mount');
    if (mount) mount.innerHTML = '';
  }
});

// Keyboard Shortcuts
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    const detailMount = document.getElementById('detail-mount');
    if (detailMount && detailMount.innerHTML) {
      detailMount.innerHTML = '';
      return;
    }
    if (confirmModal && confirmModal.open) {
      confirmModal.close();
      pendingConfirmCallback = null;
    } else {
      const mount = document.getElementById('logs-mount');
      if (mount) mount.innerHTML = '';
    }
  }
  if (event.key === 'r' && !event.target.matches('input, textarea, dialog *')) {
    const table = document.getElementById('process-table');
    if (table && window.htmx) {
      window.htmx.trigger(table, 'htmx:trigger');
    }
  }
});

