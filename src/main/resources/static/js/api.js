/**
 * API Client Wrapper
 * Handles all REST API calls with JWT token injection and error handling
 */
const API = {
    baseUrl: '/api',

    getToken() {
        return localStorage.getItem('parking_token');
    },

    async request(method, path, body = null) {
        const headers = { 'Content-Type': 'application/json' };
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = { method, headers };
        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${this.baseUrl}${path}`, options);

            if (response.status === 401 || response.status === 403) {
                Auth.logout();
                throw new Error('Session expired. Please login again.');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Network error. Please check your connection.');
            }
            throw error;
        }
    },

    get(path) { return this.request('GET', path); },
    post(path, body) { return this.request('POST', path, body); },
    put(path, body) { return this.request('PUT', path, body); },
    delete(path) { return this.request('DELETE', path); },

    // Auth & Profile
    login(username, password) {
        return this.post('/auth/login', { username, password });
    },
    register(data) {
        return this.post('/auth/register', data);
    },
    getProfile() { return this.get('/auth/me'); },
    updateProfile(data) { return this.put('/auth/me', data); },
    changePassword(currentPassword, newPassword) {
        return this.put('/auth/me/password', { currentPassword, newPassword });
    },

    // Parking
    getZones() { return this.get('/parking/zones'); },
    getZonesWithSlots() { return this.get('/parking/zones-with-slots'); },
    getSlots(zoneId) { return this.get(`/parking/zones/${zoneId}/slots`); },

    // Reservations
    createReservation(slotId, startTime, endTime) {
        return this.post('/reservations', { slotId, startTime, endTime });
    },
    getMyReservations() { return this.get('/reservations/my'); },
    cancelReservation(id) { return this.delete(`/reservations/${id}`); },
    deleteReservation(id) { return this.delete(`/reservations/${id}/delete`); },

    // Notifications
    getNotifications() { return this.get('/notifications'); },
    getUnreadCount() { return this.get('/notifications/unread-count'); },
    markNotificationRead(id) { return this.put(`/notifications/${id}/read`); },
    markAllRead() { return this.put('/notifications/read-all'); },

    // Security Staff
    getActiveReservations() { return this.get('/security/reservations/active'); },
    verifyQrCode(qrCode) { return this.get(`/security/verify/${qrCode}`); },
    checkoutReservation(id) { return this.post(`/security/reservations/${id}/checkout`); },
    updateSlotStatus(slotId, status) {
        return this.put(`/security/slots/${slotId}/status`, { status });
    },

    // Admin
    getDashboardStats() { return this.get('/admin/stats'); },
    getUsageByZone() { return this.get('/admin/usage'); },
    createZone(zone) { return this.post('/admin/zones', zone); },
    updateZone(id, zone) { return this.put(`/admin/zones/${id}`, zone); },
    deleteZone(id) { return this.delete(`/admin/zones/${id}`); },
    createSlots(zoneId, count) { return this.post(`/admin/zones/${zoneId}/slots`, { count }); },
    getReports(startDate, endDate) {
        let params = '';
        if (startDate) params += `?startDate=${startDate}`;
        if (endDate) params += `${params ? '&' : '?'}endDate=${endDate}`;
        return this.get(`/admin/reports${params}`);
    },
    getAllUsers() { return this.get('/admin/users'); },
    getAuditLog(page = 0, size = 50) {
        return this.get(`/admin/audit?page=${page}&size=${size}`);
    },
};

