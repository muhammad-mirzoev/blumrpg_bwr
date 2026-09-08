from django.urls import path
from . import views

app_name = 'levels'

urlpatterns = [
    path('', views.LevelListView.as_view(), name='list'),
    path('<int:pk>/', views.LevelDetailView.as_view(), name='detail'),
    path('<int:pk>/complete/', views.LevelCompleteView.as_view(), name='complete'),
]