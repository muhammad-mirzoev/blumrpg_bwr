from rest_framework import serializers
from .models import Level, LevelCompletion


def is_level_unlocked(level, character):
    """
    Первый уровень в мире открыт всегда. Остальные открываются, когда
    предыдущий уровень (по order внутри того же world) пройден этим
    персонажем хотя бы раз.
    """
    previous = level.get_previous_level()
    if previous is None:
        return True
    return LevelCompletion.objects.filter(character=character, level=previous).exists()


class LevelListSerializer(serializers.ModelSerializer):
    """
    Для экрана выбора уровня (GET /api/levels/). Без map_data -
    карта нужна только когда игрок реально заходит на уровень.
    """
    is_unlocked = serializers.SerializerMethodField()
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = Level
        fields = (
            'id', 'name', 'slug', 'description', 'difficulty',
            'world', 'order', 'required_character_level',
            'reward_gold', 'reward_experience',
            'is_unlocked', 'is_completed',
        )

    def _character(self):
        return self.context['request'].user.character

    def get_is_unlocked(self, obj):
        return is_level_unlocked(obj, self._character())

    def get_is_completed(self, obj):
        return LevelCompletion.objects.filter(character=self._character(), level=obj).exists()


class LevelDetailSerializer(LevelListSerializer):
    """Для GET /api/levels/<id>/ - добавляет map_data поверх полей списка."""
    class Meta(LevelListSerializer.Meta):
        fields = LevelListSerializer.Meta.fields + ('map_data',)


class LevelCompleteSerializer(serializers.Serializer):
    """
    Тело POST /api/levels/<id>/complete/. xp_earned/gold_earned - то,
    что фронтенд насчитал за убийства врагов (Session-счётчик из HUD).
    Сервер не доверяет этим числам напрямую - см. LevelCompleteView.
    """
    xp_earned = serializers.IntegerField(min_value=0, default=0)
    gold_earned = serializers.IntegerField(min_value=0, default=0)