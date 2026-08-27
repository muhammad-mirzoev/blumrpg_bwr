/**
 * Камера следует за игроком по горизонтали и не выходит за границы уровня.
 * По вертикали пока не скроллим - высота уровня равна высоте канваса
 * (этого достаточно для тестового уровня; при необходимости логика
 * расширяется точно так же, как для оси X).
 */
class Camera {
    constructor(viewWidth, viewHeight) {
        this.x = 0;
        this.y = 0;
        this.viewWidth = viewWidth;
        this.viewHeight = viewHeight;
    }

    follow(target, level) {
        const desiredX = target.x + target.width / 2 - this.viewWidth / 2;
        this.x = Math.max(0, Math.min(desiredX, level.width - this.viewWidth));
    }
}