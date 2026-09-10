from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator


class Item(models.Model):
    """
    Определение предмета (каталог). Полностью редактируется через
    Django Admin - новые предметы не требуют изменения кода.
    """

    ITEM_TYPE_CHOICES = [
        ('weapon', 'Weapon'),
        ('armor', 'Armor'),
        ('helmet', 'Helmet'),
        ('boots', 'Boots'),
        ('potion', 'Potion'),
        ('consumable', 'Consumable'),
        ('quest_item', 'Quest Item'),
    ]

    EQUIPPABLE_TYPES = ('weapon', 'armor', 'helmet', 'boots')

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=110, unique=True)
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES)
    description = models.TextField(blank=True)

    # Актуально для weapon (страйк-бонус к силе атаки).
    damage_bonus = models.PositiveIntegerField(default=0)

    # Актуально для armor / helmet / boots.
    defense_bonus = models.PositiveIntegerField(default=0)

    # Актуально для potion / consumable.
    heal_amount = models.PositiveIntegerField(default=0)

    is_stackable = models.BooleanField(
        default=True,
        help_text='Можно ли иметь несколько штук в одном слоте инвентаря '
                   '(зелья - да, уникальную экипировку в будущем можно сделать нет).'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['item_type', 'name']
        verbose_name = 'Item'
        verbose_name_plural = 'Items'

    def __str__(self):
        return f'{self.name} ({self.get_item_type_display()})'

    @property
    def is_equippable(self):
        return self.item_type in self.EQUIPPABLE_TYPES

    @property
    def is_usable(self):
        return self.item_type in ('potion', 'consumable') and self.heal_amount > 0


class InventoryItem(models.Model):
    """Предмет, лежащий в инвентаре конкретного персонажа, с количеством."""

    character = models.ForeignKey(
        'characters.Character', on_delete=models.CASCADE, related_name='inventory_items',
    )
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='+')
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])

    acquired_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('character', 'item')
        verbose_name = 'Inventory item'
        verbose_name_plural = 'Inventory items'

    def __str__(self):
        return f'{self.character.name}: {self.item.name} x{self.quantity}'


class Equipment(models.Model):
    """
    Что сейчас надето на персонаже. Один персонаж - один набор слотов
    (OneToOne). Каждый слот ссылается на Item нужного типа - сам предмет
    при этом не покидает инвентарь (экипировка не "тратит" его).
    """

    character = models.OneToOneField(
        'characters.Character', on_delete=models.CASCADE, related_name='equipment',
    )

    weapon = models.ForeignKey(
        Item, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='+', limit_choices_to={'item_type': 'weapon'},
    )
    armor = models.ForeignKey(
        Item, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='+', limit_choices_to={'item_type': 'armor'},
    )
    helmet = models.ForeignKey(
        Item, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='+', limit_choices_to={'item_type': 'helmet'},
    )
    boots = models.ForeignKey(
        Item, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='+', limit_choices_to={'item_type': 'boots'},
    )

    class Meta:
        verbose_name = 'Equipment'
        verbose_name_plural = 'Equipment'

    def __str__(self):
        return f'Equipment of {self.character.name}'

    @property
    def total_damage_bonus(self):
        return self.weapon.damage_bonus if self.weapon else 0

    @property
    def total_defense_bonus(self):
        return sum(
            item.defense_bonus for item in (self.armor, self.helmet, self.boots) if item
        )