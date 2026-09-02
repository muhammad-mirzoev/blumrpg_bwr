/**
 * Отрисовка сцены. Простыми прямоугольниками/эллипсами с базовой
 */
class Renderer {
    constructor(ctx, canvasWidth, canvasHeight) {
        this.ctx = ctx;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    render(level, player, camera, enemies, floatingTexts, movingPlatforms, fallingPlatforms) {
        const ctx = this.ctx;

        this._drawBackground();

        ctx.save();
        ctx.translate(-camera.x, -camera.y);

        this._drawPlatforms(level);
        this._drawMovingPlatforms(movingPlatforms);
        this._drawFallingPlatforms(fallingPlatforms);
        this._drawTraps(level);
        this._drawEnemies(enemies);
        this._drawAttackHitbox(player);
        this._drawPlayer(player);
        this._drawFloatingTexts(floatingTexts);

        ctx.restore();
    }

    _drawBackground() {
        const ctx = this.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        gradient.addColorStop(0, '#1a1a26');
        gradient.addColorStop(1, '#0a0a10');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    _drawPlatforms(level) {
        const ctx = this.ctx;
        for (const p of level.platforms) {
            ctx.fillStyle = '#3a3a4a';
            ctx.fillRect(p.x, p.y, p.width, p.height);

            ctx.fillStyle = '#4f6b4a';
            ctx.fillRect(p.x, p.y, p.width, 4);

            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(p.x, p.y + p.height - 4, p.width, 4);
        }
    }

    _drawMovingPlatforms(movingPlatforms) {
        const ctx = this.ctx;
        for (const p of movingPlatforms) {
            ctx.fillStyle = '#4a4a63'; // чуть холоднее обычных платформ - читается как механизм
            ctx.fillRect(p.x, p.y, p.width, p.height);

            ctx.fillStyle = '#e0a53c';
            ctx.fillRect(p.x, p.y, p.width, 3); // янтарная полоса-индикатор "механизм"

            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(p.x, p.y + p.height - 4, p.width, 4);
        }
    }

    _drawFallingPlatforms(fallingPlatforms) {
        const ctx = this.ctx;

        for (const p of fallingPlatforms) {
            if (p.state === 'collapsed') continue; // сейчас её физически нет

            ctx.save();

            // Дрожание во время предупреждения - небольшой случайный сдвиг.
            let shakeX = 0, shakeY = 0;
            if (p.state === 'warning') {
                shakeX = (Math.random() - 0.5) * 3;
                shakeY = (Math.random() - 0.5) * 2;
            }

            if (p.state === 'falling') {
                ctx.globalAlpha = Math.max(0, p.timer / p.FALL_DURATION);
            }

            ctx.translate(shakeX, shakeY);

            ctx.fillStyle = '#3a3a4a';
            ctx.fillRect(p.x, p.y, p.width, p.height);

            // Мелкие трещины - единственная подсказка, что платформа "не такая как все".
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x + p.width * 0.3, p.y);
            ctx.lineTo(p.x + p.width * 0.45, p.y + p.height);
            ctx.moveTo(p.x + p.width * 0.7, p.y);
            ctx.lineTo(p.x + p.width * 0.6, p.y + p.height * 0.6);
            ctx.stroke();

            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(p.x, p.y + p.height - 4, p.width, 4);

            ctx.restore();
        }
    }

    _drawTraps(level) {
        const ctx = this.ctx;
        for (const trap of level.traps) {
            if (trap.type !== 'spikes') continue;

            const spikeCount = Math.floor(trap.width / 12);
            ctx.fillStyle = '#8b8b9a';

            for (let i = 0; i < spikeCount; i++) {
                const spikeX = trap.x + i * 12;
                ctx.beginPath();
                ctx.moveTo(spikeX, trap.y + trap.height);
                ctx.lineTo(spikeX + 6, trap.y);
                ctx.lineTo(spikeX + 12, trap.y + trap.height);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    _drawEnemies(enemies) {
        for (const enemy of enemies) {
            if (enemy.isDead) continue;
            if (enemy instanceof Slime) {
                this._drawSlime(enemy);
            }
        }
    }

    _drawSlime(slime) {
        const ctx = this.ctx;

        const squash = Math.sin(slime.bobPhase) * 0.15;
        const w = slime.width * (1 + squash);
        const h = slime.height * (1 - squash);
        const offsetY = slime.height - h;

        ctx.fillStyle = slime.hitFlashTimer > 0 ? '#f2f2f2' : '#4caf6b';
        ctx.beginPath();
        ctx.ellipse(
            slime.x + slime.width / 2,
            slime.y + offsetY + h / 2,
            w / 2, h / 2,
            0, 0, Math.PI * 2
        );
        ctx.fill();

        if (slime.hitFlashTimer <= 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.beginPath();
            ctx.ellipse(
                slime.x + slime.width / 2 - w / 6,
                slime.y + offsetY + h / 3,
                w / 5, h / 6,
                0, 0, Math.PI * 2
            );
            ctx.fill();
        }
    }

    _drawAttackHitbox(player) {
        const hitbox = player.getAttackHitbox();
        if (!hitbox) return;

        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(224, 165, 60, 0.35)';
        ctx.strokeStyle = 'rgba(224, 165, 60, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height, 6);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    _drawPlayer(player) {
        const ctx = this.ctx;

        const isFlickering = player.invulnerableTimer > 0;
        const isFadedFrame = isFlickering && Math.floor(player.invulnerableTimer / 4) % 2 === 0;

        ctx.save();
        ctx.globalAlpha = isFadedFrame ? 0.35 : 1;

        ctx.fillStyle = '#e0a53c';
        ctx.fillRect(player.x, player.y, player.width, player.height);

        ctx.fillStyle = '#14141c';
        const eyeX = player.facing === 1
            ? player.x + player.width - 10
            : player.x + 4;
        ctx.fillRect(eyeX, player.y + 10, 6, 6);

        ctx.restore();
    }

    _drawFloatingTexts(floatingTexts) {
        const ctx = this.ctx;
        ctx.save();
        ctx.font = '13px "Press Start 2P", monospace';
        ctx.textAlign = 'center';

        for (const ft of floatingTexts) {
            ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
        }

        ctx.restore();
    }
}