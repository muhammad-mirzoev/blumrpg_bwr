/**
 * Точка входа. Инициализирует игру, подтягивает данные персонажа
 */
(function () {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const input = new InputManager();
    const level = TEST_LEVEL;
    const player = new Player(level.spawn.x, level.spawn.y);
    const camera = new Camera(canvas.width, canvas.height);
    const renderer = new Renderer(ctx, canvas.width, canvas.height);

    let enemies = spawnEnemies(level);
    let movingPlatforms = spawnMovingPlatforms(level);
    let fallingPlatforms = spawnFallingPlatforms(level);
    let floatingTexts = [];

    let runXp = 0;
    let runGold = 0;

    let hitEnemiesThisSwing = new Set();
    let attackWasActive = false;

    const GameState = { PLAYING: 'playing', PAUSED: 'paused', DEAD: 'dead' };
    let state = GameState.PLAYING;

    const loadingOverlay = document.getElementById('loading-overlay');
    const pauseOverlay = document.getElementById('pause-overlay');
    const deathOverlay = document.getElementById('death-overlay');
    const btnRestart = document.getElementById('btn-restart');
    const hudSession = document.getElementById('hud-session');

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

    // Загрузка данных персонажа с backend
    async function loadCharacter() {
        try {
            const response = await fetch('/api/character/', {
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const character = await response.json();

            player.maxHealth = character.max_health;
            player.health = character.health;
            player.strength = character.strength;

            updateHudStaticFields(character);
        } catch (err) {
            console.error('Не удалось загрузить персонажа:', err);
            document.getElementById('hud-char-name').textContent = 'Гость (offline)';
        } finally {
            loadingOverlay.classList.add('hidden');
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
        if (state === GameState.DEAD) return;

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
        state = GameState.PLAYING;
    }

    btnRestart.addEventListener('click', restartLevel);

    function handleEnemyContact() {
        for (const enemy of enemies) {
            if (enemy.isDead) continue;
            if (!rectsIntersect(player.rect, enemy.rect)) continue;
            player.takeDamage(enemy.damage);
        }
    }

    /** Урон от шипов - с отбрасыванием в сторону, противоположную стороне подхода игрока. */
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

        if (input.wasJustPressed('pause')) {
            togglePause();
        }

        if (state === GameState.PLAYING) {
            for (const mp of movingPlatforms) mp.update();
            for (const fp of fallingPlatforms) fp.update();

            player.update(input, level, movingPlatforms, fallingPlatforms);

            // Границы уровня по X (раньше это делал сам Player, теперь -
            // после того, как учтено движение вместе с платформой).
            if (player.x < 0) player.x = 0;
            if (player.x + player.width > level.width) player.x = level.width - player.width;

            for (const enemy of enemies) {
                enemy.update(level);
            }

            handlePlayerAttack();
            handleEnemyContact();
            handleTrapContact();
            updateFloatingTexts();

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
    loadCharacter();
    requestAnimationFrame(gameLoop);
})();