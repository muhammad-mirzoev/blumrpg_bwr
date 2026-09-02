/**
 * ВРЕМЕННЫЙ тестовый уровень, захардкоженный прямо в JS.
 * Полноценная система уровней (загрузка map_data из Django API,
 */
const TEST_LEVEL = {
    width: 2400,
    height: 540,
    spawn: { x: 80, y: 400 },
    deathZoneY: 700,
    platforms: [
        { x: 0, y: 500, width: 500, height: 40 },
        { x: 620, y: 500, width: 300, height: 40 },
        { x: 1000, y: 500, width: 260, height: 40 },
        { x: 1340, y: 500, width: 1060, height: 40 },

        { x: 250, y: 400, width: 120, height: 20 },
        { x: 500, y: 340, width: 100, height: 20 },
        { x: 720, y: 400, width: 100, height: 20 },
        { x: 1150, y: 420, width: 100, height: 20 },
        { x: 1700, y: 320, width: 120, height: 20 },
        { x: 1900, y: 420, width: 160, height: 20 },
    ],

    enemies: [
        { type: 'slime', x: 650, y: 480, patrolMinX: 630, patrolMaxX: 892 },
        { type: 'slime', x: 1550, y: 480, patrolMinX: 1360, patrolMaxX: 2380 },
    ],

    // Ловушки сдвинуты подальше от краёв платформ
    traps: [
        { type: 'spikes', x: 1080, y: 480, width: 60, height: 20, damage: 15 },
        { type: 'spikes', x: 1730, y: 300, width: 60, height: 20, damage: 15 },
    ],

    movingPlatforms: [
        {
            x: 1450, y: 380, width: 140, height: 20,
            axis: 'x', rangeMin: 1360, rangeMax: 1690, speed: 1.4,
        },
    ],

    fallingPlatforms: [
        { x: 950, y: 340, width: 100, height: 20 },
    ],
};