from rest_framework import generics, permissions
from .models import Character
from .serializers import CharacterSerializer


class MyCharacterView(generics.RetrieveAPIView):
    """
    GET /api/character/
    Возвращает персонажа текущего залогиненного пользователя.
    """
    serializer_class = CharacterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.character