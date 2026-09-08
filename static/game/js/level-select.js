/**
 * Экран выбора уровня. Загружает список уровней с backend и рисует
 * карточки: доступные - кликабельны, недоступные - с замочком.
 */
(function () {
    const grid = document.getElementById('level-grid');

    const DIFFICULTY_LABELS = {
        easy: 'Лёгкий',
        medium: 'Средний',
        hard: 'Сложный',
        boss: 'Босс',
    };

    async function loadLevels() {
        try {
            const response = await fetch('/api/levels/', { credentials: 'same-origin' });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const levels = await response.json();
            renderLevels(levels);
        } catch (err) {
            console.error('Не удалось загрузить уровни:', err);
            grid.innerHTML = '<p id="level-grid-loading">Не удалось загрузить уровни. Обнови страницу.</p>';
        }
    }

    function renderLevels(levels) {
        if (levels.length === 0) {
            grid.innerHTML = '<p id="level-grid-loading">Уровней пока нет - добавь их в Django Admin.</p>';
            return;
        }

        grid.innerHTML = '';

        for (const level of levels) {
            const card = document.createElement(level.is_unlocked ? 'a' : 'div');
            card.className = 'level-card' + (level.is_unlocked ? '' : ' level-card-locked');

            if (level.is_unlocked) {
                card.href = `/game/play/${level.id}/`;
            }

            card.innerHTML = `
                <div class="level-card-header">
                    <span class="level-card-world">World ${level.world} · ${level.order}</span>
                    ${level.is_completed ? '<span class="level-card-badge">✓ Пройден</span>' : ''}
                </div>
                <h3 class="level-card-name">${level.is_unlocked ? level.name : '???'}</h3>
                <p class="level-card-desc">${level.is_unlocked ? level.description : 'Пройди предыдущий уровень, чтобы открыть.'}</p>
                <div class="level-card-footer">
                    <span class="level-card-difficulty">${DIFFICULTY_LABELS[level.difficulty] || level.difficulty}</span>
                    <span class="level-card-reward">+${level.reward_experience} XP · +${level.reward_gold} Gold</span>
                </div>
                ${!level.is_unlocked ? '<div class="level-card-lock">🔒</div>' : ''}
            `;

            grid.appendChild(card);
        }
    }

    loadLevels();
})();