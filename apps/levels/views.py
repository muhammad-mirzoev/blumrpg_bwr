from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Level, LevelCompletion
from .serializers import (
    LevelListSerializer, LevelDetailSerializer, LevelCompleteSerializer, is_level_unlocked,
)


class LevelListView(generics.ListAPIView):
    """GET /api/levels/ - список уровней для экрана выбора."""
    serializer_class = LevelListSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Level.objects.filter(is_active=True)


class LevelDetailView(generics.RetrieveAPIView):
    """
    GET /api/levels/<id>/ - данные уровня, включая map_data.
    Отдаёт карту ТОЛЬКО если уровень разблокирован для текущего
    персонажа - иначе 403, даже если запрос ушёл в API напрямую,
    в обход интерфейса выбора уровня.
    """
    serializer_class = LevelDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Level.objects.filter(is_active=True)

    def retrieve(self, request, *args, **kwargs):
        level = self.get_object()
        character = request.user.character

        if not is_level_unlocked(level, character):
            return Response(
                {'detail': 'Этот уровень ещё не разблокирован.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if character.level < level.required_character_level:
            return Response(
                {'detail': f'Требуется персонаж {level.required_character_level} уровня.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(level)
        return Response(serializer.data)


class LevelCompleteView(APIView):
    """
    POST /api/levels/<id>/complete/
    Backend авторитетно начисляет награды и фиксирует прохождение.
    Именно здесь "обналичивается" Session-счётчик (+XP/+Gold) из HUD.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        level = get_object_or_404(Level, pk=pk, is_active=True)
        character = request.user.character

        if not is_level_unlocked(level, character):
            return Response(
                {'detail': 'Этот уровень ещё не разблокирован.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = LevelCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # --- Анти-чит: не доверяем напрямую числам от клиента ---
        max_xp, max_gold = level.get_max_possible_rewards()
        safe_xp_earned = min(serializer.validated_data['xp_earned'], max_xp)
        safe_gold_earned = min(serializer.validated_data['gold_earned'], max_gold)

        total_xp = level.reward_experience + safe_xp_earned
        total_gold = level.reward_gold + safe_gold_earned

        levels_gained = character.add_experience(total_xp)
        character.add_gold(total_gold)
        character.save()

        completion, created = LevelCompletion.objects.get_or_create(
            character=character, level=level,
        )
        if not created:
            completion.times_completed += 1
            completion.last_completed_at = timezone.now()
            completion.save()

        return Response({
            'xp_awarded': total_xp,
            'gold_awarded': total_gold,
            'levels_gained': levels_gained,
            'character_level': character.level,
            'character_experience': character.experience,
            'character_gold': character.gold,
            'first_completion': created,
        }, status=status.HTTP_200_OK)