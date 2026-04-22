/**
 * Main Application Router & Toast System
 * Hash-based SPA routing with role-based navigation
 */

// ---- Toast System ----
const Toast = {
    show(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toast-exit 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

// ---- Modal System ----
const Modal = {
    show(title, content) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = content;
        document.getElementById('modalOverlay').classList.add('show');
    },

    hide() {
        document.getElementById('modalOverlay').classList.remove('show');
    },

    /**
     * Promise-based confirm dialog. Resolves true on OK, false on cancel/close.
     *   const ok = await Modal.confirm({ title, message, confirmText, danger });
     */
    confirm({ title = 'Confirm', message = 'Are you sure?', confirmText = 'Confirm', cancelText = 'Cancel', danger = false, icon = '❓' } = {}) {
        return new Promise((resolve) => {
            const id = 'confirm-' + Date.now();
            const btnClass = danger ? 'btn btn-danger' : 'btn btn-primary';

            this.show(title, `
                <div style="text-align: center; padding: var(--space-md) 0;">
                    <div style="font-size: 3rem; margin-bottom: var(--space-md);">${icon}</div>
                    <p style="font-size: var(--font-base); margin-bottom: var(--space-xl); white-space: pre-line;">${message}</p>
                    <div style="display: flex; gap: var(--space-md); justify-content: center;">
                        <button class="btn btn-secondary" id="${id}-cancel">${cancelText}</button>
                        <button class="${btnClass}" id="${id}-ok">${confirmText}</button>
                    </div>
                </div>
            `);

            const finish = (val) => {
                this.hide();
                resolve(val);
            };
            document.getElementById(`${id}-ok`).addEventListener('click', () => finish(true));
            document.getElementById(`${id}-cancel`).addEventListener('click', () => finish(false));
        });
    },

    /**
     * Promise-based single-input prompt. Resolves with the string entered, or
     * null if the user cancels.
     */
    prompt({ title = 'Input', label = 'Value', defaultValue = '', placeholder = '', type = 'text', confirmText = 'OK' } = {}) {
        return new Promise((resolve) => {
            const id = 'prompt-' + Date.now();
            this.show(title, `
                <div class="form-group">
                    <label class="form-label">${label}</label>
                    <input type="${type}" class="form-input" id="${id}-input" value="${defaultValue}" placeholder="${placeholder}">
                </div>
                <div style="display: flex; gap: var(--space-md); justify-content: flex-end;">
                    <button class="btn btn-secondary" id="${id}-cancel">Cancel</button>
                    <button class="btn btn-primary" id="${id}-ok">${confirmText}</button>
                </div>
            `);

            const input = document.getElementById(`${id}-input`);
            input.focus();
            input.select();

            const finish = (val) => {
                this.hide();
                resolve(val);
            };
            document.getElementById(`${id}-ok`).addEventListener('click', () => finish(input.value));
            document.getElementById(`${id}-cancel`).addEventListener('click', () => finish(null));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') finish(input.value);
                if (e.key === 'Escape') finish(null);
            });
        });
    }
};

document.getElementById('modalClose')?.addEventListener('click', () => Modal.hide());
document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) Modal.hide();
});

// ---- Sortable Tables ----
/**
 * Lightweight client-side sorting helper. Usage:
 *   SortableTable.attach('tableId', (rows, col, dir) => { ... rerender ... });
 * The helper itself just wires click handlers and tracks state. The caller
 * provides the render function to re-draw the rows using the sorted data.
 */
const SortableTable = {
    state: {},

    sort(rows, accessor, dir = 'asc') {
        const copy = [...rows];
        copy.sort((a, b) => {
            let va = accessor(a);
            let vb = accessor(b);

            if (va == null) va = '';
            if (vb == null) vb = '';

            // Attempt numeric + date comparison, fall back to string
            const na = Number(va);
            const nb = Number(vb);
            if (!Number.isNaN(na) && !Number.isNaN(nb) && va !== '' && vb !== '') {
                return dir === 'asc' ? na - nb : nb - na;
            }
            const da = Date.parse(va);
            const db = Date.parse(vb);
            if (!Number.isNaN(da) && !Number.isNaN(db) && String(va).includes('-')) {
                return dir === 'asc' ? da - db : db - da;
            }
            return dir === 'asc'
                ? String(va).localeCompare(String(vb))
                : String(vb).localeCompare(String(va));
        });
        return copy;
    },

    renderHeader(tableKey, columns) {
        const st = this.state[tableKey] || { col: null, dir: 'asc' };
        return columns.map(c => {
            if (!c.sortKey) return `<th>${c.label}</th>`;
            const active = st.col === c.sortKey;
            const arrow = active ? (st.dir === 'asc' ? ' ▲' : ' ▼') : '';
            return `<th class="sortable" data-sort-table="${tableKey}" data-sort-key="${c.sortKey}" style="cursor: pointer; user-select: none;">${c.label}${arrow}</th>`;
        }).join('');
    },

    bind(tableKey, onChange) {
        document.querySelectorAll(`th[data-sort-table="${tableKey}"]`).forEach(th => {
            th.addEventListener('click', () => {
                const key = th.dataset.sortKey;
                const curr = this.state[tableKey] || { col: null, dir: 'asc' };
                let dir = 'asc';
                if (curr.col === key) {
                    dir = curr.dir === 'asc' ? 'desc' : 'asc';
                }
                this.state[tableKey] = { col: key, dir };
                onChange(key, dir);
            });
        });
    },

    getState(tableKey) {
        return this.state[tableKey] || null;
    }
};

// ---- Router ----
const Router = {
    routes: {
        '#/login': () => {
            Router.updateNav(false);
            Auth.renderLoginPage();
        },
        '#/dashboard': () => {
            if (!Auth.isLoggedIn()) { window.location.hash = '#/login'; return; }
            Router.updateNav(true);
            UserDashboard.render();
            Notifications.start();
        },
        '#/security': () => {
            if (!Auth.isLoggedIn()) { window.location.hash = '#/login'; return; }
            Router.updateNav(true);
            SecurityDashboard.render();
            Notifications.start();
        },
        '#/admin': () => {
            if (!Auth.isLoggedIn()) { window.location.hash = '#/login'; return; }
            Router.updateNav(true);
            AdminDashboard.render();
            Notifications.start();
        },
        '#/profile': () => {
            if (!Auth.isLoggedIn()) { window.location.hash = '#/login'; return; }
            Router.updateNav(true);
            Profile.render();
            Notifications.start();
        }
    },

    init() {
        window.addEventListener('hashchange', () => this.route());
        this.route();
    },

    route() {
        const hash = window.location.hash || '#/login';

        if (!Auth.isLoggedIn() && hash !== '#/login') {
            window.location.hash = '#/login';
            return;
        }

        if (Auth.isLoggedIn() && hash === '#/login') {
            const role = Auth.getRole();
            if (role === 'ROLE_ADMIN') { window.location.hash = '#/admin'; return; }
            if (role === 'ROLE_SECURITY') { window.location.hash = '#/security'; return; }
            window.location.hash = '#/dashboard';
            return;
        }

        const routeFn = this.routes[hash];
        if (routeFn) {
            routeFn();
        } else {
            window.location.hash = '#/login';
        }
    },

    updateNav(isLoggedIn) {
        const navLinks = document.getElementById('navLinks');
        const navActions = document.getElementById('navActions');

        if (!isLoggedIn) {
            navLinks.innerHTML = '';
            navActions.innerHTML = '';
            return;
        }

        const user = Auth.getUser();
        const role = user?.role;
        const hash = window.location.hash;

        let links = '';
        if (role === 'ROLE_USER') {
            links = `<a class="nav-link ${hash === '#/dashboard' ? 'active' : ''}" href="#/dashboard"><img src="/images/iit-dhanbad-feature-img-01.jpg" class="inline-logo" alt="Logo"> Dashboard</a>`;
        } else if (role === 'ROLE_SECURITY') {
            links = `
                <a class="nav-link ${hash === '#/security' ? 'active' : ''}" href="#/security">🛡️ Security</a>
                <a class="nav-link ${hash === '#/dashboard' ? 'active' : ''}" href="#/dashboard"><img src="/images/iit-dhanbad-feature-img-01.jpg" class="inline-logo" alt="Logo"> Parking</a>
            `;
        } else if (role === 'ROLE_ADMIN') {
            links = `
                <a class="nav-link ${hash === '#/admin' ? 'active' : ''}" href="#/admin">⚙️ Admin</a>
                <a class="nav-link ${hash === '#/dashboard' ? 'active' : ''}" href="#/dashboard"><img src="/images/iit-dhanbad-feature-img-01.jpg" class="inline-logo" alt="Logo"> Parking</a>
                <a class="nav-link ${hash === '#/security' ? 'active' : ''}" href="#/security">🛡️ Security</a>
            `;
        }
        links += `<a class="nav-link ${hash === '#/profile' ? 'active' : ''}" href="#/profile">👤 Profile</a>`;
        navLinks.innerHTML = links;

        const initials = (user?.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase();
        navActions.innerHTML = `
            ${Notifications.renderBell()}
            <a href="#/profile" class="user-menu" style="text-decoration: none; color: inherit;">
                <div class="user-avatar">${initials}</div>
                <div>
                    <div class="user-name">${user?.fullName || 'User'}</div>
                    <div class="user-role">${(role || '').replace('ROLE_', '')}</div>
                </div>
            </a>
            <button class="btn-logout" onclick="Auth.logout()">Logout</button>
        `;

        Notifications.poll();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Router.init();
});

