// --- 1. KONFIGURASI FIREBASE ANDA (WAJIB DIGANTI!) ---
const firebaseConfig = {
    apiKey: "AIzaSyBnta8VP5aK0wqPHnuZFhBjXDZQMQ-YtIw", // Ganti
    authDomain: "tictactoe-givy.firebaseapp.com",     // Ganti
    projectId: "tictactoe-givy",                     // Ganti
    // PASTE databaseURL LENGKAP DI SINI:
    databaseURL: "https://tictactoe-givy-default-rtdb.asia-southeast1.firebasedatabase.app", 
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth(); // Inisialisasi Auth

// --- VARIABEL GLOBAL ---
let currentRoomId = null;
let currentPlayerName = null;
let currentPlayerRole = null; // 'X' atau 'O'
let currentUserId = null; // UID untuk keamanan

// Cache DOM elements
const $ = (id) => document.getElementById(id);
const cells = document.querySelectorAll('.cell');

// Fungsi Utility
const generateRoomId = () => Math.random().toString(36).substring(2, 10).toUpperCase();
const winningConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Baris
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Kolom
    [0, 4, 8], [2, 4, 6]            // Diagonal
];

// --- A. FUNGSI UTAMA (CREATE, JOIN, LISTEN) ---

function createAndHostRoom(name, userId) { 
    currentRoomId = generateRoomId();
    const roomRef = database.ref('rooms/' + currentRoomId);
    
    const initialRoomData = {
        playerX: name,
        playerX_uid: userId, 
        playerO: null,
        playerO_uid: null, 
        mode: 'multiplayer',
        status: 'waiting',
        board: Array(9).fill(''),
        currentTurn: 'X',
        winner: null,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    roomRef.set(initialRoomData)
        .then(() => {
            displayGameView();
            history.pushState(null, '', `?id=${currentRoomId}`); 
            listenToRoomChanges(roomRef);
        })
        .catch(error => alert("Gagal membuat room: " + error.message));
}


function joinExistingRoom(id, name, userId) {
    const roomRef = database.ref('rooms/' + id);

    roomRef.once('value', (snapshot) => {
        const roomData = snapshot.val();

        if (!roomData) {
            alert("Room tidak ditemukan atau sudah kadaluwarsa.");
            window.location.search = '';
            return;
        }

        if (roomData.playerO) {
            alert("Room sudah penuh dan game sedang berlangsung!");
            window.location.search = '';
            return;
        }
        
        // Slot tersedia: Gabung sebagai Pemain O
        roomRef.update({
            playerO: name,
            playerO_uid: userId, 
            status: 'active'
        }).then(() => {
            displayGameView();
            listenToRoomChanges(roomRef);
        });
    });
}


function listenToRoomChanges(roomRef) {
    roomRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            alert('Room ini sudah tidak tersedia (Game Over atau kadaluwarsa). Kembali ke lobby.');
            window.location.search = '';
            return;
        }

        // Update Info UI
        $('room-info').textContent = `Room: ${currentRoomId} | X: ${data.playerX} | O: ${data.playerO || 'Menunggu...'}`;
        
        // Cek Status Game
        if (data.status === 'finished') {
            const result = data.winner === 'Draw' ? 'Hasil Seri (Draw)!' : `🎉 Pemenang: ${data.winner} (${data.winner === currentPlayerRole ? 'Anda Menang!' : 'Anda Kalah!'})!`;
            $('status-display').textContent = result;
            $('board').classList.add('game-over');
        } else if (data.status === 'waiting') {
            $('status-display').textContent = 'Menunggu Lawan... Bagikan Link Ini!';
            $('board').classList.remove('game-over');
        } else if (data.status === 'active') {
            const turnName = data.currentTurn === currentPlayerRole ? 'ANDA' : (data.currentTurn === 'X' ? data.playerX : data.playerO);
            $('status-display').textContent = `Giliran: ${turnName} (${data.currentTurn})`;
            $('board').classList.remove('game-over');
        }
        
        drawBoard(data);
    });
}

// --- B. LOGIKA GERAKAN (MOVE) ---

cells.forEach((cell) => {
    cell.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.cellIndex);
        const roomRef = database.ref('rooms/' + currentRoomId);
        
        roomRef.once('value', (snapshot) => {
            const data = snapshot.val();

            // Verifikasi Dasar (Meski sudah dilindungi Security Rules)
            if (!data || data.currentTurn !== currentPlayerRole) return alert("Bukan giliran Anda atau game belum siap!");
            if (data.board[index] !== '') return alert("Kotak sudah terisi!");
            if (data.status !== 'active' || data.winner) return;
            
            // Verifikasi Keamanan (Cek UID)
            const expectedUid = currentPlayerRole === 'X' ? data.playerX_uid : data.playerO_uid;
            if (currentUserId !== expectedUid) return alert("Kesalahan Otentikasi: Anda tidak memiliki izin untuk bergerak.");

            // Lakukan Gerakan
            let newBoard = [...data.board];
            newBoard[index] = currentPlayerRole;
            
            const nextTurn = currentPlayerRole === 'X' ? 'O' : 'X';
            const winner = checkWinner(newBoard);
            const isDraw = !winner && newBoard.every(cell => cell !== '');

            // Update Database
            roomRef.update({
                board: newBoard,
                currentTurn: winner || isDraw ? null : nextTurn,
                winner: winner || (isDraw ? 'Draw' : null),
                status: winner || isDraw ? 'finished' : 'active'
            });
        });
    });
});


// --- C. LOGIKA KEMENANGAN ---

function checkWinner(board) {
    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a]; 
        }
    }
    return null;
}

// --- D. PENANGANAN NAMA & OTENTIKASI ---

$('name-form').addEventListener('submit', (e) => {
    e.preventDefault();
    currentPlayerName = $('player-name-input').value.trim();
    $('name-modal').style.display = 'none';

    // Langkah Kunci: Otentikasi Anonim untuk mendapatkan UID
    auth.signInAnonymously()
        .then((userCredential) => {
            currentUserId = userCredential.user.uid; 

            if (currentPlayerRole === 'X') {
                createAndHostRoom(currentPlayerName, currentUserId);
            } else if (currentPlayerRole === 'O') {
                joinExistingRoom(currentRoomId, currentPlayerName, currentUserId);
            }
        })
        .catch((error) => {
            console.error("Gagal otentikasi:", error);
            alert("Gagal memulai permainan. Cek koneksi Anda.");
            window.location.search = ''; 
        });
});


// --- E. INIT SAAT HALAMAN DIMUAT & UTILITY UI ---

window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id) {
        currentRoomId = id;
        currentPlayerRole = 'O'; 
        $('player-role-display').textContent = 'O (Gabung Room)';
        $('lobby-view').style.display = 'none';
        $('name-modal').style.display = 'flex';
    }
};

// Gabung Room secara manual
$('join-manual-btn').addEventListener('click', () => {
    const id = $('manual-room-id').value.trim();
    if (id) {
        window.location.search = `?id=${id}`;
    } else {
        alert('Masukkan Room ID yang valid.');
    }
});

// Buat Room
$('create-room-btn').addEventListener('click', () => {
    const selectedMode = $('game-mode').value;
    
    if (selectedMode === 'multiplayer') {
        currentPlayerRole = 'X';
        $('player-role-display').textContent = 'X (Pembuat Room)';
        $('lobby-view').style.display = 'none';
        $('name-modal').style.display = 'flex';
    } else {
        alert(`Mode ${selectedMode} (vs AI) belum diimplementasikan. Pilih Multiplayer.`);
    }
});


function displayGameView() {
    $('lobby-view').style.display = 'none';
    $('name-modal').style.display = 'none';
    $('game-view').style.display = 'block';
}

function drawBoard(data) {
    cells.forEach((cell, index) => {
        cell.textContent = data.board[index];
        cell.className = 'cell ' + data.board[index];
    });
}

$('copy-link-btn').addEventListener('click', () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link).then(() => {
        alert("Link berhasil disalin!");
    });
});
