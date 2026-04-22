/**
 * Auth Module
 * Handles login, register, and auth state management
 */
const Auth = {
    getUser() {
        const user = localStorage.getItem('parking_user');
        return user ? JSON.parse(user) : null;
    },

    isLoggedIn() {
        return !!localStorage.getItem('parking_token');
    },

    getRole() {
        const user = this.getUser();
        return user ? user.role : null;
    },

    login(token, username, role, fullName) {
        localStorage.setItem('parking_token', token);
        localStorage.setItem('parking_user', JSON.stringify({ username, role, fullName }));
    },

    logout() {
        localStorage.removeItem('parking_token');
        localStorage.removeItem('parking_user');
        Notifications.stop();
        window.location.hash = '#/login';
    },

    renderLoginPage() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <h1><img src="/images/iit-dhanbad-feature-img-01.jpg" class="inline-logo" alt="Logo"> CampusParking</h1>
                        <p>Sign in to manage your parking</p>
                    </div>
                    <div class="auth-tabs">
                        <button class="auth-tab active" id="tabLogin" onclick="Auth.switchTab('login')">Sign In</button>
                        <button class="auth-tab" id="tabRegister" onclick="Auth.switchTab('register')">Sign Up</button>
                    </div>

                    <div id="loginForm">
                        <div class="form-group">
                            <label class="form-label">Username</label>
                            <input type="text" class="form-input" id="loginUsername" placeholder="Enter username" autocomplete="username">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <input type="password" class="form-input" id="loginPassword" placeholder="Enter password" autocomplete="current-password">
                        </div>
                        <button class="btn btn-primary btn-full btn-lg" id="btnLogin" onclick="Auth.handleLogin()">
                            Sign In
                        </button>
                        <div style="margin-top: var(--space-lg); padding: var(--space-md); background: var(--bg-primary); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                            <p style="font-size: var(--font-xs); color: var(--text-tertiary); margin-bottom: 8px;">Demo Accounts:</p>
                            <div style="font-size: var(--font-xs); color: var(--text-secondary); display: grid; gap: 4px;">
                                <span>👤 User: <b>user1</b> / password123</span>
                                <span>🛡️ Security: <b>security1</b> / password123</span>
                                <span>⚙️ Admin: <b>admin1</b> / password123</span>
                            </div>
                        </div>
                    </div>

                    <div id="registerForm" style="display: none;">
                        <div class="form-group">
                            <label class="form-label">Full Name</label>
                            <input type="text" class="form-input" id="regFullName" placeholder="Enter your full name">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Username</label>
                            <input type="text" class="form-input" id="regUsername" placeholder="Choose a username">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-input" id="regEmail" placeholder="your@email.com">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <input type="password" class="form-input" id="regPassword" placeholder="Min 6 characters">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Vehicle Plate Number</label>
                            <input type="text" class="form-input" id="regVehicle" placeholder="e.g. KA-01-AB-1234">
                        </div>
                        <button class="btn btn-primary btn-full btn-lg" id="btnRegister" onclick="Auth.handleRegister()">
                            Create Account
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Enter key support
        setTimeout(() => {
            document.getElementById('loginPassword')?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') Auth.handleLogin();
            });
            document.getElementById('regVehicle')?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') Auth.handleRegister();
            });
        }, 100);
    },

    switchTab(tab) {
        document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
        document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
        document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
        document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
    },

    async handleLogin() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            Toast.show('Please fill in all fields', 'warning');
            return;
        }

        const btn = document.getElementById('btnLogin');
        btn.disabled = true;
        btn.textContent = 'Signing in...';

        try {
            const data = await API.login(username, password);
            this.login(data.token, data.username, data.role, data.fullName);
            Toast.show(`Welcome back, ${data.fullName}!`, 'success');

            // Route based on role
            if (data.role === 'ROLE_ADMIN') {
                window.location.hash = '#/admin';
            } else if (data.role === 'ROLE_SECURITY') {
                window.location.hash = '#/security';
            } else {
                window.location.hash = '#/dashboard';
            }
        } catch (e) {
            Toast.show(e.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Sign In';
        }
    },

    async handleRegister() {
        const fullName = document.getElementById('regFullName').value.trim();
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const vehiclePlate = document.getElementById('regVehicle').value.trim();

        if (!fullName || !username || !email || !password) {
            Toast.show('Please fill in all required fields', 'warning');
            return;
        }

        const btn = document.getElementById('btnRegister');
        btn.disabled = true;
        btn.textContent = 'Creating account...';

        try {
            const data = await API.register({ fullName, username, email, password, vehiclePlate });
            this.login(data.token, data.username, data.role, data.fullName);
            Toast.show(`Welcome, ${data.fullName}! Account created.`, 'success');
            window.location.hash = '#/dashboard';
        } catch (e) {
            Toast.show(e.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    }
};
