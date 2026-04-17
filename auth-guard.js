// ============================================================
//  NAFAKA 1 ESTATE — WATER BILLING SYSTEM
//  auth-guard.js  —  Drop this BEFORE app.js in index.html
//  <script src="auth-guard.js"></script>
//  <script src="app.js"></script>
// ============================================================

(function () {
    // ── Block access if not logged in ──
    const token = sessionStorage.getItem('nafaka_auth_token');
    if (!token) {
        window.location.replace('login.html');
    }
})();

// ── Attach Bearer token to every API request automatically ──
// Wraps the native fetch so your existing app.js needs NO changes
(function () {
    const _fetch = window.fetch;
    window.fetch = function (url, options = {}) {
        const token = sessionStorage.getItem('nafaka_auth_token');
        if (token) {
            options.headers = Object.assign({}, options.headers, {
                'Authorization': 'Bearer ' + token
            });
        }
        return _fetch(url, options).then(function (res) {
            // If server says 401 (token expired / invalid) — force logout
            if (res.status === 401) {
                sessionStorage.removeItem('nafaka_auth_token');
                sessionStorage.removeItem('nafaka_username');
                window.location.replace('login.html');
            }
            return res;
        });
    };
})();

// ── Logout ──
function logout() {
    if (confirm('Are you sure you want to log out?')) {
        sessionStorage.removeItem('nafaka_auth_token');
        sessionStorage.removeItem('nafaka_username');
        window.location.href = 'login.html';
    }
}
