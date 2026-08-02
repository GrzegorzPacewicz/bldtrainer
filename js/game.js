class Game {
    constructor(algorithms, includeInverse = false, allAlgorithms = null) {
        this.algorithms = algorithms;
        this.allAlgorithms = allAlgorithms || algorithms;
        this.includeInverse = includeInverse;
        this.pendingInverse = null;

        let toShuffle = [...algorithms];
        if (includeInverse) {
            toShuffle = this.deduplicatePairs(toShuffle);
        }
        this.shuffled = this.shuffle(toShuffle);
        this.index = 0;
        this.results = new Map();
        this.startTime = null;
        this.isTiming = false;
    }

    deduplicatePairs(algs) {
        const seen = new Set();
        return algs.filter(a => {
            if (!a.target2) return true;
            const key1 = `${a.target1}-${a.target2}`;
            const key2 = `${a.target2}-${a.target1}`;
            if (seen.has(key1) || seen.has(key2)) return false;
            seen.add(key1);
            return true;
        });
    }

    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    getCurrentCase() {
        if (this.pendingInverse) {
            if (this.pendingInverse.inverseLp) return this.pendingInverse.inverseLp;
            if (this.pendingInverse.inverseMemo) return this.pendingInverse.inverseMemo;
            return `${this.pendingInverse.target2} ${this.pendingInverse.target1}`;
        }
        if (this.index >= this.shuffled.length) return null;
        const alg = this.shuffled[this.index];
        if (alg.memo) return alg.memo;
        if (alg.lp) return alg.lp;
        if (alg.target2) return `${alg.target1} ${alg.target2}`;
        return alg.target1;
    }

    getCurrentAlg() {
        if (this.pendingInverse) {
            return this.pendingInverse.inverseAlg || '';
        }
        if (this.index >= this.shuffled.length) return '';
        return this.shuffled[this.index].algorithms[0].alg;
    }

    getCurrentId() {
        if (this.pendingInverse) {
            return this.pendingInverse.id + '_inv';
        }
        if (this.index >= this.shuffled.length) return null;
        return this.shuffled[this.index].id;
    }

    getNextCase() {
        if (this.pendingInverse) {
            if (this.index + 1 >= this.shuffled.length) return '';
            const alg = this.shuffled[this.index + 1];
            if (alg.memo) return alg.memo;
            if (alg.lp) return alg.lp;
            if (alg.target2) return `${alg.target1} ${alg.target2}`;
            return alg.target1;
        }
        if (this.includeInverse) {
            const alg = this.shuffled[this.index];
            if (alg && alg.target2) {
                const inverseData = this.findInverseData(alg);
                if (inverseData.lp) return inverseData.lp;
                if (inverseData.memo) return inverseData.memo;
                return `${alg.target2} ${alg.target1}`;
            }
        }
        if (this.index + 1 >= this.shuffled.length) return '';
        const alg = this.shuffled[this.index + 1];
        if (alg.memo) return alg.memo;
        if (alg.lp) return alg.lp;
        if (alg.target2) return `${alg.target1} ${alg.target2}`;
        return alg.target1;
    }

    getProgress() {
        if (this.includeInverse) {
            const total = this.shuffled.filter(a => a.target2).length * 2 +
                          this.shuffled.filter(a => !a.target2).length;
            const done = this.shuffled.slice(0, this.index).reduce((count, a) => {
                return count + (a.target2 ? 2 : 1);
            }, 0) + (this.pendingInverse ? 1 : 0);
            return `${done + 1}/${total}`;
        }
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
        if (this.pendingInverse) {
            this.pendingInverse = null;
            this.index++;
            return this.index < this.shuffled.length;
        }

        if (this.includeInverse) {
            const alg = this.shuffled[this.index];
            if (alg && alg.target2) {
                const inverseData = this.findInverseData(alg);
                this.pendingInverse = {
                    ...alg,
                    inverseAlg: inverseData.alg,
                    inverseLp: inverseData.lp,
                    inverseMemo: inverseData.memo
                };
                return true;
            }
        }

        this.index++;
        return this.index < this.shuffled.length;
    }

    findInverseData(alg) {
        const inverse = this.allAlgorithms.find(a =>
            a.target1 === alg.target2 && a.target2 === alg.target1
        );
        return {
            alg: inverse?.algorithms?.[0]?.alg || '',
            lp: inverse?.lp || '',
            memo: inverse?.memo || ''
        };
    }

    isFinished() {
        return this.index >= this.shuffled.length && !this.pendingInverse;
    }

    removeResult(id) {
        this.results.delete(id);
    }

    getResultsList() {
        const list = [];
        const source = this.allResults || this.results;
        for (const [id, time] of source) {
            const isInverse = id.endsWith('_inv');
            const baseId = isInverse ? id.slice(0, -4) : id;
            const alg = this.algorithms.find(a => a.id === baseId);
            if (alg) {
                let caseName;
                if (alg.memo) caseName = alg.memo;
                else if (alg.lp) caseName = alg.lp;
                else if (alg.target2) {
                    caseName = isInverse
                        ? `${alg.target2} ${alg.target1}`
                        : `${alg.target1} ${alg.target2}`;
                }
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

        this.saveDailyStats();
    }

    saveDailyStats() {
        const today = new Date().toISOString().slice(0, 10);
        const dailyStats = JSON.parse(localStorage.getItem('dailyStats') || '{}');

        if (!dailyStats[today]) {
            dailyStats[today] = { executions: 0, totalTime: 0 };
        }

        for (const time of this.results.values()) {
            dailyStats[today].executions++;
            dailyStats[today].totalTime += time;
        }

        localStorage.setItem('dailyStats', JSON.stringify(dailyStats));
    }
}
