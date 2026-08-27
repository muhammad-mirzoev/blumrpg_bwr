from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Character


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_character_for_new_user(sender, instance, created, **kwargs):
    """
    При создании нового User автоматически создаём для него Character.
    Имя персонажа по умолчанию = username (игрок сможет переименовать позже,
    когда сделаем соответствующий эндпоинт).
    """
    if created:
        Character.objects.create(user=instance, name=instance.username)