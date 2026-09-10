from django.contrib import admin
from .models import Item, InventoryItem, Equipment


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'item_type', 'damage_bonus', 'defense_bonus', 'heal_amount', 'is_stackable')
    list_filter = ('item_type', 'is_stackable')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ('character', 'item', 'quantity', 'acquired_at')
    list_filter = ('item__item_type',)
    search_fields = ('character__name', 'item__name')
    autocomplete_fields = ('character', 'item')


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ('character', 'weapon', 'armor', 'helmet', 'boots')
    search_fields = ('character__name',)
    autocomplete_fields = ('character', 'weapon', 'armor', 'helmet', 'boots')