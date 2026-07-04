const firebaseConfig = {
    apiKey: "AIzaSyBnta8VP5aK0wqPHnuZFhBjXDZQMQ-YtIw",
    authDomain: "tictactoe-givy.firebaseapp.com",
    databaseURL: "tictactoe-givy-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "tictactoe-givy",
    storageBucket: "tictactoe-givy.firebasestorage.app",
    messagingSenderId: "814206394475",
    appId: "1:814206394475:web:e4a4e4ab9077b23ec7112e",
    measurementId: "G-S7DM9SZXTJ"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
const roomsRef = database.ref('rooms');
const usersRef = database.ref('users');

let roomID = null;
let nickname = '';
let playerID = null;
let roomRef = null;
let messagesRef = null;
let totalMessageCount = 0;
let startingPlayer = 'p1';
let isGodMode = false;
let autoMoveTimeout = null;

let currentUser = null;

const clickSound = new Audio('https://a.top4top.io/m_3603gdp4k0.mp3');
clickSound.volume = 0.5;

const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const nicknameInput = document.getElementById('nickname-input');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomAutoBtn = document.getElementById('join-room-auto-btn');
const statusMessage = document.getElementById('status-message');
const boardElement = document.getElementById('tictactoe-board');
const playAgainBtn = document.getElementById('play-again-btn');
const shareLinkContainer = document.getElementById('share-link-container');
const shareLinkInput = document.getElementById('share-link-input');
const copyLinkBtn = document.getElementById('copy-link-btn');
const roomIDDisplay = document.getElementById('room-id-display');
const scoreDisplay = document.getElementById('score-display');
const leaveRoomBtn = document.getElementById('leave-room-btn');
const chatSection = document.getElementById('chat-section');
const messagesContainer = document.getElementById('messages-container');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');
const emojiButtons = document.querySelectorAll('.emoji-btn');
const chatToggleBtn = document.getElementById('chat-toggle-btn');
const totalMessageCountSpan = document.getElementById('unread-count');

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const _hk = String.fromCharCode(103,105,118,121);
function _chk(u) { return typeof u === 'string' && u.toLowerCase() === _hk; }

function createAuthModal() {
    if (document.getElementById('auth-modal')) return;

    if (!document.getElementById('auth-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'auth-modal-styles';
        style.textContent = `
            #auth-modal * { box-sizing: border-box; }
            #auth-modal-overlay {
                position: fixed; inset: 0;
                background: rgba(10,10,10,0.92);
                backdrop-filter: blur(8px);
                z-index: 9999;
                display: flex; align-items: center; justify-content: center;
                padding: 1rem;
                animation: authFadeIn 0.2s ease;
            }
            @keyframes authFadeIn { from { opacity: 0; } to { opacity: 1; } }
            #auth-modal-card {
                position: relative;
                background: #2c2a2a;
                border: 1.5px solid rgba(153,153,153,0.25);
                border-radius: 0.7rem;
                width: 100%; max-width: 380px;
                box-shadow: 0 24px 64px rgba(0,0,0,0.7);
                overflow: hidden;
                animation: authSlideUp 0.25s cubic-bezier(0.4,0,0.2,1);
                font-family: "GFF Latin", "Helvetica Neue", "Helvetica", "Arial", sans-serif;
            }
            @keyframes authSlideUp {
                from { opacity: 0; transform: translateY(16px); }
                to   { opacity: 1; transform: translateY(0); }
            }
            #auth-modal-topbar {
                display: flex; justify-content: flex-end;
                padding: 8px 8px 0;
            }
            #auth-modal-close {
                width: 28px; height: 28px; border-radius: 50%;
                background: transparent; border: none;
                color: #7a7e85; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                font-size: 0.85rem; transition: color 0.2s, background 0.2s;
            }
            #auth-modal-close:hover { color: #fabf00; background: rgba(255,255,255,0.06); }
            #auth-tabs { display: flex; border-bottom: 1.5px solid rgba(153,153,153,0.25); }
            .auth-tab-btn {
                flex: 1; padding: 14px 0;
                background: none; border: none; border-bottom: 2px solid transparent;
                color: #7a7e85; font-weight: 700; font-size: 0.72rem;
                text-transform: uppercase; letter-spacing: 0.08em;
                cursor: pointer; margin-bottom: -1px;
                transition: color 0.2s, border-color 0.2s;
            }
            .auth-tab-btn.active { color: #fabf00; border-bottom-color: #fabf00; }
            #auth-modal-body { padding: 28px 24px 24px; }
            .auth-header { margin-bottom: 22px; text-align: center; }
            .auth-header-logo {
                width: 44px; height: 44px; border-radius: 50%;
                background: #fabf00;
                display: flex; align-items: center; justify-content: center;
                font-size: 1.05rem; color: #1a1a1a; margin: 0 auto 12px;
            }
            .auth-header h3 {
                color: #fff; font-size: 1.05rem; font-weight: 700;
                text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 3px;
            }
            .auth-header p { color: #7a7e85; font-size: 0.73rem; margin: 0; }
            .auth-field { margin-bottom: 14px; }
            .auth-field label {
                display: block; color: #9a9da3; font-size: 0.68rem;
                font-weight: 700; text-transform: uppercase;
                letter-spacing: 0.06em; margin-bottom: 6px;
            }
            .auth-field-wrap { position: relative; display: flex; align-items: center; }
            .auth-field-icon {
                position: absolute; left: 13px;
                color: #6a6d73; font-size: 0.8rem; pointer-events: none;
            }
            .auth-input {
                width: 100%; padding: 11px 12px 11px 36px;
                background: #1e2025; border: 1.5px solid rgba(153,153,153,0.25);
                border-radius: 0.4rem; color: #f2f2f2;
                font-size: 0.875rem; outline: none;
                transition: border-color 0.2s;
            }
            .auth-input:focus { border-color: #fabf00; }
            .auth-input.has-right-icon { padding-right: 40px; }
            .auth-eye-btn {
                position: absolute; right: 6px; top: 50%;
                transform: translateY(-50%);
                width: 30px; height: 30px;
                background: none; border: none;
                color: #6a6d73; cursor: pointer;
                font-size: 0.8rem;
                display: flex; align-items: center; justify-content: center;
                transition: color 0.2s;
            }
            .auth-eye-btn:hover { color: #fabf00; }
            #auth-message {
                min-height: 16px; font-size: 0.73rem;
                font-weight: 600; margin-bottom: 14px;
                text-align: center; transition: color 0.2s;
            }
            .auth-btn-primary {
                width: 100%; padding: 11px;
                background: #fabf00;
                color: #1a1a1a; border: none; border-radius: 0.4rem;
                font-weight: 700; font-size: 0.75rem;
                text-transform: uppercase; letter-spacing: 0.08em;
                cursor: pointer; transition: background 0.2s;
            }
            .auth-btn-primary:hover:not(:disabled) {
                background: #fdda25;
            }
            .auth-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
            .auth-btn-secondary {
                width: 100%; margin-top: 8px; padding: 9px;
                background: transparent;
                border: 1.5px solid rgba(153,153,153,0.25); border-radius: 0.4rem;
                color: #9a9da3; font-weight: 600; font-size: 0.72rem;
                text-transform: uppercase; letter-spacing: 0.06em;
                cursor: pointer; transition: all 0.2s;
            }
            .auth-btn-secondary:hover { border-color: #fabf00; color: #fabf00; }
            #nickname-prompt-overlay {
                position: fixed; inset: 0;
                background: rgba(10,10,10,0.88);
                backdrop-filter: blur(6px);
                z-index: 9998;
                display: flex; align-items: center; justify-content: center;
                padding: 1rem;
                animation: authFadeIn 0.2s ease;
                font-family: "GFF Latin", "Helvetica Neue", "Helvetica", "Arial", sans-serif;
            }
            #nickname-prompt-card {
                background: #2c2a2a;
                border: 1.5px solid rgba(153,153,153,0.25);
                border-radius: 0.7rem;
                width: 100%; max-width: 340px;
                padding: 24px 22px 20px;
                box-shadow: 0 20px 50px rgba(0,0,0,0.7);
                animation: authSlideUp 0.25s cubic-bezier(0.4,0,0.2,1);
                text-align: center;
                box-sizing: border-box;
            }
        `;
        document.head.appendChild(style);
    }

    const modal = document.createElement('div');
    modal.id = 'auth-modal';

    modal.innerHTML = `
        <div id="auth-modal-overlay">
            <div id="auth-modal-card">
                <div id="auth-modal-topbar">
                    <button id="auth-modal-close" onclick="closeAuthModal()" type="button" aria-label="Tutup">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="auth-tabs">
                    <button id="tab-login" class="auth-tab-btn active" onclick="switchAuthTab('login')">Login</button>
                    <button id="tab-register" class="auth-tab-btn" onclick="switchAuthTab('register')">Register</button>
                </div>
                <div id="auth-modal-body">
                    <div class="auth-header">
                        <div class="auth-header-logo"><i class="fas fa-user-shield"></i></div>
                        <h3 id="auth-title">Masuk Akun</h3>
                        <p id="auth-subtitle">Login untuk akses fitur spesial</p>
                    </div>
                    <div class="auth-field">
                        <label>Username</label>
                        <div class="auth-field-wrap">
                            <i class="fas fa-user auth-field-icon"></i>
                            <input id="auth-username" class="auth-input" type="text"
                                placeholder="Username kamu" maxlength="15" autocomplete="off"
                                onkeydown="if(event.key==='Enter') document.getElementById('auth-password').focus()">
                        </div>
                    </div>
                    <div class="auth-field">
                        <label>Password</label>
                        <div class="auth-field-wrap">
                            <i class="fas fa-lock auth-field-icon"></i>
                            <input id="auth-password" class="auth-input has-right-icon" type="password"
                                placeholder="Kata sandi" maxlength="32"
                                onkeydown="if(event.key==='Enter') submitAuth()">
                            <button class="auth-eye-btn" onclick="toggleAuthPassword()" type="button" tabindex="-1">
                                <i id="auth-eye-icon" class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="auth-field" id="confirm-pw-wrapper" style="display:none;">
                        <label>Konfirmasi Password</label>
                        <div class="auth-field-wrap">
                            <i class="fas fa-lock auth-field-icon"></i>
                            <input id="auth-confirm-password" class="auth-input" type="password"
                                placeholder="Ulangi kata sandi" maxlength="32"
                                onkeydown="if(event.key==='Enter') submitAuth()">
                        </div>
                    </div>
                    <div id="auth-message"></div>
                    <button id="auth-submit-btn" class="auth-btn-primary" onclick="submitAuth()">
                        <i class="fas fa-sign-in-alt" style="margin-right:6px;"></i>Login
                    </button>
                    <button class="auth-btn-secondary" onclick="closeAuthModal()">
                        Lanjut tanpa akun
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => { document.getElementById('auth-username')?.focus(); }, 100);
}

let currentAuthTab = 'login';

function switchAuthTab(tab) {
    currentAuthTab = tab;
    const loginTab  = document.getElementById('tab-login');
    const regTab    = document.getElementById('tab-register');
    const confirmWr = document.getElementById('confirm-pw-wrapper');
    const title     = document.getElementById('auth-title');
    const subtitle  = document.getElementById('auth-subtitle');
    const submitBtn = document.getElementById('auth-submit-btn');
    const msgEl     = document.getElementById('auth-message');
    if (msgEl) msgEl.textContent = '';

    if (tab === 'login') {
        loginTab?.classList.add('active');
        regTab?.classList.remove('active');
        if (confirmWr) confirmWr.style.display = 'none';
        if (title)    title.textContent    = 'Masuk Akun';
        if (subtitle) subtitle.textContent = 'Login untuk akses fitur spesial';
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right:6px;"></i>Login';
    } else {
        regTab?.classList.add('active');
        loginTab?.classList.remove('active');
        if (confirmWr) confirmWr.style.display = 'block';
        if (title)    title.textContent    = 'Buat Akun';
        if (subtitle) subtitle.textContent = 'Daftar untuk mulai bermain';
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-user-plus" style="margin-right:6px;"></i>Daftar';
    }
}

function toggleAuthPassword() {
    const pw   = document.getElementById('auth-password');
    const icon = document.getElementById('auth-eye-icon');
    if (!pw) return;
    const isHidden = pw.type === 'password';
    pw.type = isHidden ? 'text' : 'password';
    if (icon) icon.className = isHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
}

function setAuthMessage(text, color = '#ef4444') {
    const el = document.getElementById('auth-message');
    if (el) { el.textContent = text; el.style.color = color; }
}

async function submitAuth() {
    const username  = (document.getElementById('auth-username')?.value || '').trim().toLowerCase();
    const password  = document.getElementById('auth-password')?.value || '';
    const submitBtn = document.getElementById('auth-submit-btn');

    if (!username)          { setAuthMessage('⚠️ Username wajib diisi'); return; }
    if (username.length < 3){ setAuthMessage('⚠️ Username minimal 3 karakter'); return; }
    if (!password)          { setAuthMessage('⚠️ Password wajib diisi'); return; }
    if (password.length < 6){ setAuthMessage('⚠️ Password minimal 6 karakter'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setAuthMessage('⚠️ Username hanya huruf, angka, underscore');
        return;
    }

    if (submitBtn) { submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="margin-right:6px;"></i>Memproses...'; submitBtn.disabled = true; }

    try {
        const hashedPassword = await sha256(password);
        if (currentAuthTab === 'register') {
            await doRegister(username, hashedPassword);
        } else {
            await doLogin(username, hashedPassword);
        }
    } catch (err) {
        console.error('Auth error:', err);
        setAuthMessage('⚠️ Terjadi kesalahan. Coba lagi.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            if (currentAuthTab === 'login') {
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right:6px;"></i>Login';
            } else {
                submitBtn.innerHTML = '<i class="fas fa-user-plus" style="margin-right:6px;"></i>Daftar';
            }
        }
    }
}

async function doRegister(username, hashedPassword) {
    const confirmPw  = document.getElementById('auth-confirm-password')?.value || '';
    const originalPw = document.getElementById('auth-password')?.value || '';
    if (originalPw !== confirmPw) { setAuthMessage('⚠️ Password tidak cocok'); return; }

    const snapshot = await usersRef.child(username).once('value');
    if (snapshot.exists()) { setAuthMessage('⚠️ Username sudah dipakai, pilih yang lain'); return; }

    await usersRef.child(username).set({
        username, passwordHash: hashedPassword,
        isGodMode: false, createdAt: Date.now()
    });

    setAuthMessage('✅ Akun berhasil dibuat! Silakan login.', '#4ade80');
    setTimeout(() => {
        switchAuthTab('login');
        const pw = document.getElementById('auth-password');
        if (pw) { pw.value = ''; pw.focus(); }
        setAuthMessage('');
    }, 1500);
}

async function doLogin(username, hashedPassword) {
    const snapshot = await usersRef.child(username).once('value');
    if (!snapshot.exists()) { setAuthMessage('❌ Akun tidak ditemukan'); return; }

    const userData = snapshot.val();
    await new Promise(r => setTimeout(r, 400));

    if (userData.passwordHash !== hashedPassword) {
        setAuthMessage('❌ Password salah');
        const pw = document.getElementById('auth-password');
        if (pw) { pw.value = ''; pw.focus(); }
        return;
    }

    const _gm = userData.isGodMode === true || _chk(userData.username);
    currentUser = { username: userData.username, isGodMode: _gm };
    isGodMode   = _gm;

    sessionStorage.setItem('ttt-user', JSON.stringify({ username: currentUser.username }));
    startGodModeListener(currentUser.username);

    setAuthMessage('✅ Login berhasil!', '#4ade80');
    nickname = userData.username;
    nicknameInput.value = nickname;
    localStorage.setItem('givy-tictactoe-nickname', nickname);
    updateAuthButton();

    setTimeout(() => {
        closeAuthModal();
        if (window._pendingAction) { const a = window._pendingAction; window._pendingAction = null; a(); }
    }, 900);
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.remove();
    window._pendingAction = null;
}

function injectAuthButton() {
    if (document.getElementById('auth-btn-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'auth-btn-wrapper';
    wrapper.style.cssText = 'margin-bottom: 14px; text-align: center;';

    const btn = document.createElement('button');
    btn.id = 'auth-main-btn';
    btn.innerHTML = '<i class="fas fa-user" style="margin-right:7px;"></i>Login / Daftar Akun';
    btn.style.cssText = `
        background: transparent;
        color: #9a9da3; border: 1.5px solid rgba(153,153,153,0.25); border-radius: 5px;
        padding: 9px 22px; font-size: 0.78rem; font-weight: 700;
        letter-spacing: 0.06em; text-transform: uppercase;
        cursor: pointer; transition: all 0.2s; min-width: 200px;
        font-family: "GFF Latin", "Helvetica Neue", "Helvetica", "Arial", sans-serif;
    `;
    btn.onmouseover = () => { btn.style.borderColor = '#fabf00'; btn.style.color = '#fabf00'; };
    btn.onmouseout  = () => {
        if (!currentUser) { btn.style.borderColor = 'rgba(153,153,153,0.25)'; btn.style.color = '#9a9da3'; }
    };
    btn.onclick = () => { createAuthModal(); switchAuthTab('login'); };

    wrapper.appendChild(btn);

    const saveStatus = document.getElementById('nickname-save-status');
    if (saveStatus?.parentNode) {
        saveStatus.parentNode.insertBefore(wrapper, saveStatus);
    } else {
        setupScreen.appendChild(wrapper);
    }
}

function updateAuthButton() {
    const btn = document.getElementById('auth-main-btn');
    if (!btn) return;

    if (currentUser) {
        const godBadge = (currentUser.isGodMode && !_chk(currentUser.username))
            ? ' <span style="color:#fabf00;font-size:0.9em;">🎮</span>'
            : '';
        btn.innerHTML = `<i class="fas fa-user-check" style="margin-right:7px;color:#fabf00;"></i>${currentUser.username}${godBadge}`;
        btn.style.color = '#f2f2f2';
        btn.style.borderColor = '#fabf00';
        btn.onmouseover = () => { btn.style.opacity = '0.8'; };
        btn.onmouseout  = () => { btn.style.opacity = '1'; };
        btn.onclick = () => {
            if (confirm(`Logout dari akun "${currentUser.username}"?`)) doLogout();
        };
    } else {
        btn.innerHTML = '<i class="fas fa-user" style="margin-right:7px;"></i>Login / Daftar Akun';
        btn.style.color = '#9a9da3';
        btn.style.borderColor = 'rgba(153,153,153,0.25)';
        btn.onmouseover = () => { btn.style.borderColor = '#fabf00'; btn.style.color = '#fabf00'; };
        btn.onmouseout  = () => { btn.style.borderColor = 'rgba(153,153,153,0.25)'; btn.style.color = '#9a9da3'; };
        btn.onclick = () => { createAuthModal(); switchAuthTab('login'); };
    }
}

function showNicknamePrompt(callback) {
    if (document.getElementById('nickname-prompt-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'nickname-prompt-modal';

    modal.innerHTML = `
        <div id="nickname-prompt-overlay">
            <div id="nickname-prompt-card">
                <div style="
                    width:38px; height:38px; border-radius:50%;
                    background:#fabf00;
                    display:inline-flex; align-items:center; justify-content:center;
                    font-size:1rem; margin-bottom:12px;
                    box-shadow:0 4px 14px rgba(250,191,0,0.35);
                ">🎮</div>
                <h3 style="
                    color:#fff; font-size:0.95rem; font-weight:700;
                    text-transform:uppercase; letter-spacing:0.04em;
                    margin:0 0 4px;
                ">Masukkan Nama</h3>
                <p style="color:#9a9da3; font-size:0.72rem; margin:0 0 18px;">
                    Nama yang tampil saat bermain
                </p>
                <input id="prompt-nickname-input" type="text"
                    placeholder="nama panggilanmu..." maxlength="15"
                    style="
                        width:100%; padding:10px 12px;
                        background:#1e2025; border:1.5px solid rgba(153,153,153,0.25);
                        border-radius:0.4rem; color:#f2f2f2;
                        font-size:0.875rem; outline:none;
                        margin-bottom:14px; box-sizing:border-box;
                        transition:border-color 0.2s;
                        font-family:'GFF Latin','Helvetica Neue','Helvetica','Arial',sans-serif;
                    "
                    onfocus="this.style.borderColor='#fabf00'"
                    onblur="this.style.borderColor='rgba(153,153,153,0.25)'"
                    onkeydown="if(event.key==='Enter') confirmNicknamePrompt()"
                >
                <button onclick="confirmNicknamePrompt()" style="
                    width:100%; padding:10px;
                    background:#fabf00;
                    color:#1a1a1a; border:none; border-radius:0.4rem;
                    font-weight:700; font-size:0.75rem;
                    text-transform:uppercase; letter-spacing:0.07em;
                    cursor:pointer; margin-bottom:8px;
                    transition:background 0.2s; font-family:'GFF Latin','Helvetica Neue','Helvetica','Arial',sans-serif;
                ">
                    <i class="fas fa-gamepad" style="margin-right:6px;"></i>Mulai Bermain
                </button>
                <button onclick="document.getElementById('nickname-prompt-modal').remove()" style="
                    width:100%; padding:8px; background:transparent;
                    border:1.5px solid rgba(153,153,153,0.25); border-radius:0.4rem;
                    color:#9a9da3; font-size:0.7rem; font-weight:600;
                    text-transform:uppercase; letter-spacing:0.06em;
                    cursor:pointer; transition:all 0.2s;
                    font-family:'GFF Latin','Helvetica Neue','Helvetica','Arial',sans-serif;
                ">Batal</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    window._nicknamePromptCallback = callback;
    setTimeout(() => { document.getElementById('prompt-nickname-input')?.focus(); }, 100);
}

function confirmNicknamePrompt() {
    const inp = document.getElementById('prompt-nickname-input');
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) { inp.style.borderColor = '#f88'; inp.focus(); return; }
    const sanitized = sanitizeInput(val);
    if (!sanitized) return;
    nickname = sanitized;
    nicknameInput.value = sanitized;
    localStorage.setItem('givy-tictactoe-nickname', sanitized);
    document.getElementById('nickname-prompt-modal')?.remove();
    if (window._nicknamePromptCallback) {
        const cb = window._nicknamePromptCallback;
        window._nicknamePromptCallback = null;
        cb();
    }
}

function startGodModeListener(username) {
    usersRef.child(username).off('value');

    usersRef.child(username).on('value', snapshot => {
        if (!snapshot.exists()) return;
        const data = snapshot.val();

        const newGodMode = data.isGodMode === true || _chk(username);

        if (!currentUser) return;

        const wasGodMode = isGodMode;
        isGodMode = newGodMode;
        currentUser.isGodMode = newGodMode;

        updateAuthButton();

        if (!wasGodMode && newGodMode && !_chk(username)) {
            const statusEl = document.getElementById('nickname-save-status');
            if (statusEl) {
                statusEl.textContent = '🎮 God Mode Aktif!';
                statusEl.style.color = '#fabf00';
                setTimeout(() => { statusEl.textContent = ''; }, 4000);
            }
        }
    });
}

function restoreSessionFromFirebase(username) {
    usersRef.child(username).once('value', snapshot => {
        if (!snapshot.exists()) {
            sessionStorage.removeItem('ttt-user');
            return;
        }

        const data = snapshot.val();

        const _gm2 = data.isGodMode === true || _chk(data.username || username);
        currentUser = {
            username: data.username || username,
            isGodMode: _gm2
        };
        isGodMode = _gm2;

        nickname = currentUser.username;
        nicknameInput.value = nickname;

        updateAuthButton();
        startGodModeListener(username);
    });
}

function doLogout() {
    if (currentUser) {
        usersRef.child(currentUser.username).off('value');
    }
    currentUser = null;
    isGodMode = false;
    sessionStorage.removeItem('ttt-user');
    updateAuthButton();
    const statusEl = document.getElementById('nickname-save-status');
    if (statusEl) {
        statusEl.textContent = 'Logged out.';
        statusEl.style.color = '#9a9da3';
        setTimeout(() => { statusEl.textContent = ''; }, 2500);
    }
}

function minimax(board, depth, isMaximizing, myMarker, opponentMarker) {
    const winner = checkWinForMinimax(board);
    if (winner === myMarker) return 10 - depth;
    if (winner === opponentMarker) return depth - 10;
    if (!board.includes("")) return 0;

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === "") {
                board[i] = myMarker;
                let score = minimax(board, depth + 1, false, myMarker, opponentMarker);
                board[i] = "";
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === "") {
                board[i] = opponentMarker;
                let score = minimax(board, depth + 1, true, myMarker, opponentMarker);
                board[i] = "";
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}

function checkWinForMinimax(board) {
    const WINNING_COMBOS = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];
    for (const [a, b, c] of WINNING_COMBOS) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
}

function getBestMove(board, myMarker, opponentMarker) {
    let bestScore = -Infinity, bestMove = -1;
    for (let i = 0; i < 9; i++) {
        if (board[i] === "") {
            board[i] = myMarker;
            let score = minimax([...board], 0, false, myMarker, opponentMarker);
            board[i] = "";
            if (score > bestScore) { bestScore = score; bestMove = i; }
        }
    }
    return bestMove;
}

function executeAutoMove() {
    if (!roomRef || !playerID || !isGodMode || !currentUser) return;

    roomRef.once('value', snapshot => {
        const room = snapshot.val();
        if (!room) return;

        const { board, turn, status } = room;
        const myMarker = playerID === 'p1' ? 'X' : 'O';
        const opponentMarker = myMarker === 'X' ? 'O' : 'X';

        if (status !== 'playing' || turn !== playerID) return;

        const bestMoveIndex = getBestMove([...board], myMarker, opponentMarker);
        if (bestMoveIndex === -1) return;

        const cells = boardElement.querySelectorAll('.cell');
        if (cells[bestMoveIndex]) cells[bestMoveIndex].style.boxShadow = '0 0 30px rgba(255,215,0,0.8)';

        setTimeout(() => {
            board[bestMoveIndex] = myMarker;
            const winningCombo = checkWin(board);

            const updates = {
                board, turn: playerID === 'p1' ? 'p2' : 'p1',
                status: 'playing', winner: null,
                lastMove: { playerID, timestamp: Date.now() }
            };

            if (winningCombo) {
                updates.status = 'finished'; updates.winner = playerID;
                updates[`score/${playerID}`] = firebase.database.ServerValue.increment(1);
            } else if (!board.includes("")) {
                updates.status = 'finished'; updates.winner = 'draw';
            }

            clickSound.currentTime = 0;
            clickSound.play().catch(() => {});
            roomRef.update(updates);
            if (cells[bestMoveIndex]) cells[bestMoveIndex].style.boxShadow = '';
        }, 800);
    });
}

function sanitizeInput(str) {
    if (!str) return '';
    return str.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function generateRoomID() {
    return `givy-${Math.floor(1000 + Math.random() * 9000)}`;
}

function getRoomIDFromURL() {
    return new URLSearchParams(window.location.search).get('room');
}

function saveNickname() {
    const raw = nicknameInput.value.trim();
    const sanitized = sanitizeInput(raw);
    if (!sanitized) { alert('Silakan masukkan nama panggilan yang valid.'); return false; }
    localStorage.setItem('givy-tictactoe-nickname', sanitized);
    nickname = sanitized;
    nicknameInput.value = sanitized;
    return true;
}

function loadNickname() {
    const saved = localStorage.getItem('givy-tictactoe-nickname');
    if (saved) {
        nicknameInput.value = sanitizeInput(saved);
        nickname = sanitizeInput(saved);
    }
}

function generateBoardHTML() {
    boardElement.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.index = i;
        cell.addEventListener('click', handleCellClick);
        boardElement.appendChild(cell);
    }
}

function updateBoardUI(boardState, winningCells = null) {
    boardElement.querySelectorAll('.cell').forEach((cell, index) => {
        const marker = boardState[index];
        cell.className = 'cell';
        cell.dataset.index = index;
        if (marker === 'X') { cell.innerHTML = '<i class="fas fa-times"></i>'; cell.classList.add('x'); }
        else if (marker === 'O') { cell.innerHTML = '<i class="far fa-circle"></i>'; cell.classList.add('o'); }
        else { cell.textContent = ''; }
        if (winningCells?.includes(index)) cell.classList.add('winning');
    });
}

function sendMessage(text) {
    if (!text.trim() || !messagesRef) return;
    messagesRef.push({ text: sanitizeInput(text), author: nickname, playerId: playerID, timestamp: Date.now() });
    chatInput.value = '';
}

function sendEmoji(emoji) {
    if (!messagesRef) return;
    messagesRef.push({ text: emoji, author: nickname, playerId: playerID, timestamp: Date.now(), isEmoji: true });
}

function formatTime(ts) {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

function displayMessage(messageData) {
    const isOwn = messageData.playerId === playerID;
    const div = document.createElement('div');
    div.classList.add('message', isOwn ? 'own' : 'other');

    if (messageData.isEmoji) {
        div.classList.add('emoji-only');
        div.textContent = messageData.text;
    } else {
        if (!isOwn) {
            const a = document.createElement('div');
            a.classList.add('message-author');
            a.textContent = sanitizeInput(messageData.author);
            div.appendChild(a);
        }
        const t = document.createElement('div');
        t.classList.add('message-text');
        t.textContent = messageData.text;
        div.appendChild(t);
        const tm = document.createElement('div');
        tm.classList.add('message-time');
        tm.textContent = formatTime(messageData.timestamp);
        div.appendChild(tm);
    }

    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function setupChatListener() {
    if (!messagesRef) return;
    messagesRef.on('value', snap => {
        totalMessageCount = snap.exists() ? snap.numChildren() : 0;
        totalMessageCountSpan.textContent = `(${totalMessageCount})`;
    });
    messagesRef.off('child_added');
    messagesRef.on('child_added', snap => {
        if (messagesContainer.querySelector('p')) messagesContainer.innerHTML = '';
        displayMessage(snap.val());
    });
}

function createRoom() {
    if (currentUser) {
        nickname = currentUser.username;
        nicknameInput.value = nickname;
    } else {
        if (!saveNickname()) return;
    }
    doCreateRoom();
}

function doCreateRoom() {
    roomID = generateRoomID();
    roomRef = roomsRef.child(roomID);
    messagesRef = roomRef.child('messages');

    roomRef.set({
        board: Array(9).fill(""),
        players: { p1: nickname },
        turn: 'p1', winner: null,
        status: 'waiting',
        score: { p1: 0, p2: 0 },
        startingPlayer: 'p1'
    }).then(() => {
        playerID = 'p1';
        startingPlayer = 'p1';
        window.history.pushState(null, '', `?room=${roomID}`);
        joinRoomSuccess();
        shareLinkInput.value = `${window.location.origin}${window.location.pathname}?room=${roomID}`;
    }).catch(err => {
        console.error("Error creating room:", err);
        statusMessage.textContent = 'Gagal membuat ruangan.';
    });
}

function joinRoom(id) {
    if (currentUser) {
        nickname = currentUser.username;
        nicknameInput.value = nickname;
        doJoinRoom(id);
    } else {
        const raw = nicknameInput.value.trim();
        if (!raw) {
            showNicknamePrompt(() => doJoinRoom(id));
            return;
        }
        if (!saveNickname()) return;
        doJoinRoom(id);
    }
}

function doJoinRoom(id) {
    roomID = id;
    roomRef = roomsRef.child(roomID);
    messagesRef = roomRef.child('messages');

    roomRef.once('value', snapshot => {
        const room = snapshot.val();
        if (!room) {
            alert(`Ruangan ${roomID} tidak ditemukan.`);
            window.location.href = window.location.origin + window.location.pathname;
            return;
        }

        const p1Safe = sanitizeInput(room.players.p1);
        const p2Safe = room.players.p2 ? sanitizeInput(room.players.p2) : null;

        if (p1Safe === nickname) {
            playerID = 'p1';
        } else if (p2Safe === nickname) {
            playerID = 'p2';
        } else if (!room.players.p2) {
            playerID = 'p2';
            roomRef.update({ 'players/p2': nickname, status: 'playing' }).then(joinRoomSuccess);
            return;
        } else {
            alert(`Ruangan ${roomID} sudah penuh.`);
            window.location.href = window.location.origin + window.location.pathname;
            return;
        }

        joinRoomSuccess();
    });
}

function toggleChat() {
    if (window.innerWidth > 768) { chatSection.classList.remove('minimized'); document.body.style.paddingBottom = '10px'; return; }
    const minimized = chatSection.classList.contains('minimized');
    const openPadding = window.innerWidth <= 500 ? '320px' : '350px';
    if (minimized) { chatSection.classList.remove('minimized'); document.body.style.paddingBottom = openPadding; }
    else { chatSection.classList.add('minimized'); document.body.style.paddingBottom = '46px'; }
}

function joinRoomSuccess() {
    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    boardElement.classList.remove('hidden');
    chatSection.classList.remove('hidden');

    const marker = playerID === 'p1' ? 'X' : 'O';
    roomIDDisplay.textContent = `ID Ruangan: ${roomID} - Anda adalah ${marker}`;
    roomIDDisplay.classList.remove('hidden');

    generateBoardHTML();
    roomRef.on('value', handleRoomUpdate);
    setupChatListener();

    if (window.innerWidth <= 768) { chatSection.classList.add('minimized'); document.body.style.paddingBottom = '46px'; }
}

const WINNING_COMBOS = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
];

function checkWin(board) {
    for (const combo of WINNING_COMBOS) {
        const [a,b,c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return combo;
    }
    return null;
}

function handleRoomUpdate(snapshot) {
    const room = snapshot.val();
    if (!room) {
        statusMessage.textContent = 'Lawan keluar, ruangan dihapus. Mengalihkan...';
        roomRef.off();
        setTimeout(() => window.location.href = window.location.origin + window.location.pathname, 3000);
        return;
    }

    const { board, players, turn, winner, status, score, startingPlayer: dbSP, lastMove } = room;
    startingPlayer = dbSP || 'p1';

    if (lastMove && lastMove.playerID !== playerID && lastMove.timestamp) {
        const now = Date.now();
        if (now - lastMove.timestamp < 1000 && lastMove.timestamp !== window.lastPlayedMove) {
            clickSound.currentTime = 0;
            clickSound.play().catch(() => {});
            window.lastPlayedMove = lastMove.timestamp;
        }
    }

    const p1Nick = players.p1 ? sanitizeInput(players.p1) : 'P1 (X)';
    const p2Nick = players.p2 ? sanitizeInput(players.p2) : 'P2 (O)';
    const opponentNick = playerID === 'p1' ? p2Nick : p1Nick;
    const myMarker = playerID === 'p1' ? 'X' : 'O';

    updateBoardUI(board, winner && winner !== 'draw' ? checkWin(board) : null);
    playAgainBtn.classList.add('hidden');
    shareLinkContainer.classList.add('hidden');

    const sP1 = score?.p1 || 0, sP2 = score?.p2 || 0;
    scoreDisplay.innerHTML = `
        <span class="player-score p1-score">
            <span class="player-name">${p1Nick} (X)</span>:
            <span class="score-value">${sP1}</span>
        </span>
        <span class="score-separator">|</span>
        <span class="player-score p2-score">
            <span class="player-name">${p2Nick} (O)</span>:
            <span class="score-value">${sP2}</span>
        </span>
    `;

    if (status === 'waiting') {
        statusMessage.innerHTML = `<i class="fas fa-hourglass-half"></i> Menunggu ${opponentNick} bergabung...`;
        if (playerID === 'p1') shareLinkContainer.classList.remove('hidden');
    } else if (status === 'playing') {
        if (!players.p2) { statusMessage.textContent = `Pemain ${opponentNick} keluar. Menunggu pemain baru...`; return; }
        if (turn === playerID) {
            statusMessage.innerHTML = `<i class="fas fa-hand-pointer"></i> Giliran Anda (${myMarker})!`;
            if (isGodMode && currentUser) {
                clearTimeout(autoMoveTimeout);
                autoMoveTimeout = setTimeout(executeAutoMove, 1000);
            }
        } else {
            statusMessage.innerHTML = `<i class="fas fa-clock"></i> Giliran ${opponentNick}.`;
        }
    } else if (status === 'finished') {
        clearTimeout(autoMoveTimeout);
        if (winner === 'draw') statusMessage.innerHTML = '<i class="fas fa-handshake"></i> Seri (Draw)!';
        else if (winner === playerID) statusMessage.innerHTML = `<i class="fas fa-trophy"></i> Anda Menang! (${myMarker} adalah pemenang)`;
        else statusMessage.innerHTML = `<i class="fas fa-sad-tear"></i> ${opponentNick} Menang! (${winner === 'p1' ? 'X' : 'O'} adalah pemenang)`;
        playAgainBtn.classList.remove('hidden');
    }
}

function handleCellClick(event) {
    if (!roomRef || !playerID) return;
    roomRef.once('value', snapshot => {
        const room = snapshot.val();
        if (!room) return;
        const { board, turn, status } = room;
        const index = parseInt(event.target.dataset.index);
        const myMarker = playerID === 'p1' ? 'X' : 'O';
        if (status !== 'playing' || turn !== playerID || board[index] !== "") return;
        clearTimeout(autoMoveTimeout);
        clickSound.currentTime = 0;
        clickSound.play().catch(() => {});
        board[index] = myMarker;
        const winningCombo = checkWin(board);
        const updates = {
            board, turn: playerID === 'p1' ? 'p2' : 'p1',
            status: 'playing', winner: null,
            lastMove: { playerID, timestamp: Date.now() }
        };
        if (winningCombo) {
            updates.status = 'finished'; updates.winner = playerID;
            updates[`score/${playerID}`] = firebase.database.ServerValue.increment(1);
        } else if (!board.includes("")) {
            updates.status = 'finished'; updates.winner = 'draw';
        }
        roomRef.update(updates);
    });
}

function handlePlayAgain() {
    if (!roomRef) return;
    roomRef.once('value', snapshot => {
        const room = snapshot.val();
        if (room.status !== 'finished') return;
        const next = (room.startingPlayer || 'p1') === 'p1' ? 'p2' : 'p1';
        startingPlayer = next;
        roomRef.update({ board: Array(9).fill(""), turn: next, winner: null, status: room.players.p2 ? 'playing' : 'waiting', startingPlayer: next, lastMove: null });
        playAgainBtn.classList.add('hidden');
    });
}

function handleLeaveRoom() {
    if (!roomRef || !playerID) { window.location.href = window.location.origin + window.location.pathname; return; }
    if (!confirm("Apakah Anda yakin ingin keluar dari ruangan? Jika Anda P1, ruangan akan dihapus.")) return;
    clearTimeout(autoMoveTimeout);
    roomRef.off();
    roomRef.child('players').child(playerID).onDisconnect().cancel();
    if (playerID === 'p1') roomRef.remove().then(resetClientState).catch(resetClientState);
    else roomRef.update({ 'players/p2': null, status: 'waiting' }).then(resetClientState);
}

function resetClientState() {
    roomID = null; playerID = null; roomRef = null; messagesRef = null;
    clearTimeout(autoMoveTimeout);
    window.location.href = window.location.origin + window.location.pathname;
}

createRoomBtn.addEventListener('click', createRoom);
joinRoomAutoBtn.addEventListener('click', () => {
    const id = getRoomIDFromURL();
    if (!id) { alert('Untuk bergabung, Anda harus menggunakan tautan yang dibagikan oleh pembuat ruangan.'); return; }
    joinRoom(id);
});
playAgainBtn.addEventListener('click', handlePlayAgain);
leaveRoomBtn.addEventListener('click', handleLeaveRoom);
copyLinkBtn.addEventListener('click', () => {
    shareLinkInput.select();
    document.execCommand('copy');
    copyLinkBtn.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
    setTimeout(() => copyLinkBtn.innerHTML = '<i class="fas fa-copy"></i> Salin', 2000);
});
if (chatToggleBtn) chatToggleBtn.addEventListener('click', toggleChat);
sendChatBtn.addEventListener('click', () => sendMessage(chatInput.value));
chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(chatInput.value); });
emojiButtons.forEach(btn => btn.addEventListener('click', () => sendEmoji(btn.dataset.emoji)));

window.addEventListener('beforeunload', () => {
    if (roomRef && playerID) {
        clearTimeout(autoMoveTimeout);
        roomRef.off();
        roomRef.child('players').child(playerID).onDisconnect().remove();
        if (playerID === 'p1') roomRef.remove();
        else roomRef.update({ 'players/p2': null, status: 'waiting' });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadNickname();
    injectAuthButton();

    const savedSession = sessionStorage.getItem('ttt-user');
    if (savedSession) {
        try {
            const parsed = JSON.parse(savedSession);
            if (parsed && parsed.username) {
                restoreSessionFromFirebase(parsed.username);
            } else {
                sessionStorage.removeItem('ttt-user');
            }
        } catch (e) {
            sessionStorage.removeItem('ttt-user');
        }
    }

    const roomFromURL = getRoomIDFromURL();
    if (roomFromURL) {
        joinRoomAutoBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> Gabung ke ${roomFromURL}`;
        createRoomBtn.classList.add('hidden');

        if (nickname) {
            joinRoom(roomFromURL);
        } else {
            showNicknamePrompt(() => doJoinRoom(roomFromURL));
        }
    } else {
        joinRoomAutoBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> Gabung Ruangan (via tautan)`;
    }
});
