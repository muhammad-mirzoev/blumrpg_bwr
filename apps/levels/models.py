from django.db import models
from django.core.validators import MinValueValidator


class Level(models.Model):
    """
    Игровой уровень. Все данные для Canvas-движка (платформы, враги,
    ловушки, точка спавна, дверь-выход) хранятся в map_data - поэтому
    новые уровни добавляются полностью через Django Admin.

    Формат map_data идентичен структуре, которая раньше жила прямо в
    static/game/js/level.js (TEST_LEVEL) - фронтенду не пришлось менять
    логику чтения уровня, только источник данных.
    """

    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
        ('boss', 'Boss'),
    ]

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=110, unique=True)
    description = models.TextField(blank=True)

    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='easy')

    # Мир и порядок внутри мира (п.13 ТЗ: WORLD 1 - Лес, 5 уровней, и т.д.)
    world = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(
        default=1,
        help_text='Порядок внутри мира (1, 2, 3...). Определяет, какой '
                   'уровень нужно пройти, чтобы открыть следующий.'
    )

    required_character_level = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text='Минимальный уровень персонажа для входа на этот уровень.'
    )

    reward_gold = models.PositiveIntegerField(default=0)
    reward_experience = models.PositiveIntegerField(default=0)

    map_data = models.JSONField(
        help_text='width, height, spawn, deathZoneY, exit, platforms, enemies, '
                   'traps, movingPlatforms, fallingPlatforms — формат как в '
                   'бывшем static/game/js/level.js.'
    )

    is_active = models.BooleanField(
        default=True,
        help_text='Неактивные уровни не показываются игрокам, даже если разблокированы.'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['world', 'order']
        unique_together = ('world', 'order')
        verbose_name = 'Level'
        verbose_name_plural = 'Levels'

    def __str__(self):
        return f'World {self.world} — {self.order}. {self.name}'

    def get_previous_level(self):
        """Уровень, который нужно пройти, чтобы открыть этот. None — для самого первого."""
        return (
            Level.objects.filter(world=self.world, order__lt=self.order, is_active=True)
            .order_by('-order')
            .first()
        )

    def get_max_possible_rewards(self):
        """
        Анти-чит: теоретический максимум XP/Gold, который честно можно
        получить на уровне, убив всех врагов из map_data. Используется,
        чтобы не доверять напрямую данным с клиента.

        ВАЖНО: значения ниже должны совпадать с тем, что задано в классах
        врагов в static/game/js/entities.js. Добавляешь нового врага на
        фронтенде - обнови и эту таблицу.
        """
        max_xp = 0
        max_gold = 0

        for enemy in self.map_data.get('enemies', []):
            reward = ENEMY_REWARDS.get(enemy.get('type'))
            if reward:
                max_xp += reward['xp']
                max_gold += reward['gold']

        return max_xp, max_gold


ENEMY_REWARDS = {
    'slime': {'xp': 15, 'gold': 5},
}


class LevelCompletion(models.Model):
    """
    Факт прохождения уровня персонажем. Наличие записи означает, что
    уровень пройден хотя бы раз - на этом строится разблокировка
    следующего уровня и отметка "пройдено" в списке.
    """
    character = models.ForeignKey(
        'characters.Character',
        on_delete=models.CASCADE,
        related_name='level_completions',
    )
    level = models.ForeignKey(Level, on_delete=models.CASCADE, related_name='completions')

    times_completed = models.PositiveIntegerField(default=1)
    first_completed_at = models.DateTimeField(auto_now_add=True)
    last_completed_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('character', 'level')
        verbose_name = 'Level completion'
        verbose_name_plural = 'Level completions'

    def __str__(self):
        return f'{self.character.name} — {self.level.name} (x{self.times_completed})'