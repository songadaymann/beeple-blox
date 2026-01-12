// ============================================
// BEEPLE BLOX - LEADERBOARD SYSTEM
// ============================================

const LEADERBOARD_API = 'https://mann.cool/api/leaderboard';
const GAME_SLUG = 'beeple-blox';
const GAME_URL = 'https://mann.cool/games/beeple-blox'; // Update this to your actual game URL

// Leaderboard Modal DOM Elements
const leaderboardBtn = document.getElementById('leaderboard-btn');
const leaderboardModal = document.getElementById('leaderboard-modal');
const leaderboardContainer = document.getElementById('leaderboard-container');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');

// Old Submit Score Modal DOM Elements (keeping for backwards compatibility)
const submitScoreModal = document.getElementById('submit-score-modal');
const submitTitle = document.getElementById('submit-title');
const submitLevelEl = document.getElementById('submit-level');
const submitScoreEl = document.getElementById('submit-score');
const submitThrowsEl = document.getElementById('submit-throws');
const playerNameInput = document.getElementById('player-name-input');
const connectWalletBtn = document.getElementById('connect-wallet-btn');
const walletAddressDisplay = document.getElementById('wallet-address-display');
const submitScoreBtn = document.getElementById('submit-score-btn');
const skipSubmitBtn = document.getElementById('skip-submit-btn');
const submitStatus = document.getElementById('submit-status');

// New End Game Modal DOM Elements
const endGameModal = document.getElementById('end-game-modal');
const endGameMessage = document.getElementById('end-game-message');
const endScoreEl = document.getElementById('end-score');
const endThrowsEl = document.getElementById('end-throws');
const endLevelEl = document.getElementById('end-level');
const endPlayerNameInput = document.getElementById('end-player-name');
const endConnectWalletBtn = document.getElementById('end-connect-wallet-btn');
const endWalletDisplay = document.getElementById('end-wallet-display');
const endSubmitBtn = document.getElementById('end-submit-btn');
const endPlayAgainBtn = document.getElementById('end-play-again-btn');
const endGameStatus = document.getElementById('end-game-status');
const endLeaderboardList = document.getElementById('end-leaderboard-list');
const shareTwitterBtn = document.getElementById('share-twitter-btn');
const shareCopyBtn = document.getElementById('share-copy-btn');

// State
let connectedAddress = null;
let onSubmitComplete = null;
let currentGameStats = { score: 0, throws: 0, level: 1, isVictory: false };
let playerSubmittedRank = null;

// ============================================
// WALLET CONNECTION (using ethers.js)
// ============================================

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert('No wallet detected. Please install MetaMask or another Web3 wallet.');
        return null;
    }

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);

        if (accounts.length > 0) {
            connectedAddress = accounts[0];
            updateWalletUI();
            return connectedAddress;
        }
    } catch (error) {
        console.error('Wallet connection error:', error);
        if (error.code === 4001) {
            alert('Wallet connection was cancelled.');
        } else {
            alert('Failed to connect wallet. Please try again.');
        }
    }
    return null;
}

function disconnectWallet() {
    connectedAddress = null;
    updateWalletUI();
}

function updateWalletUI() {
    const shortAddr = connectedAddress ? `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}` : '';

    // Update old modal
    if (connectWalletBtn) {
        if (connectedAddress) {
            connectWalletBtn.textContent = 'Disconnect';
            connectWalletBtn.classList.add('connected');
            walletAddressDisplay.textContent = shortAddr;
            walletAddressDisplay.classList.remove('hidden');
        } else {
            connectWalletBtn.textContent = 'Connect Wallet';
            connectWalletBtn.classList.remove('connected');
            walletAddressDisplay.classList.add('hidden');
        }
    }

    // Update new end game modal
    if (endConnectWalletBtn) {
        if (connectedAddress) {
            endConnectWalletBtn.textContent = 'Disconnect';
            endConnectWalletBtn.classList.add('connected');
            endWalletDisplay.textContent = shortAddr;
            endWalletDisplay.classList.remove('hidden');
        } else {
            endConnectWalletBtn.textContent = 'Connect Wallet';
            endConnectWalletBtn.classList.remove('connected');
            endWalletDisplay.classList.add('hidden');
        }
    }
}

function shortenAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ============================================
// LEADERBOARD FETCH & DISPLAY
// ============================================

async function fetchLeaderboard(limit = 50) {
    try {
        const params = new URLSearchParams({
            game: GAME_SLUG,
            limit: limit
        });

        const response = await fetch(`${LEADERBOARD_API}?${params}`);
        const data = await response.json();

        if (data.success && data.entries) {
            return data.entries;
        }
        return [];
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        return [];
    }
}

function renderLeaderboard(entries, containerEl, highlightName = null) {
    if (!entries || entries.length === 0) {
        containerEl.innerHTML = '<div class="leaderboard-empty">No scores yet. Be the first!</div>';
        return;
    }

    const html = entries.map((entry, index) => {
        const rank = index + 1;
        const isTop3 = rank <= 3;
        const isHighlight = highlightName && entry.name === highlightName;

        // Check if using end-game modal styles
        const isEndModal = containerEl === endLeaderboardList;
        const entryClass = isEndModal ? 'end-leaderboard-entry' : 'leaderboard-entry';
        const rankClass = isEndModal ? 'end-leaderboard-rank' : 'leaderboard-rank';
        const nameClass = isEndModal ? 'end-leaderboard-name' : 'leaderboard-name';
        const scoreClass = isEndModal ? 'end-leaderboard-score' : 'leaderboard-score';
        const detailsClass = isEndModal ? 'end-leaderboard-details' : 'leaderboard-details';

        return `
            <div class="${entryClass} ${isTop3 ? 'top-3' : ''} ${isHighlight ? 'highlight' : ''}">
                <div class="${rankClass}">#${rank}</div>
                <div class="${nameClass}">
                    ${escapeHtml(entry.name)}
                    ${entry.address ? `<span style="opacity: 0.4; font-size: 10px;"> (${shortenAddress(entry.address)})</span>` : ''}
                </div>
                <div class="${scoreClass}">Lvl ${entry.level || '?'}</div>
                <div class="${detailsClass}">
                    ${entry.throws || '?'} throws
                </div>
            </div>
        `;
    }).join('');

    containerEl.innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function showLeaderboard() {
    leaderboardModal.classList.remove('hidden');
    leaderboardContainer.innerHTML = '<div class="leaderboard-loading">Loading...</div>';

    const entries = await fetchLeaderboard();
    renderLeaderboard(entries, leaderboardContainer);
}

function hideLeaderboard() {
    leaderboardModal.classList.add('hidden');
}

// ============================================
// SCORE SUBMISSION
// ============================================

async function submitScore(name, scoreValue, throwsValue, levelValue, address = null) {
    try {
        // Ranking: higher level first, then fewer throws wins (API sorts ascending)
        // Formula: -level * 10000 + throws
        // e.g., Level 20 with 50 throws = -199950, Level 20 with 100 throws = -199900
        // Lower values rank higher, so fewer throws at same level = better rank
        const sortScore = -(levelValue * 10000) + throwsValue;

        const payload = {
            game: GAME_SLUG,
            name: name,
            score: sortScore,
            throws: throwsValue,
            level: levelValue
        };

        if (address) {
            payload.address = address;
        }

        const response = await fetch(LEADERBOARD_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            return { success: true, rank: data.rank };
        } else {
            return { success: false, error: data.error || 'Unknown error' };
        }
    } catch (error) {
        console.error('Failed to submit score:', error);
        return { success: false, error: 'Network error. Please try again.' };
    }
}

// ============================================
// NEW END GAME MODAL
// ============================================

async function showEndGameModal(scoreValue, throwsValue, levelValue, isVictory = false, callback = null) {
    onSubmitComplete = callback;
    currentGameStats = { score: scoreValue, throws: throwsValue, level: levelValue, isVictory };
    playerSubmittedRank = null;

    // Update message
    if (isVictory) {
        endGameMessage.textContent = 'You beat all 20 levels!';
        endGameMessage.style.color = '#44ff44';
    } else {
        endGameMessage.textContent = `Game Over - You reached level ${levelValue}`;
        endGameMessage.style.color = '#e8847c';
    }

    // Update stats
    endScoreEl.textContent = scoreValue.toLocaleString();
    endThrowsEl.textContent = throwsValue;
    endLevelEl.textContent = levelValue;

    // Reset form
    endPlayerNameInput.value = '';
    endGameStatus.classList.add('hidden');
    endSubmitBtn.disabled = false;
    endSubmitBtn.textContent = 'Submit Score';

    // Show modal
    endGameModal.classList.remove('hidden');
    endPlayerNameInput.focus();

    // Load leaderboard
    endLeaderboardList.innerHTML = '<div class="leaderboard-loading">Loading...</div>';
    const entries = await fetchLeaderboard(20);
    renderLeaderboard(entries, endLeaderboardList);
}

function hideEndGameModal() {
    endGameModal.classList.add('hidden');
    if (onSubmitComplete) {
        onSubmitComplete();
        onSubmitComplete = null;
    }
}

async function handleEndGameSubmit() {
    const name = endPlayerNameInput.value.trim();

    if (!name) {
        endGameStatus.textContent = 'Please enter your name';
        endGameStatus.className = 'end-game-status error';
        endGameStatus.classList.remove('hidden');
        return;
    }

    if (name.length < 1 || name.length > 20) {
        endGameStatus.textContent = 'Name must be 1-20 characters';
        endGameStatus.className = 'end-game-status error';
        endGameStatus.classList.remove('hidden');
        return;
    }

    // Disable button and show loading
    endSubmitBtn.disabled = true;
    endSubmitBtn.textContent = 'Submitting...';
    endGameStatus.classList.add('hidden');

    const result = await submitScore(
        name,
        currentGameStats.score,
        currentGameStats.throws,
        currentGameStats.level,
        connectedAddress
    );

    if (result.success) {
        playerSubmittedRank = result.rank;
        endGameStatus.textContent = `Score submitted! You're rank #${result.rank}`;
        endGameStatus.className = 'end-game-status success';
        endGameStatus.classList.remove('hidden');
        endSubmitBtn.textContent = 'Submitted!';

        // Refresh leaderboard with highlight
        const entries = await fetchLeaderboard(20);
        renderLeaderboard(entries, endLeaderboardList, name);
    } else {
        endGameStatus.textContent = result.error;
        endGameStatus.className = 'end-game-status error';
        endGameStatus.classList.remove('hidden');
        endSubmitBtn.disabled = false;
        endSubmitBtn.textContent = 'Submit Score';
    }
}

// ============================================
// SHARING
// ============================================

function getShareText() {
    const { score, throws, level, isVictory } = currentGameStats;

    if (isVictory) {
        return `I beat all 20 levels of BEEPLE BLOX with ${score.toLocaleString()} points using ${throws} throws! Can you beat my score?`;
    } else {
        return `I scored ${score.toLocaleString()} points in BEEPLE BLOX, reaching level ${level} with ${throws} throws! Can you beat me?`;
    }
}

function shareOnTwitter() {
    const text = getShareText();
    const url = GAME_URL;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
}

async function copyShareLink() {
    const text = `${getShareText()} ${GAME_URL}`;

    try {
        await navigator.clipboard.writeText(text);
        shareCopyBtn.classList.add('copied');
        shareCopyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Copied!
        `;

        setTimeout(() => {
            shareCopyBtn.classList.remove('copied');
            shareCopyBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Copy Link
            `;
        }, 2000);
    } catch (error) {
        console.error('Failed to copy:', error);
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        shareCopyBtn.textContent = 'Copied!';
        setTimeout(() => {
            shareCopyBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Copy Link
            `;
        }, 2000);
    }
}

// ============================================
// OLD SUBMIT MODAL (for backwards compatibility)
// ============================================

function showSubmitScoreModal(scoreValue, throwsValue, levelValue, isVictory = false, callback = null) {
    // Redirect to new end game modal
    showEndGameModal(scoreValue, throwsValue, levelValue, isVictory, callback);
}

function hideSubmitScoreModal() {
    hideEndGameModal();
}

async function handleSubmitScore() {
    const name = playerNameInput.value.trim();

    if (!name) {
        submitStatus.textContent = 'Please enter your name';
        submitStatus.className = 'submit-status error';
        submitStatus.classList.remove('hidden');
        return;
    }

    if (name.length < 1 || name.length > 20) {
        submitStatus.textContent = 'Name must be 1-20 characters';
        submitStatus.className = 'submit-status error';
        submitStatus.classList.remove('hidden');
        return;
    }

    submitScoreBtn.disabled = true;
    submitScoreBtn.textContent = 'Submitting...';
    submitStatus.classList.add('hidden');

    const scoreValue = parseInt(submitScoreEl.textContent.replace(/,/g, ''));
    const throwsValue = parseInt(submitThrowsEl.textContent);
    const levelValue = parseInt(submitLevelEl.textContent);

    const result = await submitScore(name, scoreValue, throwsValue, levelValue, connectedAddress);

    if (result.success) {
        submitStatus.textContent = `Score submitted! You're rank #${result.rank}`;
        submitStatus.className = 'submit-status success';
        submitStatus.classList.remove('hidden');

        setTimeout(() => {
            hideSubmitScoreModal();
        }, 2000);
    } else {
        submitStatus.textContent = result.error;
        submitStatus.className = 'submit-status error';
        submitStatus.classList.remove('hidden');
        submitScoreBtn.disabled = false;
        submitScoreBtn.textContent = 'Submit Score';
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

// Leaderboard button (top right)
if (leaderboardBtn) leaderboardBtn.addEventListener('click', showLeaderboard);
if (closeLeaderboardBtn) closeLeaderboardBtn.addEventListener('click', hideLeaderboard);

// Close leaderboard on backdrop click
if (leaderboardModal) {
    leaderboardModal.addEventListener('click', (e) => {
        if (e.target === leaderboardModal) {
            hideLeaderboard();
        }
    });
}

// Old modal wallet connect
if (connectWalletBtn) {
    connectWalletBtn.addEventListener('click', () => {
        if (connectedAddress) {
            disconnectWallet();
        } else {
            connectWallet();
        }
    });
}

// Old modal submit
if (submitScoreBtn) submitScoreBtn.addEventListener('click', handleSubmitScore);
if (skipSubmitBtn) skipSubmitBtn.addEventListener('click', hideSubmitScoreModal);
if (playerNameInput) {
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSubmitScore();
    });
}

// New end game modal events
if (endConnectWalletBtn) {
    endConnectWalletBtn.addEventListener('click', () => {
        if (connectedAddress) {
            disconnectWallet();
        } else {
            connectWallet();
        }
    });
}

if (endSubmitBtn) endSubmitBtn.addEventListener('click', handleEndGameSubmit);

if (endPlayAgainBtn) {
    endPlayAgainBtn.addEventListener('click', () => {
        hideEndGameModal();
        // The callback will trigger restart
    });
}

if (endPlayerNameInput) {
    endPlayerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleEndGameSubmit();
    });
}

// Share buttons
if (shareTwitterBtn) shareTwitterBtn.addEventListener('click', shareOnTwitter);
if (shareCopyBtn) shareCopyBtn.addEventListener('click', copyShareLink);

// Check for existing wallet connection on load
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
            if (accounts.length > 0) {
                connectedAddress = accounts[0];
                updateWalletUI();
            }
        })
        .catch(console.error);

    // Listen for account changes
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
            connectedAddress = accounts[0];
        } else {
            connectedAddress = null;
        }
        updateWalletUI();
    });
}

// Export functions for game.js to use
window.BeepleLeaderboard = {
    showSubmitScoreModal,
    hideSubmitScoreModal,
    showEndGameModal,
    hideEndGameModal,
    showLeaderboard,
    hideLeaderboard
};

console.log('Leaderboard system initialized');
