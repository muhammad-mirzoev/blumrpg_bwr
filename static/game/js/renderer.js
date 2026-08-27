/**
 * Отрисовка сцены. На этом этапе - простыми прямоугольниками с базовой
 * "пиксельной" стилизацией (тени/градиенты), без спрайтов —
 * художественные ассеты добавим на Этапе 15 (Polish).
 */
class Renderer {
    constructor(ctx, canvasWidth, canvasHeight) {
        this.ctx = ctx;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    render(level, player, camera) {
        const ctx = this.ctx;

        this._drawBackground();

        ctx.save();
        ctx.translate(-camera.x, -camera.y);

        this._drawPlatforms(level);
        this._drawPlayer(player);

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
            // тело платформы
            ctx.fillStyle = '#3a3a4a';
            ctx.fillRect(p.x, p.y, p.width, p.height);

            // верхняя "трава/мох" полоска - просто для читаемости верха платформы
            ctx.fillStyle = '#4f6b4a';
            ctx.fillRect(p.x, p.y, p.width, 4);

            // нижняя тень
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(p.x, p.y + p.height - 4, p.width, 4);
        }
    }

    _drawPlayer(player) {
        const ctx = this.ctx;

        // тело
        ctx.fillStyle = '#e0a53c';
        ctx.fillRect(player.x, player.y, player.width, player.height);

        // "лицо" - направление взгляда, просто прямоугольник-глаз
        ctx.fillStyle = '#14141c';
        const eyeX = player.facing === 1
            ? player.x + player.width - 10
            : player.x + 4;
        ctx.fillRect(eyeX, player.y + 10, 6, 6);
    }
}