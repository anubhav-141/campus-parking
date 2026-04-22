/**
 * Admin Dashboard Module
 * Stats, zone CRUD, usage charts, reports, user management, audit log.
 */
const AdminDashboard = {
    async render() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="page-header">
                <h1>⚙️ Admin Dashboard</h1>
                <p>Manage parking zones, view statistics, and generate reports</p>
            </div>

            <div class="stats-grid" id="statsGrid">
                <div class="spinner"></div>
            </div>

            <!-- Zone Usage Chart -->
            <div class="chart-container">
                <h3 style="margin-bottom: var(--space-lg);">📊 Zone Usage Overview</h3>
                <canvas id="usageChart" height="250"></canvas>
            </div>

            <!-- Active Reservations -->
            <div class="section-header">
                <h2 class="section-title">Active Reservations — Who Is Using</h2>
                <button class="btn btn-secondary btn-sm" onclick="AdminDashboard.loadActiveRes()">🔄 Refresh</button>
            </div>
            <div id="activeResAdmin">
                <div class="spinner"></div>
            </div>

            <!-- Zone Management -->
            <div class="section-header" style="margin-top: var(--space-2xl);">
                <h2 class="section-title">Parking Zone Management</h2>
                <button class="btn btn-primary btn-sm" onclick="AdminDashboard.showAddZone()">+ Add Zone</button>
            </div>
            <div id="zonesManagement">
                <div class="spinner"></div>
            </div>

            <!-- Reports -->
            <div class="section-header" style="margin-top: var(--space-2xl);">
                <h2 class="section-title">Reports</h2>
            </div>
            <div class="card" style="margin-bottom: var(--space-2xl);">
                <div class="card-body">
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: var(--space-md);">
                        <button class="btn btn-secondary btn-sm" onclick="AdminDashboard.setRange('today')">Today</button>
                        <button class="btn btn-secondary btn-sm" onclick="AdminDashboard.setRange('7d')">Last 7 days</button>
                        <button class="btn btn-secondary btn-sm" onclick="AdminDashboard.setRange('30d')">Last 30 days</button>
                        <button class="btn btn-secondary btn-sm" onclick="AdminDashboard.setRange('90d')">Last 90 days</button>
                        <button class="btn btn-secondary btn-sm" onclick="AdminDashboard.setRange('all')">All time</button>
                    </div>
                    <div class="date-range-picker" style="margin-bottom: var(--space-lg);">
                        <label class="form-label" style="margin-bottom: 0;">From:</label>
                        <input type="datetime-local" id="reportStart">
                        <label class="form-label" style="margin-bottom: 0;">To:</label>
                        <input type="datetime-local" id="reportEnd">
                        <button class="btn btn-primary btn-sm" onclick="AdminDashboard.generateReport()">Generate</button>
                        <button class="btn btn-secondary btn-sm" onclick="AdminDashboard.exportCSV()">📥 Export CSV</button>
                    </div>
                    <div id="reportResults"></div>
                </div>
            </div>

            <!-- User List -->
            <div class="section-header">
                <h2 class="section-title">Registered Users</h2>
            </div>
            <div id="usersList">
                <div class="spinner"></div>
            </div>

            <!-- Audit Log -->
            <div class="section-header" style="margin-top: var(--space-2xl);">
                <h2 class="section-title">📜 Audit Log</h2>
                <button class="btn btn-secondary btn-sm" onclick="AdminDashboard.loadAudit()">🔄 Refresh</button>
            </div>
            <div id="auditLog">
                <div class="spinner"></div>
            </div>
        `;

        this.setRange('30d');

        await Promise.all([
            this.loadStats(),
            this.loadUsageChart(),
            this.loadActiveRes(),
            this.loadZones(),
            this.loadUsers(),
            this.loadAudit()
        ]);
    },

    // ---- Quick ranges for reports ----
    setRange(range) {
        const now = new Date();
        let start;
        switch (range) {
            case 'today':
                start = new Date(now); start.setHours(0, 0, 0, 0);
                break;
            case '7d':
                start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case 'all':
                start = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        const fmt = (d) => {
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        const s = document.getElementById('reportStart');
        const e = document.getElementById('reportEnd');
        if (s) s.value = fmt(start);
        if (e) e.value = fmt(now);
    },

    async loadStats() {
        try {
            const stats = await API.getDashboardStats();
            const grid = document.getElementById('statsGrid');
            grid.innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon blue"><img src="/images/iit-dhanbad-feature-img-01.jpg" class="inline-logo" alt="Logo" style="margin:0;"></div>
                    <div class="stat-value">${stats.totalSlots}</div>
                    <div class="stat-label">Total Slots</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">✅</div>
                    <div class="stat-value">${stats.availableSlots}</div>
                    <div class="stat-label">Available</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon red">🔴</div>
                    <div class="stat-value">${stats.occupiedSlots + stats.reservedSlots}</div>
                    <div class="stat-label">In Use</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon teal">📊</div>
                    <div class="stat-value">${stats.occupancyRate.toFixed(1)}%</div>
                    <div class="stat-label">Occupancy Rate</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon yellow">🔖</div>
                    <div class="stat-value">${stats.activeReservations}</div>
                    <div class="stat-label">Active Reservations</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">👥</div>
                    <div class="stat-value">${stats.totalUsers}</div>
                    <div class="stat-label">Total Users</div>
                </div>
            `;
        } catch (e) {
            document.getElementById('statsGrid').innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
        }
    },

    activeResData: [],

    async loadActiveRes() {
        try {
            this.activeResData = await API.getActiveReservations();
            this.renderActiveRes();
        } catch (e) {
            document.getElementById('activeResAdmin').innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
        }
    },

    renderActiveRes() {
        const container = document.getElementById('activeResAdmin');
        const reservations = this.activeResData || [];

        if (reservations.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🟢</div><p>No active reservations — all slots are free</p></div>';
            return;
        }

        const columns = [
            { label: 'User', sortKey: 'user' },
            { label: 'Vehicle Plate', sortKey: 'plate' },
            { label: 'Zone', sortKey: 'zone' },
            { label: 'Slot', sortKey: 'slot' },
            { label: 'Start', sortKey: 'start' },
            { label: 'End', sortKey: 'end' },
            { label: 'Time Left' },
            { label: 'Status' }
        ];

        const accessor = (key) => (r) => {
            switch (key) {
                case 'user': return r.user?.fullName || '';
                case 'plate': return r.user?.vehiclePlate || '';
                case 'zone': return r.slot?.zone?.name || '';
                case 'slot': return r.slot?.slotNumber || '';
                case 'start': return r.startTime || '';
                case 'end': return r.endTime || '';
                default: return '';
            }
        };

        const st = SortableTable.getState('adminActiveRes');
        let rows = reservations;
        if (st && st.col) rows = SortableTable.sort(rows, accessor(st.col), st.dir);

        container.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>${SortableTable.renderHeader('adminActiveRes', columns)}</tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => {
                            const endTime = new Date(r.endTime);
                            const now = new Date();
                            const diffMs = endTime - now;
                            const diffMin = Math.max(0, Math.floor(diffMs / 60000));
                            const h = Math.floor(diffMin / 60);
                            const m = diffMin % 60;
                            const timeLeft = diffMs <= 0 ? '<span style="color:var(--danger)">Expired</span>' : `${h}h ${m}m`;
                            return `
                                <tr>
                                    <td><strong>${r.user?.fullName || 'N/A'}</strong></td>
                                    <td>${r.user?.vehiclePlate || '-'}</td>
                                    <td>${r.slot?.zone?.name || 'N/A'}</td>
                                    <td><strong>${r.slot?.slotNumber || 'N/A'}</strong></td>
                                    <td>${new Date(r.startTime).toLocaleString()}</td>
                                    <td>${new Date(r.endTime).toLocaleString()}</td>
                                    <td>${timeLeft}</td>
                                    <td><span class="badge badge-active">ACTIVE</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        SortableTable.bind('adminActiveRes', () => this.renderActiveRes());
    },

    async loadUsageChart() {
        try {
            const usage = await API.getUsageByZone();
            const canvas = document.getElementById('usageChart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const names = usage.zoneNames || [];
            const total = usage.totalSlots || [];
            const occupied = usage.occupiedSlots || [];

            canvas.width = canvas.parentElement.clientWidth - 64;
            canvas.height = 250;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (names.length === 0) return;

            const padding = { top: 30, right: 30, bottom: 60, left: 50 };
            const chartW = canvas.width - padding.left - padding.right;
            const chartH = canvas.height - padding.top - padding.bottom;
            const maxVal = Math.max(...total, 1);
            const barGroupWidth = chartW / names.length;
            const barWidth = barGroupWidth * 0.3;
            const gap = barGroupWidth * 0.1;

            ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 5; i++) {
                const y = padding.top + (chartH / 5) * i;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(canvas.width - padding.right, y);
                ctx.stroke();

                ctx.fillStyle = '#64748b';
                ctx.font = '11px Inter, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(Math.round(maxVal - (maxVal / 5) * i), padding.left - 10, y + 4);
            }

            names.forEach((name, i) => {
                const x = padding.left + i * barGroupWidth + gap;

                const totalH = (total[i] / maxVal) * chartH;
                const totalGrad = ctx.createLinearGradient(0, padding.top + chartH - totalH, 0, padding.top + chartH);
                totalGrad.addColorStop(0, '#0ea5e9');
                totalGrad.addColorStop(1, '#0284c7');
                ctx.fillStyle = totalGrad;
                this.roundRect(ctx, x, padding.top + chartH - totalH, barWidth, totalH, 4);

                const occH = (occupied[i] / maxVal) * chartH;
                const occGrad = ctx.createLinearGradient(0, padding.top + chartH - occH, 0, padding.top + chartH);
                occGrad.addColorStop(0, '#14b8a6');
                occGrad.addColorStop(1, '#0d9488');
                ctx.fillStyle = occGrad;
                this.roundRect(ctx, x + barWidth + 4, padding.top + chartH - occH, barWidth, occH, 4);

                ctx.fillStyle = '#94a3b8';
                ctx.font = '11px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(name.length > 15 ? name.substring(0, 15) + '...' : name, x + barWidth, canvas.height - 15);
            });

            ctx.fillStyle = '#0ea5e9';
            ctx.fillRect(padding.left, 8, 12, 12);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('Total Slots', padding.left + 18, 18);

            ctx.fillStyle = '#14b8a6';
            ctx.fillRect(padding.left + 100, 8, 12, 12);
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('In Use', padding.left + 118, 18);
        } catch (e) {
            // silently fail
        }
    },

    roundRect(ctx, x, y, w, h, r) {
        if (h <= 0) return;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.fill();
    },

    zonesData: [],

    async loadZones() {
        try {
            this.zonesData = await API.getZones();
            this.renderZones();
        } catch (e) {
            document.getElementById('zonesManagement').innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
        }
    },

    renderZones() {
        const container = document.getElementById('zonesManagement');
        const zones = this.zonesData;

        if (zones.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏗️</div><p>No zones created yet</p></div>';
            return;
        }

        const columns = [
            { label: 'ID', sortKey: 'id' },
            { label: 'Name', sortKey: 'name' },
            { label: 'Code', sortKey: 'code' },
            { label: 'Location', sortKey: 'location' },
            { label: 'Total', sortKey: 'total' },
            { label: 'Available', sortKey: 'available' },
            { label: 'Status', sortKey: 'status' },
            { label: 'Actions' }
        ];

        const accessor = (key) => (z) => {
            switch (key) {
                case 'id': return z.id;
                case 'name': return z.name;
                case 'code': return z.zoneCode || '';
                case 'location': return z.location || '';
                case 'total': return z.totalSlots;
                case 'available': return z.availableSlots;
                case 'status': return z.status;
                default: return '';
            }
        };

        const st = SortableTable.getState('adminZones');
        let rows = [...zones];
        if (st && st.col) rows = SortableTable.sort(rows, accessor(st.col), st.dir);

        container.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>${SortableTable.renderHeader('adminZones', columns)}</tr>
                    </thead>
                    <tbody>
                        ${rows.map(z => `
                            <tr>
                                <td>#${z.id}</td>
                                <td><strong>${z.name}</strong></td>
                                <td><code style="background: var(--bg-primary); padding: 2px 6px; border-radius: 4px;">${z.zoneCode || '-'}</code></td>
                                <td>${z.location || '-'}</td>
                                <td>${z.totalSlots}</td>
                                <td><span class="badge badge-available">${z.availableSlots}</span></td>
                                <td><span class="badge badge-${z.status === 'ACTIVE' ? 'active' : 'cancelled'}">${z.status}</span></td>
                                <td>
                                    <div class="flex gap-1">
                                        <button class="btn btn-secondary btn-sm" onclick="AdminDashboard.editZone(${z.id})">Edit</button>
                                        <button class="btn btn-danger btn-sm" onclick="AdminDashboard.deleteZone(${z.id})">Delete</button>
                                        <button class="btn btn-success btn-sm" onclick="AdminDashboard.addSlots(${z.id})">+ Slots</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        SortableTable.bind('adminZones', () => this.renderZones());
    },

    showAddZone() {
        Modal.show('Add Parking Zone', `
            <div class="form-group">
                <label class="form-label">Zone Name</label>
                <input type="text" class="form-input" id="zoneName" placeholder="e.g. Zone D - Engineering Block">
            </div>
            <div class="form-group">
                <label class="form-label">Location</label>
                <input type="text" class="form-input" id="zoneLocation" placeholder="e.g. Near Engineering Building">
            </div>
            <div class="form-group">
                <label class="form-label">Zone Code (slot prefix)</label>
                <input type="text" class="form-input" id="zoneCode" placeholder="e.g. D or ENG" maxlength="8">
                <span style="font-size: var(--font-xs); color: var(--text-tertiary);">Leave blank to auto-derive from the name</span>
            </div>
            <div class="form-group">
                <label class="form-label">Number of Slots</label>
                <input type="number" class="form-input" id="zoneSlots" value="10" min="1" max="100">
            </div>
            <button class="btn btn-primary btn-full" onclick="AdminDashboard.createZone()">Create Zone</button>
        `);
    },

    async createZone() {
        const name = document.getElementById('zoneName').value.trim();
        const location = document.getElementById('zoneLocation').value.trim();
        const zoneCode = document.getElementById('zoneCode').value.trim();
        const totalSlots = parseInt(document.getElementById('zoneSlots').value) || 10;

        if (!name) { Toast.show('Zone name is required', 'warning'); return; }

        try {
            const zone = await API.createZone({ name, location, zoneCode, totalSlots });
            await API.createSlots(zone.id, totalSlots);
            Modal.hide();
            Toast.show('Zone created with ' + totalSlots + ' slots', 'success');
            await Promise.all([this.loadStats(), this.loadZones(), this.loadUsageChart()]);
        } catch (e) {
            Toast.show(e.message, 'error');
        }
    },

    editZone(id) {
        const z = this.zonesData.find(x => x.id === id);
        if (!z) return;
        Modal.show('Edit Zone', `
            <div class="form-group">
                <label class="form-label">Zone Name</label>
                <input type="text" class="form-input" id="editZoneName" value="${z.name || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Location</label>
                <input type="text" class="form-input" id="editZoneLocation" value="${z.location || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Zone Code</label>
                <input type="text" class="form-input" id="editZoneCode" value="${z.zoneCode || ''}" maxlength="8">
            </div>
            <div class="form-group">
                <label class="form-label">Total Slots (metadata only)</label>
                <input type="number" class="form-input" id="editZoneSlots" value="${z.totalSlots}">
            </div>
            <button class="btn btn-primary btn-full" onclick="AdminDashboard.saveZone(${id})">Save Changes</button>
        `);
    },

    async saveZone(id) {
        const name = document.getElementById('editZoneName').value.trim();
        const location = document.getElementById('editZoneLocation').value.trim();
        const zoneCode = document.getElementById('editZoneCode').value.trim();
        const totalSlots = parseInt(document.getElementById('editZoneSlots').value);

        try {
            await API.updateZone(id, { name, location, zoneCode, totalSlots });
            Modal.hide();
            Toast.show('Zone updated successfully', 'success');
            await Promise.all([this.loadStats(), this.loadZones(), this.loadUsageChart()]);
        } catch (e) {
            Toast.show(e.message, 'error');
        }
    },

    async deleteZone(id) {
        const ok = await Modal.confirm({
            title: 'Delete Zone',
            message: 'This will permanently delete the zone AND all its slots.\nReservations referencing those slots may be affected.\n\nContinue?',
            confirmText: 'Yes, Delete',
            danger: true,
            icon: '🗑️'
        });
        if (!ok) return;
        try {
            await API.deleteZone(id);
            Toast.show('Zone deleted', 'success');
            await Promise.all([this.loadStats(), this.loadZones(), this.loadUsageChart()]);
        } catch (e) {
            Toast.show(e.message, 'error');
        }
    },

    async addSlots(zoneId) {
        const count = await Modal.prompt({
            title: 'Add Slots',
            label: 'How many slots to add?',
            defaultValue: '5',
            type: 'number',
            confirmText: 'Add Slots'
        });
        if (count === null) return;
        const n = parseInt(count);
        if (!n || n <= 0) { Toast.show('Enter a valid number', 'warning'); return; }
        try {
            await API.createSlots(zoneId, n);
            Toast.show(`${n} slots added`, 'success');
            await Promise.all([this.loadStats(), this.loadZones(), this.loadUsageChart()]);
        } catch (e) {
            Toast.show(e.message, 'error');
        }
    },

    reportData: [],

    async generateReport() {
        const startDate = document.getElementById('reportStart').value;
        const endDate = document.getElementById('reportEnd').value;
        const container = document.getElementById('reportResults');
        container.innerHTML = '<div class="spinner"></div>';

        try {
            this.reportData = await API.getReports(startDate, endDate);

            if (this.reportData.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>No reservations found for this period</p></div>';
                return;
            }

            this.renderReport();
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
        }
    },

    renderReport() {
        const container = document.getElementById('reportResults');
        const columns = [
            { label: 'ID', sortKey: 'id' },
            { label: 'User', sortKey: 'user' },
            { label: 'Vehicle', sortKey: 'vehicle' },
            { label: 'Zone', sortKey: 'zone' },
            { label: 'Slot', sortKey: 'slot' },
            { label: 'Start', sortKey: 'start' },
            { label: 'End', sortKey: 'end' },
            { label: 'Status', sortKey: 'status' }
        ];

        const accessor = (key) => (r) => {
            switch (key) {
                case 'id': return r.id;
                case 'user': return r.user || '';
                case 'vehicle': return r.vehiclePlate || '';
                case 'zone': return r.zone || '';
                case 'slot': return r.slot || '';
                case 'start': return r.startTime || '';
                case 'end': return r.endTime || '';
                case 'status': return r.status || '';
                default: return '';
            }
        };

        const st = SortableTable.getState('adminReport');
        let rows = [...this.reportData];
        if (st && st.col) rows = SortableTable.sort(rows, accessor(st.col), st.dir);

        container.innerHTML = `
            <p style="font-size: var(--font-sm); color: var(--text-secondary); margin-bottom: var(--space-md);">
                Found <strong>${this.reportData.length}</strong> reservations
            </p>
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>${SortableTable.renderHeader('adminReport', columns)}</tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => `
                            <tr>
                                <td>#${r.id}</td>
                                <td>${r.user || '-'}</td>
                                <td>${r.vehiclePlate || '-'}</td>
                                <td>${r.zone || '-'}</td>
                                <td>${r.slot || '-'}</td>
                                <td>${new Date(r.startTime).toLocaleString()}</td>
                                <td>${new Date(r.endTime).toLocaleString()}</td>
                                <td><span class="badge badge-${(r.status || '').toLowerCase()}">${r.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        SortableTable.bind('adminReport', () => this.renderReport());
    },

    exportCSV() {
        if (!this.reportData || this.reportData.length === 0) {
            Toast.show('Generate a report first', 'warning');
            return;
        }

        const headers = ['ID', 'User', 'Username', 'Vehicle Plate', 'Zone', 'Slot', 'Start Time', 'End Time', 'Status'];
        const rows = this.reportData.map(r => [
            r.id, r.user, r.username, r.vehiclePlate, r.zone, r.slot, r.startTime, r.endTime, r.status
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(v => `"${(v == null ? '' : String(v)).replace(/"/g, '""')}"`).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `parking-report-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        Toast.show('Report exported as CSV', 'success');
    },

    usersData: [],

    async loadUsers() {
        try {
            this.usersData = await API.getAllUsers();
            this.renderUsers();
        } catch (e) {
            document.getElementById('usersList').innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
        }
    },

    renderUsers() {
        const container = document.getElementById('usersList');
        const users = this.usersData;

        const columns = [
            { label: 'ID', sortKey: 'id' },
            { label: 'Name', sortKey: 'name' },
            { label: 'Username', sortKey: 'username' },
            { label: 'Email', sortKey: 'email' },
            { label: 'Role', sortKey: 'role' },
            { label: 'Vehicle', sortKey: 'vehicle' },
            { label: 'Joined', sortKey: 'joined' }
        ];

        const accessor = (key) => (u) => {
            switch (key) {
                case 'id': return u.id;
                case 'name': return u.fullName || '';
                case 'username': return u.username;
                case 'email': return u.email;
                case 'role': return u.role;
                case 'vehicle': return u.vehiclePlate || '';
                case 'joined': return u.createdAt || '';
                default: return '';
            }
        };

        const st = SortableTable.getState('adminUsers');
        let rows = [...users];
        if (st && st.col) rows = SortableTable.sort(rows, accessor(st.col), st.dir);

        container.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>${SortableTable.renderHeader('adminUsers', columns)}</tr>
                    </thead>
                    <tbody>
                        ${rows.map(u => `
                            <tr>
                                <td>#${u.id}</td>
                                <td><strong>${u.fullName || '-'}</strong></td>
                                <td>${u.username}</td>
                                <td>${u.email}</td>
                                <td><span class="badge badge-${u.role === 'ROLE_ADMIN' ? 'admin' : u.role === 'ROLE_SECURITY' ? 'security' : 'user'}">${u.role.replace('ROLE_', '')}</span></td>
                                <td>${u.vehiclePlate || '-'}</td>
                                <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        SortableTable.bind('adminUsers', () => this.renderUsers());
    },

    auditData: [],

    async loadAudit() {
        try {
            const data = await API.getAuditLog(0, 100);
            this.auditData = data.content || [];
            this.renderAudit();
        } catch (e) {
            document.getElementById('auditLog').innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
        }
    },

    renderAudit() {
        const container = document.getElementById('auditLog');
        const logs = this.auditData;

        if (logs.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📜</div><p>No audit entries yet</p></div>';
            return;
        }

        const columns = [
            { label: 'When', sortKey: 'when' },
            { label: 'Actor', sortKey: 'actor' },
            { label: 'Action', sortKey: 'action' },
            { label: 'Details' }
        ];

        const accessor = (key) => (l) => {
            switch (key) {
                case 'when': return l.createdAt || '';
                case 'actor': return l.username || '';
                case 'action': return l.action || '';
                default: return '';
            }
        };

        const st = SortableTable.getState('adminAudit');
        let rows = [...logs];
        if (st && st.col) rows = SortableTable.sort(rows, accessor(st.col), st.dir);

        container.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>${SortableTable.renderHeader('adminAudit', columns)}</tr>
                    </thead>
                    <tbody>
                        ${rows.map(l => `
                            <tr>
                                <td style="font-size: var(--font-xs); white-space: nowrap;">${new Date(l.createdAt).toLocaleString()}</td>
                                <td><strong>${l.username}</strong></td>
                                <td><code style="background: var(--bg-primary); padding: 2px 8px; border-radius: 4px; font-size: var(--font-xs);">${l.action}</code></td>
                                <td style="font-size: var(--font-sm);">${l.details || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        SortableTable.bind('adminAudit', () => this.renderAudit());
    }
};
