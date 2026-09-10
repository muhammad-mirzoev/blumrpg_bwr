from rest_framework import serializers
from .models import Item, InventoryItem, Equipment


class ItemSerializer(serializers.ModelSerializer):
    is_equippable = serializers.ReadOnlyField()
    is_usable = serializers.ReadOnlyField()

    class Meta:
        model = Item
        fields = (
            'id', 'name', 'slug', 'item_type', 'description',
            'damage_bonus', 'defense_bonus', 'heal_amount',
            'is_stackable', 'is_equippable', 'is_usable',
        )
        read_only_fields = fields


class InventoryItemSerializer(serializers.ModelSerializer):
    item = ItemSerializer(read_only=True)

    class Meta:
        model = InventoryItem
        fields = ('id', 'item', 'quantity', 'acquired_at')
        read_only_fields = fields


class EquipmentSerializer(serializers.ModelSerializer):
    weapon = ItemSerializer(read_only=True)
    armor = ItemSerializer(read_only=True)
    helmet = ItemSerializer(read_only=True)
    boots = ItemSerializer(read_only=True)
    total_damage_bonus = serializers.ReadOnlyField()
    total_defense_bonus = serializers.ReadOnlyField()

    class Meta:
        model = Equipment
        fields = (
            'weapon', 'armor', 'helmet', 'boots',
            'total_damage_bonus', 'total_defense_bonus',
        )
        read_only_fields = fields


class EquipItemSerializer(serializers.Serializer):
    item_id = serializers.IntegerField()


class UnequipSlotSerializer(serializers.Serializer):
    slot = serializers.ChoiceField(choices=['weapon', 'armor', 'helmet', 'boots'])


class UseItemSerializer(serializers.Serializer):
    item_id = serializers.IntegerField()