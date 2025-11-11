// Firebase Configuration
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

// Global State
let roomID = null;
let nickname = '';
let playerID = null;
let roomRef = null;
let messagesRef = null;
let totalMessageCount = 0; 
let startingPlayer = 'p1'; // Baru: Melacak siapa yang memulai putaran saat ini

// DOM Elements
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

// Utility Functions
function sanitizeInput(str) {
    if (!str) return '';
    return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function generateRoomID() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `givy-${randomNum}`;
}

function getRoomIDFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room');
}

function saveNickname() {
    const rawInput = nicknameInput.value.trim();
    const sanitizedNickname = sanitizeInput(rawInput);

    if (!sanitizedNickname) {
        alert('Silakan masukkan nama panggilan yang valid.');
        return false;
    }

    localStorage.setItem('givy-tictactoe-nickname', sanitizedNickname);
    nickname = sanitizedNickname;
    nicknameInput.value = sanitizedNickname;
    document.getElementById('nickname-save-status').textContent = 'Nama tersimpan!';
    setTimeout(() => document.getElementById('nickname-save-status').textContent = '', 2000);
    return true;
}

function loadNickname() {
    const savedName = localStorage.getItem('givy-tictactoe-nickname');
    if (savedName) {
        const sanitizedName = sanitizeInput(savedName);
        nicknameInput.value = sanitizedName;
        nickname = sanitizedName;
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
    const cells = boardElement.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        const marker = boardState[index];

        cell.className = 'cell';
        cell.dataset.index = index;

        if (marker === 'X') {
            cell.innerHTML = '<i class="fas fa-times"></i>';
            cell.classList.add('x');
        } else if (marker === 'O') {
            cell.innerHTML = '<i class="far fa-circle"></i>';
            cell.classList.add('o');
        } else {
            cell.textContent = '';
        }

        if (winningCells && winningCells.includes(index)) {
            cell.classList.add('winning');
        }
    });
}

// Chat Functions
function sendMessage(text) {
    if (!text.trim() || !messagesRef) return;

    const message = {
        text: sanitizeInput(text),
        author: nickname,
        playerId: playerID,
        timestamp: Date.now()
    };

    messagesRef.push(message);
    chatInput.value = '';
}

function sendEmoji(emoji) {
    if (!messagesRef) return;

    const message = {
        text: emoji,
        author: nickname,
        playerId: playerID,
        timestamp: Date.now(),
        isEmoji: true
    };

    messagesRef.push(message);
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function displayMessage(messageData, messageKey) {
    const messageDiv = document.createElement('div');
    const isOwn = messageData.playerId === playerID;
    const isEmojiOnly = messageData.isEmoji;

    messageDiv.classList.add('message');
    if (isOwn) {
        messageDiv.classList.add('own');
    } else {
        messageDiv.classList.add('other');
    }

    if (isEmojiOnly) {
        messageDiv.classList.add('emoji-only');
        messageDiv.textContent = messageData.text;
    } else {
        if (!isOwn) {
            const authorDiv = document.createElement('div');
            authorDiv.classList.add('message-author');
            authorDiv.textContent = sanitizeInput(messageData.author);
            messageDiv.appendChild(authorDiv);
        }

        const textDiv = document.createElement('div');
        textDiv.classList.add('message-text');
        textDiv.textContent = messageData.text;
        messageDiv.appendChild(textDiv);

        const timeDiv = document.createElement('div');
        timeDiv.classList.add('message-time');
        timeDiv.textContent = formatTime(messageData.timestamp);
        messageDiv.appendChild(timeDiv);
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateTotalMessageCountDisplay() {
    totalMessageCountSpan.textContent = `(${totalMessageCount})`;
}

function setupChatListener() {
    if (!messagesRef) return;

    // 1. Listener untuk MENGHITUNG TOTAL PESAN (Permanent Counter)
    messagesRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            totalMessageCount = snapshot.numChildren(); 
        } else {
            totalMessageCount = 0;
        }
        updateTotalMessageCountDisplay();
    });

    // 2. Listener untuk MENAMPILKAN PESAN
    messagesRef.off('child_added'); 
    messagesRef.on('child_added', (snapshot) => {
        const messageData = snapshot.val();
        
        if (messagesContainer.querySelector('p')) {
            messagesContainer.innerHTML = '';
        }

        displayMessage(messageData, snapshot.key);
    });
}

// Room Management
function createRoom() {
    if (!saveNickname()) {
        alert('Silakan masukkan nama panggilan.');
        return;
    }

    roomID = generateRoomID();
    roomRef = roomsRef.child(roomID);
    messagesRef = roomRef.child('messages');

    const initialRoomState = {
        board: Array(9).fill(""),
        players: { p1: nickname },
        turn: 'p1',
        winner: null,
        status: 'waiting',
        score: { p1: 0, p2: 0 },
        startingPlayer: 'p1' // P1 selalu memulai putaran pertama
    };

    roomRef.set(initialRoomState)
        .then(() => {
            playerID = 'p1';
            startingPlayer = 'p1'; // Set state lokal
            window.history.pushState(null, '', `?room=${roomID}`);
            joinRoomSuccess();
            const shareLink = `${window.location.origin}${window.location.pathname}?room=${roomID}`;
            shareLinkInput.value = shareLink;
        })
        .catch(error => {
            console.error("Error creating room:", error);
            statusMessage.textContent = 'Gagal membuat ruangan.';
        });
}

function joinRoom(id) {
    if (!saveNickname()) {
        alert('Silakan masukkan nama panggilan.');
        return;
    }

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

        const p1NicknameSafe = sanitizeInput(room.players.p1);
        const p2NicknameSafe = room.players.p2 ? sanitizeInput(room.players.p2) : null;

        const isP1 = p1NicknameSafe === nickname;
        const isP2 = p2NicknameSafe === nickname;

        if (isP1) {
            playerID = 'p1';
        } else if (isP2) {
            playerID = 'p2';
        } else if (!room.players.p2) {
            playerID = 'p2';
            roomRef.update({
                'players/p2': nickname,
                status: 'playing'
            }).then(() => {
                joinRoomSuccess();
            });
            return;
        } else {
            alert(`Ruangan ${roomID} sudah penuh.`);
            window.location.href = window.location.origin + window.location.pathname;
            return;
        }

        joinRoomSuccess();
    });
}

// Logic untuk Toggle Chat
function toggleChat() {
    if (window.innerWidth > 768) {
        chatSection.classList.remove('minimized');
        document.body.style.paddingBottom = '10px';
        return;
    }

    const isCurrentlyMinimized = chatSection.classList.contains('minimized');
    const newMinimizedState = !isCurrentlyMinimized;
    
    const minimizedPadding = '46px'; 
    const openPadding = window.innerWidth <= 500 ? '320px' : '350px';

    if (newMinimizedState) {
        chatSection.classList.add('minimized');
        document.body.style.paddingBottom = minimizedPadding; 
    } else {
        chatSection.classList.remove('minimized');
        document.body.style.paddingBottom = openPadding;
    }
}

function joinRoomSuccess() {
    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    boardElement.classList.remove('hidden');
    chatSection.classList.remove('hidden');
    roomIDDisplay.textContent = `ID Ruangan: ${roomID} - Anda adalah ${playerID.toUpperCase() === 'P1' ? 'X' : 'O'}`;
    roomIDDisplay.classList.remove('hidden');
    generateBoardHTML();

    roomRef.on('value', handleRoomUpdate);
    setupChatListener();
    
    if (window.innerWidth <= 768) {
        chatSection.classList.add('minimized'); 
        document.body.style.paddingBottom = '46px';
    }
}

// Game Logic
const WINNING_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

function checkWin(board) {
    for (const combo of WINNING_COMBOS) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return combo;
        }
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

    // Baca startingPlayer dari database
    const { board, players, turn, winner, status, score, startingPlayer: dbStartingPlayer } = room; 
    startingPlayer = dbStartingPlayer || 'p1'; // Perbarui state lokal

    const p1Nickname = players.p1 ? sanitizeInput(players.p1) : 'P1 (X)';
    const p2Nickname = players.p2 ? sanitizeInput(players.p2) : 'P2 (O)';
    const opponentNickname = playerID === 'p1' ? p2Nickname : p1Nickname;
    const myMarker = playerID === 'p1' ? 'X' : 'O';

    updateBoardUI(board, winner && winner !== 'draw' ? checkWin(board) : null);
    playAgainBtn.classList.add('hidden');
    shareLinkContainer.classList.add('hidden');

    const scoreP1 = score ? (score.p1 || 0) : 0;
    const scoreP2 = score ? (score.p2 || 0) : 0;

    scoreDisplay.innerHTML = `
        <span class="player-score p1-score">
            <span class="player-name">${p1Nickname} (X)</span>: 
            <span class="score-value">${scoreP1}</span>
        </span>
        <span class="score-separator">|</span>
        <span class="player-score p2-score">
            <span class="player-name">${p2Nickname} (O)</span>: 
            <span class="score-value">${scoreP2}</span>
        </span>
    `;

    if (status === 'waiting') {
        statusMessage.innerHTML = `<i class="fas fa-hourglass-half"></i> Menunggu ${opponentNickname} bergabung...`;
        if (playerID === 'p1') {
            shareLinkContainer.classList.remove('hidden');
        }
    } else if (status === 'playing') {
        if (!players.p2) {
            statusMessage.innerHTML = `<i class="fas fa-user-slash"></i> Pemain ${opponentNickname} keluar. Menunggu pemain baru...`;
            return;
        }
        if (turn === playerID) {
            statusMessage.innerHTML = `<i class="fas fa-hand-pointer"></i> Giliran Anda (${myMarker})!`;
        } else {
            statusMessage.innerHTML = `<i class="fas fa-clock"></i> Giliran ${opponentNickname}.`;
        }
    } else if (status === 'finished') {
        if (winner === 'draw') {
            statusMessage.innerHTML = '<i class="fas fa-handshake"></i> Seri (Draw)!';
        } else if (winner === playerID) {
            statusMessage.innerHTML = `<i class="fas fa-trophy"></i> Anda Menang! (${myMarker} adalah pemenang)`;
        } else {
            const winnerMarker = winner === 'p1' ? 'X' : 'O';
            statusMessage.innerHTML = `<i class="fas fa-sad-tear"></i> ${opponentNickname} Menang! (${winnerMarker} adalah pemenang)`;
        }
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

        if (status !== 'playing' || turn !== playerID || board[index] !== "") {
            return;
        }

        board[index] = myMarker;
        const winningCombo = checkWin(board);
        let newTurn = playerID === 'p1' ? 'p2' : 'p1';
        let newStatus = 'playing';
        let winner = null;

        const updates = {
            board: board,
            turn: newTurn,
            status: newStatus,
            winner: winner
        };

        if (winningCombo) {
            newStatus = 'finished';
            winner = playerID;
            updates.status = 'finished';
            updates.winner = winner;
            updates[`score/${playerID}`] = firebase.database.ServerValue.increment(1);
        } else if (!board.includes("")) {
            newStatus = 'finished';
            winner = 'draw';
            updates.status = 'finished';
            updates.winner = 'draw';
        }

        roomRef.update(updates);
    });
}

function handlePlayAgain() {
    if (!roomRef) return;

    roomRef.once('value', snapshot => {
        const room = snapshot.val();

        if (room.status !== 'finished') return;

        // Tentukan siapa yang memulai putaran selanjutnya (Alternating)
        const currentStartingPlayer = room.startingPlayer || 'p1'; 
        const nextStartingPlayer = currentStartingPlayer === 'p1' ? 'p2' : 'p1';
        
        startingPlayer = nextStartingPlayer; 

        roomRef.update({
            board: Array(9).fill(""),
            // Giliran diatur ke pemain yang akan memulai
            turn: nextStartingPlayer, 
            winner: null,
            status: room.players.p2 ? 'playing' : 'waiting',
            // Simpan startingPlayer baru ke database
            startingPlayer: nextStartingPlayer 
        });

        playAgainBtn.classList.add('hidden');
    });
}

function handleLeaveRoom() {
    if (!roomRef || !playerID) {
        window.location.href = window.location.origin + window.location.pathname;
        return;
    }

    if (!confirm("Apakah Anda yakin ingin keluar dari ruangan? Jika Anda P1, ruangan akan dihapus.")) {
        return;
    }

    roomRef.off();

    const playerSlotRef = roomRef.child('players').child(playerID);
    playerSlotRef.onDisconnect().cancel();

    if (playerID === 'p1') {
        roomRef.remove().then(() => {
            resetClientState();
        }).catch(error => {
            resetClientState();
        });
    } else if (playerID === 'p2') {
        roomRef.update({
            'players/p2': null,
            status: 'waiting'
        }).then(() => {
            resetClientState();
        });
    }
}

function resetClientState() {
    roomID = null;
    playerID = null;
    roomRef = null;
    messagesRef = null;
    window.location.href = window.location.origin + window.location.pathname;
}

// Event Listeners
createRoomBtn.addEventListener('click', createRoom);
joinRoomAutoBtn.addEventListener('click', () => {
    const roomFromURL = getRoomIDFromURL();

    if (!roomFromURL) {
        alert('Untuk bergabung, Anda harus menggunakan tautan yang dibagikan oleh pembuat ruangan.');
        return;
    }

    joinRoom(roomFromURL);
});

playAgainBtn.addEventListener('click', handlePlayAgain);
leaveRoomBtn.addEventListener('click', handleLeaveRoom);

copyLinkBtn.addEventListener('click', () => {
    shareLinkInput.select();
    document.execCommand('copy');
    copyLinkBtn.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
    setTimeout(() => copyLinkBtn.innerHTML = '<i class="fas fa-copy"></i> Salin', 2000);
});

// Event Listener untuk Toggle Chat
if (chatToggleBtn) {
    chatToggleBtn.addEventListener('click', toggleChat);
}

// Chat Event Listeners
sendChatBtn.addEventListener('click', () => {
    sendMessage(chatInput.value);
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage(chatInput.value);
    }
});

emojiButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        sendEmoji(btn.dataset.emoji);
    });
});

// Handle Disconnect
window.addEventListener('beforeunload', () => {
    if (roomRef && playerID) {
        roomRef.off();

        const playerSlotRef = roomRef.child('players').child(playerID);
        playerSlotRef.onDisconnect().remove();

        if (playerID === 'p1') {
            roomRef.remove();
        } else if (playerID === 'p2') {
            roomRef.update({
                'players/p2': null,
                status: 'waiting'
            });
        }
    }
});

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
    loadNickname();
    const roomFromURL = getRoomIDFromURL();

    if (roomFromURL) {
        joinRoomAutoBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> Gabung ke ${roomFromURL}`;
        createRoomBtn.classList.add('hidden');

        if (nickname) {
            joinRoom(roomFromURL);
        }
    } else {
        joinRoomAutoBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> Gabung Ruangan (via tautan)`;
    }
});
