from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed

from .models import User, Organization, MOGroup, RoleChoices, Call, SentimentalAnalysis, ChatHistory, MockCall


class SignupSerializer(serializers.ModelSerializer):

    confirmpassword = serializers.CharField(min_length=7, write_only=True)
    password = serializers.CharField(min_length=7, write_only=True)

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'password', 'confirmpassword']

    def create(self, validated_data):
        validated_data.pop('confirmpassword')

        user = User(
            name=validated_data['name'],
            email=validated_data['email'],
        )
        user.set_password(validated_data['password'])
        user.save()
        return user

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirmpassword'):
            raise serializers.ValidationError("Passwords do not match.")
        return attrs


class LoginSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(max_length=255)
    password = serializers.CharField(max_length=68, min_length=8, write_only=True)
    tokens = serializers.SerializerMethodField()
    orgid = serializers.CharField(read_only=True)
    orgname = serializers.CharField(read_only=True)
    def get_tokens(self, obj):
        user = User.objects.get(email=obj['email'])
        print(user.email)
        return {
            'refresh': user.tokens()['refresh'],
            'access': user.tokens()['access']
        }

    class Meta:
        model = User
        fields = ['email', 'password', 'tokens', 'orgid', 'orgname']

    def validate(self, attrs):
        email = attrs.get('email', '')
        password = attrs.get('password', '')
        userc = User.objects.get(email=email)
        passwordc=userc.check_password(password)
        print(userc.tokens())
        orgboolean=False
        try:
            org = MOGroup.objects.get(user=userc.id,session_status=1)
            orgname = Organization.objects.get(orgname=org)
            orgname=org.organization
            orgid=orgname.id
            orgboolean=True
        except:
            print('User has no organization created yet')
        if passwordc==False:
            raise AuthenticationFailed('Access denied: wrong email or password.')
        if not userc.is_active:
            raise AuthenticationFailed('Account disabled, contact admin.')
        if not userc.is_verified:
            raise AuthenticationFailed('Email is not verified.')

        return {
            'email': userc.email,
            'tokens': userc.tokens(),
            'orgid': orgid if orgboolean else '',
            'orgname': orgname if orgboolean else ''
        }

class CreateOrgSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'orgname', 'orgcode']

    def create(self, validated_data):
        org = Organization.objects.create(**validated_data)

        user = self.context['request'].user
        MOGroup.objects.create(organization=org, user=user,role=RoleChoices.ORGANIZER.value,session_status=1)

        return org

class CallSerializer(serializers.ModelSerializer):
    class Meta:
        model = Call
        fields = '__all__'

class SentimentalAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = SentimentalAnalysis
        fields = '__all__'

class ChatHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatHistory
        fields = ['id', 'user', 'query', 'response', 'created_at']
        read_only_fields = ['id', 'response', 'created_at']

class MockCallSerializer(serializers.ModelSerializer):
    class Meta:
        model = MockCall
        fields = ['id', 'user', 'call_name', 'query', 'response', 'timestamp']
        read_only_fields = ['id', 'timestamp', 'user', 'response']