from rest_framework import serializers
from apps.categories.models import Category

class CategorySerializer(serializers.ModelSerializer):
    is_custom = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'icon', 'color', 'category_type', 'is_archived', 'is_custom', 'created_at']
        read_only_fields = ['id', 'is_custom', 'created_at']

    def get_is_custom(self, obj):
        return obj.user_id is not None
