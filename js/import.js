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

    if (rows.length < 2 || !rows[0] || rows[0].length < 2) {
        return algorithms;
    }

    const isTable = rows[1] && rows[1][0] === rows[0][1];

    if (isTable) {
        const headers = rows[0].slice(1);
        for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
            const row = rows[rowIdx];
            if (!row || !row[0]) continue;

            const secondTarget = extractTarget(String(row[0]));
            const secondLp = extractLp(String(row[0]));

            for (let colIdx = 1; colIdx < row.length; colIdx++) {
                const cellValue = row[colIdx];
                if (!cellValue || cellValue === '') continue;

                const firstTarget = extractTarget(String(headers[colIdx - 1] || ''));
                const firstLp = extractLp(String(headers[colIdx - 1] || ''));

                if (firstTarget === secondTarget) continue;

                const alg = parseAlgorithm(
                    pieceType,
                    buffer,
                    firstTarget,
                    secondTarget,
                    String(cellValue),
                    firstLp,
                    secondLp
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
                secondLp
            );
            if (alg) algorithms.push(alg);
        }
    }

    return algorithms;
}

function extractTarget(text) {
    const parts = text.trim().split(/\s+/);
    return parts[0] || '';
}

function extractLp(text) {
    const match = text.match(/\(([^)]+)\)/);
    return match ? match[1] : '';
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

function parseAlgorithm(pieceType, buffer, target1, target2, algText, lp1, lp2) {
    const canonBuffer = canonicalRepresentation(buffer);
    const canonT1 = canonicalRepresentation(target1);
    const canonT2 = canonicalRepresentation(target2);

    if (!canonT1 || !canonT2 || canonT1 === canonT2) return null;

    let difficult = false;
    let cleanAlg = algText;

    if (algText.includes('💩')) {
        difficult = true;
        cleanAlg = algText.replace(/💩/g, '').trim();
    }

    const lp = (lp1 && lp2) ? `${lp1}${lp2}` : '';

    return {
        id: `${pieceType}_${canonBuffer};${canonT1};${canonT2}`,
        pieceType,
        buffer: canonBuffer,
        target1: canonT1,
        target2: canonT2,
        algorithms: [{
            alg: cleanAlg,
            results: []
        }],
        lp,
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
