let currentPieceType = null;
let currentBuffer = null;
let currentGame = null;
let selectedCases = new Set();
let resultsSortBy = 'time';
let resultsSortAsc = false;

document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    initNavigation();
    initMenuHandlers();
    initGameHandlers();
    initImportHandlers();
    initHistoryNavigation();
});

function showScreen(screenId, pushState = true) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');

    if (pushState && history.state?.screen !== screenId) {
        history.pushState({ screen: screenId }, '', '');
    }
}

function initHistoryNavigation() {
    history.replaceState({ screen: 'menu-screen' }, '', '');

    window.addEventListener('popstate', (e) => {
        const screen = e.state?.screen || 'menu-screen';

        if (gameState === 'timing' || gameState === 'countdown' || gameState === 'showingAlg') {
            exitGame();
            showScreen('menu-screen', false);
            return;
        }

        showScreen(screen, false);
    });
}

function initNavigation() {
    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.addEventListener('click', () => {
            history.back();
        });
    });
}

function initMenuHandlers() {
    document.getElementById('btn-edges').addEventListener('click', () => selectPieceType('edges'));
    document.getElementById('btn-corners').addEventListener('click', () => selectPieceType('corners'));
    document.getElementById('btn-import').addEventListener('click', () => showScreen('import-screen'));
    document.getElementById('btn-stats').addEventListener('click', showStats);
}

async function selectPieceType(pieceType) {
    currentPieceType = pieceType;
    const buffers = await getBuffersForPiece(pieceType);

    if (buffers.length === 0) {
        alert('Brak algorytmów. Zaimportuj najpierw dane.');
        return;
    }

    if (buffers.length === 1) {
        selectBuffer(buffers[0]);
        return;
    }

    const bufferList = document.getElementById('buffer-list');
    bufferList.innerHTML = '';

    buffers.forEach(buffer => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.textContent = buffer;
        btn.addEventListener('click', () => selectBuffer(buffer));
        bufferList.appendChild(btn);
    });

    showScreen('buffer-screen');
}

async function selectBuffer(buffer) {
    currentBuffer = buffer;
    selectedCases.clear();

    const algs = await getAlgorithmsByPieceAndBuffer(currentPieceType, currentBuffer);

    const targets1 = new Map();
    const targets2 = new Map();
    algs.forEach(a => {
        const lp = a.lp || '';
        const lp1 = lp.charAt(0) || a.target1;
        const lp2 = lp.charAt(1) || a.target2;
        if (!targets1.has(a.target1)) targets1.set(a.target1, lp1);
        if (!targets2.has(a.target2)) targets2.set(a.target2, lp2);
    });

    const select1 = document.getElementById('target1-select');
    const select2 = document.getElementById('target2-select');

    select1.innerHTML = '<option value="All">All</option>';
    select2.innerHTML = '<option value="All">All</option>';

    Array.from(targets1.entries()).sort((a, b) => a[1].localeCompare(b[1])).forEach(([target, lp]) => {
        select1.innerHTML += `<option value="${target}">${lp}</option>`;
    });
    Array.from(targets2.entries()).sort((a, b) => a[1].localeCompare(b[1])).forEach(([target, lp]) => {
        select2.innerHTML += `<option value="${target}">${lp}</option>`;
    });

    updateSelectedCasesDisplay();

    const subsetBackBtn = document.querySelector('#subset-screen .btn-back');
    const buffers = await getBuffersForPiece(currentPieceType);
    subsetBackBtn.dataset.back = buffers.length === 1 ? 'menu-screen' : 'buffer-screen';

    showScreen('subset-screen');

    document.getElementById('btn-all').onclick = () => selectSubset('all');
    document.getElementById('btn-slow').onclick = () => selectSubset('slow');
    document.getElementById('btn-unstable').onclick = () => selectSubset('unstable');
    document.getElementById('btn-difficult').onclick = () => selectSubset('difficult');

    document.getElementById('btn-add-target').onclick = modifySelection.bind(null, 'add');
    document.getElementById('btn-remove-target').onclick = modifySelection.bind(null, 'remove');

    document.getElementById('btn-start-game').onclick = startGame;
}

async function selectSubset(type) {
    const algs = await getAlgorithmsByPieceAndBuffer(currentPieceType, currentBuffer);

    selectedCases.clear();

    if (type === 'all') {
        algs.filter(a => a.target1 !== a.target2).forEach(a => selectedCases.add(a.id));
    } else if (type === 'slow') {
        const slow = await getSlowCases(currentPieceType, currentBuffer, 40);
        slow.forEach(c => selectedCases.add(c.id));
    } else if (type === 'unstable') {
        const unstable = await getUnstableCases(currentPieceType, currentBuffer, 40);
        unstable.forEach(c => selectedCases.add(c.id));
    } else if (type === 'difficult') {
        const difficult = await getDifficultCases(currentPieceType, currentBuffer);
        difficult.forEach(a => selectedCases.add(a.id));
    }

    updateSelectedCasesDisplay();
}

async function modifySelection(action) {
    const t1 = document.getElementById('target1-select').value;
    const t2 = document.getElementById('target2-select').value;

    const algs = await getAlgorithmsByPieceAndBuffer(currentPieceType, currentBuffer);

    algs.forEach(a => {
        const matchT1 = t1 === 'All' || a.target1 === t1;
        const matchT2 = t2 === 'All' || a.target2 === t2;

        if (matchT1 && matchT2 && a.target1 !== a.target2) {
            if (action === 'add') {
                selectedCases.add(a.id);
            } else {
                selectedCases.delete(a.id);
            }
        }
    });

    updateSelectedCasesDisplay();
}

function updateSelectedCasesDisplay() {
    const container = document.getElementById('selected-cases');
    if (selectedCases.size === 0) {
        container.textContent = 'Wybierz case\'y';
    } else {
        container.textContent = `Wybrano: ${selectedCases.size} case'ów`;
    }
}

async function startGame() {
    if (selectedCases.size === 0) {
        alert('Wybierz przynajmniej jeden case');
        return;
    }

    const algs = await getAlgorithmsByPieceAndBuffer(currentPieceType, currentBuffer);
    const filtered = algs.filter(a => selectedCases.has(a.id));

    currentGame = new Game(filtered);

    showScreen('game-screen');
    startCountdown(() => {
        startNextCase();
    });
}

let gameState = 'idle'; // 'idle' | 'countdown' | 'timing' | 'showingAlg'

function startCountdown(callback) {
    const caseEl = document.getElementById('game-case');
    const tapArea = document.getElementById('game-tap-area');
    gameState = 'countdown';

    let count = 3;
    caseEl.textContent = count;
    tapArea.classList.remove('timing');

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            caseEl.textContent = count;
        } else {
            clearInterval(interval);
            callback();
        }
    }, 1000);
}

function startNextCase() {
    const tapArea = document.getElementById('game-tap-area');
    updateGameDisplay();
    document.getElementById('game-alg').classList.remove('visible');
    currentGame.startTimer();
    tapArea.classList.add('timing');
    gameState = 'timing';
}

function initGameHandlers() {
    const tapArea = document.getElementById('game-tap-area');
    const gameScreen = document.getElementById('game-screen');

    const handleTap = (e) => {
        e.preventDefault();

        if (!currentGame || gameState !== 'timing') return;

        const time = currentGame.stopTimer();
        tapArea.classList.remove('timing');
        currentGame.saveResult(time);
        document.getElementById('game-alg').classList.add('visible');
        gameState = 'showingAlg';

        setTimeout(() => {
            if (currentGame.next()) {
                startNextCase();
            } else {
                endGame();
                gameState = 'idle';
            }
        }, 2000);
    };

    tapArea.addEventListener('touchstart', handleTap, { passive: false });
    tapArea.addEventListener('mousedown', handleTap);

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && document.getElementById('game-screen').classList.contains('active')) {
            e.preventDefault();
            handleTap(e);
        }
        if (e.code === 'Escape' && document.getElementById('game-screen').classList.contains('active')) {
            e.preventDefault();
            exitGame();
        }
    });

    document.getElementById('btn-exit-game').addEventListener('click', exitGame);
}

function exitGame() {
    gameState = 'idle';
    currentGame = null;
    showScreen('subset-screen');
}

function updateGameDisplay() {
    document.getElementById('game-case').textContent = currentGame.getCurrentCase();
    document.getElementById('game-alg').textContent = currentGame.getCurrentAlg();
    document.getElementById('game-progress').textContent = currentGame.getProgress();
    document.getElementById('game-last-result').textContent = currentGame.getLastResult() ? `${currentGame.getLastResult()}s` : '';
    document.getElementById('game-avg').textContent = currentGame.getCurrentAvg() ? `Avg: ${currentGame.getCurrentAvg()}` : '';
    document.getElementById('game-next').textContent = currentGame.getNextCase() ? `Next: ${currentGame.getNextCase()}` : '';
}

function endGame() {
    resultsSortBy = 'time';
    resultsSortAsc = false;

    updateResultsSummary();
    renderResultsList();
    initResultsSorting();

    document.getElementById('btn-save-results').onclick = async () => {
        await currentGame.saveAllResults();
        showScreen('menu-screen');
    };

    document.getElementById('btn-discard-results').onclick = () => {
        showScreen('menu-screen');
    };

    showScreen('results-screen');
}

function updateResultsSummary() {
    const results = currentGame.getResultsList();
    const avg = currentGame.getSessionAvg();

    document.getElementById('session-summary').innerHTML = `
        <div class="avg">${avg.toFixed(2)}s</div>
        <div>${results.length} case'ów</div>
    `;
}

function renderResultsList() {
    const results = currentGame.getResultsList();

    const sorted = [...results].sort((a, b) => {
        let cmp;
        if (resultsSortBy === 'case') {
            cmp = a.case.localeCompare(b.case);
        } else {
            cmp = a.time - b.time;
        }
        return resultsSortAsc ? cmp : -cmp;
    });

    const listContainer = document.getElementById('results-list');
    listContainer.innerHTML = '';

    sorted.forEach(r => {
        const item = document.createElement('div');
        item.className = 'result-item removable';
        if (!currentGame.results.has(r.id)) {
            item.classList.add('removed');
        }
        item.innerHTML = `
            <span class="case">${r.case}</span>
            <span class="time">${r.time.toFixed(2)}s</span>
        `;
        item.addEventListener('click', () => {
            item.classList.toggle('removed');
            if (item.classList.contains('removed')) {
                currentGame.removeResult(r.id);
            } else {
                currentGame.results.set(r.id, r.time);
            }
        });
        listContainer.appendChild(item);
    });

    updateSortButtons();
}

function initResultsSorting() {
    document.getElementById('sort-case').onclick = () => toggleSort('case');
    document.getElementById('sort-time').onclick = () => toggleSort('time');
}

function toggleSort(column) {
    if (resultsSortBy === column) {
        resultsSortAsc = !resultsSortAsc;
    } else {
        resultsSortBy = column;
        resultsSortAsc = column === 'case';
    }
    renderResultsList();
}

function updateSortButtons() {
    const caseBtn = document.getElementById('sort-case');
    const timeBtn = document.getElementById('sort-time');

    caseBtn.classList.toggle('active', resultsSortBy === 'case');
    timeBtn.classList.toggle('active', resultsSortBy === 'time');

    caseBtn.querySelector('.sort-arrow').textContent = resultsSortBy === 'case' ? (resultsSortAsc ? '↑' : '↓') : '';
    timeBtn.querySelector('.sort-arrow').textContent = resultsSortBy === 'time' ? (resultsSortAsc ? '↑' : '↓') : '';
}

function initImportHandlers() {
    const fileInput = document.getElementById('import-file');
    const status = document.getElementById('import-status');

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        status.textContent = 'Importowanie...';
        status.className = '';

        try {
            const count = await handleFileImport(file);
            status.textContent = `Zaimportowano ${count} algorytmów`;
            status.className = 'success';
        } catch (err) {
            status.textContent = `Błąd: ${err.message}`;
            status.className = 'error';
        }

        fileInput.value = '';
    });
}

async function showStats() {
    const stats = await getGlobalStats();
    document.getElementById('global-stats').innerHTML = renderGlobalStats(stats);
    showScreen('stats-screen');
}
