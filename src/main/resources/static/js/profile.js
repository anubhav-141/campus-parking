/**
 * Profile Page
 * Lets any authenticated user view and edit their profile, change their
 * password, and see their recent activity at a glance.
 */
const Profile = {
    async render() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="page-header">
                <h1>👤 My Profile</h1>
                <p>View and update your account details</p>
            </div>

            <div class="zones-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));">
                <div class="card">
                    <div class="card-header">
                        <h3>Profile Details</h3>
                    </div>
                    <div class="card-body" id="profileCard">
                        <div class="spinner"></div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3>🔒 Change Password</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label class="form-label">Current Password</label>
                            <input type="password" class="form-input" id="pwdCurrent" autocomplete="current-password">
                        </div>
                        <div class="form-group">
                            <label class="form-label">New Password</label>
                            <input type="password" class="form-input" id="pwdNew" autocomplete="new-password" placeholder="Min 6 characters">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Confirm New Password</label>
                            <input type="password" class="form-input" id="pwdConfirm" autocomplete="new-password">
                        </div>
                        <button class="btn btn-primary btn-full" id="btnChangePwd" onclick="Profile.changePassword()">
                            Update Password
                        </button>
                    </div>
                </div>
            </div>
        `;

        await this.loadProfile();
    },

    async loadProfile() {
        const card = document.getElementById('profileCard');
        try {
            const me = await API.getProfile();
            this.currentProfile = me;

            card.innerHTML = `
                <div class="form-group">
                    <label class="form-label">Username</label>
                    <input type="text" class="form-input" value="${me.username || ''}" disabled style="opacity: 0.6;">
                    <span style="font-size: var(--font-xs); color: var(--text-tertiary);">Username cannot be changed</span>
                </div>
                <div class="form-group">
                    <label class="form-label">Role</label>
                    <div><span class="badge badge-${me.role === 'ROLE_ADMIN' ? 'admin' : me.role === 'ROLE_SECURITY' ? 'security' : 'user'}">${(me.role || '').replace('ROLE_', '')}</span></div>
                </div>
                <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" class="form-input" id="profFullName" value="${me.fullName || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-input" id="profEmail" value="${me.email || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Vehicle Plate</label>
                    <input type="text" class="form-input" id="profPlate" value="${me.vehiclePlate || ''}" placeholder="e.g. KA-01-AB-1234">
                </div>
                <div class="form-group">
                    <label class="form-label">Member Since</label>
                    <input type="text" class="form-input" value="${me.createdAt ? new Date(me.createdAt).toLocaleDateString() : '-'}" disabled style="opacity: 0.6;">
                </div>
                <button class="btn btn-primary btn-full" id="btnSaveProfile" onclick="Profile.saveProfile()">
                    Save Changes
                </button>
            `;
        } catch (e) {
            card.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
        }
    },

    async saveProfile() {
        const fullName = document.getElementById('profFullName').value.trim();
        const email = document.getElementById('profEmail').value.trim();
        const vehiclePlate = document.getElementById('profPlate').value.trim();

        if (!fullName) { Toast.show('Full name cannot be empty', 'warning'); return; }
        if (!email) { Toast.show('Email cannot be empty', 'warning'); return; }

        const btn = document.getElementById('btnSaveProfile');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const updated = await API.updateProfile({ fullName, email, vehiclePlate });
            // Refresh stored user so the nav bar reflects the new name
            const user = Auth.getUser() || {};
            user.fullName = updated.fullName;
            localStorage.setItem('parking_user', JSON.stringify(user));
            Toast.show('Profile updated', 'success');
            Router.updateNav(true);
        } catch (e) {
            Toast.show(e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Changes';
        }
    },

    async changePassword() {
        const current = document.getElementById('pwdCurrent').value;
        const next = document.getElementById('pwdNew').value;
        const confirmPwd = document.getElementById('pwdConfirm').value;

        if (!current || !next) { Toast.show('Please fill in all fields', 'warning'); return; }
        if (next.length < 6) { Toast.show('New password must be at least 6 characters', 'warning'); return; }
        if (next !== confirmPwd) { Toast.show('New passwords do not match', 'warning'); return; }

        const btn = document.getElementById('btnChangePwd');
        btn.disabled = true;
        btn.textContent = 'Updating...';

        try {
            await API.changePassword(current, next);
            document.getElementById('pwdCurrent').value = '';
            document.getElementById('pwdNew').value = '';
            document.getElementById('pwdConfirm').value = '';
            Toast.show('Password updated successfully', 'success');
        } catch (e) {
            Toast.show(e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Update Password';
        }
    }
};

