// =======================================================
// FIREBASE CONFIGURATION & INITIALIZATION
// =======================================================

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBnta8VP5aK0wqPHnuZFhBjXDZQMQ-YtIw",
  authDomain: "tictactoe-givy.firebaseapp.com",
  databaseURL: "https://tictactoe-givy-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tictactoe-givy",
  storageBucket: "tictactoe-givy.firebasestorage.app",
  messagingSenderId: "814206394475",
  appId: "1:814206394475:web:e4a4e4ab9077b23ec7112e",
  measurementId: "G-S7DM9SZXTJ"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✔️ 1. Firebase App initialized successfully.");
}
const database = firebase.database();
const roomsRef = database.ref('rooms');
console.log(`✔️ 2. Rooms reference created. Database URL check: ${roomsRef.toString()}`);

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
 * Generates a random GIVY-XXXX ID.
 */
function generateRoomID() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `GIVY-${randomNum}`;
}

/**
 * Gets the room ID from the URL query parameters.
 */
function getRoomIDFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room');
}

/**
 * Saves the nickname to local storage.
 */
function saveNickname() {
    nicknameInput.value = nicknameInput.value.trim(); // Clean up input
    if (!nicknameInput.value) return false;
    
    localStorage.setItem('givy-tictactoe-nickname', nicknameInput.value);
    nickname = nicknameInput.value;
    document.getElementById('nickname-save-status').textContent = 'Nickname saved!';
    setTimeout(() => document.getElementById('nickname-save-status').textContent = '', 2000);
    return true;
}

/**
 * Loads the nickname from local storage.
 */
function loadNickname() {
    const savedName = localStorage.getItem('givy-tictactoe-nickname');
    if (savedName) {
        nicknameInput.value = savedName;
        nickname = savedName;
    }
}

/**
 * Generates the 3x3 board cells and attaches listeners.
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
 * Updates the visual state of the board.
 */
function updateBoardUI(boardState, winningCells = null) {
    const cells = boardElement.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        const marker = boardState[index];
        
        // Reset and update classes/content
        cell.className = 'cell'; 
        cell.dataset.index = index;

        if (marker === 'X') {
            cell.textContent = '✖️';
            cell.classList.add('x');
        } else if (marker === 'O') {
            cell.textContent = '⭕';
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
 * Creates a new room in the Firebase Realtime Database.
 */
function createRoom() {
    if (!saveNickname()) {
        alert('Please enter a nickname.');
        return;
    }

    roomID = generateRoomID();
    roomRef = roomsRef.child(roomID);

    console.log(`🟡 3. Attempting to create room: ${roomID}`); // Log Aksi

    const initialRoomState = {
        board: Array(9).fill(""),
        players: { p1: nickname },
        turn: 'p1',
        winner: null,
        status: 'waiting'
    };

    // Set the initial room state
    roomRef.set(initialRoomState)
        .then(() => {
            console.log(`🟢 4. SUCCESS: Room ${roomID} created and data sent.`); // Log Berhasil
            playerID = 'p1';
            
            // Update URL
            window.history.pushState(null, '', `?room=${roomID}`);
            
            joinRoomSuccess();
            const shareLink = `${window.location.origin}${window.location.pathname}?room=${roomID}`;
            shareLinkInput.value = shareLink;
        })
        .catch(error => {
            console.error("🔴 4. ERROR creating room (Check Security Rules):", error); // Log Gagal
            statusMessage.textContent = 'Error creating room. Check console for details.';
        });
}

/**
 * Attempts to join an existing room.
 */
function joinRoom(id) {
    if (!saveNickname()) {
        alert('Please enter a nickname.');
        return;
    }
    
    roomID = id;
    roomRef = roomsRef.child(roomID);
    console.log(`🟡 3. Attempting to join room: ${roomID}`); // Log Aksi

    roomRef.once('value', snapshot => {
        const room = snapshot.val();
        
        if (!room) {
            console.error(`🔴 4. ERROR joining room: Room ${roomID} not found.`);
            alert(`Room ${roomID} not found or has been deleted.`);
            window.location.href = window.location.origin + window.location.pathname;
            return;
        }

        // Determine playerID (p1 or p2)
        const isP1 = room.players.p1 === nickname;
        const isP2 = room.players.p2 === nickname;

        if (isP1) {
            playerID = 'p1'; // Rejoining as P1
        } else if (isP2) {
            playerID = 'p2'; // Rejoining as P2
        } else if (!room.players.p2) {
            // New player (P2) joining
            playerID = 'p2';
            roomRef.update({
                'players/p2': nickname,
                status: 'playing' // Game starts
            }).then(() => {
                console.log(`🟢 4. SUCCESS: Joined room ${roomID} as P2.`);
                joinRoomSuccess();
            });
            return;
        } else {
            // Room is full
            console.error(`🔴 4. ERROR joining room: Room ${roomID} is full.`);
            alert(`Room ${roomID} is already full.`);
            window.location.href = window.location.origin + window.location.pathname;
            return;
        }

        // If rejoining as P1 or P2, execute success immediately
        console.log(`🟢 4. SUCCESS: Rejoined room ${roomID} as ${playerID}.`);
        joinRoomSuccess();

    }).catch(error => {
        console.error("🔴 4. ERROR joining room (Check Network/Rules):", error);
        alert('An error occurred while trying to join the room.');
    });
}

/**
 * Post-join setup for all players.
 */
function joinRoomSuccess() {
    console.log(`✨ 5. SUCCESS TRANSITION: Entering game screen for Player ${playerID}.`); // Log Transisi
    
    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    boardElement.classList.remove('hidden');
    roomIDDisplay.textContent = `Room ID: ${roomID} - Anda adalah ${playerID.toUpperCase() === 'P1' ? 'X' : 'O'}`;
    roomIDDisplay.classList.remove('hidden');
    generateBoardHTML();
    
    // Start listening for real-time updates
    roomRef.on('value', handleRoomUpdate);
    console.log("6. Listening for real-time updates started."); // Log Listener
}


// =======================================================
// FIREBASE REALTIME UPDATE HANDLER & GAME LOGIC
// =======================================================

const WINNING_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

/**
 * Checks if there is a winner and returns the winning combination or null.
 */
function checkWin(board) {
    for (const combo of WINNING_COMBOS) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return combo; // Returns the winning combination indices
        }
    }
    return null;
}

/**
 * Handles real-time updates from Firebase.
 */
function handleRoomUpdate(snapshot) {
    const room = snapshot.val();
    
    if (!room) {
        console.warn('Room data is null. Opponent may have deleted the room.');
        statusMessage.textContent = 'Opponent left, room deleted. Redirecting...';
        roomRef.off(); // Detach listener
        setTimeout(() => window.location.href = window.location.origin + window.location.pathname, 3000);
        return;
    }

    const { board, players, turn, winner, status } = room;
    const opponentNickname = playerID === 'p1' ? (players.p2 || 'Pemain Lain') : (players.p1 || 'Pemain Lain');
    const myMarker = playerID === 'p1' ? 'X' : 'O';

    updateBoardUI(board, winner && winner !== 'draw' ? checkWin(board) : null);
    playAgainBtn.classList.add('hidden');
    shareLinkContainer.classList.add('hidden');
    
    // --- Update Status Message ---
    if (status === 'waiting') {
        statusMessage.textContent = `Menunggu ${opponentNickname} bergabung...`;
        if (playerID === 'p1') {
            shareLinkContainer.classList.remove('hidden');
        }
    } else if (status === 'playing') {
        if (!players.p2) { // Safety check if P2 disconnected mid-game
            statusMessage.textContent = `Pemain ${opponentNickname} keluar. Menunggu pemain baru...`;
            return;
        }
        if (turn === playerID) {
            statusMessage.textContent = `🟢 Giliran Anda (${myMarker})!`;
        } else {
            statusMessage.textContent = `🔴 Giliran ${opponentNickname}.`;
        }
    } else if (status === 'finished') {
        // Game Over logic
        if (winner === 'draw') {
            statusMessage.textContent = '🤝 Seri (Draw)!';
        } else if (winner === playerID) {
            statusMessage.textContent = `🎉 Anda Menang! (${myMarker} adalah pemenang)`;
        } else {
            const winnerMarker = winner === 'p1' ? 'X' : 'O';
            statusMessage.textContent = `😔 ${opponentNickname} Menang! (${winnerMarker} adalah pemenang)`;
        }
        playAgainBtn.classList.remove('hidden');
    }
}

/**
 * Handles a cell click (a player's move).
 */
function handleCellClick(event) {
    if (!roomRef || !playerID) return;

    roomRef.once('value', snapshot => {
        const room = snapshot.val();
        if (!room) return; // Room may have been deleted by opponent
        
        const { board, turn, status } = room;
        const index = parseInt(event.target.dataset.index);
        const myMarker = playerID === 'p1' ? 'X' : 'O';

        // 1. Check game status and turn
        if (status !== 'playing' || turn !== playerID || board[index] !== "") {
             console.log('Move blocked: Invalid status, not turn, or cell taken.');
            return;
        }

        // --- Make the move and update Firebase state ---
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

        // 3. Update the room state in Firebase
        roomRef.update({
            board: board,
            turn: newTurn,
            status: newStatus,
            winner: winner
        }).then(() => {
             console.log(`Move successful at index ${index}. New turn: ${newTurn}. Status: ${newStatus}`);
        }).catch(error => {
             console.error('Error updating move:', error);
        });

    });
}

/**
 * Resets the board for a new game.
 */
function handlePlayAgain() {
    if (!roomRef) return;
    
    // Only P1 can initiate a full reset to playing
    if (playerID !== 'p1') {
        alert('Hanya Pemain 1 (X) yang dapat memulai ulang permainan.');
        return;
    }

    roomRef.once('value', snapshot => {
        const room = snapshot.val();
        
        if (room.status !== 'finished') return;

        // Reset the state, starting turn with p1
        roomRef.update({
            board: Array(9).fill(""),
            turn: 'p1',
            winner: null,
            status: 'playing' // Start new game
        }).then(() => {
             console.log('Game reset initiated by P1.');
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
        alert('Untuk bergabung, Anda harus menggunakan tautan yang dibagikan oleh pembuat ruangan (Creator).');
        return;
    }
    
    joinRoom(roomFromURL);
});

playAgainBtn.addEventListener('click', handlePlayAgain);

copyLinkBtn.addEventListener('click', () => {
    shareLinkInput.select();
    document.execCommand('copy');
    copyLinkBtn.textContent = '✅ Copied!';
    setTimeout(() => copyLinkBtn.textContent = '📋 Copy', 2000);
});

// --- Handle Disconnect ---
window.addEventListener('beforeunload', () => {
    if (roomRef && playerID) {
        roomRef.off(); // Detach listener
        console.log(`Cleaning up ${playerID} on disconnect...`);

        // Use onDisconnect to clean up the player slot only if the user closes the window unexpectedly
        const playerSlotRef = roomRef.child('players').child(playerID);
        playerSlotRef.onDisconnect().remove();

        if (playerID === 'p1') {
            // Player 1 leaving means the room is unplayable, so delete it after a delay
            // We use remove() on unload to trigger fast cleanup.
             roomRef.remove();
        } else if (playerID === 'p2') {
             // Player 2 leaving leaves the room open for another player.
            roomRef.update({
                'players/p2': null,
                status: 'waiting'
            });
        }
    }
});

// --- Initial Setup on Load ---
document.addEventListener('DOMContentLoaded', () => {
    loadNickname();
    const roomFromURL = getRoomIDFromURL();

    if (roomFromURL) {
        // If room ID is in URL, automatically prepare to join
        setupScreen.querySelector('h2').textContent = `Siap bergabung ke Room ${roomFromURL}?`;
        joinRoomAutoBtn.textContent = `🔗 Gabung ke ${roomFromURL}`;
        createRoomBtn.classList.add('hidden');
        
        // If nickname is already set, we can call joinRoom directly to minimize clicks
        if (nickname) {
             console.log(`Auto-joining room ${roomFromURL} with saved nickname.`);
             joinRoom(roomFromURL);
        } else {
             console.log(`Enter nickname to join room ${roomFromURL}.`);
        }

    } else {
        // No room ID, show standard setup screen
        joinRoomAutoBtn.textContent = `🔗 Gabung Room (via link)`;
        setupScreen.querySelector('h2').textContent = `Buat Ruangan Baru`;
    }
});
