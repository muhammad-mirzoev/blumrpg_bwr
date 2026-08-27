/**
 * Точка входа. Инициализирует игру, подтягивает данные персонажа
 * с бэкенда (GET /api/character/) и запускает game loop.
 */
(function () {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const input = new InputManager();
    const level = TEST_LEVEL;
    const player = new Player(level.spawn.x, level.spawn.y);
    const camera = new Camera(canvas.width, canvas.height);
    const renderer = new Renderer(ctx, canvas.width, canvas.height);

    // Состояния игровой сцены. 'dead' блокирует физику до нажатия Restart.
    const GameState = { PLAYING: 'playing', PAUSED: 'paused', DEAD: 'dead' };
    let state = GameState.PLAYING;

    const loadingOverlay = document.getElementById('loading-overlay');
    const pauseOverlay = document.getElementById('pause-overlay');
    const deathOverlay = document.getElementById('death-overlay');
    const btnRestart = document.getElementById('btn-restart');

    // --- Загрузка данных персонажа с backend ---
    async function loadCharacter() {
        try {
            const response = await fetch('/api/character/', {
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const character = await response.json();
            updateHud(character);
        } catch (err) {
            console.error('Не удалось загрузить персонажа:', err);
            document.getElementById('hud-char-name').textContent = 'Гость (offline)';
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

    function updateHud(character) {
        document.getElementById('hud-char-name').textContent = character.name;
        document.getElementById('hud-level').textContent = `LVL ${character.level}`;

        const hpPercent = (character.health / character.max_health) * 100;
        document.getElementById('hp-fill').style.width = `${hpPercent}%`;
        document.getElementById('hp-value').textContent =
            `${character.health}/${character.max_health}`;

        const xpPercent = (character.experience / character.experience_to_next_level) * 100;
        document.getElementById('xp-fill').style.width = `${xpPercent}%`;

        document.getElementById('gold-value').textContent = character.gold;
    }

    // --- Пауза ---
    function togglePause() {
        if (state === GameState.DEAD) return; // на экране смерти пауза недоступна

        state = state === GameState.PAUSED ? GameState.PLAYING : GameState.PAUSED;
        pauseOverlay.classList.toggle('hidden', state !== GameState.PAUSED);
    }

    // --- Смерть / Рестарт ---
    function triggerDeath() {
        state = GameState.DEAD;
        deathOverlay.classList.remove('hidden');
    }

    function restartLevel() {
        player.respawn(level);
        deathOverlay.classList.add('hidden');
        state = GameState.PLAYING;
    }

    btnRestart.addEventListener('click', restartLevel);

    // --- Game loop ---
    function gameLoop(timestamp) {
        requestAnimationFrame(gameLoop);

        if (input.wasJustPressed('pause')) {
            togglePause();
        }

        if (state === GameState.PLAYING) {
            player.update(input, level);

            if (player.hasFallenIntoVoid(level)) {
                triggerDeath();
            }

            camera.follow(player, level);
        }

        // Рендерим сцену всегда (кроме случая, когда ещё грузится персонаж),
        // даже во время паузы/смерти — чтобы сцена оставалась видна под overlay.
        camera.follow(player, level);
        renderer.render(level, player, camera);

        input.clearFrame();
    }

    loadCharacter();
    requestAnimationFrame(gameLoop);
})();