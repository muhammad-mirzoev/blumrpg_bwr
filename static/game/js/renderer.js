/**
 * Отрисовка сцены. Простыми прямоугольниками/эллипсами с базовой стилизацией.
 */
class Renderer {
    constructor(ctx, canvasWidth, canvasHeight) {
        this.ctx = ctx;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    render(level, player, camera, enemies, floatingTexts) {
        const ctx = this.ctx;

        this._drawBackground();

        ctx.save();
        ctx.translate(-camera.x, -camera.y);

        this._drawPlatforms(level);
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
        const offsetX = (slime.width - w) / 2;
        const offsetY = slime.height - h;

        // Во время hitFlash слизень становится белым - понятный сигнал попадания.
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