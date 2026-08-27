/**
 * Игрок: физика, движение, прыжок, столкновения с платформами.
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
        this.FRICTION = 0.8; // затухание скорости, когда нет ввода
    }

    get rect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    update(input, level) {
        this._handleHorizontalInput(input);
        this._handleJump(input);
        this._applyGravity();

        // Двигаем и разрешаем коллизии по осям отдельно -
        // это стандартный приём для избежания "залипания" в углах платформ.
        this._moveAndCollideX(level);
        this._moveAndCollideY(level);
    }

    /**
     * Возвращает true, если персонаж провалился ниже death zone уровня
     * (упал в пропасть/ловушку).
     */
    hasFallenIntoVoid(level) {
        return this.y > level.deathZoneY;
    }

    /**
     * Возвращает персонажа на точку спавна уровня и сбрасывает физику.
     * Используется при рестарте после смерти.
     */
    respawn(level) {
        this.x = level.spawn.x;
        this.y = level.spawn.y;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
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

    _applyGravity() {
        this.vy += this.GRAVITY;
        if (this.vy > this.MAX_FALL_SPEED) {
            this.vy = this.MAX_FALL_SPEED;
        }
    }

    _moveAndCollideX(level) {
        this.x += this.vx;

        for (const platform of level.platforms) {
            if (!this._intersects(this.rect, platform)) continue;

            if (this.vx > 0) {
                this.x = platform.x - this.width;
            } else if (this.vx < 0) {
                this.x = platform.x + platform.width;
            }
            this.vx = 0;
        }

        // Не даём уйти за левый край уровня
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > level.width) this.x = level.width - this.width;
    }

    _moveAndCollideY(level) {
        this.y += this.vy;
        this.onGround = false;

        for (const platform of level.platforms) {
            if (!this._intersects(this.rect, platform)) continue;

            if (this.vy > 0) {
                // падаем - приземляемся на платформу
                this.y = platform.y - this.height;
                this.onGround = true;
            } else if (this.vy < 0) {
                // прыгаем - бьёмся головой о платформу снизу
                this.y = platform.y + platform.height;
            }
            this.vy = 0;
        }
    }

    _intersects(a, b) {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }
}