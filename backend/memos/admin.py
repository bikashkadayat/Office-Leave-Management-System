from django.contrib import admin
from .models import Memo, MemoApprovalStep, MemoTemplate

@admin.register(Memo)
class MemoAdmin(admin.ModelAdmin):
    list_display = ('memo_number', 'title', 'memo_type', 'priority', 'status', 'created_by', 'current_approver', 'created_at')
    list_filter = ('status', 'memo_type', 'priority', 'created_at')
    search_fields = ('memo_number', 'title', 'subject', 'created_by__username', 'created_by__first_name', 'created_by__last_name')
    ordering = ('-created_at',)
    readonly_fields = ('memo_number', 'created_at', 'updated_at')

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(created_by=request.user)

@admin.register(MemoApprovalStep)
class MemoApprovalStepAdmin(admin.ModelAdmin):
    list_display = ('memo', 'step_order', 'actor', 'action', 'acted_at')
    list_filter = ('action', 'acted_at')
    search_fields = ('memo__memo_number', 'actor__username', 'actor__first_name', 'actor__last_name')
    ordering = ('memo', 'step_order')
    readonly_fields = ('acted_at',)

@admin.register(MemoTemplate)
class MemoTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'memo_type', 'is_active')
    list_filter = ('memo_type', 'is_active')
    search_fields = ('name', 'subject_template')
    ordering = ('name',)
