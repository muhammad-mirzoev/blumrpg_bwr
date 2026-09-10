from django.urls import path
from . import views

app_name = 'items'

urlpatterns = [
    path('', views.ItemListView.as_view(), name='list'),
    path('inventory/', views.InventoryView.as_view(), name='inventory'),
    path('equipment/', views.EquipmentView.as_view(), name='equipment'),
    path('equip/', views.EquipItemView.as_view(), name='equip'),
    path('unequip/', views.UnequipItemView.as_view(), name='unequip'),
    path('use/', views.UseItemView.as_view(), name='use'),
]