from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView


class PlayView(LoginRequiredMixin, TemplateView):
    """
    Отдаёт HTML-обёртку игровой сцены. Весь геймплей - на JS/Canvas,
    Django здесь только рендерит шаблон и требует авторизацию.
    Если пользователь не залогинен - редирект на LOGIN_URL (см. settings.py).
    """
    template_name = 'game/play.html'