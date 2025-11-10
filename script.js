// =======================================================
// FIREBASE CONFIGURATION & INITIALIZATION
// =======================================================

// Pastikan Anda mengganti ini dengan konfigurasi Firebase Anda sendiri!
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
const scoresRef = database.ref('scores'); // <-- BARU: Referensi untuk Skor
console.log(`✔️ Referensi rooms dibuat.`);
console.log(`✔️ Referensi scores dibuat.`); // <-- BARU

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
const shareLinkInput = document.getElementById('share-link-input');
const copyLinkBtn = document.getElementById('copy-link-btn');
const roomIDDisplay = document.getElementById('room-id-display');
const nicknameSaveStatus = document.getElementById('nickname-save-status');

// =======================================================
// UTILITY FUNCTIONS (NICKNAME & ROOM ID)
// =======================================================

function saveNickname() {
    if (nickname) {
        localStorage.setItem('tictactoe_nickname', nickname);
        nicknameSaveStatus.textContent = `Nama tersimpan: ${nickname}`;
        nicknameSaveStatus.classList.add('saved');
    }
}

function loadNickname() {
    const savedNickname = localStorage.getItem('tictactoe_nickname');
    if (savedNickname) {
        nickname = savedNickname;
        nicknameInput.value = nickname;
        nicknameSaveStatus.textContent = `Nama tersimpan: ${nickname}`;
        nicknameSaveStatus.classList.add('saved');
    }
}

function getRoomIDFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room');
}

// =======================================================
// UTILITY FUNCTIONS (SKOR BARU)
// =======================================================

/**
 * Mengambil skor pemain dari database dan menampilkannya.
 */
function displayPlayerScore() {
    const scoreDisplay = document.getElementById('my-score-display');
    if (!nickname) {
        scoreDisplay.textContent = 'Silakan masukkan nama...';
        return;
    }
    
    scoresRef.child(nickname).once('value', snapshot => {
        const score = snapshot.val();
        let stats;
        if (score) {
            stats = `W: ${score.wins || 0} | L: ${score.losses || 0} | D: ${score.draws || 0}`;
        } else {
            stats = 'Belum ada data skor. Mulai bermain!';
        }
        
        scoreDisplay.innerHTML = `<i class="fas fa-trophy"></i> Statistik Anda: <strong>${stats}</strong>`;
    });
}

/**
 * Mengupdate skor pemain (Win, Loss, atau Draw) menggunakan transaction.
 */
function updatePlayerScore(playerNickname, resultType) {
    if (!playerNickname) return;
    
    const playerRef = scoresRef.child(playerNickname);
    
    // Gunakan transaksi untuk memastikan data diupdate dengan benar saat banyak pemain mengupdate
    playerRef.transaction((currentData) => {
        if (currentData === null) {
            currentData = { wins: 0, losses: 0, draws: 0 };
        }
        
        if (resultType === 'win') {
            currentData.wins = (currentData.wins || 0) + 1;
        } else if (resultType === 'loss') {
            currentData.losses = (currentData.losses || 0) + 1;
        } else if (resultType === 'draw') {
            currentData.draws = (currentData.draws || 0) + 1;
        }
        
        return currentData;
    }, (error, committed, snapshot) => {
        if (error) {
            console.error(`🔴 Transaction gagal untuk ${playerNickname}:`, error);
        } else if (committed) {
            console.log(`🟢 Skor ${playerNickname} diupdate: ${resultType}`);
            displayPlayerScore(); // Refresh tampilan skor setelah update
        }
    });
}

// =======================================================
// GAME UI MANIPULATION
// =======================================================

function showScreen(screenId) {
    setupScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    document.getElementById(screenId).classList.remove('hidden');
}

function generateRoomID() {
    const characters = '0123456789';
    let result = 'GIVY-';
    for (let i = 0; i < 4; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function generateBoardHTML(board) {
    boardElement.innerHTML = board.map((cell, index) => {
        const content = cell === 'X' ? '<i class="fas fa-times"></i>' : (cell === 'O' ? '<i class="fas fa-circle-notch"></i>' : '');
        return `<div class="cell" data-index="${index}">${content}</div>`;
    }).join('');
}

function updateBoardUI(board, winningCombo) {
    const cells = boardElement.querySelectorAll('.cell');
    
    cells.forEach((cell, index) => {
        const content = board[index] === 'X' ? '<i class="fas fa-times"></i>' : (board[index] === 'O' ? '<i class="fas fa-circle-notch"></i>' : '');
        cell.innerHTML = content;
        
        cell.classList.remove('winning-cell', 'clickable');
        if (winningCombo && winningCombo.includes(index)) {
            cell.classList.add('winning-cell');
        }
        
        // Tandai sel yang bisa di-klik jika status 'playing' dan giliran pemain ini
        if (board[index] === "" && playerID && statusMessage.textContent.includes('Giliran Anda')) {
             cell.classList.add('clickable');
        }
    });
}

// =======================================================
// FIREBASE REALTIME UPDATE HANDLER & GAME LOGIC
// =======================================================

const WINNING_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
];

function checkWin(board) {
    for (const combo of WINNING_COMBOS) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return combo; // Mengembalikan kombinasi pemenang
        }
    }
    return null;
}

/**
 * Menangani pembaruan realtime dari Firebase. (DIMODIFIKASI)
 */
function handleRoomUpdate(snapshot) {
    const room = snapshot.val();
    
    if (!room) {
        // Logika saat ruangan dihapus (P1 disconnect)
        showScreen('setup-screen');
        roomIDDisplay.classList.add('hidden');
        if (roomRef) {
             roomRef.off();
        }
        roomRef = null;
        statusMessage.textContent = "Ruangan ditutup oleh host (P1).";
        console.log("🔴 Ruangan tidak ada atau telah dihapus.");
        return;
    }

    const { board, players, turn, winner, status, scoreUpdated } = room; // <-- Tambah scoreUpdated
    
    // Perbarui Tampilan Umum
    showScreen('game-screen');
    boardElement.classList.remove('hidden');
    roomIDDisplay.textContent = `Room ID: ${roomID}`;
    roomIDDisplay.classList.remove('hidden');
    
    const opponentNickname = playerID === 'p1' ? players.p2 : players.p1;
    const playerMark = playerID === 'p1' ? 'X' : 'O';
    const opponentMark = playerID === 'p1' ? 'O' : 'X';
    
    // Logika untuk Update Status dan Skor
    if (status === 'waiting') {
        statusMessage.innerHTML = `Menunggu lawan bergabung... (Anda: ${playerMark})`;
        boardElement.classList.add('disabled');
        shareLinkInput.value = window.location.origin + window.location.pathname + `?room=${roomID}`;
        shareLinkContainer.classList.remove('hidden');
    } else if (status === 'playing') {
        shareLinkContainer.classList.add('hidden');
        boardElement.classList.remove('disabled');
        
        if (turn === playerID) {
            statusMessage.innerHTML = `Giliran Anda (${playerMark}). Lawan: ${opponentNickname} (${opponentMark})`;
        } else {
            statusMessage.innerHTML = `Giliran ${opponentNickname} (${opponentMark}). Lawan: Anda (${playerMark})`;
        }
    } else if (status === 'finished') {
        
        // LOGIKA UPDATE SKOR HANYA SEKALI
        if (!scoreUpdated && players.p2) { // Pastikan P2 ada dan skor belum diupdate
            const p1Nickname = players.p1;
            const p2Nickname = players.p2;

            if (winner === 'draw') {
                updatePlayerScore(p1Nickname, 'draw');
                updatePlayerScore(p2Nickname, 'draw');
            } else if (winner === 'p1') {
                updatePlayerScore(p1Nickname, 'win');
                updatePlayerScore(p2Nickname, 'loss');
            } else if (winner === 'p2') {
                updatePlayerScore(p1Nickname, 'loss');
                updatePlayerScore(p2Nickname, 'win');
            }
            
            // Tandai bahwa skor sudah diupdate
            roomRef.update({ scoreUpdated: true }); 
        }

        // Tampilkan hasil
        if (winner === 'draw') {
            statusMessage.innerHTML = `<i class="fas fa-handshake"></i> **SERI!** Tidak ada yang menang.`;
        } else if (winner === playerID) {
            statusMessage.innerHTML = `<i class="fas fa-trophy"></i> **ANDA MENANG!** (Pemain ${playerID})`;
        } else {
            statusMessage.innerHTML = `<i class="fas fa-frown"></i> **ANDA KALAH.** Pemenangnya adalah ${opponentNickname}.`;
        }
        
        boardElement.classList.add('disabled');
        if (playerID === 'p1') { // Hanya P1 yang bisa menampilkan tombol Main Lagi
            playAgainBtn.classList.remove('hidden');
        }
    }
    
    // Update Board UI setelah status diproses
    updateBoardUI(board, winner && winner !== 'draw' ? checkWin(board) : null);
}

function handleCellClick(event) {
    if (!roomRef || !playerID || !event.target.classList.contains('cell')) return;

    roomRef.once('value', snapshot => {
        const room = snapshot.val();
        if (!room || room.status !== 'playing' || room.turn !== playerID || room.winner) return;

        const cellIndex = parseInt(event.target.dataset.index);
        
        if (room.board[cellIndex] === "") {
            const newBoard = [...room.board];
            const playerMark = playerID === 'p1' ? 'X' : 'O';
            newBoard[cellIndex] = playerMark;

            const winningCombo = checkWin(newBoard);
            const isDraw = !winningCombo && newBoard.every(cell => cell !== "");
            
            let updates = {
                board: newBoard,
                turn: playerID === 'p1' ? 'p2' : 'p1' // Ganti giliran
            };

            if (winningCombo) {
                updates.winner = playerID;
                updates.status = 'finished';
            } else if (isDraw) {
                updates.winner = 'draw';
                updates.status = 'finished';
            }
            
            roomRef.update(updates);
        }
    });
}

/**
 * Mereset papan untuk permainan baru. (DIMODIFIKASI)
 */
function handlePlayAgain() {
    if (!roomRef || playerID !== 'p1') {
        alert('Hanya Pemain 1 (X) yang dapat memulai ulang permainan.');
        return;
    }

    roomRef.once('value', snapshot => {
        const room = snapshot.val();
        
        // Hanya P1 yang bisa mereset setelah game finished
        if (room.status !== 'finished' || !room.players.p2) return; 

        roomRef.update({
            board: Array(9).fill(""),
            turn: 'p1',
            winner: null,
            status: 'playing',
            scoreUpdated: false // <-- BARU: Reset flag skor
        }).then(() => {
            console.log('Permainan direset oleh P1.');
            playAgainBtn.classList.add('hidden');
        });
    });
}

// =======================================================
// ROOM CREATION & JOINING
// =======================================================

function joinRoomSuccess(id, pID) {
    roomID = id;
    playerID = pID;
    roomRef = roomsRef.child(roomID);
    
    // Atur listener untuk perubahan data ruangan
    roomRef.on('value', handleRoomUpdate);
    
    // Siapkan UI
    generateBoardHTML(Array(9).fill(""));
    showScreen('game-screen');
    console.log(`✔️ Berhasil bergabung sebagai ${playerID} di ruangan ${roomID}`);
}

/**
 * Membuat ruangan baru di Firebase Realtime Database. (DIMODIFIKASI)
 */
function createRoom() {
    if (!nickname) {
        alert('Harap masukkan Nama Panggilan Anda.');
        nicknameInput.focus();
        return;
    }
    saveNickname();

    roomID = generateRoomID();
    roomRef = roomsRef.child(roomID);

    const initialRoomState = {
        board: Array(9).fill(""),
        players: { p1: nickname },
        turn: 'p1',
        winner: null,
        status: 'waiting',
        scoreUpdated: false // <-- BARU: Status awal skor
    };
    
    roomRef.set(initialRoomState)
        .then(() => {
            // Atur agar P1 terhapus jika disconnect
            roomRef.onDisconnect().remove(); 
            joinRoomSuccess(roomID, 'p1');
        })
        .catch(error => {
            alert("Gagal membuat ruangan: " + error.message);
        });
}

function joinRoom(id) {
    if (!nickname) {
        alert('Harap masukkan Nama Panggilan Anda.');
        nicknameInput.focus();
        return;
    }
    saveNickname();
    
    const targetRoomRef = roomsRef.child(id);
    
    targetRoomRef.once('value', snapshot => {
        const room = snapshot.val();
        
        if (!room) {
            alert(`Ruangan ${id} tidak ditemukan.`);
            window.history.pushState({}, '', window.location.pathname); // Hapus ?room dari URL
            location.reload();
            return;
        }
        
        if (room.status === 'playing' && room.players.p2) {
            alert(`Ruangan ${id} sudah penuh atau sedang bermain.`);
            return;
        }

        // Bergabung sebagai P2
        targetRoomRef.update({
            'players/p2': nickname,
            status: 'playing'
        }).then(() => {
            // Atur agar P2 menjadi null jika disconnect
            targetRoomRef.child('players/p2').onDisconnect().set(null);
            targetRoomRef.child('status').onDisconnect().set('waiting');
            joinRoomSuccess(id, 'p2');
        }).catch(error => {
            alert("Gagal bergabung: " + error.message);
        });
    });
}

// =======================================================
// EVENT LISTENERS & INITIAL SETUP
// =======================================================

createRoomBtn.addEventListener('click', createRoom);

joinRoomAutoBtn.addEventListener('click', () => {
    const roomFromURL = getRoomIDFromURL();
    if (roomFromURL) {
        joinRoom(roomFromURL);
    } else {
        const inputID = prompt("Masukkan Room ID (contoh: GIVY-1234):");
        if (inputID) {
            joinRoom(inputID.toUpperCase().trim());
        }
    }
});

boardElement.addEventListener('click', handleCellClick);
playAgainBtn.addEventListener('click', handlePlayAgain);

nicknameInput.addEventListener('input', (e) => {
    nickname = e.target.value.trim().substring(0, 15);
    nicknameSaveStatus.classList.remove('saved');
    nicknameSaveStatus.textContent = '';
    
    const roomFromURL = getRoomIDFromURL();
    if (roomFromURL && nickname) {
         joinRoomAutoBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> Gabung ke ${roomFromURL}`;
    }
});


// Logic Salin Link
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

        // Hapus listener onDisconnect yang sudah diatur sebelumnya
        const playerSlotRef = roomRef.child('players').child(playerID);
        playerSlotRef.onDisconnect().cancel();

        // Atur ulang onDisconnect untuk penanganan yang lebih cepat
        if (playerID === 'p1') {
            roomRef.onDisconnect().remove();
        } else if (playerID === 'p2') {
            roomRef.child('players/p2').onDisconnect().set(null);
            roomRef.child('status').onDisconnect().set('waiting');
        }
    }
});

// Initial Setup on Load
document.addEventListener('DOMContentLoaded', () => {
    loadNickname();
    const roomFromURL = getRoomIDFromURL();

    if (nickname) {
        displayPlayerScore(); // <-- BARU: Tampilkan skor saat load
    }
    
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
        joinRoomAutoBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> Gabung Ruangan`;
        createRoomBtn.classList.remove('hidden');
    }
});
