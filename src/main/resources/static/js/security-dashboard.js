/**
 * Security Dashboard Module
 * Monitors reservations, verifies QR permits, updates slot status, and
 * checks out reservations when vehicles leave.
 */
const SecurityDashboard = {
    allReservations: [],
    filteredReservations: [],
    allZones: [],

    async render() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="page-header">
                <h1>🛡️ Security Dashboard</h1>
                <p>Monitor parking reservations, verify permits, and manage slot access</p>
            </div>

            <!-- QR Verification Panel -->
            <div class="verify-panel">
                <h3 style="margin-bottom: var(--space-lg); font-size: var(--font-lg);">🔍 Verify Parking Permit</h3>
                <div class="verify-input-group">
                    <input type="text" class="form-input" id="qrInput" placeholder="Enter or scan QR code..." style="flex: 1;">
                    <button class="btn btn-primary" onclick="SecurityDashboard.verifyPermit()">Verify</button>
                    <button class="btn btn-secondary" onclick="SecurityDashboard.toggleCamera()" id="cameraBtn">📷 Scan</button>
                </div>
                <div id="cameraContainer" style="display: none; margin-top: var(--space-lg); text-align: center;">
                    <div style="position: relative; display: inline-block; border-radius: var(--radius-lg); overflow: hidden; border: 2px solid var(--accent-500);">
                        <video id="qrVideo" width="320" height="240" style="display: block;"></video>
                        <canvas id="qrCanvas" style="display: none;"></canvas>
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 180px; height: 180px; border: 2px dashed var(--accent-400); border-radius: var(--radius-md); pointer-events: none; opacity: 0.6;"></div>
                    </div>
                    <p style="font-size: var(--font-xs); color: var(--text-secondary); margin-top: var(--space-sm);">
                        Point camera at QR code to scan automatically
                    </p>
                </div>
                <div class="verify-result" id="verifyResult"></div>
            </div>

            <!-- Active Reservations -->
            <div class="section-header">
                <h2 class="section-title">Active Reservations</h2>
                <button class="btn btn-secondary btn-sm" onclick="SecurityDashboard.loadReservations()">🔄 Refresh</button>
            </div>

            <div class="filter-bar">
                <input type="text" class="search-input" id="resSearch" placeholder="Search by name, plate, or slot..." oninput="SecurityDashboard.filterReservations()">
            </div>

            <div id="reservationsTable">
                <div class="spinner"></div>
            </div>

            <!-- Slot Management -->
            <div class="section-header" style="margin-top: var(--space-2xl);">
                <h2 class="section-title">Slot Status Management</h2>
                <button class="btn btn-secondary btn-sm" onclick="SecurityDashboard.loadSlotManagement()">🔄 Refresh</button>
            </div>
            <p style="font-size: var(--font-sm); color: var(--text-secondary); margin-bottom: var(--space-lg);">
                Click on any slot to change its status (Available, Occupied, or Maintenance)
            </p>
            <div class="slot-legend" style="margin-bottom: var(--space-lg);">
                <div class="legend-item"><div class="legend-dot available"></div> Available</div>
                <div class="legend-item"><div class="legend-dot reserved"></div> Reserved</div>
                <div class="legend-item"><div class="legend-dot occupied"></div> Occupied</div>
                <div class="legend-item"><div class="legend-dot maintenance"></div> Maintenance</div>
            </div>
            <div id="slotManagement">
                <div class="spinner"></div>
            </div>
        `;

        setTimeout(() => {
            document.getElementById('qrInput')?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') SecurityDashboard.verifyPermit();
            });
        }, 100);

        await Promise.all([
            this.loadReservations(),
            this.loadSlotManagement()
        ]);
    },

    cameraStream: null,
    cameraActive: false,
    scanInterval: null,

    async toggleCamera() {
        if (this.cameraActive) { this.stopCamera(); return; }

        const container = document.getElementById('cameraContainer');
        const video = document.getElementById('qrVideo');
        const btn = document.getElementById('cameraBtn');

        try {
            if (typeof jsQR === 'undefined') {
                Toast.show('Loading QR scanner library...', 'info');
                await this.loadJsQR();
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: 320, height: 240 }
            });

            this.cameraStream = stream;
            this.cameraActive = true;
            video.srcObject = stream;
            video.play();

            container.style.display = 'block';
            btn.textContent = '⏹️ Stop';
            btn.className = 'btn btn-danger';

            this.scanInterval = setInterval(() => this.scanFrame(), 300);
        } catch (e) {
            Toast.show('Camera not available: ' + e.message, 'error');
        }
    },

    stopCamera() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        this.cameraActive = false;

        const container = document.getElementById('cameraContainer');
        const btn = document.getElementById('cameraBtn');
        if (container) container.style.display = 'none';
        if (btn) {
            btn.textContent = '📷 Scan';
            btn.className = 'btn btn-secondary';
        }
    },

    scanFrame() {
        if (!this.cameraActive || typeof jsQR === 'undefined') return;

        const video = document.getElementById('qrVideo');
        const canvas = document.getElementById('qrCanvas');
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });

        if (code && code.data) {
            document.getElementById('qrInput').value = code.data;
            this.stopCamera();
            Toast.show('QR code scanned! Verifying...', 'success');
            this.verifyPermit();
        }
    },

    loadJsQR() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load jsQR library'));
            document.head.appendChild(script);
        });
    },

    async verifyPermit() {
        const qrCode = document.getElementById('qrInput').value.trim();
        if (!qrCode) { Toast.show('Please enter a QR code', 'warning'); return; }

        const resultDiv = document.getElementById('verifyResult');
        resultDiv.className = 'verify-result';
        resultDiv.style.display = 'none';

        try {
            const reservation = await API.verifyQrCode(qrCode);
            const canCheckout = reservation.status === 'ACTIVE';
            resultDiv.className = 'verify-result valid';
            resultDiv.innerHTML = `
                <h4 style="color: var(--success); margin-bottom: var(--space-md);">✅ Valid Parking Permit</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-md);">
                    <div>
                        <div style="font-size: var(--font-xs); color: var(--text-tertiary); text-transform: uppercase;">Driver</div>
                        <div style="font-weight: 600;">${reservation.user?.fullName || 'N/A'}</div>
                    </div>
                    <div>
                        <div style="font-size: var(--font-xs); color: var(--text-tertiary); text-transform: uppercase;">Vehicle</div>
                        <div style="font-weight: 600;">${reservation.user?.vehiclePlate || 'N/A'}</div>
                    </div>
                    <div>
                        <div style="font-size: var(--font-xs); color: var(--text-tertiary); text-transform: uppercase;">Slot</div>
                        <div style="font-weight: 600;">${reservation.slot?.slotNumber || 'N/A'} (${reservation.slot?.zone?.name || 'N/A'})</div>
                    </div>
                    <div>
                        <div style="font-size: var(--font-xs); color: var(--text-tertiary); text-transform: uppercase;">Status</div>
                        <div><span class="badge badge-${(reservation.status || '').toLowerCase()}">${reservation.status}</span></div>
                    </div>
                    <div>
                        <div style="font-size: var(--font-xs); color: var(--text-tertiary); text-transform: uppercase;">Valid Until</div>
                        <div style="font-weight: 600;">${new Date(reservation.endTime).toLocaleString()}</div>
                    </div>
                </div>
                ${canCheckout ? `
                    <div style="display: flex; gap: var(--space-sm); justify-content: flex-end;">
                        <button class="btn btn-success btn-sm" onclick="SecurityDashboard.checkout(${reservation.id})">
                            ✅ Complete Checkout
                        </button>
                    </div>
                ` : ''}
            `;
        } catch (e) {
            resultDiv.className = 'verify-result invalid';
            resultDiv.innerHTML = `<h4 style="color: var(--danger);">❌ Invalid Permit</h4><p style="margin-top: 8px; font-size: var(--font-sm); color: var(--text-secondary);">${e.message}</p>`;
        }
    },

    async checkout(reservationId) {
        const ok = await Modal.confirm({
            title: 'Complete Checkout',
            message: 'Mark this reservation COMPLETED and free the slot?',
            confirmText: 'Checkout',
            icon: '🅿️'
        });
        if (!ok) return;

        try {
            await API.checkoutReservation(reservationId);
            Toast.show('Checkout complete. Slot is now available.', 'success');
            document.getElementById('verifyResult').innerHTML = '';
            document.getElementById('qrInput').value = '';
            await Promise.all([this.loadReservations(), this.loadSlotManagement()]);
        } catch (e) {
            Toast.show(e.message, 'error');
        }
    },

    async loadReservations() {
        try {
            this.allReservations = await API.getActiveReservations();
            this.filteredReservations = this.allReservations;
            this.renderReservationsTable();
        } catch (e) {
            document.getElementById('reservationsTable').innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
        }
    },

    filterReservations() {
        const query = document.getElementById('resSearch').value.toLowerCase();
        this.filteredReservations = this.allReservations.filter(r => {
            const name = (r.user?.fullName || '').toLowerCase();
            const plate = (r.user?.vehiclePlate || '').toLowerCase();
            const slot = (r.slot?.slotNumber || '').toLowerCase();
            const zone = (r.slot?.zone?.name || '').toLowerCase();
            return name.includes(query) || plate.includes(query) || slot.includes(query) || zone.includes(query);
        });
        this.renderReservationsTable();
    },

    renderReservationsTable() {
        const container = document.getElementById('reservationsTable');
        const reservations = this.filteredReservations || [];

        if (reservations.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><p>No active reservations</p></div>';
            return;
        }

        const columns = [
            { label: 'ID', sortKey: 'id' },
            { label: 'Driver', sortKey: 'driver' },
            { label: 'Plate', sortKey: 'plate' },
            { label: 'Zone', sortKey: 'zone' },
            { label: 'Slot', sortKey: 'slot' },
            { label: 'Start', sortKey: 'start' },
            { label: 'End', sortKey: 'end' },
            { label: 'Status' },
            { label: 'QR' },
            { label: 'Actions' }
        ];

        const accessor = (key) => (r) => {
            switch (key) {
                case 'id': return r.id;
                case 'driver': return r.user?.fullName || '';
                case 'plate': return r.user?.vehiclePlate || '';
                case 'zone': return r.slot?.zone?.name || '';
                case 'slot': return r.slot?.slotNumber || '';
                case 'start': return r.startTime || '';
                case 'end': return r.endTime || '';
                default: return '';
            }
        };

        const st = SortableTable.getState('secRes');
        let rows = reservations;
        if (st && st.col) rows = SortableTable.sort(rows, accessor(st.col), st.dir);

        container.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>${SortableTable.renderHeader('secRes', columns)}</tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => `
                            <tr>
                                <td>#${r.id}</td>
                                <td><strong>${r.user?.fullName || 'N/A'}</strong></td>
                                <td>${r.user?.vehiclePlate || '-'}</td>
                                <td>${r.slot?.zone?.name || 'N/A'}</td>
                                <td><strong>${r.slot?.slotNumber || 'N/A'}</strong></td>
                                <td>${new Date(r.startTime).toLocaleString()}</td>
                                <td>${new Date(r.endTime).toLocaleString()}</td>
                                <td><span class="badge badge-${(r.status || '').toLowerCase()}">${r.status}</span></td>
                                <td style="font-size: var(--font-xs); max-width: 100px; overflow: hidden; text-overflow: ellipsis;">${r.qrCode?.substring(0, 8) || '-'}...</td>
                                <td>
                                    <button class="btn btn-success btn-sm" onclick="SecurityDashboard.checkout(${r.id})" title="Mark completed and free the slot">✅ Checkout</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        SortableTable.bind('secRes', () => this.renderReservationsTable());
    },

    async loadSlotManagement() {
        const container = document.getElementById('slotManagement');
        try {
            // Single call fetches every zone and its slots - avoids N+1.
            const zones = await API.getZonesWithSlots();
            this.allZones = zones;

            if (zones.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏗️</div><p>No parking zones configured</p></div>';
                return;
            }

            container.innerHTML = zones.map(zone => `
                <div class="card" style="margin-bottom: var(--space-lg);">
                    <div class="card-header">
                        <h3>${zone.name}</h3>
                        <span style="font-size: var(--font-sm); color: var(--text-secondary);">
                            📍 ${zone.location || '-'} — ${zone.availableSlots}/${(zone.slots || []).length} available
                        </span>
                    </div>
                    <div class="card-body">
                        <div class="slots-grid">
                            ${(zone.slots || []).map(slot => `
                                <div class="slot-cell ${slot.status.toLowerCase()}"
                                     data-slot-id="${slot.id}"
                                     data-slot-number="${slot.slotNumber}"
                                     data-slot-status="${slot.status}"
                                     title="Slot ${slot.slotNumber} — ${slot.status} (ID: ${slot.id})"
                                     style="cursor: pointer;">
                                    <span class="slot-number">${slot.slotNumber}</span>
                                    <span class="slot-status-text">${slot.status.toLowerCase()}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `).join('');

            // Wire up clicks via data attributes (safer than inline onclick with interpolation)
            container.querySelectorAll('.slot-cell').forEach(cell => {
                cell.addEventListener('click', () => {
                    SecurityDashboard.showSlotActions(
                        Number(cell.dataset.slotId),
                        cell.dataset.slotNumber,
                        cell.dataset.slotStatus
                    );
                });
            });
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><p>Failed to load slots: ${e.message}</p></div>`;
        }
    },

    showSlotActions(slotId, slotNumber, currentStatus) {
        Modal.show(`Update Slot ${slotNumber}`, `
            <div style="margin-bottom: var(--space-lg); padding: var(--space-md); background: var(--bg-primary); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
                    <div>
                        <div style="font-size: var(--font-xs); color: var(--text-tertiary); text-transform: uppercase;">Slot</div>
                        <div style="font-weight: 600; font-size: var(--font-lg);">${slotNumber}</div>
                    </div>
                    <div>
                        <div style="font-size: var(--font-xs); color: var(--text-tertiary); text-transform: uppercase;">Current Status</div>
                        <div><span class="badge badge-${currentStatus.toLowerCase()}">${currentStatus}</span></div>
                    </div>
                </div>
            </div>

            <p style="font-size: var(--font-sm); color: var(--text-secondary); margin-bottom: var(--space-lg);">Select new status for this slot:</p>

            <div style="display: flex; flex-direction: column; gap: var(--space-sm);">
                <button class="btn btn-success btn-full" ${currentStatus === 'AVAILABLE' ? 'disabled' : ''}
                        onclick="SecurityDashboard.updateSlot(${slotId}, 'AVAILABLE')">
                    ✅ Mark as Available
                </button>
                <button class="btn btn-full" style="background: var(--danger); color: white;" ${currentStatus === 'OCCUPIED' ? 'disabled' : ''}
                        onclick="SecurityDashboard.updateSlot(${slotId}, 'OCCUPIED')">
                    🔴 Mark as Occupied
                </button>
                <button class="btn btn-warning btn-full" ${currentStatus === 'MAINTENANCE' ? 'disabled' : ''}
                        onclick="SecurityDashboard.updateSlot(${slotId}, 'MAINTENANCE')">
                    🔧 Mark as Maintenance
                </button>
            </div>

            ${currentStatus === 'RESERVED' ? `
                <div style="margin-top: var(--space-lg); padding: var(--space-md); background: rgba(59, 130, 246, 0.1); border-radius: var(--radius-md); border: 1px solid rgba(59, 130, 246, 0.2);">
                    <p style="font-size: var(--font-sm); color: var(--accent-400);">
                        ⚠️ This slot is currently reserved. Changing its status will not cancel the associated reservation.
                    </p>
                </div>
            ` : ''}
        `);
    },

    async updateSlot(slotId, newStatus) {
        try {
            await API.updateSlotStatus(slotId, newStatus);
            Modal.hide();
            Toast.show(`Slot updated to ${newStatus} successfully!`, 'success');
            await Promise.all([this.loadSlotManagement(), this.loadReservations()]);
        } catch (e) {
            Toast.show(`Failed to update slot: ${e.message}`, 'error');
        }
    }
};
