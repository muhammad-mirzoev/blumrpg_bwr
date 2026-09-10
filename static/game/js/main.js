/**
 * Точка входа. Загружает персонажа и данные уровня с backend
 * (вместо захардкоженного TEST_LEVEL), запускает game loop,
 * отправляет результат прохождения через POST /api/levels/<id>/complete/.
 */
(function () {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('game-container');
    const levelId = container.dataset.levelId;

    const input = new InputManager();
    const camera = new Camera(canvas.width, canvas.height);
    const renderer = new Renderer(ctx, canvas.width, canvas.height);

    let level = null;
    let player = null;
    let enemies = [];
    let movingPlatforms = [];
    let fallingPlatforms = [];
    let floatingTexts = [];

    let runXp = 0;
    let runGold = 0;

    let hitEnemiesThisSwing = new Set();
    let attackWasActive = false;

    const GameState = {
        LOADING: 'loading', PLAYING: 'playing',
        PAUSED: 'paused', DEAD: 'dead', COMPLETE: 'complete',
    };
    let state = GameState.LOADING;

    const loadingOverlay = document.getElementById('loading-overlay');
    const pauseOverlay = document.getElementById('pause-overlay');
    const deathOverlay = document.getElementById('death-overlay');
    const completeOverlay = document.getElementById('complete-overlay');
    const completeRewardsEl = document.getElementById('complete-rewards');
    const hudSession = document.getElementById('hud-session');
    const levelTitleEl = document.getElementById('level-title');

    document.getElementById('btn-restart').addEventListener('click', restartLevel);
    document.getElementById('btn-exit').addEventListener('click', goToSelect);
    document.getElementById('btn-complete-restart').addEventListener('click', restartLevel);
    document.getElementById('btn-complete-exit').addEventListener('click', goToSelect);

    function goToSelect() {
        window.location.href = '/game/select/';
    }

    function spawnEnemies(level) {
        return level.enemies.map((cfg) => {
            switch (cfg.type) {
                case 'slime':
                    return new Slime(cfg);
                default:
                    console.warn(`Неизвестный тип врага: ${cfg.type}`);
                    return null;
            }
        }).filter(Boolean);
    }

    function spawnMovingPlatforms(level) {
        return level.movingPlatforms.map((cfg) => new MovingPlatform(cfg));
    }

    function spawnFallingPlatforms(level) {
        return level.fallingPlatforms.map((cfg) => new FallingPlatform(cfg));
    }

    function spawnFloatingText(text, x, y, color) {
        floatingTexts.push({ text, x, y, color, life: 40, maxLife: 40 });
    }

    function getCsrfToken() {
        const match = document.cookie.match(/csrftoken=([^;]+)/);
        return match ? match[1] : '';
    }

    async function ensureCsrfCookie() {
        if (!document.cookie.includes('csrftoken=')) {
            await fetch('/api/auth/csrf/', { credentials: 'same-origin' });
        }
    }

    // Загрузка персонажа + уровня с backend
    async function loadCharacterAndLevel() {
        try {
            await ensureCsrfCookie();

            const [charResponse, levelResponse] = await Promise.all([
                fetch('/api/character/', { credentials: 'same-origin' }),
                fetch(`/api/levels/${levelId}/`, { credentials: 'same-origin' }),
            ]);

            if (!charResponse.ok) {
                throw new Error(`Character HTTP ${charResponse.status}`);
            }

            if (!levelResponse.ok) {
                const msg = levelResponse.status === 403
                    ? 'Этот уровень ещё не разблокирован.'
                    : 'Не удалось загрузить уровень.';
                alert(msg);
                goToSelect();
                return;
            }

            const character = await charResponse.json();
            const levelData = await levelResponse.json();

            level = levelData.map_data;
            player = new Player(level.spawn.x, level.spawn.y);
            player.maxHealth = character.max_health;
            player.health = character.health;
            player.strength = character.effective_strength;
            player.defense = character.effective_defense;

            enemies = spawnEnemies(level);
            movingPlatforms = spawnMovingPlatforms(level);
            fallingPlatforms = spawnFallingPlatforms(level);

            updateHudStaticFields(character);
            levelTitleEl.textContent = levelData.name;

            state = GameState.PLAYING;
            loadingOverlay.classList.add('hidden');
        } catch (err) {
            console.error('Ошибка загрузки:', err);
            alert('Не удалось загрузить игру.');
            goToSelect();
        }
    }

    function updateHudStaticFields(character) {
        document.getElementById('hud-char-name').textContent = character.name;
        document.getElementById('hud-level').textContent = `LVL ${character.level}`;

        const xpPercent = (character.experience / character.experience_to_next_level) * 100;
        document.getElementById('xp-fill').style.width = `${xpPercent}%`;

        document.getElementById('gold-value').textContent = character.gold;
    }

    function updateHudHealth() {
        const hpPercent = (player.health / player.maxHealth) * 100;
        document.getElementById('hp-fill').style.width = `${Math.max(0, hpPercent)}%`;
        document.getElementById('hp-value').textContent =
            `${player.health}/${player.maxHealth}`;
    }

    function updateHudSession() {
        hudSession.textContent = `+${runXp} XP · +${runGold} Gold`;
    }

    function togglePause() {
        if (state !== GameState.PLAYING && state !== GameState.PAUSED) return;

        state = state === GameState.PAUSED ? GameState.PLAYING : GameState.PAUSED;
        pauseOverlay.classList.toggle('hidden', state !== GameState.PAUSED);
    }

    function triggerDeath() {
        state = GameState.DEAD;
        deathOverlay.classList.remove('hidden');
    }

    function restartLevel() {
        player.respawn(level);
        enemies = spawnEnemies(level);
        movingPlatforms = spawnMovingPlatforms(level);
        fallingPlatforms = spawnFallingPlatforms(level);
        floatingTexts = [];
        hitEnemiesThisSwing = new Set();
        attackWasActive = false;

        runXp = 0;
        runGold = 0;
        updateHudSession();

        deathOverlay.classList.add('hidden');
        completeOverlay.classList.add('hidden');
        state = GameState.PLAYING;
    }

    // Завершение уровня: игрок дошёл до двери
    async function handleLevelComplete() {
        if (!level.exit) return;
        if (!rectsIntersect(player.rect, level.exit)) return;

        state = GameState.LOADING; // блокируем управление на время запроса
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.querySelector('span').textContent = 'Сохраняем прогресс...';

        try {
            const response = await fetch(`/api/levels/${levelId}/complete/`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken(),
                },
                body: JSON.stringify({ xp_earned: runXp, gold_earned: runGold }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            completeRewardsEl.textContent =
                `+${result.xp_awarded} XP · +${result.gold_awarded} Gold` +
                (result.levels_gained.length > 0 ? ` · Level Up! (Lv.${result.character_level})` : '');

            loadingOverlay.classList.add('hidden');
            completeOverlay.classList.remove('hidden');
            state = GameState.COMPLETE;
        } catch (err) {
            console.error('Не удалось сохранить прогресс:', err);
            alert('Не удалось сохранить прогресс. Проверь соединение и попробуй снова.');
            loadingOverlay.classList.add('hidden');
            state = GameState.PLAYING; // даём попробовать дойти до двери ещё раз
        }
    }

    function handleEnemyContact() {
        for (const enemy of enemies) {
            if (enemy.isDead) continue;
            if (!rectsIntersect(player.rect, enemy.rect)) continue;
            player.takeDamage(enemy.damage);
        }
    }

    function handleTrapContact() {
        for (const trap of level.traps) {
            if (trap.type !== 'spikes') continue;
            if (!rectsIntersect(player.rect, trap)) continue;

            const playerCenterX = player.x + player.width / 2;
            const trapCenterX = trap.x + trap.width / 2;
            const knockDirection = playerCenterX < trapCenterX ? -1 : 1;

            player.takeDamageWithKnockback(trap.damage, knockDirection);
        }
    }

    function handlePlayerAttack() {
        const hitbox = player.getAttackHitbox();

        if (hitbox && !attackWasActive) {
            hitEnemiesThisSwing = new Set();
        }
        attackWasActive = !!hitbox;

        if (!hitbox) return;

        for (const enemy of enemies) {
            if (enemy.isDead || hitEnemiesThisSwing.has(enemy)) continue;
            if (!rectsIntersect(hitbox, enemy.rect)) continue;

            hitEnemiesThisSwing.add(enemy);

            const damage = computeDamage(player.strength, enemy.defense);
            enemy.takeDamage(damage);

            spawnFloatingText(`-${damage}`, enemy.x + enemy.width / 2, enemy.y - 4, '#ffffff');

            if (enemy.isDead) {
                runXp += enemy.xpReward;
                runGold += enemy.goldReward;

                spawnFloatingText(`+${enemy.xpReward} XP`, enemy.x + enemy.width / 2, enemy.y - 20, '#7c5cbf');
                spawnFloatingText(`+${enemy.goldReward} Gold`, enemy.x + enemy.width / 2, enemy.y - 36, '#e0a53c');

                updateHudSession();
            }
        }
    }

    function updateFloatingTexts() {
        for (const ft of floatingTexts) {
            ft.y -= 0.6;
            ft.life -= 1;
        }
        floatingTexts = floatingTexts.filter((ft) => ft.life > 0);
    }

    function gameLoop(timestamp) {
        requestAnimationFrame(gameLoop);

        if (state === GameState.LOADING || !level || !player) {
            return; // ещё грузимся - рендерить нечего
        }

        if (input.wasJustPressed('pause')) {
            togglePause();
        }

        if (state === GameState.PLAYING) {
            for (const mp of movingPlatforms) mp.update();
            for (const fp of fallingPlatforms) fp.update();

            player.update(input, level, movingPlatforms, fallingPlatforms);

            if (player.x < 0) player.x = 0;
            if (player.x + player.width > level.width) player.x = level.width - player.width;

            for (const enemy of enemies) {
                enemy.update(level);
            }

            handlePlayerAttack();
            handleEnemyContact();
            handleTrapContact();
            updateFloatingTexts();
            handleLevelComplete(); // асинхронная - сама переключит state при успехе

            if (player.hasFallenIntoVoid(level) || !player.isAlive) {
                triggerDeath();
            }
        }

        camera.follow(player, level);
        renderer.render(level, player, camera, enemies, floatingTexts, movingPlatforms, fallingPlatforms);
        updateHudHealth();

        input.clearFrame();
    }

    updateHudSession();
    loadCharacterAndLevel();
    requestAnimationFrame(gameLoop);
})();