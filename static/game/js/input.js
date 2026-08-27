/**
 * Простой трекер состояния клавиатуры.
 * InputManager.isDown('left') -> true/false
 * Поддерживает WASD + стрелки ("желательно предусмотреть
 * поддержку стрелок").
 */
class InputManager {
    constructor() {
        this.keys = new Set();
        this.justPressed = new Set(); // клавиши, нажатые именно в этом кадре

        this._keyMap = {
            'KeyA': 'left', 'ArrowLeft': 'left',
            'KeyD': 'right', 'ArrowRight': 'right',
            'KeyS': 'down', 'ArrowDown': 'down',
            'KeyW': 'jump', 'ArrowUp': 'jump', 'Space': 'jump',
            'KeyJ': 'attack',
            'KeyK': 'skill',
            'KeyE': 'interact',
            'Escape': 'pause',
        };

        window.addEventListener('keydown', (e) => this._onKeyDown(e));
        window.addEventListener('keyup', (e) => this._onKeyUp(e));
    }

    _onKeyDown(e) {
        const action = this._keyMap[e.code];
        if (!action) return;

        // Предотвращаем скролл страницы пробелом/стрелками
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
        }

        if (!this.keys.has(action)) {
            this.justPressed.add(action);
        }
        this.keys.add(action);
    }

    _onKeyUp(e) {
        const action = this._keyMap[e.code];
        if (!action) return;
        this.keys.delete(action);
    }

    isDown(action) {
        return this.keys.has(action);
    }

    wasJustPressed(action) {
        return this.justPressed.has(action);
    }

    /** Вызывать в конце каждого кадра, чтобы сбросить "just pressed" */
    clearFrame() {
        this.justPressed.clear();
    }
}