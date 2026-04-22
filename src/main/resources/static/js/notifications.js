/**
 * Notification System
 * Handles polling and display of notifications
 */
const Notifications = {
    pollInterval: null,
    isDropdownOpen: false,

    start() {
        this.poll();
        this.pollInterval = setInterval(() => this.poll(), 30000);
    },

    stop() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    },

    async poll() {
        if (!Auth.isLoggedIn()) return;
        try {
            const data = await API.getUnreadCount();
            this.updateBadge(data.count);
        } catch (e) {
            // Silently fail polling
        }
    },

    updateBadge(count) {
        const badge = document.getElementById('notifBadge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    },

    async toggleDropdown() {
        const dropdown = document.getElementById('notifDropdown');
        if (!dropdown) return;

        this.isDropdownOpen = !this.isDropdownOpen;

        if (this.isDropdownOpen) {
            dropdown.classList.add('show');
            await this.loadNotifications();
        } else {
            dropdown.classList.remove('show');
        }
    },

    async loadNotifications() {
        const list = document.getElementById('notifList');
        if (!list) return;

        try {
            const notifications = await API.getNotifications();

            if (notifications.length === 0) {
                list.innerHTML = '<div class="notification-empty">🔔 No notifications yet</div>';
                return;
            }

            list.innerHTML = notifications.slice(0, 20).map(n => `
                <div class="notification-item ${n.read ? '' : 'unread'}" onclick="Notifications.markRead(${n.id})">
                    <div class="notif-message">${n.message}</div>
                    <div class="notif-time">${this.timeAgo(n.createdAt)}</div>
                </div>
            `).join('');
        } catch (e) {
            list.innerHTML = '<div class="notification-empty">Failed to load notifications</div>';
        }
    },

    async markRead(id) {
        try {
            await API.markNotificationRead(id);
            await this.loadNotifications();
            await this.poll();
        } catch (e) {
            // Silently fail
        }
    },

    async markAllRead() {
        try {
            await API.markAllRead();
            await this.loadNotifications();
            this.updateBadge(0);
        } catch (e) {
            Toast.show('Failed to mark notifications as read', 'error');
        }
    },

    timeAgo(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    },

    renderBell() {
        return `
            <div style="position: relative;">
                <button class="notification-bell" onclick="Notifications.toggleDropdown()" id="notifBell">
                    🔔
                    <span class="notification-badge" id="notifBadge" style="display: none;">0</span>
                </button>
                <div class="notification-dropdown" id="notifDropdown">
                    <div class="notification-dropdown-header">
                        <h4>Notifications</h4>
                        <button class="notification-mark-all" onclick="Notifications.markAllRead()">Mark all read</button>
                    </div>
                    <div class="notification-list" id="notifList">
                        <div class="notification-empty">Loading...</div>
                    </div>
                </div>
            </div>
        `;
    }
};

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (Notifications.isDropdownOpen && !e.target.closest('.notification-bell') && !e.target.closest('.notification-dropdown')) {
        Notifications.isDropdownOpen = false;
        const dropdown = document.getElementById('notifDropdown');
        if (dropdown) dropdown.classList.remove('show');
    }
});
