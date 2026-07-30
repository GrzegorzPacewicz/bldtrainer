const DB_NAME = 'bldtrainer';
const DB_VERSION = 1;

let db = null;

async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (e) => {
            const database = e.target.result;

            if (!database.objectStoreNames.contains('algorithms')) {
                const algStore = database.createObjectStore('algorithms', { keyPath: 'id' });
                algStore.createIndex('pieceType', 'pieceType', { unique: false });
                algStore.createIndex('buffer', 'buffer', { unique: false });
                algStore.createIndex('pieceBuffer', ['pieceType', 'buffer'], { unique: false });
            }
        };
    });
}

async function getAllAlgorithms() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('algorithms', 'readonly');
        const store = tx.objectStore('algorithms');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAlgorithmsByPieceAndBuffer(pieceType, buffer) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('algorithms', 'readonly');
        const store = tx.objectStore('algorithms');
        const index = store.index('pieceBuffer');
        const request = index.getAll([pieceType, buffer]);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getBuffersForPiece(pieceType) {
    const all = await getAllAlgorithms();
    const buffers = new Set();
    all.forEach(alg => {
        if (alg.pieceType === pieceType) {
            buffers.add(alg.buffer);
        }
    });
    return Array.from(buffers).sort();
}

async function saveAlgorithm(alg) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('algorithms', 'readwrite');
        const store = tx.objectStore('algorithms');
        const request = store.put(alg);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveAlgorithms(algs) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('algorithms', 'readwrite');
        const store = tx.objectStore('algorithms');

        algs.forEach(alg => store.put(alg));

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function updateResults(id, results) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('algorithms', 'readwrite');
        const store = tx.objectStore('algorithms');
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const alg = getRequest.result;
            if (alg) {
                alg.algorithms[0].results = results;
                alg.updatedAt = Date.now();
                const putRequest = store.put(alg);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            } else {
                reject(new Error('Algorithm not found'));
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
}

async function appendResult(id, result) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('algorithms', 'readwrite');
        const store = tx.objectStore('algorithms');
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const alg = getRequest.result;
            if (alg) {
                alg.algorithms[0].results.push(result);
                alg.updatedAt = Date.now();
                const putRequest = store.put(alg);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            } else {
                reject(new Error('Algorithm not found'));
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
}

async function clearAllData() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('algorithms', 'readwrite');
        const store = tx.objectStore('algorithms');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function setDifficult(id, difficult) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('algorithms', 'readwrite');
        const store = tx.objectStore('algorithms');
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const alg = getRequest.result;
            if (alg) {
                alg.difficult = difficult;
                alg.updatedAt = Date.now();
                const putRequest = store.put(alg);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            } else {
                reject(new Error('Algorithm not found'));
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
}

async function getAlgorithmById(id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('algorithms', 'readonly');
        const store = tx.objectStore('algorithms');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function updateAlgorithmText(id, newAlgText) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('algorithms', 'readwrite');
        const store = tx.objectStore('algorithms');
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const alg = getRequest.result;
            if (alg) {
                alg.algorithms[0].alg = newAlgText;
                alg.updatedAt = Date.now();
                const putRequest = store.put(alg);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            } else {
                reject(new Error('Algorithm not found'));
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
}
