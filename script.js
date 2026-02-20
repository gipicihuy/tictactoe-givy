// ============================================================
// Firebase Configuration
// ============================================================
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
const usersRef = database.ref('users'); // Path untuk user accounts

// ============================================================
// Global State
// ============================================================
let roomID = null;
let nickname = '';
let playerID = null;
let roomRef = null;
let messagesRef = null;
let totalMessageCount = 0;
let startingPlayer = 'p1';
let isGodMode = false;
let autoMoveTimeout = null;

// State auth
let currentUser = null; // { username, isGodMode }

// ============================================================
// Sound Effect
// ============================================================
const clickSound = new Audio('https://a.top4top.io/m_3603gdp4k0.mp3');
clickSound.volume = 0.5;

// ============================================================
// DOM Elements
// ============================================================
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

// ============================================================
// 🔐 CRYPTO UTILS
// ============================================================
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// 🔐 AUTH MODAL - Register & Login
// ============================================================

function createAuthModal() {
    if (document.getElementById('auth-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.88); z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(5px);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;

    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #1a1a1a 0%, #252525 100%);
            border: 1.5px solid #333;
            border-radius: 18px;
            padding: 28px 26px 24px;
            width: 92%;
            max-width: 360px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.6);
            position: relative;
        ">
            <!-- Header Tabs -->
            <div style="display:flex; gap:0; margin-bottom:22px; border-bottom: 1.5px solid #333;">
                <button id="tab-login" onclick="switchAuthTab('login')" style="
                    flex:1; padding:10px 0; background:none; border:none;
                    color:#FF5252; font-weight:700; font-size:0.85em; cursor:pointer;
                    border-bottom: 2.5px solid #FF5252; margin-bottom:-1.5px;
                    text-transform:uppercase; letter-spacing:0.5px; transition:all 0.2s;
                ">Login</button>
                <button id="tab-register" onclick="switchAuthTab('register')" style="
                    flex:1; padding:10px 0; background:none; border:none;
                    color:#666; font-weight:700; font-size:0.85em; cursor:pointer;
                    border-bottom: 2.5px solid transparent; margin-bottom:-1.5px;
                    text-transform:uppercase; letter-spacing:0.5px; transition:all 0.2s;
                ">Register</button>
            </div>

            <!-- Icon -->
            <div style="text-align:center; margin-bottom:16px;">
                <div style="
                    width:52px; height:52px; border-radius:50%;
                    background: linear-gradient(135deg, #C62828, #FF5252);
                    display:inline-flex; align-items:center; justify-content:center;
                    box-shadow: 0 4px 15px rgba(198,40,40,0.4);
                    font-size:1.4em;
                ">🎮</div>
                <p id="auth-subtitle" style="color:#888; font-size:0.76em; margin-top:8px;">Masuk ke akun kamu</p>
            </div>

            <!-- Username -->
            <div style="margin-bottom:13px;">
                <label style="color:#aaa; font-size:0.7em; font-weight:600; text-transform:uppercase; display:block; margin-bottom:5px; letter-spacing:0.5px;">Username</label>
                <input id="auth-username" type="text" placeholder="Masukkan username" maxlength="15"
                    style="
                        width:100%; padding:10px 12px; border-radius:9px;
                        border:1.5px solid #333; background:#111;
                        color:#fff; font-size:0.88em; outline:none; box-sizing:border-box;
                        transition: border-color 0.25s;
                    "
                    onfocus="this.style.borderColor='#C62828'"
                    onblur="this.style.borderColor='#333'"
                >
            </div>

            <!-- Password -->
            <div style="margin-bottom:13px;">
                <label style="color:#aaa; font-size:0.7em; font-weight:600; text-transform:uppercase; display:block; margin-bottom:5px; letter-spacing:0.5px;">Password</label>
                <div style="position:relative;">
                    <input id="auth-password" type="password" placeholder="Masukkan password" maxlength="32"
                        style="
                            width:100%; padding:10px 40px 10px 12px; border-radius:9px;
                            border:1.5px solid #333; background:#111;
                            color:#fff; font-size:0.88em; outline:none; box-sizing:border-box;
                            transition: border-color 0.25s;
                        "
                        onfocus="this.style.borderColor='#C62828'"
                        onblur="this.style.borderColor='#333'"
                        onkeydown="if(event.key==='Enter') submitAuth()"
                    >
                    <button onclick="toggleAuthPassword()" style="
                        position:absolute; right:10px; top:50%; transform:translateY(-50%);
                        background:none; border:none; color:#666; cursor:pointer;
                        font-size:1em; padding:0; display:flex; align-items:center;
                        transition: color 0.2s;
                    " onmouseover="this.style.color='#aaa'" onmouseout="this.style.color='#666'">👁</button>
                </div>
            </div>

            <!-- Confirm Password (register only) -->
            <div id="confirm-pw-wrapper" style="margin-bottom:13px; display:none;">
                <label style="color:#aaa; font-size:0.7em; font-weight:600; text-transform:uppercase; display:block; margin-bottom:5px; letter-spacing:0.5px;">Konfirmasi Password</label>
                <input id="auth-confirm-password" type="password" placeholder="Ulangi password" maxlength="32"
                    style="
                        width:100%; padding:10px 12px; border-radius:9px;
                        border:1.5px solid #333; background:#111;
                        color:#fff; font-size:0.88em; outline:none; box-sizing:border-box;
                        transition: border-color 0.25s;
                    "
                    onfocus="this.style.borderColor='#C62828'"
                    onblur="this.style.borderColor='#333'"
                    onkeydown="if(event.key==='Enter') submitAuth()"
                >
            </div>

            <!-- Error / Info Message -->
            <div id="auth-message" style="
                min-height:18px; font-size:0.78em; margin-bottom:14px;
                text-align:center; font-weight:600;
            "></div>

            <!-- Submit Button -->
            <button id="auth-submit-btn" onclick="submitAuth()" style="
                width:100%; padding:11px; border-radius:9px; border:none;
                background: linear-gradient(135deg, #C62828 0%, #B71C1C 100%);
                color:#fff; font-weight:700; cursor:pointer; font-size:0.88em;
                text-transform:uppercase; letter-spacing:0.8px;
                transition: all 0.25s; box-shadow: 0 3px 12px rgba(198,40,40,0.35);
            "
            onmouseover="this.style.opacity='0.88'; this.style.transform='translateY(-1px)'"
            onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'">
                Login
            </button>

            <!-- Skip / Close -->
            <button onclick="closeAuthModal()" style="
                width:100%; margin-top:10px; padding:8px; border-radius:9px;
                border: 1.5px solid #333; background:transparent;
                color:#666; font-weight:600; cursor:pointer; font-size:0.78em;
                text-transform:uppercase; transition: all 0.2s;
            "
            onmouseover="this.style.borderColor='#555'; this.style.color='#aaa'"
            onmouseout="this.style.borderColor='#333'; this.style.color='#666'">
                Lanjut tanpa akun
            </button>

            <!-- Login status info -->
            <p style="text-align:center; color:#444; font-size:0.68em; margin-top:14px; line-height:1.5;">
                Akun diperlukan untuk fitur spesial.<br>Data tersimpan aman di Firebase.
            </p>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => {
        const u = document.getElementById('auth-username');
        if (u) u.focus();
    }, 120);
}

let currentAuthTab = 'login';

function switchAuthTab(tab) {
    currentAuthTab = tab;
    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');
    const confirmWrapper = document.getElementById('confirm-pw-wrapper');
    const subtitle = document.getElementById('auth-subtitle');
    const submitBtn = document.getElementById('auth-submit-btn');
    const msgEl = document.getElementById('auth-message');

    if (msgEl) msgEl.textContent = '';

    if (tab === 'login') {
        loginTab.style.color = '#FF5252';
        loginTab.style.borderBottomColor = '#FF5252';
        registerTab.style.color = '#666';
        registerTab.style.borderBottomColor = 'transparent';
        if (confirmWrapper) confirmWrapper.style.display = 'none';
        if (subtitle) subtitle.textContent = 'Masuk ke akun kamu';
        if (submitBtn) submitBtn.textContent = 'Login';
    } else {
        registerTab.style.color = '#FF5252';
        registerTab.style.borderBottomColor = '#FF5252';
        loginTab.style.color = '#666';
        loginTab.style.borderBottomColor = 'transparent';
        if (confirmWrapper) confirmWrapper.style.display = 'block';
        if (subtitle) subtitle.textContent = 'Buat akun baru';
        if (submitBtn) submitBtn.textContent = 'Daftar';
    }
}

function toggleAuthPassword() {
    const pw = document.getElementById('auth-password');
    if (pw) pw.type = pw.type === 'password' ? 'text' : 'password';
}

function setAuthMessage(text, color = '#FF5252') {
    const el = document.getElementById('auth-message');
    if (el) { el.textContent = text; el.style.color = color; }
}

async function submitAuth() {
    const username = (document.getElementById('auth-username')?.value || '').trim().toLowerCase();
    const password = document.getElementById('auth-password')?.value || '';
    const submitBtn = document.getElementById('auth-submit-btn');

    if (!username) { setAuthMessage('⚠️ Username wajib diisi'); return; }
    if (username.length < 3) { setAuthMessage('⚠️ Username minimal 3 karakter'); return; }
    if (!password) { setAuthMessage('⚠️ Password wajib diisi'); return; }
    if (password.length < 6) { setAuthMessage('⚠️ Password minimal 6 karakter'); return; }

    // Cegah karakter berbahaya
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setAuthMessage('⚠️ Username hanya boleh huruf, angka, underscore');
        return;
    }

    if (submitBtn) { submitBtn.textContent = '⏳ Memproses...'; submitBtn.disabled = true; }

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
            submitBtn.textContent = currentAuthTab === 'login' ? 'Login' : 'Daftar';
        }
    }
}

async function doRegister(username, hashedPassword) {
    const confirmPw = document.getElementById('auth-confirm-password')?.value || '';
    const originalPw = document.getElementById('auth-password')?.value || '';

    if (originalPw !== confirmPw) {
        setAuthMessage('⚠️ Password tidak cocok');
        return;
    }

    // Cek apakah username sudah ada
    const snapshot = await usersRef.child(username).once('value');
    if (snapshot.exists()) {
        setAuthMessage('⚠️ Username sudah dipakai, pilih yang lain');
        return;
    }

    // Simpan user baru ke Firebase
    // isGodMode: false by default — harus di-set manual via Firebase Console
    await usersRef.child(username).set({
        username: username,
        passwordHash: hashedPassword,
        isGodMode: false,
        createdAt: Date.now()
    });

    setAuthMessage('✅ Akun berhasil dibuat! Silakan login.', '#4CAF50');

    // Auto switch ke tab login
    setTimeout(() => {
        switchAuthTab('login');
        const pwEl = document.getElementById('auth-password');
        if (pwEl) { pwEl.value = ''; pwEl.focus(); }
        setAuthMessage('');
    }, 1500);
}

async function doLogin(username, hashedPassword) {
    const snapshot = await usersRef.child(username).once('value');

    if (!snapshot.exists()) {
        setAuthMessage('❌ Akun tidak ditemukan');
        return;
    }

    const userData = snapshot.val();

    // Simulasi delay anti brute-force
    await new Promise(resolve => setTimeout(resolve, 400));

    if (userData.passwordHash !== hashedPassword) {
        setAuthMessage('❌ Password salah');
        const pwEl = document.getElementById('auth-password');
        if (pwEl) { pwEl.value = ''; pwEl.focus(); }
        return;
    }

    // ✅ Login berhasil
    currentUser = {
        username: userData.username,
        isGodMode: userData.isGodMode === true // Hanya true jika benar-benar true di Firebase
    };

    isGodMode = currentUser.isGodMode;

    // Simpan session di sessionStorage (hilang saat tab ditutup)
    sessionStorage.setItem('ttt-user', JSON.stringify(currentUser));

    setAuthMessage('✅ Login berhasil!', '#4CAF50');

    // Update nickname otomatis dari username akun
    nickname = userData.username;
    nicknameInput.value = nickname;
    localStorage.setItem('givy-tictactoe-nickname', nickname);

    // Update UI auth button
    updateAuthButton();

    setTimeout(() => {
        closeAuthModal();

        // Tampilkan info God Mode jika aktif
        if (isGodMode) {
            const statusEl = document.getElementById('nickname-save-status');
            if (statusEl) {
                statusEl.textContent = '🎮 God Mode Aktif!';
                statusEl.style.color = '#FFD700';
                setTimeout(() => { statusEl.textContent = ''; }, 4000);
            }
        }

        // Jalankan aksi yang pending (jika login dipicu sebelum create/join room)
        if (window._pendingAction) {
            const action = window._pendingAction;
            window._pendingAction = null;
            action();
        }
    }, 1000);
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.remove();
    window._pendingAction = null;
}

// ============================================================
// Auth Button di Setup Screen
// ============================================================

function injectAuthButton() {
    // Cek apakah tombol sudah ada
    if (document.getElementById('auth-btn-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'auth-btn-wrapper';
    wrapper.style.cssText = 'margin-bottom: 12px; text-align: center;';

    const btn = document.createElement('button');
    btn.id = 'auth-main-btn';
    btn.innerHTML = '<i class="fas fa-user"></i> Login / Daftar Akun';
    btn.style.cssText = `
        background: linear-gradient(135deg, #333 0%, #2a2a2a 100%);
        color: #FFA726; border: 1.5px solid #444; border-radius: 8px;
        padding: 8px 20px; font-size: 0.85em; font-weight: 600;
        cursor: pointer; transition: all 0.25s; min-width: 200px;
    `;
    btn.onmouseover = () => { btn.style.borderColor = '#FFA726'; };
    btn.onmouseout = () => { btn.style.borderColor = '#444'; };
    btn.onclick = () => { createAuthModal(); switchAuthTab('login'); };

    wrapper.appendChild(btn);

    // Sisipkan sebelum nickname-save-status
    const saveStatus = document.getElementById('nickname-save-status');
    if (saveStatus && saveStatus.parentNode) {
        saveStatus.parentNode.insertBefore(wrapper, saveStatus);
    } else {
        setupScreen.appendChild(wrapper);
    }
}

function updateAuthButton() {
    const btn = document.getElementById('auth-main-btn');
    if (!btn) return;

    if (currentUser) {
        btn.innerHTML = `<i class="fas fa-user-check"></i> ${currentUser.username}${currentUser.isGodMode ? ' 🎮' : ''}`;
        btn.style.color = currentUser.isGodMode ? '#FFD700' : '#4CAF50';
        btn.style.borderColor = currentUser.isGodMode ? '#FFD700' : '#4CAF50';
        btn.onclick = () => {
            if (confirm(`Logout dari akun "${currentUser.username}"?`)) {
                doLogout();
            }
        };
    } else {
        btn.innerHTML = '<i class="fas fa-user"></i> Login / Daftar Akun';
        btn.style.color = '#FFA726';
        btn.style.borderColor = '#444';
        btn.onclick = () => { createAuthModal(); switchAuthTab('login'); };
    }
}

function doLogout() {
    currentUser = null;
    isGodMode = false;
    sessionStorage.removeItem('ttt-user');
    updateAuthButton();
    const statusEl = document.getElementById('nickname-save-status');
    if (statusEl) {
        statusEl.textContent = 'Logged out.';
        statusEl.style.color = '#888';
        setTimeout(() => { statusEl.textContent = ''; }, 2500);
    }
}

// ============================================================
// 🎮 GOD MODE - MINIMAX AI
// ============================================================

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

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

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

// ============================================================
// CHAT FUNCTIONS
// ============================================================

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

// ============================================================
// ROOM MANAGEMENT
// ============================================================

function createRoom() {
    // Jika sudah login pakai username dari akun
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
    } else {
        if (!saveNickname()) return;
    }
    doJoinRoom(id);
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

// ============================================================
// GAME LOGIC
// ============================================================

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

// ============================================================
// EVENT LISTENERS
// ============================================================

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

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    loadNickname();
    injectAuthButton();

    // Restore session jika ada
    const savedSession = sessionStorage.getItem('ttt-user');
    if (savedSession) {
        try {
            currentUser = JSON.parse(savedSession);
            isGodMode = currentUser.isGodMode === true;
            nickname = currentUser.username;
            nicknameInput.value = nickname;
            updateAuthButton();
        } catch (e) {
            sessionStorage.removeItem('ttt-user');
        }
    }

    const roomFromURL = getRoomIDFromURL();
    if (roomFromURL) {
        joinRoomAutoBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> Gabung ke ${roomFromURL}`;
        createRoomBtn.classList.add('hidden');
        if (nickname) joinRoom(roomFromURL);
    } else {
        joinRoomAutoBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> Gabung Ruangan (via tautan)`;
    }
});
