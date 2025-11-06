import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models
from rest_framework_simplejwt.tokens import RefreshToken


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # Hash the password
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

class Category(models.TextChoices):
    MEMBER = 'member', 'Member'
    ORGANIZER='organizer','Organizer'
    ADMIN = 'admin', 'Admin'


class User(AbstractBaseUser):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=100)
    role = models.CharField(max_length=100, choices=Category.choices, default=Category.MEMBER.value)
    organization=models.CharField(max_length=100)
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    objects = CustomUserManager()

    def tokens(self):
        refresh = RefreshToken.for_user(self)
        print('tokens ready')
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token)
        }
    def __str__(self):
        return self.email


class Organization(models.Model):
    orgname=models.CharField(max_length=100,unique=True)
    orgcode=models.CharField(max_length=100)

    def __str__(self):
        return self.orgname


class RoleChoices(models.TextChoices):
    ORGANIZER = 'organizer', 'Organizer'
    MEMBER = 'member', 'Member'


class JoinRequest(models.Model):
    employee = models.ForeignKey(User, on_delete=models.CASCADE)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    status = models.CharField(max_length=10,
                              choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected')],
                              default='pending')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('employee', 'organization')
    def __str__(self):
        return str(self.id)

class MOGroup(models.Model):

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=RoleChoices.choices, default=RoleChoices.MEMBER)
    session_status = models.IntegerField(default=0)
    class Meta:
        unique_together = ('organization', 'user')

    def __str__(self):
        return self.organization.orgname
class Callstatus(models.TextChoices):
        ONGOING='ongoing', 'Ongoing'
        COMPLETED='completed', 'Completed'

class Call(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calls')
    customer = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
    duration = models.DurationField()
    status = models.CharField(max_length=10, choices=Callstatus.choices, default=Callstatus.ONGOING)
    sentiment_score = models.FloatField()
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)

    def __str__(self):
        return str(self.id)

class PushToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=255)
    updated_at = models.DateTimeField(auto_now=True)

class SentimentalAnalysis(models.Model):
    call = models.ForeignKey(Call, on_delete=models.CASCADE, related_name='analyses')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='analyses')
    timestamp = models.DateTimeField(auto_now_add=True)
    employee_sentiment = models.CharField(max_length=50)
    emotion = models.CharField(max_length=50)
    confidence_score = models.FloatField()

    def __str__(self):
        return str(self.id)
class CustomerSentimentalAnalysis(models.Model):
    call = models.ForeignKey(Call, on_delete=models.CASCADE, related_name='cusanalyses')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cusanalyses')
    timestamp = models.DateTimeField(auto_now_add=True)
    sentiment = models.CharField(max_length=50)
    confidence_score = models.FloatField()

    def __str__(self):
        return str(self.id)
class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations')  # Add this line
    title = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    def __str__(self):
        return str(self.id)

class ChatHistory(models.Model):
    conversation = models.ForeignKey(Conversation, related_name='messages', on_delete=models.CASCADE, null=True,blank=True )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_histories')
    query = models.TextField()
    response = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return str(self.id)

class MockcallConversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mockcallconversations')  # Add this line
    title = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)

    def __str__(self):
        return str(self.id)

class MockCall(models.Model):
    conversation = models.ForeignKey(MockcallConversation, related_name='mock_calls', on_delete=models.CASCADE, null=True,blank=True )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mock_calls')
    call_name = models.CharField(max_length=100)
    query = models.TextField()
    response = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Call '{self.call_name}' by {self.user.username} at {self.timestamp}"

class Audio(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='audio')
    audio_file = models.FileField(upload_to='audios/')

    def __str__(self):
        return str(self.id)
