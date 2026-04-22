/**
 * User Dashboard Module
 * Handles zone viewing, slot selection, reservation, and history
 */
const UserDashboard = {
    currentZone: null,

    async render() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="page-header">
                <h1><img src="/images/iit-dhanbad-feature-img-01.jpg" class="inline-logo" alt="Logo"> Parking Dashboard</h1>
                <p>Find and reserve available parking spaces on campus</p>
            </div>

            <div id="activeReservation"></div>

            <div class="section-header">
                <h2 class="section-title">Parking Zones</h2>
                <div class="slot-legend">
                    <div class="legend-item"><div class="legend-dot available"></div> Available</div>
                    <div class="legend-item"><div class="legend-dot reserved"></div> Reserved</div>
                    <div class="legend-item"><div class="legend-dot occupied"></div> Occupied</div>
                    <div class="legend-item"><div class="legend-dot maintenance"></div> Maintenance</div>
                </div>
            </div>

            <div class="zones-grid" id="zonesGrid">
                <div class="spinner"></div>
            </div>

            <div id="slotsView" style="display: none;"></div>

            <div class="section-header" style="margin-top: var(--space-2xl);">
                <h2 class="section-title">Reservation History</h2>
            </div>
            <div id="reservationHistory">
                <div class="spinner"></div>
            </div>
        `;

        await Promise.all([
            this.loadZones(),
            this.loadActiveReservation(),
            this.loadHistory()
        ]);
    },

    async loadZones() {
        try {
            const zones = await API.getZones();
            const grid = document.getElementById('zonesGrid');

            if (zones.length === 0) {
                grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏗️</div><p>No parking zones available</p></div>';
                return;
            }

            grid.innerHTML = zones.map(zone => {
                const total = zone.totalSlots || 1;
                const available = zone.availableSlots || 0;
                const occupied = zone.occupiedSlots || 0;
                const reserved = zone.reservedSlots || 0;
                const maintenance = zone.maintenanceSlots || 0;
                const pctAvailable = (available / total * 100);
                const pctOccupied = (occupied / total * 100);
                const pctReserved = (reserved / total * 100);
                const pctMaint = (maintenance / total * 100);

                let statusClass = 'available';
                let statusText = 'Available';
                if (available === 0) { statusClass = 'full'; statusText = 'Full'; }
                else if (pctAvailable < 30) { statusClass = 'limited'; statusText = 'Limited'; }

                return `
                    <div class="zone-card" onclick="UserDashboard.viewZone(${zone.id}, '${zone.name.replace(/'/g, "\\'")}')">
                        <div class="zone-card-header">
                            <div>
                                <div class="zone-name">${zone.name}</div>
                                <div class="zone-location">📍 ${zone.location}</div>
                            </div>
                            <span class="zone-status-badge ${statusClass}">${statusText}</span>
                        </div>
                        <div class="zone-stats">
                            <div class="zone-stat">
                                <div class="zone-stat-value green">${available}</div>
                                <div class="zone-stat-label">Available</div>
                            </div>
                            <div class="zone-stat">
                                <div class="zone-stat-value red">${occupied + reserved}</div>
                                <div class="zone-stat-label">In Use</div>
                            </div>
                            <div class="zone-stat">
                                <div class="zone-stat-value blue">${total}</div>
                                <div class="zone-stat-label">Total</div>
                            </div>
                        </div>
                        <div class="availability-bar">
                            <div class="availability-segment available" style="width: ${pctAvailable}%"></div>
                            <div class="availability-segment reserved" style="width: ${pctReserved}%"></div>
                            <div class="availability-segment occupied" style="width: ${pctOccupied}%"></div>
                            <div class="availability-segment maintenance" style="width: ${pctMaint}%"></div>
                        </div>
                        <div style="margin-top: var(--space-md); text-align: center;">
                            <span style="font-size: var(--font-xs); color: var(--accent-400); font-weight: 600;">
                                👆 Click to view slots & reserve
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (e) {
            document.getElementById('zonesGrid').innerHTML = `<div class="empty-state"><p>Failed to load zones: ${e.message}</p></div>`;
        }
    },

    async viewZone(zoneId, zoneName) {
        this.currentZone = { id: zoneId, name: zoneName };
        const slotsView = document.getElementById('slotsView');
        slotsView.style.display = 'block';
        slotsView.innerHTML = `
            <div class="card" style="margin-bottom: var(--space-2xl);">
                <div class="card-header">
                    <h3>${zoneName} — Select a Slot to Reserve</h3>
                    <button class="btn btn-secondary btn-sm" onclick="UserDashboard.hideSlots()">✕ Close</button>
                </div>
                <div class="card-body">
                    <p style="font-size: var(--font-sm); color: var(--text-secondary); margin-bottom: var(--space-lg);">
                        Click on any <span style="color: var(--success); font-weight: 600;">green (available)</span> slot to make a reservation
                    </p>
                    <div class="slots-grid" id="slotsGrid"><div class="spinner"></div></div>
                </div>
            </div>
        `;

        slotsView.scrollIntoView({ behavior: 'smooth' });

        try {
            const slots = await API.getSlots(zoneId);
            const grid = document.getElementById('slotsGrid');
            grid.innerHTML = slots.map(slot => `
                <div class="slot-cell ${slot.status.toLowerCase()}" 
                     onclick="${slot.status === 'AVAILABLE' ? `UserDashboard.reserveSlot(${slot.id}, '${slot.slotNumber}')` : ''}"
                     title="Slot ${slot.slotNumber} - ${slot.status}">
                    <span class="slot-number">${slot.slotNumber}</span>
                    <span class="slot-status-text">${slot.status.toLowerCase()}</span>
                </div>
            `).join('');
        } catch (e) {
            document.getElementById('slotsGrid').innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
        }
    },

    hideSlots() {
        document.getElementById('slotsView').style.display = 'none';
    },

    reserveSlot(slotId, slotNumber) {
        const now = new Date();
        const later = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const formatDT = (d) => {
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        Modal.show('Reserve Parking Slot', `
            <div style="margin-bottom: var(--space-lg); padding: var(--space-md); background: rgba(14, 165, 233, 0.1); border-radius: var(--radius-md); border: 1px solid rgba(14, 165, 233, 0.2);">
                <strong>Slot: ${slotNumber}</strong> in ${this.currentZone?.name || 'Selected Zone'}
            </div>

            <div class="form-group">
                <label class="form-label">Quick Duration</label>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    <button class="btn btn-secondary btn-sm duration-btn" onclick="UserDashboard.setDuration(30)">30 min</button>
                    <button class="btn btn-secondary btn-sm duration-btn" onclick="UserDashboard.setDuration(60)">1 hour</button>
                    <button class="btn btn-primary btn-sm duration-btn active" onclick="UserDashboard.setDuration(120)">2 hours</button>
                    <button class="btn btn-secondary btn-sm duration-btn" onclick="UserDashboard.setDuration(240)">4 hours</button>
                    <button class="btn btn-secondary btn-sm duration-btn" onclick="UserDashboard.setDuration(480)">8 hours</button>
                    <button class="btn btn-secondary btn-sm duration-btn" onclick="UserDashboard.setDuration(1440)">Full Day</button>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Start Time</label>
                <input type="datetime-local" class="form-input" id="resStartTime" value="${formatDT(now)}" onchange="UserDashboard.onStartTimeChange()">
            </div>
            <div class="form-group">
                <label class="form-label">End Time</label>
                <input type="datetime-local" class="form-input" id="resEndTime" value="${formatDT(later)}">
                <span id="durationDisplay" style="font-size: var(--font-xs); color: var(--accent-400); margin-top: 4px; display: block;">Duration: 2 hours</span>
            </div>
            <button class="btn btn-primary btn-full" id="btnConfirmRes" onclick="UserDashboard.confirmReservation(${slotId})">
                ✅ Confirm Reservation
            </button>
        `);
    },

    selectedDuration: 120, // default 2 hours in minutes

    setDuration(minutes) {
        this.selectedDuration = minutes;
        const startInput = document.getElementById('resStartTime');
        if (!startInput) return;

        const start = new Date(startInput.value);
        const end = new Date(start.getTime() + minutes * 60 * 1000);
        document.getElementById('resEndTime').value = this.formatLocalDT(end);

        // Update duration display
        this.updateDurationDisplay();

        // Update active button style
        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.className = 'btn btn-secondary btn-sm duration-btn';
        });
        event.target.className = 'btn btn-primary btn-sm duration-btn active';
    },

    onStartTimeChange() {
        if (this.selectedDuration) {
            const startInput = document.getElementById('resStartTime');
            const start = new Date(startInput.value);
            const end = new Date(start.getTime() + this.selectedDuration * 60 * 1000);
            document.getElementById('resEndTime').value = this.formatLocalDT(end);
            this.updateDurationDisplay();
        }
    },

    updateDurationDisplay() {
        const startInput = document.getElementById('resStartTime');
        const endInput = document.getElementById('resEndTime');
        const display = document.getElementById('durationDisplay');
        if (!startInput || !endInput || !display) return;

        const start = new Date(startInput.value);
        const end = new Date(endInput.value);
        const diffMs = end - start;
        if (diffMs <= 0) {
            display.textContent = 'Invalid: end time must be after start time';
            display.style.color = 'var(--danger)';
            return;
        }
        display.style.color = 'var(--accent-400)';
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 60) {
            display.textContent = `Duration: ${diffMin} minutes`;
        } else {
            const h = Math.floor(diffMin / 60);
            const m = diffMin % 60;
            display.textContent = `Duration: ${h} hour${h > 1 ? 's' : ''}${m > 0 ? ` ${m} min` : ''}`;
        }
    },

    async confirmReservation(slotId) {
        const startTime = document.getElementById('resStartTime').value;
        const endTime = document.getElementById('resEndTime').value;

        if (!startTime || !endTime) {
            Toast.show('Please select both start and end times', 'warning');
            return;
        }

        const btn = document.getElementById('btnConfirmRes');
        btn.disabled = true;
        btn.textContent = 'Reserving...';

        try {
            const reservation = await API.createReservation(slotId, startTime, endTime);
            Modal.hide();
            Toast.show('Parking slot reserved successfully! 🎉', 'success');
            
            // Refresh everything
            await Promise.all([
                this.loadZones(),
                this.loadActiveReservation(),
                this.loadHistory()
            ]);

            if (this.currentZone) {
                await this.viewZone(this.currentZone.id, this.currentZone.name);
            }
        } catch (e) {
            Toast.show(e.message, 'error');
            btn.disabled = false;
            btn.textContent = '✅ Confirm Reservation';
        }
    },

    async loadActiveReservation() {
        try {
            const reservations = await API.getMyReservations();
            const active = reservations.find(r => r.status === 'ACTIVE');
            const container = document.getElementById('activeReservation');

            if (!active) {
                container.innerHTML = '';
                return;
            }

            container.innerHTML = `
                <div class="active-reservation-card">
                    <div class="active-res-header">
                        <div class="active-res-title">
                            🟢 Active Reservation
                        </div>
                        <button class="btn btn-danger btn-sm" onclick="UserDashboard.cancelRes(${active.id})">Cancel</button>
                    </div>
                    <div class="active-res-details">
                        <div class="active-res-detail">
                            <label>Zone</label>
                            <span>${active.slot?.zone?.name || 'N/A'}</span>
                        </div>
                        <div class="active-res-detail">
                            <label>Slot</label>
                            <span>${active.slot?.slotNumber || 'N/A'}</span>
                        </div>
                        <div class="active-res-detail">
                            <label>Start</label>
                            <span>${this.formatDateTime(active.startTime)}</span>
                        </div>
                        <div class="active-res-detail">
                            <label>End</label>
                            <span>${this.formatDateTime(active.endTime)}</span>
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <p style="font-size: var(--font-sm); color: var(--text-secondary); margin-bottom: var(--space-md);">
                            Show this QR code at the parking gate
                        </p>
                        <div class="qr-container" id="qrCodeDisplay"></div>
                        <p class="qr-code-text" style="color: var(--text-tertiary); margin-top: var(--space-sm);">${active.qrCode}</p>
                    </div>
                </div>
            `;

            // Generate QR code
            setTimeout(() => {
                const qrEl = document.getElementById('qrCodeDisplay');
                if (qrEl && typeof QRCode !== 'undefined') {
                    qrEl.innerHTML = '';
                    new QRCode(qrEl, {
                        text: active.qrCode,
                        width: 180,
                        height: 180,
                        colorDark: '#0f172a',
                        colorLight: '#ffffff',
                    });
                }
            }, 100);
        } catch (e) {
            // Silently fail
        }
    },

    async cancelRes(id) {
        const ok = await Modal.confirm({
            title: 'Cancel Reservation',
            message: 'Are you sure you want to cancel this reservation?\nThe parking slot will be released.',
            confirmText: 'Yes, Cancel',
            cancelText: 'Keep Reservation',
            danger: true,
            icon: '⚠️'
        });
        if (!ok) return;
        try {
            await API.cancelReservation(id);
            Toast.show('Reservation cancelled', 'success');
            await Promise.all([
                this.loadZones(),
                this.loadActiveReservation(),
                this.loadHistory()
            ]);
        } catch (e) {
            Toast.show(e.message, 'error');
        }
    },

    async deleteRes(id) {
        const ok = await Modal.confirm({
            title: 'Delete Reservation',
            message: 'Remove this reservation from your history?',
            confirmText: 'Delete',
            danger: true,
            icon: '🗑️'
        });
        if (!ok) return;
        try {
            await API.deleteReservation(id);
            Toast.show('Reservation removed from history', 'success');
            await Promise.all([
                this.loadZones(),
                this.loadActiveReservation(),
                this.loadHistory()
            ]);
        } catch (e) {
            Toast.show(e.message, 'error');
        }
    },

    historyData: [],

    async loadHistory() {
        try {
            this.historyData = await API.getMyReservations();
            this.renderHistory();
        } catch (e) {
            document.getElementById('reservationHistory').innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
        }
    },

    renderHistory() {
        const container = document.getElementById('reservationHistory');
        const reservations = this.historyData || [];

        if (reservations.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><p>No reservation history</p></div>';
            return;
        }

        const columns = [
            { label: 'Zone', sortKey: 'zone' },
            { label: 'Slot', sortKey: 'slot' },
            { label: 'Start Time', sortKey: 'start' },
            { label: 'End Time', sortKey: 'end' },
            { label: 'Status', sortKey: 'status' },
            { label: 'QR Code' },
            { label: 'Actions' }
        ];

        const accessor = (key) => (r) => {
            switch (key) {
                case 'zone': return r.slot?.zone?.name || '';
                case 'slot': return r.slot?.slotNumber || '';
                case 'start': return r.startTime || '';
                case 'end': return r.endTime || '';
                case 'status': return r.status || '';
                default: return '';
            }
        };

        const st = SortableTable.getState('userHistory');
        let rows = reservations;
        if (st && st.col) rows = SortableTable.sort(rows, accessor(st.col), st.dir);

        container.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>${SortableTable.renderHeader('userHistory', columns)}</tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => `
                            <tr>
                                <td>${r.slot?.zone?.name || 'N/A'}</td>
                                <td><strong>${r.slot?.slotNumber || 'N/A'}</strong></td>
                                <td>${this.formatDateTime(r.startTime)}</td>
                                <td>${this.formatDateTime(r.endTime)}</td>
                                <td><span class="badge badge-${r.status.toLowerCase()}">${r.status}</span></td>
                                <td style="font-size: var(--font-xs); max-width: 120px; overflow: hidden; text-overflow: ellipsis;">${r.qrCode || '-'}</td>
                                <td>
                                    <div style="display: flex; gap: 6px;">
                                        ${r.status === 'ACTIVE'
                                            ? `<button class="btn btn-danger btn-sm" onclick="UserDashboard.cancelRes(${r.id})">Cancel</button>`
                                            : `<button class="btn btn-secondary btn-sm" onclick="UserDashboard.deleteRes(${r.id})">🗑️ Delete</button>`
                                        }
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        SortableTable.bind('userHistory', () => this.renderHistory());
    },

    formatDateTime(dt) {
        if (!dt) return 'N/A';
        const d = new Date(dt);
        return d.toLocaleString('en-IN', { 
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true 
        });
    },

    formatLocalDT(d) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
};
