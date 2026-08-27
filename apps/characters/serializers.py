from rest_framework import serializers
from .models import Character


class CharacterSerializer(serializers.ModelSerializer):
    experience_to_next_level = serializers.ReadOnlyField()
    is_alive = serializers.ReadOnlyField()

    class Meta:
        model = Character
        fields = (
            'id', 'name', 'level', 'experience', 'experience_to_next_level',
            'gold', 'health', 'max_health', 'strength', 'defense', 'speed',
            'is_alive', 'created_at', 'updated_at',
        )
        # Все поля read-only на этом этапе: изменять характеристики напрямую
        # через API нельзя - это будет делаться через игровую логику
        # (получение опыта, урон и т.д.)
        read_only_fields = fields