// =======================================================
// FIREBASE CONFIGURATION & INITIALIZATION
// =======================================================

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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✔️ Firebase berhasil diinisialisasi.");
}
const database = firebase.database();
const roomsRef = database.ref('rooms');
console.log(`✔️ Referensi rooms dibuat.`);

// =======================================================
// GLOBAL STATE & DOM REFERENCES
// =======================================================

let roomID = null;
let nickname = '';
let playerID = null; // 'p1' or 'p2'
let roomRef = null;

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

// =======================================================
// UTILITY FUNCTIONS
// =======================================================

/**
 * Membuat ID ruangan acak GIVY-XXXX.
 */
function generateRoomID() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `GIVY-${randomNum}`;
}

/**
 * Mendapatkan ID ruangan dari parameter URL.
 */
function getRoomIDFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room');
}

/**
 * Menyimpan nama panggilan ke local storage.
 */
function saveNickname() {
    nicknameInput.value = nicknameInput.value.trim();
    if (!nicknameInput.value) return false;
    
    localStorage.setItem('givy-tictactoe-nickname', nicknameInput.value);
    nickname = nicknameInput.value;
    document.getElementById('nickname-save-status').textContent = 'Nama tersimpan!';
    setTimeout(() => document.getElementById('nickname-save-status').textContent = '', 2000);
    return true;
}

/**
 * Memuat nama panggilan dari local storage.
 */
function loadNickname() {
    const savedName = localStorage.getItem('givy-tictactoe-nickname');
    if (savedName) {
        nicknameInput.value = savedName;
        nickname = savedName;
    }
}

/**
 * Membuat papan 3x3 dan menambahkan event listener.
 */
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

/**
 * Memperbarui tampilan papan permainan.
 */
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

// =======================================================
// FIREBASE ROOM MANAGEMENT
// =======================================================

/**
 * Membuat ruangan baru di Firebase Realtime Database.
 */
function createRoom() {
    if (!saveNickname()) {
        alert('Silakan masukkan nama panggilan.');
        return;
    }

    roomID = generateRoomID();
    roomRef = roomsRef.child(roomID);

    console.log(`🟡 Mencoba membuat ruangan: ${roomID}`);

    const initialRoomState = {
        board: Array(9).fill(""),
        players: { p1: nickname },
        turn: 'p1',
        winner: null,
        status: 'waiting'
    };

    roomRef.set(initialRoomState)
        .then(() => {
            console.log(`🟢 BERHASIL: Ruangan ${roomID} dibuat.`);
            playerID = 'p1';
            
            window.history.pushState(null, '', `?room=${roomID}`);
            
            joinRoomSuccess();
            const shareLink = `${window.location.origin}${window.location.pathname}?room=${roomID}`;
            shareLinkInput.value = shareLink;
        })
        .catch(error => {
            console.error("🔴 ERROR membuat ruangan:", error);
            statusMessage.textContent = 'Gagal membuat ruangan. Periksa konsol untuk detail.';
        });
}

/**
 * Mencoba bergabung ke ruangan yang sudah ada.
 */
function joinRoom(id) {
    if (!saveNickname()) {
        alert('Silakan masukkan nama panggilan.');
        return;
    }
    
    roomID = id;
    roomRef = roomsRef.child(roomID);
    console.log(`🟡 Mencoba bergabung ke ruangan: ${roomID}`);

    roomRef.once('value', snapshot => {
        const room = snapshot.val();
        
        if (!room) {
            console.error(`🔴 ERROR: Ruangan ${roomID} tidak ditemukan.`);
            alert(`Ruangan ${roomID} tidak ditemukan atau sudah dihapus.`);
            window.location.href = window.location.origin + window.location.pathname;
            return;
        }

        const isP1 = room.players.p1 === nickname;
        const isP2 = room.players.p2 === nickname;

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
                console.log(`🟢 BERHASIL: Bergabung ke ruangan ${roomID} sebagai P2.`);
                joinRoomSuccess();
            });
            return;
        } else {
            console.error(`🔴 ERROR: Ruangan ${roomID} sudah penuh.`);
            alert(`Ruangan ${roomID} sudah penuh.`);
            window.location.href = window.location.origin + window.location.pathname;
            return;
        }

        console.log(`🟢 BERHASIL: Bergabung kembali ke ruangan ${roomID} sebagai ${playerID}.`);
        joinRoomSuccess();

    }).catch(error => {
        console.error("🔴 ERROR bergabung ke ruangan:", error);
        alert('Terjadi kesalahan saat mencoba bergabung ke ruangan.');
    });
}

/**
 * Setup setelah berhasil bergabung.
 */
function joinRoomSuccess() {
    console.log(`✨ Masuk ke layar permainan sebagai Pemain ${playerID}.`);
    
    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    boardElement.classList.remove('hidden');
    roomIDDisplay.textContent = `ID Ruangan: ${roomID} - Anda adalah ${playerID.toUpperCase() === 'P1' ? 'X' : 'O'}`;
    roomIDDisplay.classList.remove('hidden');
    generateBoardHTML();
    
    roomRef.on('value', handleRoomUpdate);
    console.log("✔️ Mulai mendengarkan pembaruan realtime.");
}

// =======================================================
// FIREBASE REALTIME UPDATE HANDLER & GAME LOGIC
// =======================================================

const WINNING_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Baris
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Kolom
    [0, 4, 8], [2, 4, 6]             // Diagonal
];

/**
 * Memeriksa apakah ada pemenang.
 */
function checkWin(board) {
    for (const combo of WINNING_COMBOS) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return combo;
        }
    }
    return null;
}

/**
 * Menangani pembaruan realtime dari Firebase.
 */
function handleRoomUpdate(snapshot) {
    const room = snapshot.val();
    
    if (!room) {
        console.warn('Data ruangan null. Lawan mungkin telah menghapus ruangan.');
        statusMessage.textContent = 'Lawan keluar, ruangan dihapus. Mengalihkan...';
        roomRef.off();
        setTimeout(() => window.location.href = window.location.origin + window.location.pathname, 3000);
        return;
    }

    const { board, players, turn, winner, status } = room;
    const opponentNickname = playerID === 'p1' ? (players.p2 || 'Pemain Lain') : (players.p1 || 'Pemain Lain');
    const myMarker = playerID === 'p1' ? 'X' : 'O';

    updateBoardUI(board, winner && winner !== 'draw' ? checkWin(board) : null);
    playAgainBtn.classList.add('hidden');
    shareLinkContainer.classList.add('hidden');
    
    // Update Status Message
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

/**
 * Menangani klik sel (langkah pemain).
 */
function handleCellClick(event) {
    if (!roomRef || !playerID) return;

    roomRef.once('value', snapshot => {
        const room = snapshot.val();
        if (!room) return;
        
        const { board, turn, status } = room;
        const index = parseInt(event.target.dataset.index);
        const myMarker = playerID === 'p1' ? 'X' : 'O';

        if (status !== 'playing' || turn !== playerID || board[index] !== "") {
            console.log('Langkah diblokir: Status tidak valid, bukan giliran, atau sel sudah terisi.');
            return;
        }

        board[index] = myMarker;
        const winningCombo = checkWin(board);
        let newTurn = playerID === 'p1' ? 'p2' : 'p1';
        let newStatus = 'playing';
        let winner = null;

        if (winningCombo) {
            newStatus = 'finished';
            winner = playerID;
        } else if (!board.includes("")) {
            newStatus = 'finished';
            winner = 'draw';
        }

        roomRef.update({
            board: board,
            turn: newTurn,
            status: newStatus,
            winner: winner
        }).then(() => {
            console.log(`Langkah berhasil di indeks ${index}. Giliran baru: ${newTurn}. Status: ${newStatus}`);
        }).catch(error => {
            console.error('Error memperbarui langkah:', error);
        });
    });
}

/**
 * Mereset papan untuk permainan baru.
 */
function handlePlayAgain() {
    if (!roomRef) return;
    
    if (playerID !== 'p1') {
        alert('Hanya Pemain 1 (X) yang dapat memulai ulang permainan.');
        return;
    }

    roomRef.once('value', snapshot => {
        const room = snapshot.val();
        
        if (room.status !== 'finished') return;

        roomRef.update({
            board: Array(9).fill(""),
            turn: 'p1',
            winner: null,
            status: 'playing'
        }).then(() => {
            console.log('Permainan direset oleh P1.');
        });
        
        playAgainBtn.classList.add('hidden');
    });
}

// =======================================================
// EVENT LISTENERS & INITIAL SETUP
// =======================================================

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

copyLinkBtn.addEventListener('click', () => {
    shareLinkInput.select();
    document.execCommand('copy');
    copyLinkBtn.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
    setTimeout(() => copyLinkBtn.innerHTML = '<i class="fas fa-copy"></i> Salin', 2000);
});

// Handle Disconnect
window.addEventListener('beforeunload', () => {
    if (roomRef && playerID) {
        roomRef.off();
        console.log(`Membersihkan ${playerID} saat disconnect...`);

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

// Initial Setup on Load
document.addEventListener('DOMContentLoaded', () => {
    loadNickname();
    const roomFromURL = getRoomIDFromURL();

    if (roomFromURL) {
        joinRoomAutoBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> Gabung ke ${roomFromURL}`;
        createRoomBtn.classList.add('hidden');
        
        if (nickname) {
            console.log(`Auto-joining ruangan ${roomFromURL} dengan nama tersimpan.`);
            joinRoom(roomFromURL);
        } else {
            console.log(`Masukkan nama untuk bergabung ke ruangan ${roomFromURL}.`);
        }
    } else {
        joinRoomAutoBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> Gabung Ruangan (via tautan)`;
    }
});
