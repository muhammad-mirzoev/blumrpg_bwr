from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator


class Character(models.Model):
    """
    Игровой персонаж. Один пользователь = один персонаж (OneToOne).
    Если в будущем понадобится несколько персонажей на аккаунт -
    придётся менять на ForeignKey
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='character',
    )

    name = models.CharField(max_length=32)

    # Прогресс
    level = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    experience = models.PositiveIntegerField(default=0)
    gold = models.PositiveIntegerField(default=0)

    # Характеристики
    health = models.PositiveIntegerField(default=100)
    max_health = models.PositiveIntegerField(default=100)
    strength = models.PositiveIntegerField(default=10)
    defense = models.PositiveIntegerField(default=5)
    speed = models.PositiveIntegerField(default=5)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Character'
        verbose_name_plural = 'Characters'

    def __str__(self):
        return f'{self.name} (Lv.{self.level})'

    # Игровая логика уровня

    @property
    def experience_to_next_level(self) -> int:
        """
        Простая прогрессивная формула: чем выше уровень, тем больше нужно опыта.
        Level 1 -> 2: 100 XP
        Level 2 -> 3: 150 XP
        Level 3 -> 4: 200 XP
        и т.д. (+50 XP за каждый уровень)
        """
        return 100 + (self.level - 1) * 50

    def add_experience(self, amount: int) -> list[int]:
        """
        Добавляет опыт и обрабатывает повышение уровня (в том числе несколько
        уровней за раз, если опыта дали много). Возвращает список уровней,
        которые были достигнуты (для фронтенда - можно показать анимацию
        "Level Up!" за каждый).
        Метод не сохраняет объект - save() нужно вызвать отдельно,
        чтобы можно было объединить с другими изменениями в одной транзакции.
        """
        if amount <= 0:
            return []

        self.experience += amount
        levels_gained = []

        while self.experience >= self.experience_to_next_level:
            self.experience -= self.experience_to_next_level
            self.level += 1
            levels_gained.append(self.level)
            self._apply_level_up_bonuses()

        return levels_gained

    def _apply_level_up_bonuses(self) -> None:
        """Бонусы характеристик при повышении уровня."""
        self.max_health += 10
        self.health = self.max_health  # полное восстановление HP при левелапе
        self.strength += 2
        self.defense += 1

    def add_gold(self, amount: int) -> None:
        if amount > 0:
            self.gold += amount

    def take_damage(self, raw_damage: int) -> int:
        """
        Применяет урон с учётом защиты. Минимальный урон - 1
        """
        actual_damage = max(raw_damage - self.defense, 1)
        self.health = max(self.health - actual_damage, 0)
        return actual_damage

    @property
    def is_alive(self) -> bool:
        return self.health > 0