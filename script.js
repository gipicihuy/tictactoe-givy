// =======================================================
// FIREBASE CONFIGURATION & INITIALIZATION
// =======================================================

// !!! IMPORTANT: REPLACE WITH YOUR ACTUAL FIREBASE CONFIG !!!
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
const roomsRef = database.ref('rooms');

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
 * @returns {string} The generated room ID.
 */
function generateRoomID() {
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    return `GIVY-${randomNum}`;
}

/**
 * Gets the room ID from the URL query parameters.
 * @returns {string | null} The room ID or null.
 */
function getRoomIDFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room');
}

/**
 * Saves the nickname to local storage.
 */
function saveNickname() {
    localStorage.setItem('givy-tictactoe-nickname', nicknameInput.value.trim());
    nickname = nicknameInput.value.trim();
    document.getElementById('nickname-save-status').textContent = 'Nickname saved!';
    setTimeout(() => document.getElementById('nickname-save-status').textContent = '', 2000);
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
 * Generates the 3x3 board cells.
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
 * @param {Array<string>} boardState The current state of the board array.
 * @param {Array<number> | null} winningCells The indices of the winning combination.
 */
function updateBoardUI(boardState, winningCells = null) {
    const cells = boardElement.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        const marker = boardState[index];
        cell.textContent = marker === 'X' ? '✖️' : (marker === 'O' ? '⭕' : '');
        cell.className = 'cell'; // Reset classes
        cell.dataset.index = index;
        
        if (marker === 'X') cell.classList.add('x');
        if (marker === 'O') cell.classList.add('o');

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
    roomID = generateRoomID();
    roomRef = roomsRef.child(roomID);

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
            playerID = 'p1';
            joinRoomSuccess();
            const shareLink = `${window.location.origin}${window.location.pathname}?room=${roomID}`;
            shareLinkInput.value = shareLink;
            shareLinkContainer.classList.remove('hidden');
            console.log(`Room ${roomID} created. You are p1 (X).`);
        })
        .catch(error => {
            console.error("Error creating room:", error);
            statusMessage.textContent = 'Error creating room. Try again.';
        });
}

/**
 * Attempts to join an existing room.
 * @param {string} id The room ID to join.
 */
function joinRoom(id) {
    roomID = id;
    roomRef = roomsRef.child(roomID);

    roomRef.once('value', snapshot => {
        const room = snapshot.val();
        if (!room) {
            alert(`Room ${roomID} not found or has been deleted.`);
            window.location.href = window.location.origin + window.location.pathname; // Clear URL
            return;
        }

        if (room.status === 'playing' || room.status === 'finished') {
            // Check if the current user is already in the room
            if (room.players.p1 === nickname || room.players.p2 === nickname) {
                 // Rejoin as the existing player
                 playerID = room.players.p1 === nickname ? 'p1' : 'p2';
            } else if (room.players.p2) {
                // Room is full and player is new
                alert(`Room ${roomID} is already full or a game is in progress.`);
                window.location.href = window.location.origin + window.location.pathname; // Clear URL
                return;
            }
        }

        if (!room.players.p2) {
            // Player 2 joins
            playerID = 'p2';
            roomRef.update({
                'players/p2': nickname,
                status: 'playing' // Game starts
            }).then(joinRoomSuccess);
            console.log(`Joined room ${roomID}. You are p2 (O).`);
        } else {
            // Player 1 rejoins or room is full (handled above)
            playerID = 'p1';
            joinRoomSuccess();
            console.log(`Re-joined room ${roomID}. You are p1 (X).`);
        }

    }).catch(error => {
        console.error("Error joining room:", error);
        alert('An error occurred while trying to join the room.');
    });
}

/**
 * Post-join setup for all players.
 */
function joinRoomSuccess() {
    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    boardElement.classList.remove('hidden');
    roomIDDisplay.textContent = `Room ID: ${roomID} - You are ${playerID.toUpperCase() === 'P1' ? 'X' : 'O'}`;
    roomIDDisplay.classList.remove('hidden');
    generateBoardHTML();
    
    // Start listening for real-time updates
    roomRef.on('value', handleRoomUpdate);
}


// =======================================================
// FIREBASE REALTIME UPDATE HANDLER
// =======================================================

/**
 * Handles real-time updates from Firebase.
 * @param {Object} snapshot The Firebase snapshot object.
 */
function handleRoomUpdate(snapshot) {
    const room = snapshot.val();
    if (!room) {
        // Room deleted
        statusMessage.textContent = 'Opponent left, room deleted. Redirecting...';
        setTimeout(() => window.location.href = window.location.origin + window.location.pathname, 3000);
        return;
    }

    const { board, players, turn, winner, status } = room;
    const opponentNickname = playerID === 'p1' ? (players.p2 || 'Awaiting Opponent') : (players.p1 || 'Awaiting Opponent');
    const myMarker = playerID === 'p1' ? 'X' : 'O';

    updateBoardUI(board, winner ? checkWin(board) : null);
    playAgainBtn.classList.add('hidden');
    shareLinkContainer.classList.add('hidden');
    
    // --- Update Status Message ---
    if (status === 'waiting') {
        statusMessage.textContent = `Waiting for ${opponentNickname} to join...`;
        // Only Player 1 sees the share link on this screen
        if (playerID === 'p1') {
            shareLinkContainer.classList.remove('hidden');
        }
    } else if (status === 'playing') {
        if (turn === playerID) {
            statusMessage.textContent = `🟢 Your turn (${myMarker})!`;
        } else {
            statusMessage.textContent = `🔴 ${opponentNickname}'s turn.`;
        }
    } else if (status === 'finished') {
        // Game Over logic
        if (winner === 'draw') {
            statusMessage.textContent = '🤝 It\'s a Draw!';
        } else if (winner === playerID) {
            statusMessage.textContent = `🎉 You Win! (${myMarker} is the winner)`;
        } else {
            const winnerMarker = winner === 'p1' ? 'X' : 'O';
            statusMessage.textContent = `😔 ${opponentNickname} Wins! (${winnerMarker} is the winner)`;
        }
        playAgainBtn.classList.remove('hidden');
    }
}

// =======================================================
// GAME LOGIC
// =======================================================

const WINNING_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

/**
 * Checks if there is a winner and returns the winning combination or null.
 * @param {Array<string>} board The current board state.
 * @returns {Array<number> | null} The winning indices or null.
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
 * Handles a cell click (a player's move).
 * @param {Event} event The click event.
 */
function handleCellClick(event) {
    if (!roomRef || !playerID) return;

    roomRef.once('value', snapshot => {
        const room = snapshot.val();
        const { board, turn, status } = room;
        const index = parseInt(event.target.dataset.index);
        const myMarker = playerID === 'p1' ? 'X' : 'O';

        // 1. Check game status and turn
        if (status !== 'playing') {
            alert('The game is not currently playing.');
            return;
        }
        if (turn !== playerID) {
            alert('It is not your turn!');
            return;
        }
        
        // 2. Check if the cell is already taken
        if (board[index] !== "") {
            alert('That spot is already taken!');
            return;
        }

        // --- Make the move locally and update Firebase ---
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
        });

    });
}

/**
 * Resets the board for a new game. Only the winner or first player should initiate.
 */
function handlePlayAgain() {
    if (!roomRef) return;

    roomRef.once('value', snapshot => {
        const room = snapshot.val();
        
        // Check if the game is actually finished
        if (room.status !== 'finished') return;

        // Reset the state, starting turn with p1
        roomRef.update({
            board: Array(9).fill(""),
            turn: 'p1',
            winner: null,
            status: 'playing' // Start new game
        });
        
        playAgainBtn.classList.add('hidden');
    });
}

// =======================================================
// EVENT LISTENERS & INITIAL SETUP
// =======================================================

createRoomBtn.addEventListener('click', () => {
    nicknameInput.value = nicknameInput.value.trim();
    if (!nicknameInput.value) {
        alert('Please enter a nickname.');
        return;
    }
    saveNickname();
    createRoom();
});

// Since the join room is primarily done via URL, this button will guide/prompt
joinRoomAutoBtn.addEventListener('click', () => {
    const roomFromURL = getRoomIDFromURL();
    if (!roomFromURL) {
        alert('To join a room, you must use the share link provided by the room creator.');
        // Optionally, you could add an input field here for manual ID entry
        return;
    }
    // If we're here, it means we clicked 'Join Room' but the check on load failed for some reason
    // We proceed to join if URL param exists
    nicknameInput.value = nicknameInput.value.trim();
    if (!nicknameInput.value) {
        alert('Please enter a nickname.');
        return;
    }
    saveNickname();
    joinRoom(roomFromURL);
});

playAgainBtn.addEventListener('click', handlePlayAgain);

copyLinkBtn.addEventListener('click', () => {
    shareLinkInput.select();
    document.execCommand('copy');
    copyLinkBtn.textContent = '✅ Copied!';
    setTimeout(() => copyLinkBtn.textContent = '📋 Copy', 2000);
});

// Remove player from database on disconnect (optional but good practice)
window.addEventListener('beforeunload', () => {
    if (roomRef && playerID) {
        roomRef.off(); // Detach listener
        // Simple disconnect handling: clear the player's slot.
        // For a full solution, consider using onDisconnect() to clean up the room.
        // We'll use a simple clean-up for now.
        if (playerID === 'p1') {
            // Player 1 leaving means the room is unplayable, so delete it.
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
        // If a room ID is in the URL, automatically prepare to join
        setupScreen.querySelector('h1').textContent = `Joining Room ${roomFromURL}...`;
        // Pre-fill nickname if possible, but force click to save name and join
        joinRoomAutoBtn.textContent = `🔗 Join ${roomFromURL}`;
        createRoomBtn.classList.add('hidden'); // Hide create room button
        
        // If nickname is already set, jump straight to joining
        if (nickname) {
            joinRoom(roomFromURL);
        }

    } else {
        // If no room ID, show the standard setup screen
        // Ensure "Join Room" button is visible for non-URL-based joining (although not the primary method)
        joinRoomAutoBtn.textContent = `🔗 Join Room (via link)`;
    }
});
