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
        this.facing = 1; // 1 = вправо, -1 = влево

        // Физические константы
        this.MOVE_SPEED = 4.2;
        this.JUMP_FORCE = -13;
        this.GRAVITY = 0.65;
        this.MAX_FALL_SPEED = 16;
        this.FRICTION = 0.8;

        // HP
        // Реальные значения подставляются в main.js после загрузки
        // персонажа с backend.
        this.maxHealth = 100;
        this.health = 100;

        this.INVULNERABILITY_FRAMES = 60;
        this.invulnerableTimer = 0;

        // Боевые характеристики
        // strength тоже подтягивается с backend в main.js. Значение по
        this.strength = 10;

        // Атака
        this.ATTACK_ACTIVE_FRAMES = 10;   // сколько кадров хитбокс реально бьёт
        this.ATTACK_COOLDOWN_FRAMES = 28; // сколько кадров ждать до следующей атаки
        this.attackTimer = 0;
        this.attackCooldown = 0;
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

    update(input, level) {
        this._handleHorizontalInput(input);
        this._handleJump(input);
        this._handleAttack(input);
        this._applyGravity();

        this._moveAndCollideX(level);
        this._moveAndCollideY(level);

        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= 1;
        }
    }

    /**
     * Возвращает прямоугольник хитбокса атаки перед персонажем,
     * либо null, если атака сейчас не активна.
     */
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

        this.health = Math.max(0, this.health - amount);
        this.invulnerableTimer = this.INVULNERABILITY_FRAMES;
        return true;
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

    _moveAndCollideX(level) {
        this.x += this.vx;

        for (const platform of level.platforms) {
            if (!rectsIntersect(this.rect, platform)) continue;

            if (this.vx > 0) {
                this.x = platform.x - this.width;
            } else if (this.vx < 0) {
                this.x = platform.x + platform.width;
            }
            this.vx = 0;
        }

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > level.width) this.x = level.width - this.width;
    }

    _moveAndCollideY(level) {
        this.y += this.vy;
        this.onGround = false;

        for (const platform of level.platforms) {
            if (!rectsIntersect(this.rect, platform)) continue;

            if (this.vy > 0) {
                this.y = platform.y - this.height;
                this.onGround = true;
            } else if (this.vy < 0) {
                this.y = platform.y + platform.height;
            }
            this.vy = 0;
        }
    }
}


/**
 * Базовый класс врага. Конкретные типы (Slime, Goblin, Bat, ...)
 * наследуются от него.
 */
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

        // Кратковременная белая вспышка при получении урона.
        this.HIT_FLASH_FRAMES = 8;
        this.hitFlashTimer = 0;
    }

    get rect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    /** Базовое обновление - тикает таймер вспышки. */
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


/**
 * Slime - медленный базовый враг.
 * Патрулирует между двумя точками, наносит контактный урон.
 */
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


/** Простая проверка пересечения двух прямоугольников (AABB). Общая утилита. */
function rectsIntersect(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

/**
 * Формула damage = strength - defense, минимум 1.
 * Это ТОЛЬКО клиентское превью - авторитетный расчёт (и защита от читов)
 * остаётся на backend.
 */
function computeDamage(attackerStrength, targetDefense) {
    return Math.max(attackerStrength - targetDefense, 1);
}