let currentPieceType = null;
let currentBuffer = null;
let currentGame = null;
let selectedCases = new Set();
let resultsSortBy = 'order'; // 'order' | 'time-best' | 'time-worst' | 'case-asc' | 'case-desc'
let flashcardCases = [];
let flashcardIndex = 0;
let flashcardState = 'hidden'; // 'hidden' | 'revealed'
let closingEditModal = false;

document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    initNavigation();
    initMenuHandlers();
    initGameHandlers();
    initFlashcardHandlers();
    initImportHandlers();
    initHistoryNavigation();
    initThemeToggle();
    initHomeButtons();
    initEditModal();
    initPauseSetting();
});

function initPauseSetting() {
    const select = document.getElementById('pause-duration');
    const saved = localStorage.getItem('pauseDuration');
    if (saved !== null) {
        select.value = saved;
    }
    select.addEventListener('change', () => {
        localStorage.setItem('pauseDuration', select.value);
    });
}

function getPauseDuration() {
    return parseInt(localStorage.getItem('pauseDuration') ?? '2000', 10);
}

function showScreen(screenId, addToHistory = true) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');

    if (screenId === 'menu-screen') {
        history.replaceState({ screen: 'menu-screen' }, '', '');
    } else if (addToHistory && history.state?.screen !== screenId) {
        history.pushState({ screen: screenId }, '', '');
    }
}

function initHistoryNavigation() {
    history.replaceState({ screen: 'menu-screen' }, '', '');

    window.addEventListener('popstate', (e) => {
        const editModal = document.getElementById('edit-modal');
        if (editModal.classList.contains('active')) {
            closeEditModal(true);
            return;
        }

        // Modal was just closed via history.back() - stay on current screen
        if (closingEditModal) {
            closingEditModal = false;
            return;
        }

        const pauseOverlay = document.getElementById('pause-overlay');
        if (pauseOverlay.classList.contains('active')) {
            resumeGame();
            history.pushState({ screen: 'game-screen' }, '', '');
            return;
        }

        const resultsScreen = document.getElementById('results-screen');
        if (resultsScreen.classList.contains('active') && currentGame) {
            currentGame = null;
            showScreen('subset-screen', false);
            return;
        }

        if (currentGame) {
            pauseGame();
            history.pushState({ screen: 'game-screen' }, '', '');
            return;
        }

        if (flashcardState !== 'idle') {
            flashcardState = 'idle';
        }

        const targetScreen = e.state?.screen || 'menu-screen';
        showScreen(targetScreen, false);
    });
}

function initNavigation() {
}

function initMenuHandlers() {
    document.getElementById('btn-edges').addEventListener('click', () => selectPieceType('edges'));
    document.getElementById('btn-corners').addEventListener('click', () => selectPieceType('corners'));
    document.getElementById('btn-parity').addEventListener('click', () => selectPieceType('parity'));
    document.getElementById('btn-import').addEventListener('click', () => showScreen('import-screen'));
    document.getElementById('btn-export-menu').addEventListener('click', openExportModal);
    document.getElementById('btn-export-stats').addEventListener('click', () => { closeExportModal(); exportToExcel(); });
    document.getElementById('btn-export-algs').addEventListener('click', () => { closeExportModal(); exportAlgorithmsNxN(); });
    document.getElementById('export-modal-cancel').addEventListener('click', closeExportModal);
    document.getElementById('export-modal').addEventListener('click', (e) => {
        if (e.target.id === 'export-modal') closeExportModal();
    });
    document.getElementById('btn-stats').addEventListener('click', showStats);
    document.getElementById('btn-help').addEventListener('click', openHelpModal);
    document.getElementById('help-modal-close').addEventListener('click', closeHelpModal);
    document.getElementById('help-modal-close-x').addEventListener('click', closeHelpModal);
    document.getElementById('help-modal').addEventListener('click', (e) => {
        if (e.target.id === 'help-modal') closeHelpModal();
    });
    document.getElementById('help-modal').addEventListener('keydown', handleHelpModalKeydown);
}

let helpModalTrigger = null;

function openHelpModal() {
    helpModalTrigger = document.activeElement;
    const modal = document.getElementById('help-modal');
    modal.classList.add('active');
    const closeX = document.getElementById('help-modal-close-x');
    closeX.focus();
}

function closeHelpModal() {
    document.getElementById('help-modal').classList.remove('active');
    if (helpModalTrigger && helpModalTrigger.focus) {
        helpModalTrigger.focus();
    }
    helpModalTrigger = null;
}

function openExportModal() {
    document.getElementById('export-modal').classList.add('active');
}

function closeExportModal() {
    document.getElementById('export-modal').classList.remove('active');
}

function handleHelpModalKeydown(e) {
    if (e.key === 'Escape') {
        closeHelpModal();
        return;
    }
    if (e.key === 'Tab') {
        const modal = document.getElementById('help-modal');
        const focusable = modal.querySelectorAll('button, [tabindex="0"]');
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
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
        const lp2 = a.target2 ? (lp.charAt(1) || a.target2) : null;
        if (!targets1.has(a.target1)) targets1.set(a.target1, lp1);
        if (a.target2 && !targets2.has(a.target2)) targets2.set(a.target2, lp2);
    });

    const select1 = document.getElementById('target1-select');
    const select2 = document.getElementById('target2-select');
    const inversionWrapper = document.getElementById('inversion-toggle-wrapper');
    const isParity = currentPieceType === 'parity';

    select1.innerHTML = '<option value="All">All</option>';
    select2.innerHTML = '<option value="All">All</option>';

    Array.from(targets1.entries()).sort((a, b) => a[1].localeCompare(b[1])).forEach(([target, lp]) => {
        select1.innerHTML += `<option value="${target}">${lp}</option>`;
    });
    Array.from(targets2.entries()).sort((a, b) => a[1].localeCompare(b[1])).forEach(([target, lp]) => {
        select2.innerHTML += `<option value="${target}">${lp}</option>`;
    });

    document.getElementById('target2-wrapper').style.display = isParity ? 'none' : '';
    inversionWrapper.style.display = isParity ? 'none' : '';

    updateSelectedCasesDisplay();

    showScreen('subset-screen');

    document.getElementById('btn-all').onclick = () => selectSubset('all');
    document.getElementById('btn-drill-weak').onclick = () => selectSubset('drill-weak');
    document.getElementById('btn-maintain').onclick = () => selectSubset('maintain');
    document.getElementById('btn-learn-new').onclick = () => selectSubset('learn-new');
    document.getElementById('btn-fast').onclick = () => selectSubset('fast');
    document.getElementById('btn-average').onclick = () => selectSubset('average');
    document.getElementById('btn-slow').onclick = () => selectSubset('slow');
    document.getElementById('btn-unstable').onclick = () => selectSubset('unstable');
    document.getElementById('btn-regressing').onclick = () => selectSubset('regressing');
    document.getElementById('btn-difficult').onclick = () => selectSubset('difficult');

    document.getElementById('btn-add-target').onclick = modifySelection.bind(null, 'add');
    document.getElementById('btn-remove-target').onclick = modifySelection.bind(null, 'remove');
    document.getElementById('btn-reset-selection').onclick = resetSelection;
    document.getElementById('include-inverse').onchange = updateSelectedCasesDisplay;

    document.getElementById('btn-start-game').onclick = startGame;
}

function hasAlgorithm(a) {
    return a.algorithms[0]?.alg?.trim();
}

async function selectSubset(type) {
    const algs = await getAlgorithmsByPieceAndBuffer(currentPieceType, currentBuffer);

    selectedCases.clear();

    if (type === 'all') {
        algs.filter(a => (!a.target2 || a.target1 !== a.target2) && hasAlgorithm(a)).forEach(a => selectedCases.add(a.id));
    } else if (type === 'drill-weak') {
        const weak = await getDrillWeakCases(currentPieceType, currentBuffer);
        weak.filter(a => a.hasAlg).forEach(a => selectedCases.add(a.id));
    } else if (type === 'maintain') {
        const maintain = await getMaintainCases(currentPieceType, currentBuffer);
        maintain.filter(a => a.hasAlg).forEach(a => selectedCases.add(a.id));
    } else if (type === 'learn-new') {
        const newCases = await getNewCases(currentPieceType, currentBuffer);
        newCases.filter(a => a.hasAlg).forEach(a => selectedCases.add(a.id));
    } else if (type === 'slow') {
        const cats = await getCasesByCategory(currentPieceType, currentBuffer);
        cats.slow.filter(a => a.hasAlg).forEach(a => selectedCases.add(a.id));
    } else if (type === 'unstable') {
        const cats = await getCasesByCategory(currentPieceType, currentBuffer);
        cats.unstable.filter(a => a.hasAlg).forEach(a => selectedCases.add(a.id));
    } else if (type === 'regressing') {
        const cats = await getCasesByCategory(currentPieceType, currentBuffer);
        cats.regressing.filter(a => a.hasAlg).forEach(a => selectedCases.add(a.id));
    } else if (type === 'fast') {
        const cats = await getCasesByCategory(currentPieceType, currentBuffer);
        cats.fast.filter(a => a.hasAlg).forEach(a => selectedCases.add(a.id));
    } else if (type === 'average') {
        const cats = await getCasesByCategory(currentPieceType, currentBuffer);
        cats.average.filter(a => a.hasAlg).forEach(a => selectedCases.add(a.id));
    } else if (type === 'difficult') {
        const difficult = await getDifficultCases(currentPieceType, currentBuffer);
        difficult.filter(a => hasAlgorithm(a)).forEach(a => selectedCases.add(a.id));
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

        if (matchT1 && matchT2 && (!a.target2 || a.target1 !== a.target2)) {
            if (action === 'add') {
                selectedCases.add(a.id);
            } else {
                selectedCases.delete(a.id);
            }
        }
    });

    updateSelectedCasesDisplay();
}

function resetSelection() {
    selectedCases.clear();
    updateSelectedCasesDisplay();
}

async function updateSelectedCasesDisplay() {
    const container = document.getElementById('selected-cases');
    if (selectedCases.size === 0) {
        container.innerHTML = '<span class="text-muted">Wybierz przypadki</span>';
        return;
    }

    const algs = await getAlgorithmsByPieceAndBuffer(currentPieceType, currentBuffer);
    const selected = algs.filter(a => selectedCases.has(a.id) && hasAlgorithm(a));
    const labels = selected.map(a => {
        if (a.lp) return a.lp;
        if (a.target2) return `${a.target1}${a.target2}`;
        return a.target1;
    }).sort();

    const preview = labels.length <= 20
        ? labels.join(', ')
        : labels.slice(0, 20).join(', ') + ` ... (+${labels.length - 20})`;

    const includeInverse = document.getElementById('include-inverse').checked;
    let totalCount;
    if (includeInverse) {
        const seen = new Set();
        let uniquePairs = 0;
        let singles = 0;
        for (const a of selected) {
            if (!a.target2) {
                singles++;
            } else {
                const key1 = `${a.target1}-${a.target2}`;
                const key2 = `${a.target2}-${a.target1}`;
                if (!seen.has(key1) && !seen.has(key2)) {
                    seen.add(key1);
                    uniquePairs++;
                }
            }
        }
        totalCount = uniquePairs * 2 + singles;
    } else {
        totalCount = selected.length;
    }

    container.innerHTML = `<strong>Wybrano: ${totalCount}</strong><div class="selected-preview">${preview}</div>`;
}

async function startGame() {
    if (selectedCases.size === 0) {
        alert('Wybierz przynajmniej jeden przypadek');
        return;
    }

    const algs = await getAlgorithmsByPieceAndBuffer(currentPieceType, currentBuffer);
    const filtered = algs.filter(a => selectedCases.has(a.id) && hasAlgorithm(a));

    if (filtered.length === 0) {
        alert('Brak przypadków z algorytmami');
        return;
    }

    const includeInverse = document.getElementById('include-inverse').checked;
    currentGame = new Game(filtered, includeInverse, algs);

    // Reset display before showing
    document.getElementById('game-case').textContent = '';
    document.getElementById('game-alg').textContent = '';
    document.getElementById('game-alg').classList.remove('visible');
    document.getElementById('game-timer').textContent = '';
    document.getElementById('game-avg').textContent = '';
    document.getElementById('game-progress').textContent = '';
    document.getElementById('game-next-preview').textContent = '';
    document.getElementById('game-next-preview').classList.remove('visible');
    document.getElementById('game-tap-area').classList.remove('timing');
    document.getElementById('game-screen').classList.remove('timing');

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

    document.getElementById('btn-pause').addEventListener('click', pauseGame);
    document.getElementById('btn-pause-resume').addEventListener('click', resumeGame);
    document.getElementById('btn-pause-finish').addEventListener('click', finishGameWithResults);
    document.getElementById('btn-pause-cancel').addEventListener('click', cancelGame);

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

        const pause = getPauseDuration();
        if (pause === 0) {
            if (currentGame.next()) {
                startNextCase();
            } else {
                endGame();
                gameState = 'idle';
            }
        } else {
            algPauseRemaining = pause;
            algPauseStartedAt = performance.now();
            document.getElementById('game-alg').classList.remove('visible');
            algPauseTimeout = setTimeout(() => {
                algPauseTimeout = null;
                if (currentGame.next()) {
                    startNextCase();
                } else {
                    endGame();
                    gameState = 'idle';
                }
            }, pause);
        }
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
            pauseGame();
        }
    });

}

let pausedState = null;
let algPauseTimeout = null;
let algPauseRemaining = 0;
let algPauseStartedAt = 0;

function pauseGame() {
    if (!currentGame || gameState === 'paused') return;

    pausedState = gameState;
    gameState = 'paused';
    stopGameTimer();
    if (pausedState === 'timing') {
        currentGame.pauseTimer();
    }

    if (algPauseTimeout) {
        clearTimeout(algPauseTimeout);
        algPauseRemaining = Math.max(0, algPauseRemaining - (performance.now() - algPauseStartedAt));
        algPauseTimeout = null;
    }

    const hasResults = currentGame.getCompletedCount() > 0;
    document.getElementById('btn-pause-finish').disabled = !hasResults;
    document.getElementById('pause-overlay').classList.add('active');
}

function resumeGame() {
    document.getElementById('pause-overlay').classList.remove('active');
    gameState = pausedState;
    pausedState = null;

    if (gameState === 'timing') {
        currentGame.resumeTimer();
        startGameTimer();
    } else if (gameState === 'showingAlg') {
        if (algPauseRemaining > 0) {
            algPauseStartedAt = performance.now();
            algPauseTimeout = setTimeout(() => {
                algPauseTimeout = null;
                if (currentGame.next()) {
                    startNextCase();
                } else {
                    endGame();
                    gameState = 'idle';
                }
            }, algPauseRemaining);
        } else {
            if (currentGame.next()) {
                startNextCase();
            } else {
                endGame();
                gameState = 'idle';
            }
        }
    }
}

function finishGameWithResults() {
    document.getElementById('pause-overlay').classList.remove('active');
    if (algPauseTimeout) {
        clearTimeout(algPauseTimeout);
        algPauseTimeout = null;
    }
    endGame();
    gameState = 'idle';
}

function cancelGame() {
    document.getElementById('pause-overlay').classList.remove('active');
    gameState = 'idle';
    stopGameTimer();
    if (algPauseTimeout) {
        clearTimeout(algPauseTimeout);
        algPauseTimeout = null;
    }
    currentGame = null;
    showScreen('subset-screen', false);
    history.replaceState({ screen: 'subset-screen' }, '', '');
}

function updateGameDisplay() {
    document.getElementById('game-case').textContent = currentGame.getCurrentCase();
    document.getElementById('game-alg').textContent = currentGame.getCurrentAlg();
    document.getElementById('game-progress').textContent = currentGame.getProgress();
    document.getElementById('game-avg').textContent = currentGame.getCurrentAvg() ? `Avg: ${currentGame.getCurrentAvg()}s` : '';
}

function endGame() {
    resultsSortBy = 'order';

    updateResultsSummary();
    renderResultsList();
    initResultsSorting();

    document.getElementById('btn-save-results').onclick = async () => {
        await currentGame.saveAllResults();
        currentGame = null;
        history.back();
    };

    document.getElementById('btn-discard-results').onclick = () => {
        currentGame = null;
        history.back();
    };

    showScreen('results-screen', false);
    history.replaceState({ screen: 'results-screen' }, '', '');
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

    let sorted;
    if (resultsSortBy === 'order') {
        sorted = results;
    } else if (resultsSortBy === 'time-best') {
        sorted = [...results].sort((a, b) => a.time - b.time);
    } else if (resultsSortBy === 'time-worst') {
        sorted = [...results].sort((a, b) => b.time - a.time);
    } else if (resultsSortBy === 'case-asc') {
        sorted = [...results].sort((a, b) => a.case.localeCompare(b.case));
    } else if (resultsSortBy === 'case-desc') {
        sorted = [...results].sort((a, b) => b.case.localeCompare(a.case));
    } else {
        sorted = results;
    }

    const listContainer = document.getElementById('results-list');
    listContainer.innerHTML = '';

    sorted.forEach(r => {
        const item = document.createElement('div');
        item.className = 'result-item';
        if (!currentGame.results.has(r.id)) {
            item.classList.add('removed');
        }

        const isDifficult = r.difficult || currentGame.difficultCases?.has(r.id) || false;

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
    if (column === 'time') {
        if (resultsSortBy === 'order' || resultsSortBy.startsWith('case')) {
            resultsSortBy = 'time-best';
        } else if (resultsSortBy === 'time-best') {
            resultsSortBy = 'time-worst';
        } else {
            resultsSortBy = 'order';
        }
    } else if (column === 'case') {
        if (resultsSortBy === 'order' || resultsSortBy.startsWith('time')) {
            resultsSortBy = 'case-asc';
        } else if (resultsSortBy === 'case-asc') {
            resultsSortBy = 'case-desc';
        } else {
            resultsSortBy = 'order';
        }
    }
    renderResultsList();
}

function updateSortButtons() {
    const caseBtn = document.getElementById('sort-case');
    const timeBtn = document.getElementById('sort-time');

    caseBtn.classList.toggle('active', resultsSortBy.startsWith('case'));
    timeBtn.classList.toggle('active', resultsSortBy.startsWith('time'));

    let caseArrow = '';
    if (resultsSortBy === 'case-asc') caseArrow = '↑';
    else if (resultsSortBy === 'case-desc') caseArrow = '↓';

    let timeArrow = '';
    if (resultsSortBy === 'time-best') timeArrow = '↓';
    else if (resultsSortBy === 'time-worst') timeArrow = '↑';

    caseBtn.querySelector('.sort-arrow').textContent = caseArrow;
    timeBtn.querySelector('.sort-arrow').textContent = timeArrow;
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
    document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.stats-tab[data-tab="global"]').classList.add('active');
    currentStatsTab = 'global';
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
        initCategoryFilter();
        initTrendFilter();
        initDetailsLock();
        restoreActiveFilters();
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
        btn.addEventListener('click', goToMenu);
    });

    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.addEventListener('click', goToMenu);
    });
}

function goToMenu() {
    if (currentGame) {
        stopGameTimer();
        currentGame = null;
        gameState = 'idle';
    }
    flashcardState = 'idle';
    showScreen('menu-screen');
}

let timerInterval = null;
let currentEditId = null;

function initEditModal() {
    const modal = document.getElementById('edit-modal');
    const saveBtn = document.getElementById('edit-modal-save');
    const cancelBtn = document.getElementById('edit-modal-cancel');
    const resetBtn = document.getElementById('edit-modal-reset');

    cancelBtn.addEventListener('click', closeEditModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeEditModal();
    });

    saveBtn.addEventListener('click', async () => {
        if (!currentEditId) return;

        const newAlg = document.getElementById('edit-modal-alg').value.trim();
        const difficult = document.getElementById('edit-modal-difficult').checked;

        await updateAlgorithmText(currentEditId, newAlg);
        await setDifficult(currentEditId, difficult);

        if (currentGame) {
            if (currentGame.allAlgorithms) {
                const alg = currentGame.allAlgorithms.find(a => a.id === currentEditId);
                if (alg) {
                    alg.difficult = difficult;
                    if (alg.algorithms?.[0]) {
                        alg.algorithms[0].alg = newAlg;
                    }
                }
            }
            if (!currentGame.difficultCases) {
                currentGame.difficultCases = new Set();
            }
            if (difficult) {
                currentGame.difficultCases.add(currentEditId);
            } else {
                currentGame.difficultCases.delete(currentEditId);
            }
        }

        closeEditModal();

        if (document.getElementById('flashcard-screen').classList.contains('active')) {
            refreshCurrentFlashcard();
        }

        if (document.getElementById('stats-screen').classList.contains('active')) {
            await renderStatsTab(currentStatsTab);
        }

        if (document.getElementById('results-screen').classList.contains('active') && currentGame) {
            renderResultsList();
        }
    });

    resetBtn.addEventListener('click', async () => {
        if (!currentEditId) return;
        if (!confirm('Na pewno zresetować wyniki tego przypadku?')) return;

        await updateResults(currentEditId, []);
        closeEditModal();

        if (document.getElementById('stats-screen').classList.contains('active')) {
            await showStats();
        }
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
    const difficultCheckbox = document.getElementById('edit-modal-difficult');

    currentEditId = id;
    caseEl.textContent = caseName;

    const alg = await getAlgorithmById(id);
    algInput.value = alg?.algorithms[0]?.alg || '';
    const isDifficultInGame = currentGame?.difficultCases?.has(id);
    difficultCheckbox.checked = isDifficultInGame ?? alg?.difficult ?? false;

    history.pushState({ modal: 'edit' }, '', '');
    modal.classList.add('active');
    algInput.focus();
}

function closeEditModal(skipHistory = false) {
    const modal = document.getElementById('edit-modal');
    if (!modal.classList.contains('active')) return;

    modal.classList.remove('active');
    currentEditId = null;

    if (!skipHistory && history.state?.modal === 'edit') {
        closingEditModal = true;
        history.back();
    }
}

function startGameTimer() {
    const timerEl = document.getElementById('game-timer');

    timerInterval = setInterval(() => {
        if (!currentGame || !currentGame.isTiming) return;
        const elapsed = (performance.now() - currentGame.startTime) / 1000;
        timerEl.textContent = elapsed.toFixed(1) + 's';
    }, 100);
}

function stopGameTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Flashcard mode
function initFlashcardHandlers() {
    document.getElementById('btn-start-flashcard').addEventListener('click', startFlashcard);

    document.getElementById('flashcard-tap-area').addEventListener('click', revealFlashcard);

    document.getElementById('btn-flashcard-fail').addEventListener('click', () => flashcardAnswer(false));
    document.getElementById('btn-flashcard-ok').addEventListener('click', () => flashcardAnswer(true));

    document.getElementById('btn-flashcard-back').addEventListener('click', exitFlashcard);
    document.getElementById('btn-flashcard-edit').addEventListener('click', openFlashcardEdit);

    document.addEventListener('keydown', (e) => {
        if (!document.getElementById('flashcard-screen').classList.contains('active')) return;

        if (e.code === 'Space' && flashcardState === 'hidden') {
            e.preventDefault();
            revealFlashcard();
        } else if (flashcardState === 'revealed') {
            if (e.code === 'ArrowLeft' || e.code === 'Digit1') {
                flashcardAnswer(false);
            } else if (e.code === 'ArrowRight' || e.code === 'Digit2' || e.code === 'Space') {
                e.preventDefault();
                flashcardAnswer(true);
            }
        }
    });
}

async function startFlashcard() {
    if (selectedCases.size === 0) {
        alert('Wybierz przynajmniej jeden przypadek');
        return;
    }

    const algs = await getAlgorithmsByPieceAndBuffer(currentPieceType, currentBuffer);
    flashcardCases = algs.filter(a => selectedCases.has(a.id) && hasAlgorithm(a));

    if (flashcardCases.length === 0) {
        alert('Brak przypadków z algorytmami');
        return;
    }

    // Shuffle
    for (let i = flashcardCases.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [flashcardCases[i], flashcardCases[j]] = [flashcardCases[j], flashcardCases[i]];
    }

    flashcardIndex = 0;
    showScreen('flashcard-screen');
    showFlashcard();
}

function showFlashcard() {
    const c = flashcardCases[flashcardIndex];
    let caseName;
    if (c.lp) caseName = c.lp;
    else if (c.target2) caseName = `${c.target1}${c.target2}`;
    else caseName = c.target1;

    document.getElementById('flashcard-progress').textContent = `${flashcardIndex + 1}/${flashcardCases.length}`;
    document.getElementById('flashcard-case').textContent = caseName;
    document.getElementById('flashcard-alg').textContent = c.algorithms[0].alg;
    document.getElementById('flashcard-alg').classList.remove('visible');

    document.getElementById('flashcard-tap-area').classList.remove('hidden');
    document.getElementById('flashcard-buttons').classList.add('hidden');

    flashcardState = 'hidden';
}

function revealFlashcard() {
    if (flashcardState !== 'hidden') return;

    document.getElementById('flashcard-alg').classList.add('visible');
    document.getElementById('flashcard-tap-area').classList.add('hidden');
    document.getElementById('flashcard-buttons').classList.remove('hidden');

    flashcardState = 'revealed';
}

async function flashcardAnswer(known) {
    const c = flashcardCases[flashcardIndex];

    if (!known) {
        await setDifficult(c.id, true);
    }

    flashcardIndex++;

    if (flashcardIndex >= flashcardCases.length) {
        exitFlashcard();
        return;
    }

    showFlashcard();
}

function exitFlashcard() {
    flashcardState = 'idle';
    showScreen('menu-screen');
}

function openFlashcardEdit() {
    if (flashcardCases.length === 0) return;

    const c = flashcardCases[flashcardIndex];
    let caseName;
    if (c.lp) caseName = c.lp;
    else if (c.target2) caseName = `${c.target1}${c.target2}`;
    else caseName = c.target1;
    openEditModal(c.id, caseName);
}

async function refreshCurrentFlashcard() {
    if (flashcardIndex >= flashcardCases.length) return;

    const c = flashcardCases[flashcardIndex];
    const updated = await getAlgorithmById(c.id);
    if (updated) {
        flashcardCases[flashcardIndex] = updated;
        document.getElementById('flashcard-alg').textContent = updated.algorithms[0]?.alg || '';
    }
}
