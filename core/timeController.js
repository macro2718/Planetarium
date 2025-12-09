import { calculateLocalSiderealTime } from '../utils/astronomy.js';

const getFixedTimeOfDayMs = (date) => (
    date.getHours() * 3600000
    + date.getMinutes() * 60000
    + date.getSeconds() * 1000
    + date.getMilliseconds()
);

export class TimeController {
    constructor({ isArchive = false, nowProvider } = {}) {
        this.isArchive = isArchive;
        this.nowProvider = typeof nowProvider === 'function'
            ? nowProvider
            : () => performance.now() * 0.001;
        const initialDate = new Date();
        this.initialRealtimeDate = new Date(initialDate);
        this.reset(initialDate);
    }

    getCurrentSeconds() {
        return this.nowProvider();
    }

    getSnapshot() {
        return {
            timeMode: this.timeMode,
            timeScale: this.timeScale,
            dayScale: this.dayScale,
            isTimePaused: this.isTimePaused,
            simulatedDate: new Date(this.simulatedDate),
            localSiderealTime: this.localSiderealTime
        };
    }

    reset(baseDate = new Date()) {
        this.timeMode = 'realtime';
        this.timeScale = 240;
        this.dayScale = 1;
        this.simulationStartDate = new Date(baseDate);
        this.simulationStartPerf = this.getCurrentSeconds();
        this.simulatedDate = new Date(baseDate);
        this.realtimeOffsetMs = 0;
        this.fixedTimeOfDayMs = getFixedTimeOfDayMs(baseDate);
        this.isTimePaused = false;
        this.localSiderealTime = calculateLocalSiderealTime(this.simulatedDate, 0);
        this.initialRealtimeDate = new Date(baseDate);
        return this.getSnapshot();
    }

    setMode(mode, options = {}) {
        if (mode === 'realtime') {
            this.timeMode = 'realtime';
            this.isTimePaused = false;
            const providedDate = options.date instanceof Date
                ? options.date
                : (options.date ? new Date(options.date) : null);
            const hasValidDate = providedDate && !Number.isNaN(providedDate.getTime());
            const fallbackDate = this.isArchive
                ? (this.simulatedDate || this.initialRealtimeDate)
                : new Date();
            const baseDate = hasValidDate ? providedDate : fallbackDate;
            this.realtimeOffsetMs = baseDate.getTime() - Date.now();
            this.simulationStartDate = new Date(baseDate);
            this.simulationStartPerf = this.getCurrentSeconds();
            this.simulatedDate = new Date(baseDate);
            this.fixedTimeOfDayMs = getFixedTimeOfDayMs(baseDate);
        } else if (mode === 'custom') {
            this.timeMode = 'custom';
            this.isTimePaused = false;
            if (typeof options.timeScale === 'number' && !Number.isNaN(options.timeScale)) {
                this.timeScale = options.timeScale;
            }
            const providedDate = options.date instanceof Date
                ? options.date
                : (options.date ? new Date(options.date) : null);
            const hasValidDate = providedDate && !Number.isNaN(providedDate.getTime());
            const baseDate = hasValidDate ? providedDate : this.getSimulatedDate();
            this.simulationStartDate = new Date(baseDate);
            this.simulationStartPerf = this.getCurrentSeconds();
            this.simulatedDate = new Date(baseDate);
            this.fixedTimeOfDayMs = getFixedTimeOfDayMs(baseDate);
        } else if (mode === 'fixed-time') {
            this.timeMode = 'fixed-time';
            this.isTimePaused = false;
            if (typeof options.dayScale === 'number' && !Number.isNaN(options.dayScale)) {
                this.dayScale = options.dayScale;
            }
            const providedDate = options.date instanceof Date
                ? options.date
                : (options.date ? new Date(options.date) : null);
            const hasValidDate = providedDate && !Number.isNaN(providedDate.getTime());
            const baseDate = hasValidDate ? providedDate : this.getSimulatedDate();
            this.fixedTimeOfDayMs = getFixedTimeOfDayMs(baseDate);
            this.simulationStartDate = new Date(baseDate);
            this.simulationStartPerf = this.getCurrentSeconds();
            this.simulatedDate = new Date(baseDate);
        } else {
            console.warn('Unknown time mode:', mode);
        }

        return this.getSnapshot();
    }

    update(nowSeconds = this.getCurrentSeconds(), observerLon = 0) {
        if (this.timeMode === 'realtime') {
            const offset = Number.isFinite(this.realtimeOffsetMs) ? this.realtimeOffsetMs : 0;
            this.simulatedDate = new Date(Date.now() + offset);
        } else {
            const elapsed = nowSeconds - this.simulationStartPerf;
            if (this.timeMode === 'custom') {
                const scale = this.isTimePaused ? 0 : this.timeScale;
                const simulatedMs = this.simulationStartDate.getTime() + elapsed * 1000 * scale;
                this.simulatedDate = new Date(simulatedMs);
            } else if (this.timeMode === 'fixed-time') {
                const scale = this.isTimePaused ? 0 : this.dayScale;
                const daysPassed = Math.floor(elapsed * scale);
                const baseDate = new Date(this.simulationStartDate);
                baseDate.setDate(baseDate.getDate() + daysPassed);
                const startOfDay = new Date(baseDate);
                startOfDay.setHours(0, 0, 0, 0);
                const timeOfDayMs = this.fixedTimeOfDayMs ?? 0;
                this.simulatedDate = new Date(startOfDay.getTime() + timeOfDayMs);
            }
        }

        this.localSiderealTime = calculateLocalSiderealTime(this.simulatedDate, observerLon);
        return {
            simulatedDate: this.simulatedDate,
            localSiderealTime: this.localSiderealTime
        };
    }

    togglePause(forceState, observerLon = 0) {
        if (this.timeMode === 'realtime') {
            this.isTimePaused = false;
            return this.isTimePaused;
        }
        const nowSeconds = this.getCurrentSeconds();
        this.update(nowSeconds, observerLon);
        const next = typeof forceState === 'boolean' ? forceState : !this.isTimePaused;
        this.isTimePaused = next;
        this.simulationStartDate = new Date(this.simulatedDate);
        this.simulationStartPerf = nowSeconds;
        return this.isTimePaused;
    }

    getSimulatedDate() {
        return this.simulatedDate ?? new Date();
    }
}
