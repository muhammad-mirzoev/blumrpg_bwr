from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView


class LevelSelectView(LoginRequiredMixin, TemplateView):
    """
    Экран выбора уровня. Сам список (с флагами unlocked/completed)
    подтягивается на JS через GET /api/levels/ - здесь только HTML-каркас.
    """
    template_name = 'game/select.html'


class PlayView(LoginRequiredMixin, TemplateView):
    """
    HTML-обёртка игровой сцены для конкретного уровня. level_id уходит
    в шаблон, чтобы main.js знал, какой GET /api/levels/<id>/ вызвать.
    """
    template_name = 'game/play.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['level_id'] = kwargs['level_id']
        return context