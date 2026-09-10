from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Item, InventoryItem, Equipment
from .serializers import (
    ItemSerializer, InventoryItemSerializer, EquipmentSerializer,
    EquipItemSerializer, UnequipSlotSerializer, UseItemSerializer,
)


class ItemListView(generics.ListAPIView):
    """GET /api/items/ - полный каталог предметов игры."""
    serializer_class = ItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Item.objects.all()


class InventoryView(generics.ListAPIView):
    """GET /api/items/inventory/ - инвентарь текущего персонажа."""
    serializer_class = InventoryItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return InventoryItem.objects.filter(
            character=self.request.user.character
        ).select_related('item')


class EquipmentView(generics.RetrieveAPIView):
    """GET /api/items/equipment/ - что сейчас надето."""
    serializer_class = EquipmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        equipment, _ = Equipment.objects.get_or_create(character=self.request.user.character)
        return equipment


class EquipItemView(APIView):
    """
    POST /api/items/equip/  {"item_id": 1}
    Экипирует предмет из инвентаря персонажа в соответствующий слот.
    Предмет остаётся в инвентаре - экипировка его не расходует.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = EquipItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        character = request.user.character
        item = get_object_or_404(Item, pk=serializer.validated_data['item_id'])

        if not item.is_equippable:
            return Response(
                {'detail': f'Предмет типа "{item.item_type}" нельзя экипировать.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        owns_item = InventoryItem.objects.filter(character=character, item=item).exists()
        if not owns_item:
            return Response(
                {'detail': 'Этого предмета нет в инвентаре.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        equipment, _ = Equipment.objects.get_or_create(character=character)
        setattr(equipment, item.item_type, item)  # 'weapon'/'armor'/'helmet'/'boots'
        equipment.save()

        return Response(EquipmentSerializer(equipment).data, status=status.HTTP_200_OK)


class UnequipItemView(APIView):
    """POST /api/items/unequip/  {"slot": "weapon"}"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = UnequipSlotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        equipment, _ = Equipment.objects.get_or_create(character=request.user.character)
        setattr(equipment, serializer.validated_data['slot'], None)
        equipment.save()

        return Response(EquipmentSerializer(equipment).data, status=status.HTTP_200_OK)


class UseItemView(APIView):
    """
    POST /api/items/use/  {"item_id": 3}
    Использует зелье/расходник: лечит персонажа, уменьшает quantity в
    инвентаре (удаляет запись, если дошло до 0).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = UseItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        character = request.user.character
        item = get_object_or_404(Item, pk=serializer.validated_data['item_id'])

        if not item.is_usable:
            return Response(
                {'detail': f'Предмет "{item.name}" нельзя использовать.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        inventory_item = InventoryItem.objects.filter(character=character, item=item).first()
        if not inventory_item or inventory_item.quantity < 1:
            return Response(
                {'detail': 'Этого предмета нет в инвентаре.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        character.health = min(character.max_health, character.health + item.heal_amount)
        character.save()

        inventory_item.quantity -= 1
        if inventory_item.quantity <= 0:
            inventory_item.delete()
        else:
            inventory_item.save()

        return Response({
            'character_health': character.health,
            'character_max_health': character.max_health,
            'item_remaining': inventory_item.quantity if inventory_item.pk else 0,
        }, status=status.HTTP_200_OK)