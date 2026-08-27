from django.urls import path
from . import views

app_name = 'game'

urlpatterns = [
    path('play/', views.PlayView.as_view(), name='play'),
]