from django.urls import path
from . import views

app_name = 'game'

urlpatterns = [
    path('select/', views.LevelSelectView.as_view(), name='select'),
    path('play/<int:level_id>/', views.PlayView.as_view(), name='play'),
]

"старый маршрут /game/play/ (без id) больше не существует"
"теперь вход в игру всегда идёт через конкретный уровень: /game/play/1/, /game/play/2/ и т.д."
"Точка входа для игрока - /game/select/."