export function renderDashboardPage(hasAuth: boolean = false): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <meta name="theme-color" content="#0d0d0d">
    <meta name="description" content="PM2 EID Is Discord Dashboard - Minimal, secure PM2 process manager and dashboard for production infrastructure. Developed by Core Red Project.">
    <title>PM2 EID Is Discord Dashboard | Core Red Project</title>
    <link rel="icon" type="image/webp" href="/static/icon.webp">
    <link rel="apple-touch-icon" href="/static/icon.webp">
    <link rel="stylesheet" href="/static/css/main.css">
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
</head>
<body>
    <div class="dashboard">
        <!-- Header -->
        <header class="header">
            <div class="header-content">
                <img src="/static/icon.webp" alt="PM2 EID Icon" class="header-logo-img">
                <div class="header-titles">
                    <h1 class="logo" title="PM2 EID Is Discord Dashboard">PM2 <span class="accent">EID</span></h1>
                    <div class="header-meta">
                        <span class="header-subtitle">PM2 EID Is Discord Dashboard</span>
                        <span class="header-org">Core Red Project</span>
                    </div>
                </div>
            </div>
            <div class="header-actions">
                <button class="btn btn-refresh" 
                        hx-get="/api/processes" 
                        hx-target="#process-table" 
                        hx-swap="innerHTML"
                        hx-indicator="#loading-indicator">
                    Refresh
                </button>
                ${hasAuth ? '<a href="/logout" class="btn btn-secondary" title="Sign out">Logout</a>' : ''}
                <span id="loading-indicator" class="htmx-indicator">Syncing...</span>
            </div>
        </header>

        <!-- Main Content -->
        <main class="main">
            <!-- Process Table Section -->
            <section class="section">
                <div class="section-header">
                    <h2>Processes</h2>
                    <div class="auto-refresh">
                        <label>
                            <input type="checkbox" id="auto-refresh-toggle" checked>
                            Auto-refresh (10s)
                        </label>
                    </div>
                </div>

                <!-- Process Toolbar (Search & Filter Chips) -->
                <div class="process-toolbar">
                    <div class="search-box">
                        <input type="text" id="process-search-input" class="search-input" placeholder="Filter processes by name or ID..." autocomplete="off">
                    </div>
                    <div class="status-chips" id="status-filter-chips">
                        <button type="button" class="chip active" data-status="all">All</button>
                        <button type="button" class="chip" data-status="online">Online</button>
                        <button type="button" class="chip" data-status="stopped">Stopped</button>
                        <button type="button" class="chip" data-status="errored">Errored</button>
                    </div>
                </div>

                <div id="process-table" 
                     hx-get="/api/processes" 
                     hx-trigger="load, every 10s [checkAutoRefresh()]"
                     hx-swap="innerHTML">
                    <div class="loading-state">
                        <p>Connecting to PM2 daemon...</p>
                    </div>
                </div>
            </section>

            <!-- Dynamic Logs Mountpoint (Ergonomic HTMX swap) -->
            <div id="logs-mount"></div>
        </main>

        <!-- Footer -->
        <footer class="footer">
            <div class="footer-content">
                <span>Developed by <a href="https://sxnnysideproject.com" target="_blank" rel="noopener noreferrer" class="footer-link">Core Red Project</a></span>
                <span class="separator">|</span>
                <span id="server-time">--:--:--</span>
                <div class="footer-meta">
                    <span>Sxnnyside Project</span>
                </div>
            </div>
        </footer>
    </div>

    <!-- Non-native Dialog Modal for HTMX Confirmations -->
    <dialog id="confirm-modal" class="modal-dialog">
        <div class="modal-header">
            <svg class="modal-icon-danger" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span class="modal-title" id="confirm-modal-title">Confirm Action</span>
        </div>
        <div class="modal-body" id="confirm-modal-message">
            Are you sure you want to perform this action?
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="confirm-modal-cancel">
                Cancel
            </button>
            <button type="button" class="btn btn-delete" id="confirm-modal-confirm">
                Confirm
            </button>
        </div>
    </dialog>

    <script>
        // Reactive Search & Status Filter Logic
        let activeStatusFilter = 'all';
        let activeSearchQuery = '';

        function applyProcessFilters() {
            const rows = document.querySelectorAll('#process-table .process-row');
            rows.forEach(row => {
                const name = (row.getAttribute('data-process') || '').toLowerCase();
                const id = (row.querySelector('.col-id')?.textContent || '').trim().toLowerCase();
                const status = (row.querySelector('.status-badge')?.textContent || '').trim().toLowerCase();

                const matchesSearch = !activeSearchQuery || name.includes(activeSearchQuery) || id.includes(activeSearchQuery);
                const matchesStatus = activeStatusFilter === 'all' || status === activeStatusFilter;

                row.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
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

                chipsContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');

                activeStatusFilter = chip.getAttribute('data-status') || 'all';
                applyProcessFilters();
            });
        }

        // Reapply active filters whenever HTMX updates the process table
        document.body.addEventListener('htmx:afterSwap', function(event) {
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

        document.addEventListener('htmx:confirm', function(event) {
            if (!event.target.hasAttribute('hx-confirm')) return;
            event.preventDefault();

            const question = event.detail.question || 'Confirm this action?';
            modalMessage.textContent = question;

            // Danger actions (delete/stop) get highlighted button
            const isDanger = question.toLowerCase().includes('delete') || question.toLowerCase().includes('stop');
            modalConfirmBtn.className = isDanger ? 'btn btn-delete' : 'btn btn-primary';
            modalConfirmBtn.textContent = isDanger ? 'Proceed' : 'Confirm';

            pendingConfirmCallback = () => {
                event.detail.issueRequest(true);
            };

            confirmModal.showModal();
        });

        modalConfirmBtn.addEventListener('click', () => {
            confirmModal.close();
            if (pendingConfirmCallback) {
                pendingConfirmCallback();
                pendingConfirmCallback = null;
            }
        });

        modalCancelBtn.addEventListener('click', () => {
            confirmModal.close();
            pendingConfirmCallback = null;
        });

        // Close modal on click outside backdrop
        confirmModal.addEventListener('click', (event) => {
            const rect = confirmModal.getBoundingClientRect();
            const isInDialog = (
                rect.top <= event.clientY &&
                event.clientY <= rect.top + rect.height &&
                rect.left <= event.clientX &&
                event.clientX <= rect.left + rect.width
            );
            if (!isInDialog) {
                confirmModal.close();
                pendingConfirmCallback = null;
            }
        });

        // Auto-refresh conditional check
        const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
        function checkAutoRefresh() {
            return autoRefreshToggle ? autoRefreshToggle.checked : true;
        }

        // Live Clock
        function updateServerTime() {
            const now = new Date();
            const timeEl = document.getElementById('server-time');
            if (timeEl) timeEl.textContent = now.toLocaleTimeString();
        }
        setInterval(updateServerTime, 1000);
        updateServerTime();

        // Keyboard Shortcuts
        document.addEventListener('keydown', function(event) {
            // ESC closes logs mount or dialog
            if (event.key === 'Escape') {
                if (confirmModal.open) {
                    confirmModal.close();
                    pendingConfirmCallback = null;
                } else {
                    const mount = document.getElementById('logs-mount');
                    if (mount) mount.innerHTML = '';
                }
            }
            // R refreshes process table
            if (event.key === 'r' && !event.target.matches('input, textarea, dialog *')) {
                htmx.trigger('#process-table', 'htmx:trigger');
            }
        });
    </script>
</body>
</html>`;
}
