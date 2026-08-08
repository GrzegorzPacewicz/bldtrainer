async function importExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                const algorithms = [];

                for (const sheetName of workbook.SheetNames) {
                    const parts = sheetName.split('_');
                    if (parts.length !== 2) continue;

                    const [pieceType, buffer] = parts;
                    const sheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                    const parsed = parseSheet(json, pieceType, buffer);
                    algorithms.push(...parsed);
                }

                await saveAlgorithms(algorithms);
                resolve(algorithms.length);
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}

function parseSheet(rows, pieceType, buffer) {
    const algorithms = [];

    if (rows.length < 1 || !rows[0]) {
        return algorithms;
    }

    const isParity = pieceType.toLowerCase() === 'parity';
    const header = rows[0];
    const resultsColIdx = header.findIndex(h => String(h).toLowerCase() === 'results');
    const target1ColIdx = header.findIndex(h => String(h).toLowerCase() === 'target1');
    const target2ColIdx = header.findIndex(h => String(h).toLowerCase() === 'target2');
    const algColIdx = header.findIndex(h => String(h).toLowerCase() === 'algorithm');
    const difficultColIdx = header.findIndex(h => String(h).toLowerCase() === 'difficult');
    const isExportFormat = header[0] === 'Case' && (header[1] === 'Algorithm' || header[1] === 'Target1');

    if (isExportFormat) {
        const hasTargetCols = target1ColIdx >= 0;
        const actualAlgColIdx = algColIdx >= 0 ? algColIdx : 1;

        for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
            const row = rows[rowIdx];
            if (!row || !row[0]) continue;

            const caseName = String(row[0]);
            const algText = String(row[actualAlgColIdx] || '');
            const resultsStr = resultsColIdx >= 0 ? String(row[resultsColIdx] || '') : '';
            const results = parseResultsString(resultsStr);
            const difficultVal = difficultColIdx >= 0 ? row[difficultColIdx] : undefined;

            if (isParity) {
                let target, lp;
                if (hasTargetCols) {
                    target = String(row[target1ColIdx] || '');
                    lp = caseName.length === 1 ? caseName : '';
                } else {
                    const parsed = parseCaseNameParity(caseName);
                    target = parsed.target;
                    lp = parsed.lp;
                }
                const alg = parseParityAlgorithm(pieceType, buffer, target, algText, lp, results, difficultVal);
                if (alg) algorithms.push(alg);
            } else {
                let target1, target2, lp;
                if (hasTargetCols) {
                    target1 = String(row[target1ColIdx] || '');
                    target2 = String(row[target2ColIdx] || '');
                    lp = caseName;
                } else {
                    const parsed = parseCaseName(caseName);
                    target1 = parsed.target1;
                    target2 = parsed.target2;
                    lp = parsed.lp;
                }
                const alg = parseAlgorithm(pieceType, buffer, target1, target2, algText, '', '', lp, results, difficultVal);
                if (alg) algorithms.push(alg);
            }
        }
        return algorithms;
    }

    if (isParity) {
        for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
            const row = rows[rowIdx];
            if (!row || row.length < 2 || !row[0] || !row[1]) continue;

            const target = extractTarget(String(row[0]));
            const lp = extractLp(String(row[0]));
            const algText = String(row[1]);

            const alg = parseParityAlgorithm(pieceType, buffer, target, algText, lp, []);
            if (alg) algorithms.push(alg);
        }
        return algorithms;
    }

    if (rows.length < 2 || rows[0].length < 2) {
        return algorithms;
    }

    const firstColVal = rows[1] && rows[1][0] ? extractTarget(String(rows[1][0])) : '';
    const firstRowVal = rows[0] && rows[0][1] ? extractTarget(String(rows[0][1])) : '';
    const isTable = firstColVal && firstRowVal && firstColVal === firstRowVal;

    if (isTable) {
        const headers = rows[0].slice(1);
        for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
            const row = rows[rowIdx];
            if (!row || !row[0]) continue;

            const secondTarget = extractTarget(String(row[0]));
            const secondLp = extractLp(String(row[0]));

            for (let colIdx = 1; colIdx < headers.length + 1; colIdx++) {
                const cellValue = row[colIdx] || '';

                const firstTarget = extractTarget(String(headers[colIdx - 1] || ''));
                const firstLp = extractLp(String(headers[colIdx - 1] || ''));

                if (!firstTarget || firstTarget === secondTarget) continue;

                const alg = parseAlgorithm(
                    pieceType,
                    buffer,
                    firstTarget,
                    secondTarget,
                    String(cellValue),
                    firstLp,
                    secondLp,
                    '',
                    []
                );
                if (alg) algorithms.push(alg);
            }
        }
    } else {
        for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
            const row = rows[rowIdx];
            if (!row || row.length < 3 || !row[0] || !row[1] || !row[2]) continue;

            const firstTarget = extractTarget(String(row[0]));
            const secondTarget = extractTarget(String(row[1]));
            const firstLp = extractLp(String(row[0]));
            const secondLp = extractLp(String(row[1]));

            const alg = parseAlgorithm(
                pieceType,
                buffer,
                firstTarget,
                secondTarget,
                String(row[2]),
                firstLp,
                secondLp,
                '',
                []
            );
            if (alg) algorithms.push(alg);
        }
    }

    return algorithms;
}

function parseResultsString(str) {
    if (!str || !str.trim()) return [];
    return str.split(';').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
}

function parseCaseName(caseName) {
    const lpMatch = caseName.match(/^([A-Z]{2})([A-Z]{2})$/);
    if (lpMatch) {
        return { target1: lpMatch[1], target2: lpMatch[2], lp: caseName };
    }
    const targetMatch = caseName.match(/^([A-Z]{2,3})([A-Z]{2,3})$/);
    if (targetMatch) {
        return { target1: targetMatch[1], target2: targetMatch[2], lp: '' };
    }
    return { target1: caseName, target2: '', lp: '' };
}

function parseCaseNameParity(caseName) {
    const lpMatch = caseName.match(/^([A-Z])\s*\(([^)]+)\)$/);
    if (lpMatch) {
        return { target: lpMatch[2], lp: lpMatch[1] };
    }
    return { target: caseName, lp: '' };
}

function extractTarget(text) {
    // Format: "A (UL)" - LP przed nawiasem, target w nawiasie
    const match = text.match(/\(([^)]+)\)/);
    if (match) {
        return match[1].trim();
    }
    const parts = text.trim().split(/\s+/);
    const target = parts[0] || '';
    if (/[\[\]:'2]/.test(target)) {
        return '';
    }
    return target;
}

function extractLp(text) {
    // Format: "A (UL)" - LP to część przed nawiasem
    const match = text.match(/^([^(]+)\s*\(/);
    if (match) {
        return match[1].trim();
    }
    return '';
}

function canonicalRepresentation(pieceName) {
    if (!pieceName || pieceName.toUpperCase() !== pieceName || pieceName.length !== 3) {
        return pieceName;
    }

    const order = ['U', 'D', 'F', 'B', 'R', 'L'];
    const active = pieceName[0];
    const rest = pieceName.slice(1).split('').sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return active + rest.join('');
}

function parseAlgorithm(pieceType, buffer, target1, target2, algText, lp1, lp2, lpOverride, results, difficultOverride) {
    const canonBuffer = canonicalRepresentation(buffer);
    const canonT1 = canonicalRepresentation(target1);
    const canonT2 = canonicalRepresentation(target2);

    if (!canonT1 || !canonT2 || canonT1 === canonT2) return null;

    let difficult = difficultOverride === true || difficultOverride === 1;
    let cleanAlg = algText;

    if (algText.includes('💩')) {
        difficult = true;
        cleanAlg = algText.replace(/💩/g, '').trim();
    }

    const lp = lpOverride || ((lp1 && lp2) ? `${lp1}${lp2}` : '');

    return {
        id: `${pieceType}_${canonBuffer};${canonT1};${canonT2}`,
        pieceType,
        buffer: canonBuffer,
        target1: canonT1,
        target2: canonT2,
        algorithms: [{
            alg: cleanAlg,
            results: results || []
        }],
        lp,
        memo: '',
        difficult,
        updatedAt: Date.now()
    };
}

function parseParityAlgorithm(pieceType, buffer, target, algText, lp, results, difficultOverride) {
    const canonBuffer = canonicalRepresentation(buffer);
    const canonTarget = canonicalRepresentation(target);

    if (!canonTarget) return null;

    let difficult = difficultOverride === true || difficultOverride === 1;
    let cleanAlg = algText;

    if (algText.includes('💩')) {
        difficult = true;
        cleanAlg = algText.replace(/💩/g, '').trim();
    }

    return {
        id: `${pieceType}_${canonBuffer};${canonTarget}`,
        pieceType,
        buffer: canonBuffer,
        target1: canonTarget,
        target2: null,
        algorithms: [{
            alg: cleanAlg,
            results: results || []
        }],
        lp: lp || '',
        memo: '',
        difficult,
        updatedAt: Date.now()
    };
}

async function importTxt(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n');

                let pieceType = 'edges';
                let buffer = 'UF';
                const algorithms = [];

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    if (trimmed.startsWith('#')) {
                        const parts = trimmed.slice(1).trim().split('_');
                        if (parts.length === 2) {
                            pieceType = parts[0];
                            buffer = parts[1];
                        }
                        continue;
                    }

                    const match = trimmed.match(/^(\S+)\s+(\S+):\s*(.+)$/);
                    if (match) {
                        const [, t1, t2, alg] = match;
                        const parsed = parseAlgorithm(pieceType, buffer, t1, t2, alg, '', '');
                        if (parsed) algorithms.push(parsed);
                    }
                }

                await saveAlgorithms(algorithms);
                resolve(algorithms.length);
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

async function handleFileImport(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
        return importExcel(file);
    } else if (ext === 'txt' || ext === 'csv') {
        return importTxt(file);
    } else {
        throw new Error('Unsupported file format');
    }
}
