/**
 * Игрок: физика, движение, прыжок, столкновения с платформами, HP, атака.
 */
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 48;

        this.vx = 0;
        this.vy = 0;

        this.onGround = false;
        this.facing = 1;

        this.MOVE_SPEED = 4.2;
        this.JUMP_FORCE = -13;
        this.GRAVITY = 0.65;
        this.MAX_FALL_SPEED = 16;
        this.FRICTION = 0.8;

        this.maxHealth = 100;
        this.health = 100;

        this.INVULNERABILITY_FRAMES = 60;
        this.invulnerableTimer = 0;

        this.strength = 10;
        this.defense = 0;

        this.ATTACK_ACTIVE_FRAMES = 10;
        this.ATTACK_COOLDOWN_FRAMES = 28;
        this.attackTimer = 0;
        this.attackCooldown = 0;

        // Кратковременная потеря контроля после удара шипами/врагом с knockback.
        this.knockbackTimer = 0;

        // Платформа, на которой сейчас стоит игрок (или null). Нужна,
        // чтобы двигать игрока вместе с движущейся платформой — иначе
        // он будет соскальзывать назад, пока платформа едет вперёд.
        this.standingOn = null;
    }

    get rect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    get isAlive() {
        return this.health > 0;
    }

    get isAttacking() {
        return this.attackTimer > 0;
    }

    update(input, level, movingPlatforms, fallingPlatforms) {
        // Если стоим на движущейся платформе - переносимся вместе с ней
        // ДО обработки собственного ввода, чтобы это не "съедало" прыжок игрока.
        if (this.standingOn) {
            this.x += this.standingOn.deltaX;
        }
        this.standingOn = null;

        if (this.knockbackTimer > 0) {
            this.knockbackTimer -= 1;
        } else {
            this._handleHorizontalInput(input);
        }

        this._handleJump(input);
        this._handleAttack(input);
        this._applyGravity();

        this._moveAndCollideX(level.platforms);
        this._moveAndCollideYCombined(level.platforms, movingPlatforms, fallingPlatforms);

        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= 1;
        }
    }

    getAttackHitbox() {
        if (this.attackTimer <= 0) return null;

        const width = 34;
        const height = this.height * 0.7;
        const x = this.facing === 1 ? this.x + this.width : this.x - width;
        const y = this.y + (this.height - height) / 2;

        return { x, y, width, height };
    }

    takeDamage(amount) {
        if (this.invulnerableTimer > 0) return false;

        // защита снижает входящий урон, минимум 1. До этого этапа defense
        // игрока нигде не применялся - с появлением брони это исправлено.
        const mitigated = Math.max(amount - this.defense, 1);
        this.health = Math.max(0, this.health - mitigated);
        this.invulnerableTimer = this.INVULNERABILITY_FRAMES;
        return true;
    }

    /**
     * Урон с отбрасыванием (шипы, некоторые враги в будущем).
     * direction: -1 или 1 - куда отбросить игрока по горизонтали.
     */
    takeDamageWithKnockback(amount, direction) {
        const applied = this.takeDamage(amount);
        if (applied) {
            // Сила уменьшена по сравнению с первой версией — раньше
            // отбрасывание могло утащить игрока прямо в соседнюю пропасть.
            this.vx = 4 * direction;
            this.vy = -5;
            this.knockbackTimer = 10;
        }
        return applied;
    }

    hasFallenIntoVoid(level) {
        return this.y > level.deathZoneY;
    }

    respawn(level) {
        this.x = level.spawn.x;
        this.y = level.spawn.y;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.health = this.maxHealth;
        this.invulnerableTimer = 0;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.knockbackTimer = 0;
        this.standingOn = null;
    }

    _handleHorizontalInput(input) {
        if (input.isDown('left')) {
            this.vx = -this.MOVE_SPEED;
            this.facing = -1;
        } else if (input.isDown('right')) {
            this.vx = this.MOVE_SPEED;
            this.facing = 1;
        } else {
            this.vx *= this.FRICTION;
            if (Math.abs(this.vx) < 0.1) this.vx = 0;
        }
    }

    _handleJump(input) {
        if (input.wasJustPressed('jump') && this.onGround) {
            this.vy = this.JUMP_FORCE;
            this.onGround = false;
        }
    }

    _handleAttack(input) {
        if (this.attackTimer > 0) this.attackTimer -= 1;
        if (this.attackCooldown > 0) this.attackCooldown -= 1;

        if (input.wasJustPressed('attack') && this.attackCooldown <= 0) {
            this.attackTimer = this.ATTACK_ACTIVE_FRAMES;
            this.attackCooldown = this.ATTACK_COOLDOWN_FRAMES;
        }
    }

    _applyGravity() {
        this.vy += this.GRAVITY;
        if (this.vy > this.MAX_FALL_SPEED) {
            this.vy = this.MAX_FALL_SPEED;
        }
    }

    _moveAndCollideX(staticPlatforms) {
        this.x += this.vx;

        for (const platform of staticPlatforms) {
            if (!rectsIntersect(this.rect, platform)) continue;

            if (this.vx > 0) {
                this.x = platform.x - this.width;
            } else if (this.vx < 0) {
                this.x = platform.x + platform.width;
            }
            this.vx = 0;
        }

        // Границы уровня знает только main.js, поэтому здесь не клампим -
        // это делает вызывающий код (main.js) после update(), как и раньше.
    }

    /**
     * Вертикальные коллизии со всеми видами "полов" сразу: обычные
     * статичные платформы, движущиеся и осыпающиеся. Логика приземления
     * одинаковая для всех трёх - различие только в том, что происходит
     * ПОСЛЕ приземления (запоминаем standingOn / триггерим осыпание).
     */
    _moveAndCollideYCombined(staticPlatforms, movingPlatforms, fallingPlatforms) {
        this.y += this.vy;
        this.onGround = false;

        const allSolids = [
            ...staticPlatforms,
            ...movingPlatforms,
            ...fallingPlatforms.filter((p) => !p.isCollapsed),
        ];

        for (const platform of allSolids) {
            if (!rectsIntersect(this.rect, platform)) continue;

            if (this.vy > 0) {
                this.y = platform.y - this.height;
                this.onGround = true;
                this.vy = 0;

                if (platform.axis) {
                    // Это движущаяся платформа - запоминаем, чтобы в следующем
                    // кадре перенести игрока вместе с ней.
                    this.standingOn = platform;
                } else if (platform.triggerCollapse) {
                    // Это осыпающаяся платформа - запускаем таймер обрушения.
                    platform.triggerCollapse();
                }
            } else if (this.vy < 0) {
                this.y = platform.y + platform.height;
                this.vy = 0;
            }
        }
    }
}


/** Базовый класс врага. */
class Enemy {
    constructor({ x, y, width, height, health, damage, defense, speed, xpReward, goldReward }) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.maxHealth = health;
        this.health = health;

        this.damage = damage;
        this.defense = defense || 0;
        this.speed = speed;

        this.xpReward = xpReward;
        this.goldReward = goldReward;

        this.isDead = false;

        this.HIT_FLASH_FRAMES = 8;
        this.hitFlashTimer = 0;
    }

    get rect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    update(level) {
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= 1;
        }
    }

    takeDamage(amount) {
        if (this.isDead) return;

        this.health = Math.max(0, this.health - amount);
        this.hitFlashTimer = this.HIT_FLASH_FRAMES;

        if (this.health <= 0) {
            this.isDead = true;
        }
    }
}


/** Slime - медленный базовый враг*/
class Slime extends Enemy {
    constructor({ x, y, patrolMinX, patrolMaxX }) {
        super({
            x, y,
            width: 28, height: 20,
            health: 20,
            damage: 8,
            defense: 2,
            speed: 1.1,
            xpReward: 15,
            goldReward: 5,
        });

        this.patrolMinX = patrolMinX;
        this.patrolMaxX = patrolMaxX;
        this.direction = 1;
        this.bobPhase = Math.random() * Math.PI * 2;
    }

    update(level) {
        super.update(level);
        if (this.isDead) return;

        this.x += this.speed * this.direction;

        if (this.x <= this.patrolMinX) {
            this.x = this.patrolMinX;
            this.direction = 1;
        } else if (this.x + this.width >= this.patrolMaxX) {
            this.x = this.patrolMaxX - this.width;
            this.direction = -1;
        }

        this.bobPhase += 0.12;
    }
}


/**
 * Shipы - статичная ловушка. Не двигается, наносит сильный урон
 * с отбрасыванием при контакте. Есть небольшой кулдаун урона на
 * саму ловушку (иначе стоя на шипах игрок терял бы HP каждый кадр
 * ещё и поверх i-frames - это уже избыточно жестоко).
 */
class Spike {
    constructor({ x, y, width, height }) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.damage = 15;
    }

    get rect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}


/**
 * Движущаяся платформа. Едет туда-обратно вдоль одной оси между
 * rangeMin и rangeMax. deltaX/deltaY - на сколько она сдвинулась
 * именно в ЭТОМ кадре (нужно игроку, чтобы двигаться вместе с ней).
 */
class MovingPlatform {
    constructor({ x, y, width, height, axis, rangeMin, rangeMax, speed }) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.axis = axis; // 'x' или 'y'
        this.rangeMin = rangeMin;
        this.rangeMax = rangeMax;
        this.speed = speed;
        this.direction = 1;

        this.deltaX = 0;
        this.deltaY = 0;
    }

    get rect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    update() {
        const move = this.speed * this.direction;

        if (this.axis === 'x') {
            this.x += move;
            this.deltaX = move;
            this.deltaY = 0;

            if (this.x <= this.rangeMin) {
                this.x = this.rangeMin;
                this.direction = 1;
            } else if (this.x >= this.rangeMax) {
                this.x = this.rangeMax;
                this.direction = -1;
            }
        } else {
            this.y += move;
            this.deltaY = move;
            this.deltaX = 0;

            if (this.y <= this.rangeMin) {
                this.y = this.rangeMin;
                this.direction = 1;
            } else if (this.y >= this.rangeMax) {
                this.y = this.rangeMax;
                this.direction = -1;
            }
        }
    }
}


/**
 * Осыпающаяся платформа. Снаружи выглядит как обычная (с мелким отличием
 * в текстуре - см. renderer.js), но через WARNING_DELAY кадров после того,
 * как игрок на неё встал, она рушится (перестаёт быть твёрдой и падает
 * вниз анимацией), а через RESPAWN_DELAY - восстанавливается на исходном месте.
 */
class FallingPlatform {
    constructor({ x, y, width, height }) {
        this.originX = x;
        this.originY = y;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.WARNING_DELAY = 30;   // ~0.5 сек дрожания перед обрушением
        this.FALL_DURATION = 25;   // сколько кадров длится анимация падения
        this.RESPAWN_DELAY = 90;   // ~1.5 сек до восстановления

        this.state = 'idle'; // idle -> warning -> falling -> collapsed -> idle
        this.timer = 0;
    }

    get rect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    get isCollapsed() {
        return this.state === 'falling' || this.state === 'collapsed';
    }

    /** Вызывается игроком в момент приземления на платформу. */
    triggerCollapse() {
        if (this.state === 'idle') {
            this.state = 'warning';
            this.timer = this.WARNING_DELAY;
        }
    }

    update() {
        if (this.state === 'warning') {
            this.timer -= 1;
            if (this.timer <= 0) {
                this.state = 'falling';
                this.timer = this.FALL_DURATION;
            }
        } else if (this.state === 'falling') {
            this.y += 6; // платформа физически падает вниз с экрана
            this.timer -= 1;
            if (this.timer <= 0) {
                this.state = 'collapsed';
                this.timer = this.RESPAWN_DELAY;
            }
        } else if (this.state === 'collapsed') {
            this.timer -= 1;
            if (this.timer <= 0) {
                this.state = 'idle';
                this.x = this.originX;
                this.y = this.originY;
            }
        }
    }

    // Метод-геттер под общий интерфейс "у платформы, которая рушится, есть triggerCollapse"
    get triggerCollapseRef() {
        return this.triggerCollapse.bind(this);
    }
}


function rectsIntersect(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function computeDamage(attackerStrength, targetDefense) {
    return Math.max(attackerStrength - targetDefense, 1);
}