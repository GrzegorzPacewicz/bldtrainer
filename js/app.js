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
    initThemeToggle();
    initHomeButtons();
    initEditModal();
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
}

function initMenuHandlers() {
    document.getElementById('btn-edges').addEventListener('click', () => selectPieceType('edges'));
    document.getElementById('btn-corners').addEventListener('click', () => selectPieceType('corners'));
    document.getElementById('btn-import').addEventListener('click', () => showScreen('import-screen'));
    document.getElementById('btn-stats').addEventListener('click', showStats);
    document.getElementById('btn-help').addEventListener('click', openHelpModal);
    document.getElementById('help-modal-close').addEventListener('click', closeHelpModal);
    document.getElementById('help-modal').addEventListener('click', (e) => {
        if (e.target.id === 'help-modal') closeHelpModal();
    });
}

function openHelpModal() {
    document.getElementById('help-modal').classList.add('active');
}

function closeHelpModal() {
    document.getElementById('help-modal').classList.remove('active');
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

    showScreen('subset-screen');

    document.getElementById('btn-all').onclick = () => selectSubset('all');
    document.getElementById('btn-drill-weak').onclick = () => selectSubset('drill-weak');
    document.getElementById('btn-maintain').onclick = () => selectSubset('maintain');
    document.getElementById('btn-learn-new').onclick = () => selectSubset('learn-new');
    document.getElementById('btn-slow').onclick = () => selectSubset('slow');
    document.getElementById('btn-unstable').onclick = () => selectSubset('unstable');
    document.getElementById('btn-regressing').onclick = () => selectSubset('regressing');
    document.getElementById('btn-fast').onclick = () => selectSubset('fast');
    document.getElementById('btn-difficult').onclick = () => selectSubset('difficult');
    document.getElementById('btn-new').onclick = () => selectSubset('new');

    document.getElementById('btn-add-target').onclick = modifySelection.bind(null, 'add');
    document.getElementById('btn-remove-target').onclick = modifySelection.bind(null, 'remove');

    document.getElementById('btn-start-game').onclick = startGame;
}

async function selectSubset(type) {
    const algs = await getAlgorithmsByPieceAndBuffer(currentPieceType, currentBuffer);

    selectedCases.clear();

    if (type === 'all') {
        algs.filter(a => a.target1 !== a.target2).forEach(a => selectedCases.add(a.id));
    } else if (type === 'drill-weak') {
        const weak = await getDrillWeakCases(currentPieceType, currentBuffer);
        weak.forEach(a => selectedCases.add(a.id));
    } else if (type === 'maintain') {
        const maintain = await getMaintainCases(currentPieceType, currentBuffer);
        maintain.forEach(a => selectedCases.add(a.id));
    } else if (type === 'learn-new') {
        const newCases = await getNewCases(currentPieceType, currentBuffer);
        newCases.forEach(a => selectedCases.add(a.id));
    } else if (type === 'slow') {
        const cats = await getCasesByCategory(currentPieceType, currentBuffer);
        cats.slow.forEach(a => selectedCases.add(a.id));
    } else if (type === 'unstable') {
        const cats = await getCasesByCategory(currentPieceType, currentBuffer);
        cats.unstable.forEach(a => selectedCases.add(a.id));
    } else if (type === 'regressing') {
        const cats = await getCasesByCategory(currentPieceType, currentBuffer);
        cats.regressing.forEach(a => selectedCases.add(a.id));
    } else if (type === 'fast') {
        const cats = await getCasesByCategory(currentPieceType, currentBuffer);
        cats.fast.forEach(a => selectedCases.add(a.id));
    } else if (type === 'new') {
        const cats = await getCasesByCategory(currentPieceType, currentBuffer);
        cats.new.forEach(a => selectedCases.add(a.id));
    } else if (type === 'difficult') {
        const difficult = await getDifficultCases(currentPieceType, currentBuffer);
        difficult.forEach(a => selectedCases.add(a.id));
    }

    updateSelectedCasesDisplay();
}

async function modifySelection(action) {
    const t1 = document.getElementById('target1-select').value;
    const t2 = document.getElementById('target2-select').value;
    const includeInverse = document.getElementById('include-inverse').checked;

    const algs = await getAlgorithmsByPieceAndBuffer(currentPieceType, currentBuffer);

    algs.forEach(a => {
        const matchT1 = t1 === 'All' || a.target1 === t1;
        const matchT2 = t2 === 'All' || a.target2 === t2;
        const matchInverse = includeInverse && (
            (t1 === 'All' || a.target2 === t1) &&
            (t2 === 'All' || a.target1 === t2)
        );

        if ((matchT1 && matchT2 || matchInverse) && a.target1 !== a.target2) {
            if (action === 'add') {
                selectedCases.add(a.id);
            } else {
                selectedCases.delete(a.id);
            }
        }
    });

    updateSelectedCasesDisplay();
}

async function updateSelectedCasesDisplay() {
    const container = document.getElementById('selected-cases');
    if (selectedCases.size === 0) {
        container.innerHTML = '<span class="text-muted">Wybierz przypadki</span>';
        return;
    }

    const algs = await getAlgorithmsByPieceAndBuffer(currentPieceType, currentBuffer);
    const selected = algs.filter(a => selectedCases.has(a.id));
    const labels = selected.map(a => a.lp || `${a.target1}${a.target2}`).sort();

    const preview = labels.length <= 20
        ? labels.join(', ')
        : labels.slice(0, 20).join(', ') + ` ... (+${labels.length - 20})`;

    container.innerHTML = `<strong>Wybrano: ${selectedCases.size}</strong><div class="selected-preview">${preview}</div>`;
}

async function startGame() {
    if (selectedCases.size === 0) {
        alert('Wybierz przynajmniej jeden przypadek');
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
    const gameScreen = document.getElementById('game-screen');
    updateGameDisplay();
    document.getElementById('game-alg').classList.remove('visible');
    document.getElementById('game-next-preview').classList.remove('visible');
    document.getElementById('game-timer').textContent = '';
    currentGame.startTimer();
    startGameTimer();
    tapArea.classList.add('timing');
    gameScreen.classList.add('timing');
    gameState = 'timing';
}

function initGameHandlers() {
    const tapArea = document.getElementById('game-tap-area');
    const gameScreen = document.getElementById('game-screen');

    const handleTap = (e) => {
        e.preventDefault();

        if (!currentGame || gameState !== 'timing') return;

        const time = currentGame.stopTimer();
        stopGameTimer();
        document.getElementById('game-timer').textContent = time.toFixed(2) + 's';
        tapArea.classList.remove('timing');
        document.getElementById('game-screen').classList.remove('timing');
        currentGame.saveResult(time);
        document.getElementById('game-alg').classList.add('visible');
        document.getElementById('game-next-preview').textContent = currentGame.getNextCase();
        document.getElementById('game-next-preview').classList.add('visible');
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

}

function exitGame() {
    gameState = 'idle';
    stopGameTimer();
    currentGame = null;
    showScreen('subset-screen');
}

function updateGameDisplay() {
    document.getElementById('game-case').textContent = currentGame.getCurrentCase();
    document.getElementById('game-alg').textContent = currentGame.getCurrentAlg();
    document.getElementById('game-progress').textContent = currentGame.getProgress();
    document.getElementById('game-avg').textContent = currentGame.getCurrentAvg() ? `Avg: ${currentGame.getCurrentAvg()}s` : '';
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
        <div>${results.length} przypadków</div>
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
        item.className = 'result-item';
        if (!currentGame.results.has(r.id)) {
            item.classList.add('removed');
        }

        const isDifficult = currentGame.difficultCases?.has(r.id) || false;

        item.innerHTML = `
            <span class="case">${r.case}</span>
            <span class="result-actions">
                <button class="btn-edit-alg" title="Edytuj algorytm">✎</button>
                <button class="btn-difficult-toggle ${isDifficult ? 'active' : ''}" title="Oznacz jako trudny">!</button>
                <span class="time">${r.time.toFixed(2)}s</span>
                <button class="btn-remove-result" title="Usuń wynik">×</button>
            </span>
        `;

        const editBtn = item.querySelector('.btn-edit-alg');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(r.id, r.case);
        });

        const difficultBtn = item.querySelector('.btn-difficult-toggle');
        difficultBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            difficultBtn.classList.toggle('active');
            if (!currentGame.difficultCases) {
                currentGame.difficultCases = new Set();
            }
            if (difficultBtn.classList.contains('active')) {
                currentGame.difficultCases.add(r.id);
            } else {
                currentGame.difficultCases.delete(r.id);
            }
        });

        const removeBtn = item.querySelector('.btn-remove-result');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
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
    const caseBtn = document.getElementById('sort-case');
    const timeBtn = document.getElementById('sort-time');

    const handleKey = (btn, column) => (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleSort(column);
        }
    };

    caseBtn.onclick = () => toggleSort('case');
    timeBtn.onclick = () => toggleSort('time');
    caseBtn.onkeydown = handleKey(caseBtn, 'case');
    timeBtn.onkeydown = handleKey(timeBtn, 'time');
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
            setTimeout(() => showScreen('menu-screen'), 1000);
        } catch (err) {
            status.textContent = `Błąd: ${err.message}`;
            status.className = 'error';
        }

        fileInput.value = '';
    });
}

let currentStatsTab = 'global';

async function showStats() {
    initStatsTabs();
    await renderStatsTab('global');
    showScreen('stats-screen');
}

function initStatsTabs() {
    document.querySelectorAll('.stats-tab').forEach(tab => {
        tab.onclick = async () => {
            document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentStatsTab = tab.dataset.tab;
            await renderStatsTab(currentStatsTab);
        };
    });
}

async function renderStatsTab(tab) {
    const panel = document.getElementById('stats-panel');

    if (tab === 'global') {
        const stats = await getGlobalStats();
        panel.innerHTML = `<div class="global-stats">${renderGlobalStats(stats)}</div>`;
    } else {
        const pieceType = tab;
        const buffers = await getBuffersForPiece(pieceType);

        if (buffers.length === 0) {
            panel.innerHTML = '<div class="stats-section"><p>Brak danych dla tego typu.</p></div>';
            return;
        }

        let html = '';
        for (const buffer of buffers) {
            const bufferStats = await getBufferStats(pieceType, buffer);
            html += renderBufferStats(buffer, bufferStats);
        }
        panel.innerHTML = html;
        initCaseRowClicks();
        initTableSorting();
        initDetailsLock();
    }
}

function initThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    const saved = localStorage.getItem('theme');

    if (saved === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        toggle.textContent = '☀️';
    }

    toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        if (current === 'light') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'dark');
            toggle.textContent = '🌙';
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            toggle.textContent = '☀️';
        }
    });
}

function initHomeButtons() {
    document.querySelectorAll('.btn-logo').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentGame) {
                stopGameTimer();
                currentGame = null;
                gameState = 'idle';
            }
            history.pushState({ screen: 'menu-screen' }, '', '');
            showScreen('menu-screen', false);
        });
    });
}

let timerInterval = null;
let currentEditId = null;

function initEditModal() {
    const modal = document.getElementById('edit-modal');
    const saveBtn = document.getElementById('edit-modal-save');
    const cancelBtn = document.getElementById('edit-modal-cancel');

    cancelBtn.addEventListener('click', closeEditModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeEditModal();
    });

    saveBtn.addEventListener('click', async () => {
        if (!currentEditId) return;

        const newAlg = document.getElementById('edit-modal-alg').value.trim();
        if (newAlg) {
            await updateAlgorithmText(currentEditId, newAlg);
        }
        closeEditModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeEditModal();
        }
    });
}

async function openEditModal(id, caseName) {
    const modal = document.getElementById('edit-modal');
    const caseEl = document.getElementById('edit-modal-case');
    const algInput = document.getElementById('edit-modal-alg');

    currentEditId = id;
    caseEl.textContent = caseName;

    const alg = await getAlgorithmById(id);
    algInput.value = alg?.algorithms[0]?.alg || '';

    modal.classList.add('active');
    algInput.focus();
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    modal.classList.remove('active');
    currentEditId = null;
}

function startGameTimer() {
    const timerEl = document.getElementById('game-timer');
    const startTime = performance.now();

    timerInterval = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;
        timerEl.textContent = elapsed.toFixed(1) + 's';
    }, 100);
}

function stopGameTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}
