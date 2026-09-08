from django.contrib import admin
from .models import Level, LevelCompletion


@admin.register(Level)
class LevelAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'world', 'order', 'difficulty',
        'required_character_level', 'reward_gold', 'reward_experience', 'is_active',
    )
    list_filter = ('world', 'difficulty', 'is_active')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    ordering = ('world', 'order')


@admin.register(LevelCompletion)
class LevelCompletionAdmin(admin.ModelAdmin):
    list_display = ('character', 'level', 'times_completed', 'last_completed_at')
    list_filter = ('level__world',)
    search_fields = ('character__name', 'level__name')
    readonly_fields = ('first_completed_at', 'last_completed_at')