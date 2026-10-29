from rest_framework import status, views, permissions, generics
from rest_framework.response import Response
from django.db.models import Q
from apps.categories.models import Category
from apps.categories.serializers import CategorySerializer

class CategoryListCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cat_type = request.query_params.get('type')
        qs = Category.objects.filter(
            Q(user=request.user) | Q(user__isnull=True),
            is_archived=False
        )
        if cat_type:
            qs = qs.filter(category_type=cat_type)
        return Response(CategorySerializer(qs, many=True).data)

    def post(self, request):
        serializer = CategorySerializer(data=request.data)
        if serializer.is_valid():
            cat = serializer.save(user=request.user)
            return Response(CategorySerializer(cat).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CategoryDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk, user):
        return generics.get_object_or_404(Category, pk=pk, user=user)

    def patch(self, request, pk):
        cat = self.get_object(pk, request.user)
        serializer = CategorySerializer(cat, data=request.data, partial=True)
        if serializer.is_valid():
            updated_cat = serializer.save()
            return Response(CategorySerializer(updated_cat).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        cat = self.get_object(pk, request.user)
        # Soft delete / archive
        cat.is_archived = True
        cat.save()
        return Response({'message': 'Category archived successfully.'}, status=status.HTTP_204_NO_CONTENT)
