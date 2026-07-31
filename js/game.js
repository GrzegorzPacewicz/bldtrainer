class Game {
    constructor(algorithms) {
        this.algorithms = algorithms;
        this.shuffled = this.shuffle([...algorithms]);
        this.index = 0;
        this.results = new Map();
        this.startTime = null;
        this.isTiming = false;
    }

    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    getCurrentCase() {
        if (this.index >= this.shuffled.length) return null;
        const alg = this.shuffled[this.index];
        if (alg.memo) return alg.memo;
        if (alg.lp) return alg.lp;
        if (alg.target2) return `${alg.target1} ${alg.target2}`;
        return alg.target1;
    }

    getCurrentAlg() {
        if (this.index >= this.shuffled.length) return '';
        return this.shuffled[this.index].algorithms[0].alg;
    }

    getCurrentId() {
        if (this.index >= this.shuffled.length) return null;
        return this.shuffled[this.index].id;
    }

    getNextCase() {
        if (this.index + 1 >= this.shuffled.length) return '';
        const alg = this.shuffled[this.index + 1];
        if (alg.memo) return alg.memo;
        if (alg.lp) return alg.lp;
        if (alg.target2) return `${alg.target1} ${alg.target2}`;
        return alg.target1;
    }

    getProgress() {
        return `${this.index + 1}/${this.shuffled.length}`;
    }

    getLastResult() {
        if (this.index === 0) return '';
        const prevId = this.shuffled[this.index - 1].id;
        const result = this.results.get(prevId);
        return result ? result.toFixed(2) : '';
    }

    getCurrentAvg() {
        if (this.results.size === 0) return '';
        const sum = Array.from(this.results.values()).reduce((a, b) => a + b, 0);
        return (sum / this.results.size).toFixed(2);
    }

    startTimer() {
        this.startTime = performance.now();
        this.isTiming = true;
    }

    stopTimer() {
        if (!this.isTiming) return null;
        const elapsed = (performance.now() - this.startTime) / 1000;
        this.isTiming = false;
        return elapsed;
    }

    saveResult(time) {
        const id = this.getCurrentId();
        if (id && time >= 0.2) {
            const roundedTime = Math.round(time * 100) / 100;
            this.results.set(id, roundedTime);
            if (!this.allResults) this.allResults = new Map();
            this.allResults.set(id, roundedTime);
        }
    }

    next() {
        this.index++;
        return this.index < this.shuffled.length;
    }

    isFinished() {
        return this.index >= this.shuffled.length;
    }

    removeResult(id) {
        this.results.delete(id);
    }

    getResultsList() {
        const list = [];
        const source = this.allResults || this.results;
        for (const [id, time] of source) {
            const alg = this.algorithms.find(a => a.id === id);
            if (alg) {
                let caseName;
                if (alg.memo) caseName = alg.memo;
                else if (alg.lp) caseName = alg.lp;
                else if (alg.target2) caseName = `${alg.target1} ${alg.target2}`;
                else caseName = alg.target1;
                list.push({
                    id,
                    case: caseName,
                    time
                });
            }
        }
        return list;
    }

    getSessionAvg() {
        if (this.results.size === 0) return 0;
        const sum = Array.from(this.results.values()).reduce((a, b) => a + b, 0);
        return sum / this.results.size;
    }

    async saveAllResults() {
        const promises = [];
        for (const [id, time] of this.results) {
            promises.push(appendResult(id, time));
        }

        if (this.difficultCases) {
            for (const id of this.difficultCases) {
                promises.push(setDifficult(id, true));
            }
        }

        await Promise.all(promises);
    }
}
