// --- 1. KONFIGURASI FIREBASE ANDA (WAJIB DIGANTI!) ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", 
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_DATABASE_URL.firebaseio.com", 
    projectId: "YOUR_PROJECT_ID",
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
// ------------------------------------------------------------------

let currentRoomId = null;
let currentPlayerName = null;
let currentPlayerRole = null; // 'X' atau 'O'

// Cache DOM elements
const $ = (id) => document.getElementById(id);
const cells = document.querySelectorAll('.cell');

// Fungsi Utility
const generateRoomId = () => Math.random().toString(36).substring(2, 10).toUpperCase();

// --- A. FUNGSI PEMBUATAN ROOM (Pemain X) ---
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

// --- B. FUNGSI GABUNG ROOM (Pemain O atau Manual Join) ---
$('join-manual-btn').addEventListener('click', () => {
    const id = $('manual-room-id').value.trim();
    if (id) {
        window.location.search = `?id=${id}`;
    } else {
        alert('Masukkan Room ID yang valid.');
    }
});


// --- C. PENANGANAN SUBMIT NAMA ---
$('name-form').addEventListener('submit', (e) => {
    e.preventDefault();
    currentPlayerName = $('player-name-input').value.trim();
    $('name-modal').style.display = 'none';

    if (currentPlayerRole === 'X') {
        createAndHostRoom(currentPlayerName);
    } else if (currentPlayerRole === 'O') {
        joinExistingRoom(currentRoomId, currentPlayerName);
    }
});


// --- D. LOGIKA UTAMA (CREATE, JOIN, LISTEN) ---

function createAndHostRoom(name) {
    currentRoomId = generateRoomId();
    const roomRef = database.ref('rooms/' + currentRoomId);
    
    const initialRoomData = {
        playerX: name,
        playerO: null,
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


function joinExistingRoom(id, name) {
    const roomRef = database.ref('rooms/' + id);

    roomRef.once('value', (snapshot) => {
        const roomData = snapshot.val();

        if (!roomData) {
            alert("Room tidak ditemukan atau sudah kadaluwarsa.");
            window.location.search = '';
            return;
        }

        if (roomData.playerO) {
            // Deteksi Room Full
            alert("Room sudah penuh dan game sedang berlangsung!");
            window.location.search = '';
            return;
        }
        
        // Slot tersedia: Gabung sebagai Pemain O
        roomRef.update({
            playerO: name,
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
            // Room sudah dihapus atau kadaluwarsa
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


// --- E. LOGIKA GERAKAN (MOVE) ---

cells.forEach((cell) => {
    cell.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.cellIndex);
        const roomRef = database.ref('rooms/' + currentRoomId);
        
        roomRef.once('value', (snapshot) => {
            const data = snapshot.val();

            // Verifikasi
            if (!data || data.currentTurn !== currentPlayerRole) return alert("Bukan giliran Anda atau game belum siap!");
            if (data.board[index] !== '') return alert("Kotak sudah terisi!");
            if (data.status !== 'active' || data.winner) return;
            
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


// --- F. LOGIKA KEMENANGAN (Kunci Game Tic-Tac-Toe) ---

const winningConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

function checkWinner(board) {
    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a]; // Mengembalikan 'X' atau 'O'
        }
    }
    return null;
}

// --- G. INIT SAAT HALAMAN DIMUAT & UTILITY UI ---
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
