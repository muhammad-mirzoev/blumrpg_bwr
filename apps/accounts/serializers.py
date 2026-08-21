from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """
    Сериализатор регистрации.
    Проверяет уникальность username/email и совпадение паролей.
    """
    password = serializers.CharField(
        write_only=True, min_length=8, style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True, min_length=8, style={'input_type': 'password'},
        label='Confirm password'
    )

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2')
        extra_kwargs = {
            'email': {'required': True},
        }

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('Пользователь с таким именем уже существует.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Этот email уже используется.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password2': 'Пароли не совпадают.'})
        # Используем стандартные валидаторы Django (длина, похожесть на username и т.д.)
        validate_password(attrs['password'])
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)  # хэшируем пароль, не храним в открытом виде
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    """
    Сериализатор входа. Не привязан к модели - просто проверяет креды.
    """
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        request = self.context.get('request')
        user = authenticate(
            request=request,
            username=attrs['username'],
            password=attrs['password'],
        )
        if user is None:
            raise serializers.ValidationError('Неверное имя пользователя или пароль.')
        if not user.is_active:
            raise serializers.ValidationError('Этот аккаунт отключён.')
        attrs['user'] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    """
    Данные пользователя, которые отдаём наружу (без пароля).
    """
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'date_joined')
        read_only_fields = fields