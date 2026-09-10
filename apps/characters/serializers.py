from rest_framework import serializers
from .models import Character


class CharacterSerializer(serializers.ModelSerializer):
    experience_to_next_level = serializers.ReadOnlyField()
    is_alive = serializers.ReadOnlyField()

    # Базовые характеристики + бонусы от экипированных предметов.
    # Считаются на лету, не переписывая strength/defense в БД.
    effective_strength = serializers.SerializerMethodField()
    effective_defense = serializers.SerializerMethodField()
    equipment = serializers.SerializerMethodField()

    class Meta:
        model = Character
        fields = (
            'id', 'name', 'level', 'experience', 'experience_to_next_level',
            'gold', 'health', 'max_health', 'strength', 'defense', 'speed',
            'effective_strength', 'effective_defense', 'equipment',
            'is_alive', 'created_at', 'updated_at',
        )
        read_only_fields = fields

    def _get_equipment(self, obj):
        from apps.items.models import Equipment
        equipment, _ = Equipment.objects.get_or_create(character=obj)
        return equipment

    def get_effective_strength(self, obj):
        equipment = self._get_equipment(obj)
        return obj.strength + equipment.total_damage_bonus

    def get_effective_defense(self, obj):
        equipment = self._get_equipment(obj)
        return obj.defense + equipment.total_defense_bonus

    def get_equipment(self, obj):
        from apps.items.serializers import EquipmentSerializer
        return EquipmentSerializer(self._get_equipment(obj)).data