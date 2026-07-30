function mean(arr) {
    if (!arr || arr.length === 0) return NaN;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr) {
    if (!arr || arr.length === 0) return NaN;
    const avg = mean(arr);
    const squareDiffs = arr.map(x => Math.pow(x - avg, 2));
    return Math.sqrt(mean(squareDiffs));
}

async function getGlobalStats() {
    const all = await getAllAlgorithms();

    let totalTime = 0;
    let totalCount = 0;
    let casesWithResults = 0;

    for (const alg of all) {
        const results = alg.algorithms[0]?.results || [];
        if (results.length > 0) {
            totalTime += results.reduce((a, b) => a + b, 0);
            totalCount += results.length;
            casesWithResults++;
        }
    }

    const avgTime = totalCount > 0 ? totalTime / totalCount : 0;

    const hours = Math.floor(totalTime / 3600);
    const mins = Math.floor((totalTime % 3600) / 60);
    const secs = Math.floor(totalTime % 60);
    const timeSpent = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    return {
        totalAlgorithms: all.length,
        casesWithResults,
        totalExecutions: totalCount,
        timeSpent,
        globalAvg: avgTime.toFixed(2)
    };
}

async function getTopNCases(pieceType, buffer, n, statFunc, reverse = false) {
    const algs = await getAlgorithmsByPieceAndBuffer(pieceType, buffer);

    const caseStats = [];
    for (const alg of algs) {
        const results = alg.algorithms[0]?.results || [];
        if (results.length === 0) continue;

        const stat = statFunc(results);
        if (!isNaN(stat)) {
            caseStats.push({
                id: alg.id,
                target1: alg.target1,
                target2: alg.target2,
                stat
            });
        }
    }

    caseStats.sort((a, b) => reverse ? b.stat - a.stat : a.stat - b.stat);

    return caseStats.slice(0, n);
}

async function getSlowCases(pieceType, buffer, n = 40) {
    return getTopNCases(pieceType, buffer, n, mean, true);
}

async function getUnstableCases(pieceType, buffer, n = 40) {
    return getTopNCases(pieceType, buffer, n, std, true);
}

async function getDifficultCases(pieceType, buffer) {
    const algs = await getAlgorithmsByPieceAndBuffer(pieceType, buffer);
    return algs.filter(a => a.difficult);
}

function renderGlobalStats(stats) {
    return `
        <div class="stat-row">
            <span class="stat-label">Algorytmów w bazie</span>
            <span class="stat-value">${stats.totalAlgorithms}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Case'ów z wynikami</span>
            <span class="stat-value">${stats.casesWithResults}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Łączna liczba wykonań</span>
            <span class="stat-value">${stats.totalExecutions}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Czas spędzony</span>
            <span class="stat-value">${stats.timeSpent}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Średni czas</span>
            <span class="stat-value">${stats.globalAvg}s</span>
        </div>
    `;
}
