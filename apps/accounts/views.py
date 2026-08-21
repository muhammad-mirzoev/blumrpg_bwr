from django.contrib.auth import login, logout
from django.middleware.csrf import get_token
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegisterSerializer, LoginSerializer, UserSerializer


class CsrfView(APIView):
    """
    GET /api/auth/csrf/
    Устанавливает CSRF-cookie в браузере. Фронтенд (Canvas-игра) должен
    дёрнуть этот эндпоинт один раз при загрузке страницы - до того,
    как отправлять POST-запросы (login/register/logout).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        get_token(request)
        return Response({'detail': 'CSRF cookie set'})


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Создаёт пользователя и сразу открывает сессию (пользователь залогинен
    сразу после регистрации).
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request, user)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    POST /api/auth/login/
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        login(request, user)
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProfileView(APIView):
    """
    GET /api/auth/me/
    Возвращает данные текущего залогиненного пользователя.
    Персонажа (Character) сюда добавим позже — на этапе apps/characters.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)