from rest_framework.permissions import BasePermission

class IsOrganizer(BasePermission):
    def has_permission(self, request, view):
        if request.user.role == 'organizer':
            return True
        return False

class IsMember(BasePermission):
    def has_permission(self, request, view):
        if request.user.role == 'member':
            return True
        return False
