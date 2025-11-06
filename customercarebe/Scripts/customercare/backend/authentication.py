from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import User
import jwt
from django.conf import settings

class CookieJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        # Get the token from the cookie
        token = request.COOKIES.get('access_token')

        if not token:
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]

        if not token:
            return None  # No token, not authenticated

        try:
            # Decode the token using your JWT secret and the algorithm
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])

            # Get the user from the decoded payload
            user = User.objects.get(id=payload['user_id'])

        except (jwt.ExpiredSignatureError, jwt.DecodeError, User.DoesNotExist) as e:
            raise AuthenticationFailed('Invalid or expired token.')

        # If all goes well, return the user and the token
        return (user, token)