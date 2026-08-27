from django.contrib import admin
from .models import Character


@admin.register(Character)
class CharacterAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'level', 'experience', 'gold', 'health', 'max_health')
    list_filter = ('level',)
    search_fields = ('name', 'user__username')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-level', '-experience')