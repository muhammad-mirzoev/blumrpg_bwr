from django.apps import AppConfig


class CharactersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.characters'

    def ready(self):
        import apps.characters.signals  # noqa: F401