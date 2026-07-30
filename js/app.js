let currentPieceType = null;
let currentBuffer = null;
let currentGame = null;
let selectedCases = new Set();

document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    initNavigation();
    initMenuHandlers();
    initGameHandlers();
    initImportHandlers();
});

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function initNavigation() {
    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.back;
            showScreen(target);
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

    const bufferList = document.getElementById('buffer-list');
    bufferList.innerHTML = '';

    if (buffers.length === 0) {
        bufferList.innerHTML = '<p style="text-align:center;color:var(--text-secondary)">Brak algorytmów. Zaimportuj najpierw dane.</p>';
    } else {
        buffers.forEach(buffer => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary';
            btn.textContent = buffer;
            btn.addEventListener('click', () => selectBuffer(buffer));
            bufferList.appendChild(btn);
        });
    }

    showScreen('buffer-screen');
}

async function selectBuffer(buffer) {
    currentBuffer = buffer;
    selectedCases.clear();

    const algs = await getAlgorithmsByPieceAndBuffer(currentPieceType, currentBuffer);

    const targets1 = new Set();
    const targets2 = new Set();
    algs.forEach(a => {
        targets1.add(a.target1);
        targets2.add(a.target2);
    });

    const select1 = document.getElementById('target1-select');
    const select2 = document.getElementById('target2-select');

    select1.innerHTML = '<option value="All">All</option>';
    select2.innerHTML = '<option value="All">All</option>';

    Array.from(targets1).sort().forEach(t => {
        select1.innerHTML += `<option value="${t}">${t}</option>`;
    });
    Array.from(targets2).sort().forEach(t => {
        select2.innerHTML += `<option value="${t}">${t}</option>`;
    });

    updateSelectedCasesDisplay();
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
        algs.forEach(a => selectedCases.add(a.id));
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
    updateGameDisplay();
}

function initGameHandlers() {
    const tapArea = document.getElementById('game-tap-area');
    const gameScreen = document.getElementById('game-screen');

    const handleTap = (e) => {
        e.preventDefault();

        if (!currentGame) return;

        if (!currentGame.isTiming) {
            currentGame.startTimer();
            tapArea.classList.add('timing');
            document.getElementById('game-alg').classList.remove('visible');
        } else {
            const time = currentGame.stopTimer();
            tapArea.classList.remove('timing');

            currentGame.saveResult(time);
            document.getElementById('game-alg').classList.add('visible');

            setTimeout(() => {
                if (currentGame.next()) {
                    updateGameDisplay();
                    document.getElementById('game-alg').classList.remove('visible');
                } else {
                    endGame();
                }
            }, 300);
        }
    };

    tapArea.addEventListener('touchstart', handleTap, { passive: false });
    tapArea.addEventListener('mousedown', handleTap);

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && document.getElementById('game-screen').classList.contains('active')) {
            e.preventDefault();
            handleTap(e);
        }
    });
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
    const results = currentGame.getResultsList();
    const avg = currentGame.getSessionAvg();

    document.getElementById('session-summary').innerHTML = `
        <div class="avg">${avg.toFixed(2)}s</div>
        <div>${results.length} case'ów</div>
    `;

    const listContainer = document.getElementById('results-list');
    listContainer.innerHTML = '';

    results.forEach(r => {
        const item = document.createElement('div');
        item.className = 'result-item removable';
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

    document.getElementById('btn-save-results').onclick = async () => {
        await currentGame.saveAllResults();
        showScreen('menu-screen');
    };

    document.getElementById('btn-discard-results').onclick = () => {
        showScreen('menu-screen');
    };

    showScreen('results-screen');
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
