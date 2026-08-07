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

    const edgeBuffers = new Set();
    const cornerBuffers = new Set();
    const parityBuffers = new Set();

    for (const alg of all) {
        const results = alg.algorithms[0]?.results || [];
        if (results.length > 0) {
            totalTime += results.reduce((a, b) => a + b, 0);
            totalCount += results.length;
            casesWithResults++;
        }
        if (alg.pieceType === 'edges') edgeBuffers.add(alg.buffer);
        if (alg.pieceType === 'corners') cornerBuffers.add(alg.buffer);
        if (alg.pieceType === 'parity') parityBuffers.add(alg.buffer);
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
        globalAvg: avgTime.toFixed(2),
        edgeBuffers: edgeBuffers.size,
        cornerBuffers: cornerBuffers.size,
        parityBuffers: parityBuffers.size
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

function categorizeCase(results, globalStats) {
    if (results.length < 5) {
        return 'new';
    }

    const avg = mean(results);
    const stdDev = std(results);
    const { avgTime, stdDevGlobal } = globalStats;

    if (results.length >= 10) {
        const last5 = mean(results.slice(-5));
        const prev5 = mean(results.slice(-10, -5));
        if (last5 > prev5 * 1.15) {
            return 'regressing';
        }
    }

    if (stdDevGlobal > 0 && stdDev > stdDevGlobal * 1.5) {
        return 'unstable';
    }

    if (avg <= avgTime * 0.8) {
        return 'fast';
    } else if (avg >= avgTime * 1.2) {
        return 'slow';
    }

    return 'average';
}

function getTrend(results) {
    if (results.length < 6) return 'none';

    const last3 = mean(results.slice(-3));
    const prev3 = mean(results.slice(-6, -3));

    const diff = (last3 - prev3) / prev3;

    if (diff < -0.1) return 'improving';
    if (diff > 0.1) return 'declining';
    return 'stable';
}

async function getDetailedCaseStats(pieceType, buffer) {
    const algs = await getAlgorithmsByPieceAndBuffer(pieceType, buffer);

    let allTimes = [];
    for (const alg of algs) {
        const results = alg.algorithms[0]?.results || [];
        if (results.length >= 5) {
            allTimes.push(...results);
        }
    }

    const avgTime = allTimes.length > 0 ? mean(allTimes) : 2;
    const stdDevGlobal = allTimes.length > 0 ? std(allTimes) : 0.5;
    const globalStats = { avgTime, stdDevGlobal };

    const cases = [];

    for (const alg of algs) {
        if (alg.target2 && alg.target1 === alg.target2) continue;

        const results = alg.algorithms[0]?.results || [];
        const executions = results.length;
        const avg = executions > 0 ? mean(results) : null;
        const stdDev = executions > 1 ? std(results) : null;
        const category = executions > 0 ? categorizeCase(results, globalStats) : 'new';
        const trend = getTrend(results);
        const best = executions > 0 ? Math.min(...results) : null;
        const worst = executions > 0 ? Math.max(...results) : null;

        let caseName;
        if (alg.lp) caseName = alg.lp;
        else if (alg.target2) caseName = `${alg.target1}${alg.target2}`;
        else caseName = alg.target1;

        const hasAlg = !!(alg.algorithms[0]?.alg?.trim());

        cases.push({
            id: alg.id,
            case: caseName,
            target1: alg.target1,
            target2: alg.target2,
            executions,
            avg,
            stdDev,
            best,
            worst,
            category,
            trend,
            difficult: alg.difficult || false,
            hasAlg
        });
    }

    return cases;
}

async function getCasesByCategory(pieceType, buffer) {
    const cases = await getDetailedCaseStats(pieceType, buffer);

    const categories = {
        fast: [],
        average: [],
        slow: [],
        unstable: [],
        new: [],
        regressing: [],
        difficult: []
    };

    for (const c of cases) {
        if (c.difficult) {
            categories.difficult.push(c);
        }
        if (categories[c.category]) {
            categories[c.category].push(c);
        }
    }

    return categories;
}

async function getBufferStats(pieceType, buffer) {
    const cases = await getDetailedCaseStats(pieceType, buffer);

    let totalTime = 0;
    let totalCount = 0;
    let casesWithResults = 0;
    let allTimes = [];

    for (const c of cases) {
        if (c.executions > 0) {
            casesWithResults++;
            totalCount += c.executions;
            if (c.avg) {
                totalTime += c.avg * c.executions;
                for (let i = 0; i < c.executions; i++) {
                    allTimes.push(c.avg);
                }
            }
        }
    }

    const avgTime = totalCount > 0 ? totalTime / totalCount : 0;
    const stdDev = std(allTimes);

    const categoryCount = {
        fast: 0,
        average: 0,
        slow: 0,
        unstable: 0,
        new: 0,
        regressing: 0,
        difficult: 0
    };

    for (const c of cases) {
        if (categoryCount.hasOwnProperty(c.category)) {
            categoryCount[c.category]++;
        }
        if (c.difficult) {
            categoryCount.difficult++;
        }
    }

    const improving = cases.filter(c => c.trend === 'improving').length;
    const declining = cases.filter(c => c.trend === 'declining').length;
    const stable = cases.filter(c => c.trend === 'stable').length;

    return {
        totalCases: cases.length,
        casesWithResults,
        totalExecutions: totalCount,
        avgTime: avgTime.toFixed(2),
        stdDev: isNaN(stdDev) ? '-' : stdDev.toFixed(2),
        categoryCount,
        trendCount: { improving, declining, stable },
        cases
    };
}

async function getDrillWeakCases(pieceType, buffer) {
    const cats = await getCasesByCategory(pieceType, buffer);
    const weak = [...cats.slow, ...cats.unstable, ...cats.regressing, ...cats.difficult];
    const uniqueIds = new Set();
    return weak.filter(a => {
        if (uniqueIds.has(a.id)) return false;
        uniqueIds.add(a.id);
        return true;
    });
}

async function getMaintainCases(pieceType, buffer) {
    const cats = await getCasesByCategory(pieceType, buffer);
    return [...cats.fast, ...cats.average];
}

async function getNewCases(pieceType, buffer) {
    const cats = await getCasesByCategory(pieceType, buffer);
    return cats.new;
}

function renderGlobalStats(stats) {
    const dailyHtml = renderDailyStats();

    return `
        <div class="stat-row">
            <span class="stat-label">Algorytmów w bazie</span>
            <span class="stat-value">${stats.totalAlgorithms}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Przypadków z wynikami</span>
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
        <div class="stat-row">
            <span class="stat-label">Bufory krawędzi</span>
            <span class="stat-value">${stats.edgeBuffers}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Bufory rogów</span>
            <span class="stat-value">${stats.cornerBuffers}</span>
        </div>
        ${dailyHtml}
    `;
}

function renderDailyStats() {
    const dailyStats = JSON.parse(localStorage.getItem('dailyStats') || '{}');
    const days = Object.keys(dailyStats).sort().reverse().slice(0, 7);

    if (days.length === 0) return '';

    const rows = days.map(day => {
        const d = dailyStats[day];
        const avg = d.executions > 0 ? (d.totalTime / d.executions).toFixed(2) : '-';
        const mins = Math.floor(d.totalTime / 60);
        const secs = Math.floor(d.totalTime % 60);
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
        return `
            <tr>
                <td>${day}</td>
                <td>${d.executions}</td>
                <td>${timeStr}</td>
                <td>${avg}s</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="daily-stats">
            <div class="stat-label">Ostatnie 7 dni</div>
            <table class="daily-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Wyk.</th>
                        <th>Czas</th>
                        <th>Avg</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

function renderBufferStats(buffer, stats) {
    const cats = stats.categoryCount;
    const trends = stats.trendCount;

    const categoryLabels = {
        fast: 'Szybkie',
        average: 'Średnie',
        slow: 'Wolne',
        unstable: 'Niestabilne',
        new: 'Nowe',
        regressing: 'Regres',
        difficult: 'Trudne'
    };

    const trendIcons = {
        improving: '↑',
        declining: '↓',
        stable: '→'
    };

    const categoryHtml = Object.entries(cats)
        .filter(([_, count]) => count > 0)
        .map(([cat, count]) => `<span class="cat-badge cat-${cat}" data-filter-cat="${cat}" style="cursor:pointer">${categoryLabels[cat]}: ${count}</span>`)
        .join(' ');

    const trendHtml = `
        <span class="trend-badge trend-improving">↑ ${trends.improving}</span>
        <span class="trend-badge trend-stable">→ ${trends.stable}</span>
        <span class="trend-badge trend-declining">↓ ${trends.declining}</span>
    `;

    return `
        <div class="stats-section">
            <h3>${buffer}</h3>
            <div class="stat-row">
                <span class="stat-label">Przypadki</span>
                <span class="stat-value">${stats.casesWithResults} / ${stats.totalCases}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Wykonania</span>
                <span class="stat-value">${stats.totalExecutions}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Średni czas</span>
                <span class="stat-value">${stats.avgTime}s</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Odch. std.</span>
                <span class="stat-value">${stats.stdDev}</span>
            </div>
            <div class="stat-categories">
                <div class="stat-label">Kategorie:</div>
                <div class="cat-badges">${categoryHtml || '<span class="text-muted">brak danych</span>'}</div>
            </div>
            <div class="stat-trends">
                <div class="stat-label">Trendy:</div>
                <div class="trend-badges">${trendHtml}</div>
            </div>
            <div class="cases-details">
                <div class="cases-header">Wszystkie przypadki (${stats.cases.filter(c => c.hasAlg).length})</div>
                <div class="cases-table-wrapper">
                    ${renderCasesTable(stats.cases.filter(c => c.hasAlg), buffer)}
                </div>
            </div>
            ${renderMissingAlgorithms(stats.cases)}
        </div>
    `;
}

function renderMissingAlgorithms(cases) {
    const missing = cases.filter(c => !c.hasAlg);
    if (missing.length === 0) return '';

    const items = missing.map(c => `
        <span class="missing-alg-item" data-id="${c.id}" data-case="${c.case}">${c.case}</span>
    `).join('');

    return `
        <div class="missing-algs">
            <div class="cases-header">Brak algorytmu (${missing.length})</div>
            <div class="missing-algs-list">${items}</div>
        </div>
    `;
}

function renderCasesTable(cases, buffer) {
    const sortedCases = [...cases].sort((a, b) => {
        if (a.avg === null && b.avg === null) return 0;
        if (a.avg === null) return 1;
        if (b.avg === null) return -1;
        return b.avg - a.avg;
    });

    const trendIcons = {
        improving: '↑',
        declining: '↓',
        stable: '→',
        none: ''
    };

    const categoryLabels = {
        fast: 'S',
        average: 'Ś',
        slow: 'W',
        unstable: 'N',
        new: '?',
        regressing: 'R'
    };

    const rows = sortedCases.map(c => {
        const avgStr = c.avg !== null ? c.avg.toFixed(2) : '-';
        const stdStr = c.stdDev !== null ? c.stdDev.toFixed(2) : '-';
        const bestStr = c.best !== null ? c.best.toFixed(2) : '-';
        const worstStr = c.worst !== null ? c.worst.toFixed(2) : '-';
        const trendIcon = trendIcons[c.trend] || '';
        const catLabel = categoryLabels[c.category] || '';
        const difficultMark = c.difficult ? '!' : '';

        return `
            <tr class="case-row cat-${c.category}" data-id="${c.id}" data-case="${c.case}">
                <td class="case-name">${c.case}${difficultMark}</td>
                <td class="case-exec">${c.executions}</td>
                <td class="case-avg">${avgStr}</td>
                <td class="case-std">${stdStr}</td>
                <td class="case-best">${bestStr}</td>
                <td class="case-worst">${worstStr}</td>
                <td class="case-cat">${catLabel}</td>
                <td class="case-trend trend-${c.trend}">${trendIcon}</td>
            </tr>
        `;
    }).join('');

    return `
        <table class="cases-table" data-buffer="${buffer}">
            <thead>
                <tr>
                    <th data-sort="case">Przyp.</th>
                    <th data-sort="exec">Wyk.</th>
                    <th data-sort="avg">Avg</th>
                    <th data-sort="std">Std</th>
                    <th data-sort="best">Best</th>
                    <th data-sort="worst">Worst</th>
                    <th data-sort="cat">Kat.</th>
                    <th data-sort="trend">Tr.</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

function initCaseRowClicks() {
    document.querySelectorAll('.case-row').forEach(row => {
        row.addEventListener('click', () => {
            const id = row.dataset.id;
            const caseName = row.dataset.case;
            if (id && caseName && typeof openEditModal === 'function') {
                openEditModal(id, caseName);
            }
        });
    });

    document.querySelectorAll('.missing-alg-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            const caseName = item.dataset.case;
            if (id && caseName && typeof openEditModal === 'function') {
                openEditModal(id, caseName);
            }
        });
    });
}

function initCategoryFilter() {
    document.querySelectorAll('.cat-badge[data-filter-cat]').forEach(badge => {
        badge.addEventListener('click', () => {
            const cat = badge.dataset.filterCat;
            const section = badge.closest('.stats-section');
            const table = section.querySelector('.cases-table');
            if (!table) return;

            const rows = table.querySelectorAll('tbody tr');
            const isActive = badge.classList.contains('active');

            if (isActive) {
                rows.forEach(row => row.style.display = '');
                badge.classList.remove('active');
            } else {
                rows.forEach(row => {
                    if (row.classList.contains(`cat-${cat}`)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
                section.querySelectorAll('.cat-badge[data-filter-cat]').forEach(b => b.classList.remove('active'));
                badge.classList.add('active');
            }
        });
    });
}

function initTableSorting() {
    const saved = JSON.parse(localStorage.getItem('statsSort') || 'null');
    const defaultSort = saved || { column: 'case', direction: 'asc' };

    document.querySelectorAll('.cases-table').forEach(table => {
        const headers = table.querySelectorAll('th[data-sort]');
        let currentSort = { ...defaultSort };

        const defaultTh = table.querySelector(`th[data-sort="${defaultSort.column}"]`);
        if (defaultTh) {
            defaultTh.classList.add(`sort-${defaultSort.direction}`);
            sortTable(table, defaultSort.column, defaultSort.direction);
        }

        headers.forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.sort;
                const direction = (currentSort.column === column && currentSort.direction === 'desc') ? 'asc' : 'desc';
                currentSort = { column, direction };

                localStorage.setItem('statsSort', JSON.stringify(currentSort));

                headers.forEach(h => {
                    h.classList.remove('sort-asc', 'sort-desc');
                });
                th.classList.add(`sort-${direction}`);

                sortTable(table, column, direction);
            });
        });
    });
}

function sortTable(table, column, direction) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    const getValue = (row, col) => {
        const cells = row.querySelectorAll('td');
        switch (col) {
            case 'case': return cells[0].textContent.replace('!', '');
            case 'exec': return parseFloat(cells[1].textContent) || 0;
            case 'avg': return cells[2].textContent === '-' ? null : parseFloat(cells[2].textContent);
            case 'std': return cells[3].textContent === '-' ? null : parseFloat(cells[3].textContent);
            case 'best': return cells[4].textContent === '-' ? null : parseFloat(cells[4].textContent);
            case 'worst': return cells[5].textContent === '-' ? null : parseFloat(cells[5].textContent);
            case 'cat': return cells[6].textContent;
            case 'trend': return cells[7].textContent;
            default: return '';
        }
    };

    rows.sort((a, b) => {
        let valA = getValue(a, column);
        let valB = getValue(b, column);

        if (column === 'trend') {
            const trendOrder = { '↑': 1, '↓': 2, '→': 3, '': 4 };
            const orderA = trendOrder[valA] || 4;
            const orderB = trendOrder[valB] || 4;
            if (direction === 'asc') {
                return orderA - orderB;
            } else {
                if (orderA <= 2 && orderB <= 2) return orderB - orderA;
                if (orderA <= 2) return -1;
                if (orderB <= 2) return 1;
                return orderA - orderB;
            }
        }

        if (valA === null && valB === null) return 0;
        if (valA === null) return 1;
        if (valB === null) return -1;

        if (typeof valA === 'string') {
            const cmp = valA.localeCompare(valB);
            return direction === 'asc' ? cmp : -cmp;
        }

        return direction === 'asc' ? valA - valB : valB - valA;
    });

    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
}

function initDetailsLock() {
}

async function exportToExcel() {
    const workbook = XLSX.utils.book_new();

    for (const pieceType of ['edges', 'corners', 'parity']) {
        const buffers = await getBuffersForPiece(pieceType);

        for (const buffer of buffers) {
            const algs = await getAlgorithmsByPieceAndBuffer(pieceType, buffer);
            const cases = await getDetailedCaseStats(pieceType, buffer);
            const caseMap = new Map(cases.map(c => [c.id, c]));

            const rows = [['Case', 'Target1', 'Target2', 'Algorithm', 'Exec', 'Avg', 'Best', 'Worst', 'Category', 'Results']];

            const sorted = [...algs]
                .filter(a => !a.target2 || a.target1 !== a.target2)
                .sort((a, b) => {
                    const caseA = a.lp || (a.target2 ? `${a.target1}${a.target2}` : a.target1);
                    const caseB = b.lp || (b.target2 ? `${b.target1}${b.target2}` : b.target1);
                    return caseA.localeCompare(caseB);
                });

            for (const alg of sorted) {
                const stats = caseMap.get(alg.id) || {};
                let caseName;
                if (alg.lp) caseName = alg.lp;
                else if (alg.target2) caseName = `${alg.target1}${alg.target2}`;
                else caseName = alg.target1;

                const results = alg.algorithms[0]?.results || [];
                const resultsStr = results.map(r => r.toFixed(2)).join(';');
                const algText = alg.algorithms[0]?.alg || '';
                const algWithDifficult = alg.difficult ? `${algText} 💩` : algText;

                rows.push([
                    caseName,
                    alg.target1,
                    alg.target2 || '',
                    algWithDifficult,
                    stats.executions || 0,
                    stats.avg ? stats.avg.toFixed(2) : '',
                    stats.best ? stats.best.toFixed(2) : '',
                    stats.worst ? stats.worst.toFixed(2) : '',
                    stats.category || 'new',
                    resultsStr
                ]);
            }

            const sheet = XLSX.utils.aoa_to_sheet(rows);
            sheet['!cols'] = [
                { wch: 6 },   // Case
                { wch: 6 },   // Target1
                { wch: 6 },   // Target2
                { wch: 40 },  // Algorithm
                { wch: 5 },   // Exec
                { wch: 6 },   // Avg
                { wch: 6 },   // Best
                { wch: 6 },   // Worst
                { wch: 10 },  // Category
                { wch: 50 }   // Results
            ];
            XLSX.utils.book_append_sheet(workbook, sheet, `${pieceType}_${buffer}`);
        }
    }

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `bldtrainer_export_${date}.xlsx`);
}
