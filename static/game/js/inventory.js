/**
 * Страница инвентаря: показывает экипированные предметы и содержимое
 * инвентаря, позволяет экипировать/снять/использовать предметы.
 */
(function () {
    const equipmentSlotsEl = document.getElementById('equipment-slots');
    const inventoryGridEl = document.getElementById('inventory-grid');

    const SLOT_LABELS = {
        weapon: 'Оружие', armor: 'Броня', helmet: 'Шлем', boots: 'Ботинки',
    };

    function getCsrfToken() {
        const match = document.cookie.match(/csrftoken=([^;]+)/);
        return match ? match[1] : '';
    }

    async function ensureCsrfCookie() {
        if (!document.cookie.includes('csrftoken=')) {
            await fetch('/api/auth/csrf/', { credentials: 'same-origin' });
        }
    }

    async function apiPost(url, body) {
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${response.status}`);
        }
        return response.json();
    }

    async function loadAll() {
        try {
            const [equipmentRes, inventoryRes] = await Promise.all([
                fetch('/api/items/equipment/', { credentials: 'same-origin' }),
                fetch('/api/items/inventory/', { credentials: 'same-origin' }),
            ]);

            const equipment = await equipmentRes.json();
            const inventory = await inventoryRes.json();

            renderEquipment(equipment);
            renderInventory(inventory);
        } catch (err) {
            console.error('Не удалось загрузить инвентарь:', err);
            inventoryGridEl.innerHTML = '<p id="inventory-loading">Ошибка загрузки. Обнови страницу.</p>';
        }
    }

    function renderEquipment(equipment) {
        equipmentSlotsEl.innerHTML = '';

        for (const slot of ['weapon', 'armor', 'helmet', 'boots']) {
            const item = equipment[slot];
            const box = document.createElement('div');
            box.className = 'equip-slot' + (item ? '' : ' equip-slot-empty');

            box.innerHTML = `
                <span class="equip-slot-label">${SLOT_LABELS[slot]}</span>
                <span class="equip-slot-item">${item ? item.name : '- пусто -'}</span>
                ${item ? `<button class="death-btn small-btn" data-unequip="${slot}">Снять</button>` : ''}
            `;
            equipmentSlotsEl.appendChild(box);
        }

        equipmentSlotsEl.querySelectorAll('[data-unequip]').forEach((btn) => {
            btn.addEventListener('click', () => unequip(btn.dataset.unequip));
        });
    }

    function renderInventory(inventory) {
        if (inventory.length === 0) {
            inventoryGridEl.innerHTML = '<p id="inventory-loading">Инвентарь пуст. Предметы выдаются через Django Admin.</p>';
            return;
        }

        inventoryGridEl.innerHTML = '';

        for (const invItem of inventory) {
            const item = invItem.item;
            const card = document.createElement('div');
            card.className = 'level-card'; // переиспользуем стиль карточки уровня

            let actionButton = '';
            if (item.is_equippable) {
                actionButton = `<button class="death-btn small-btn" data-equip="${item.id}">Экипировать</button>`;
            } else if (item.is_usable) {
                actionButton = `<button class="death-btn small-btn" data-use="${item.id}">Использовать</button>`;
            }

            card.innerHTML = `
                <div class="level-card-header">
                    <span class="level-card-world">${item.item_type}</span>
                    <span class="level-card-badge">x${invItem.quantity}</span>
                </div>
                <h3 class="level-card-name">${item.name}</h3>
                <p class="level-card-desc">${item.description || '—'}</p>
                <div class="level-card-footer">
                    <span>${item.damage_bonus ? `+${item.damage_bonus} DMG` : ''}</span>
                    <span>${item.defense_bonus ? `+${item.defense_bonus} DEF` : ''}</span>
                    <span>${item.heal_amount ? `+${item.heal_amount} HP` : ''}</span>
                </div>
                ${actionButton}
            `;
            inventoryGridEl.appendChild(card);
        }

        inventoryGridEl.querySelectorAll('[data-equip]').forEach((btn) => {
            btn.addEventListener('click', () => equip(Number(btn.dataset.equip)));
        });
        inventoryGridEl.querySelectorAll('[data-use]').forEach((btn) => {
            btn.addEventListener('click', () => useItem(Number(btn.dataset.use)));
        });
    }

    async function equip(itemId) {
        try {
            await apiPost('/api/items/equip/', { item_id: itemId });
            await loadAll();
        } catch (err) {
            alert(err.message);
        }
    }

    async function unequip(slot) {
        try {
            await apiPost('/api/items/unequip/', { slot });
            await loadAll();
        } catch (err) {
            alert(err.message);
        }
    }

    async function useItem(itemId) {
        try {
            const result = await apiPost('/api/items/use/', { item_id: itemId });
            alert(`HP восстановлено: ${result.character_health}/${result.character_max_health}`);
            await loadAll();
        } catch (err) {
            alert(err.message);
        }
    }

    ensureCsrfCookie().then(loadAll);
})();