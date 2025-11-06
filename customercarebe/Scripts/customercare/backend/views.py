import mimetypes
import os
import uuid
from django.utils import timezone
from datetime import timedelta, datetime
from logging import raiseExceptions
from faster_whisper import WhisperModel
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.views import TokenRefreshView

from customercare import settings
from .services import call_gemini_api
from django.db.models import Count
from rest_framework import generics, status, views, response, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from django.middleware.csrf import get_token
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import smart_bytes, smart_str
from django.contrib.sites.shortcuts import get_current_site
from django.urls import reverse
from django.http import HttpResponse, FileResponse
from .serializers import (
    SignupSerializer, LoginSerializer, CreateOrgSerializer, CallSerializer,
    SentimentalAnalysisSerializer, ChatHistorySerializer, MockCallSerializer
)
from .utils import Util,send_expo_push_notification
from .models import (
    User, Organization, SentimentalAnalysis, Call,
    Category, ChatHistory, MockCall, Callstatus, Conversation, MockcallConversation, MOGroup, JoinRequest, PushToken,
    Audio, CustomerSentimentalAnalysis
)
from rest_framework.permissions import IsAuthenticated, AllowAny
from .permissions import IsOrganizer, IsMember
from transformers import pipeline

sentiment_pipeline = pipeline(
    "sentiment-analysis",
    model="distilbert/distilbert-base-uncased-finetuned-sst-2-english",
    framework="tf"
)
model = WhisperModel("base", download_root=os.path.join(settings.BASE_DIR, "models"))

# ORGANIZER SIGNUP
class efe(generics.GenericAPIView):
    serializer_class = SignupSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user.role = Category.ORGANIZER.value
        user.save()

        uid = urlsafe_base64_encode(smart_bytes(user.id))
        token = PasswordResetTokenGenerator().make_token(user)
        absurl = f"http://{get_current_site(request).domain}{reverse('verify-email')}?uid={uid}&token={token}"
        email_body = f'Hi {user.name},\nUse the link below to verify your email:\n{absurl}'
        Util.send_email({'email_body': email_body, 'to_email': user.email, 'email_subject': 'Verify your email'})
        return Response({'msg': 'User created, check email to verify account'}, status=status.HTTP_201_CREATED)

# MEMBER SIGNUP
class MemberSignup(generics.GenericAPIView):
    serializer_class = SignupSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        uid = urlsafe_base64_encode(smart_bytes(user.id))
        token = PasswordResetTokenGenerator().make_token(user)
        absurl = f"http://{get_current_site(request).domain}{reverse('verify-email')}?uid={uid}&token={token}"
        email_body = f'Hi {user.name},\nUse the link below to verify your email:\n{absurl}'
        Util.send_email({'email_body': email_body, 'to_email': user.email, 'email_subject': 'Verify your email'})
        return Response({'msg': 'User created, check email to verify account'}, status=status.HTTP_201_CREATED)


class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("refresh_token")
        if refresh_token:
            request.data["refresh"] = refresh_token

        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            access = response.data.get("access")
            new_refresh = response.data.get("refresh")

            # Send new access token in response body
            response.data = {"access": access, "refresh":new_refresh}

            response.set_cookie(
                key='access_token',
                value=access,
                httponly=True,
                secure=True,
                samesite='None',
                max_age=60 * 10
            )
            # Optionally, update refresh token cookie if backend issues a new one
            if new_refresh:
                response.set_cookie(
                    key="refresh_token",
                    value=new_refresh,
                    httponly=True,
                    max_age=3600,
                    samesite='Strict',
                    secure=True
                )

        return response


class VerifyEmail(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        uidb64 = request.GET.get('uid')
        token = request.GET.get('token')
        try:
            uid = smart_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(id=uid)
            if PasswordResetTokenGenerator().check_token(user, token):
                user.is_verified = True
                user.is_active = True
                user.save()
                return HttpResponse("Email successfully verified")
            return HttpResponse("Invalid or expired token")
        except Exception:
            return HttpResponse("Invalid token or user")

class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        res = Response(serializer.data, status=status.HTTP_200_OK)
        res.set_cookie('access_token', serializer.data['tokens']['access'], httponly=True, max_age=3600)
        res.set_cookie('refresh_token', serializer.data['tokens']['refresh'], httponly=True, max_age=7*24*3600)
        return res

class VerifyTokenView(APIView):
    permission_classes = [IsAuthenticated, IsMember]

    def get(self, request):
        return Response({"message": "Token is valid."})

class VerifyTokenViewOrganizer(APIView):
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get(self, request):
        return Response({"message": "Token is valid."})

class OrganizationCreateView(generics.GenericAPIView):
    serializer_class = CreateOrgSerializer
    permission_classes = [IsAuthenticated, IsOrganizer]

    def post(self, request):
        is_session = MOGroup.objects.filter(user=request.user,
                                            role='ORGANIZER', session_status=1).exists()
        if is_session:
            MOGroup.objects.filter(user=request.user, role='ORGANIZER', session_status=1).update(session_status=0)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({'message': 'Organization successfully created'}, status=status.HTTP_200_OK)

class JoinOrganizationView(APIView):
    permission_classes = [IsAuthenticated, IsMember]

    def post(self, request):
        orgname = request.data.get('orgname')
        orgcode = request.data.get('orgcode')

        try:
            org = Organization.objects.get(orgname=orgname, orgcode=orgcode)
        except Organization.DoesNotExist:
            return Response({'error': 'Organization not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Create join request
        join_request, created = JoinRequest.objects.get_or_create(employee=request.user, organization=org)
        if not created:
            return Response({'message': 'Request already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'message': 'Join request sent to organizer.'}, status=status.HTTP_201_CREATED)


class PendingJoinRequestsView(APIView):
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get(self, request):
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn=mogroup.organization.orgname
            orgid=mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)

        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)
        # Get orgs where this user is organizer
        orgs = MOGroup.objects.filter(user=request.user, role='ORGANIZER',session_status=1).values_list('organization', flat=True)
        print(orgs)
        pending = JoinRequest.objects.filter(organization__in=orgs, status='pending')
        data = [
            {
                'id': req.id,
                'employee_name': req.employee.name,
                'organization': req.organization.orgname,
                'timestamp': req.timestamp,
            }
            for req in pending
        ]
        return Response(data)


class AcceptJoinRequestView(APIView):
    permission_classes = [IsAuthenticated, IsOrganizer]

    def post(self, request, request_id):
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn=mogroup.organization.orgname
            orgid=mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)

        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            join_request = JoinRequest.objects.get(id=request_id, status='pending')
        except JoinRequest.DoesNotExist:
            return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Only organizers of that organization can accept
        is_organizer = MOGroup.objects.filter(user=request.user, organization=join_request.organization, role='ORGANIZER').exists()
        if not is_organizer:
            return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        is_session = MOGroup.objects.filter(user=join_request.employee,role='MEMBER',session_status=1).exists()
        if not is_session:
            MOGroup.objects.create(user=join_request.employee, organization=join_request.organization, role='MEMBER',session_status=1)
        else:
            MOGroup.objects.create(user=join_request.employee, organization=join_request.organization, role='MEMBER')

        # Accept
        join_request.status = 'accepted'
        join_request.save()

        return Response({'message': 'Request accepted.'})

class RejectJoinRequestView(APIView):
    permission_classes = [IsAuthenticated, IsOrganizer]

    def post(self, request, request_id):
        orgname = request.data.get("orgname")
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn=mogroup.organization.orgname
            orgid=mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)

        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            orgid = Organization.objects.filter(orgname=orgname)
            join_request = JoinRequest.objects.get(id=request_id, status='pending',organization_id=orgid)
        except JoinRequest.DoesNotExist:
            return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_organizer = MOGroup.objects.filter(user=request.user, organization=join_request.organization, role='ORGANIZER').exists()
        if not is_organizer:
            return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        join_request.status = 'rejected'
        join_request.save()

        return Response({'message': 'Request rejected.'})


class OrganizationMembersView(APIView):
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get(self, request):
        orgs = MOGroup.objects.filter(user=request.user, role='ORGANIZER',session_status=1).values_list('organization', flat=True)
        members = MOGroup.objects.filter(organization__in=orgs).exclude(user=request.user)  # exclude self if needed

        data = [
            {
                'id': member.id,
                'user_id': member.user.id,
                'username': member.user.name,
                'organization': member.organization.orgname,
            }
            for member in members
        ]
        return Response(data)


class RemoveMemberView(APIView):
    permission_classes = [IsAuthenticated, IsOrganizer]

    def post(self, request, member_id):
        orgname = request.data.get("orgname")
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn=mogroup.organization.orgname
            orgid=mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)

        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            orgid=Organization.objects.get(orgname=orgname)
            print('ORGID')
            print(orgid)
            member = MOGroup.objects.get(organization_id=orgid.id,user_id=member_id)
            print('MEMBER')
            print(member)
            print(member_id)
            print(orgid.id)
            jrequest=JoinRequest.objects.get(employee_id=member_id,organization_id=orgid.id)
            print(jrequest)
        except MOGroup.DoesNotExist:
            return Response({'error': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Only allow organizer of that org to remove
        is_organizer = MOGroup.objects.filter(user=request.user, organization=member.organization, role='ORGANIZER').exists()
        if not is_organizer:
            return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        member.delete()
        jrequest.delete()
        try:
            remaining = MOGroup.objects.filter(user=member_id, role='MEMBER', session_status=0).first()
            MOGroup.objects.filter(user=member_id, role='MEMBER', session_status=0,
                                   organization_id=remaining.organization_id).update(session_status=1)
        except:
            pass
        return Response({'message': 'Member removed.'})

@method_decorator(ensure_csrf_cookie, name='dispatch')
class CSRFTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return response.Response({'csrfToken': get_token(request)})

class CallCreateView(APIView):
    def post(self, request):
        serializer = CallSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SentimentalAnalysisCreateView(APIView):
    def post(self, request):
        serializer = SentimentalAnalysisSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class OrgOrganizationslist(APIView):
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get(self, request):
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            print("Organization ID:", mogroup.organization.orgname)
        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)

        past_orgs = MOGroup.objects.filter(user=request.user, session_status=0)
        org_ids = past_orgs.values_list('organization_id', flat=True)
        orgss = Organization.objects.filter(id__in=org_ids)

        data = [{'id': org.id, 'name': org.orgname} for org in orgss]

        return Response({'orgss': data}, status=status.HTTP_200_OK)

class MembOrganizationslist(APIView):
    permission_classes = [IsAuthenticated, IsMember]

    def get(self, request):
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            print("Organization ID:", mogroup.organization.orgname)
        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)

        past_orgs = MOGroup.objects.filter(user=request.user, session_status=0)
        org_ids = past_orgs.values_list('organization_id', flat=True)
        orgss = Organization.objects.filter(id__in=org_ids)

        data = [{'id': org.id, 'name': org.orgname} for org in orgss]

        return Response({'orgss': data}, status=status.HTTP_200_OK)

class ChangeOrgView(APIView):
    permission_classes = [IsAuthenticated, IsOrganizer]

    def post(self, request, orgId):
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn = mogroup.organization.orgname
            orgid = mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)

        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)
        is_exist = MOGroup.objects.get(user_id=request.user, organization_id=orgId)

        if is_exist:
            MOGroup.objects.filter(user_id=request.user).update(session_status=0)
            MOGroup.objects.filter(user_id=request.user, organization_id=orgId).update(session_status=1)
            return Response({'message': 'Organization Changed Successfully'}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'There is no organization for you that matches the Id'},
                            status=status.HTTP_400_BAD_REQUEST)

class ChangeOrgViewMem(APIView):
    permission_classes = [IsAuthenticated, IsMember]

    def post(self, request, orgId):
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn = mogroup.organization.orgname
            orgid = mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)

        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)
        is_exist = MOGroup.objects.get(user_id=request.user, organization_id=orgId)

        if is_exist:
            MOGroup.objects.filter(user_id=request.user).update(session_status=0)
            MOGroup.objects.filter(user_id=request.user, organization_id=orgId).update(session_status=1)
            return Response({'message': 'Organization Changed Successfully'}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'There is no organization for you that matches the Id'},
                            status=status.HTTP_400_BAD_REQUEST)


class Employeeactivity(APIView):
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get(self, request):
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn = mogroup.organization.orgname
            orgid = mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)
        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)

        calls = Call.objects.filter(organization_id=orgid)
        print(calls)

        users = []
        for x in calls:
            if x.user_id not in users:
                users.append(x.user_id)
        print(users)


        # Initialize sentiment and emotion counts
        negative = positive = neutral = 0
        fear = disgust = surprise = sad = happy = angry = neutralemotion = 0

        # Get current time
        now = timezone.now()
        three_minutes_ago = now - timedelta(minutes=3)
        stress_users=[]
        for user in users:
            analysis = SentimentalAnalysis.objects.filter(user_id=user).order_by('id').last()
            if analysis is None or analysis.timestamp < three_minutes_ago:
                continue

            # Count sentiments
            if analysis.employee_sentiment == 'NEGATIVE':
                negative += 1
            elif analysis.employee_sentiment == 'NEUTRAL':
                neutral += 1
            elif analysis.employee_sentiment == 'POSITIVE':
                positive += 1

            userdata=User.objects.get(id=user)
            actual={'id':user,'name':userdata.name,'emotion':analysis.emotion}
            # Count emotions
            if analysis.emotion == 'fear':
                fear += 1
                stress_users.append(actual)
            elif analysis.emotion == 'disgust':
                disgust += 1
            elif analysis.emotion == 'surprise':
                surprise += 1
            elif analysis.emotion == 'sad':
                sad += 1
                stress_users.append(actual)
            elif analysis.emotion == 'happy':
                happy += 1
            elif analysis.emotion == 'angry':
                angry += 1
                stress_users.append(actual)
            elif analysis.emotion == 'neutral':
                neutralemotion += 1

        analyses = [
            {'employee_sentiment': 'Negative', 'count': negative},
            {'employee_sentiment': 'Neutral', 'count': neutral},
            {'employee_sentiment': 'Positive', 'count': positive}
        ]
        print(analyses)

        emotion = [
            {'emotion': 'fear', 'count': fear},
            {'emotion': 'disgust', 'count': disgust},
            {'emotion': 'surprise', 'count': surprise},
            {'emotion': 'sad', 'count': sad},
            {'emotion': 'happy', 'count': happy},
            {'emotion': 'neutral', 'count': neutralemotion},
            {'emotion': 'angry', 'count': angry}
        ]
        print(emotion)

        cus_negative = cus_neutral = cus_positive = 0

        for user in users:
            analysisc = CustomerSentimentalAnalysis.objects.filter(user_id=user).order_by('id').last()

            if analysisc is None or analysisc.timestamp < three_minutes_ago:
                continue  # Skip if no analysis or it's older than 3 minutes

            if analysisc.sentiment == 'NEGATIVE':
                cus_negative += 1
            elif analysisc.sentiment == 'NEUTRAL':
                cus_neutral += 1
            elif analysisc.sentiment == 'POSITIVE':
                cus_positive += 1

        analysescus = [
            {'employee_sentiment': 'Negative', 'count': cus_negative},
            {'employee_sentiment': 'Neutral', 'count': cus_neutral},
            {'employee_sentiment': 'Positive', 'count': cus_positive}
        ]

        print(analysescus)


        return Response({'analyses': analyses, 'emotion': emotion,'customeranalyses':analysescus,'stressusers':stress_users}, status=status.HTTP_200_OK)

class Datarecords(APIView):
    permission_classes = [IsAuthenticated, IsOrganizer]

    def get(self, request):
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn=mogroup.organization.orgname
            orgid=mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)

        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)
        calls = CallSerializer(Call.objects.filter(organization_id=orgid), many=True).data
        analyses = SentimentalAnalysisSerializer(SentimentalAnalysis.objects.all(), many=True).data
        return Response({'analyses': analyses, 'Calls': calls}, status=status.HTTP_200_OK)

class ChatAPIView(APIView):
    permission_classes = [IsAuthenticated, IsMember]

    def post(self, request):
        query = request.data.get("query")
        orgname = request.data.get("orgname")
        print(orgname)
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn=mogroup.organization.orgname
            orgid=mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)

        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)

        if not orgn==orgname:
            print('orgn not found')

            return Response({'error': 'You should be in an organization to continue'}, status=status.HTTP_400_BAD_REQUEST)

        if not query:
            return Response({'error': 'Query is empty'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            response = call_gemini_api(f"{query}. Respond in Markdown format, organized with H2 and H3 headings as i will be displaying it in a chatgpt or gemini like environment in my site.")
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        titleresult = call_gemini_api(f'Provide a short few words title like topic for "{query}" to add it to a history of user conversations so that he or she can click it easily')
        conversation = Conversation.objects.create(title=titleresult, user=request.user, organization_id=orgid)
        chat = ChatHistory.objects.create(conversation=conversation,user=request.user, query=query, response=response)
        print(conversation)
        return Response({'reply': response, 'record': ChatHistorySerializer(chat).data,"conversation_id": str(conversation.id)}, status=status.HTTP_201_CREATED)

class AddMessageToConversationView(APIView):
    permission_classes = [IsAuthenticated, IsMember]

    def post(self, request, conversation_id):
        orgname = request.data.get("orgname")
        print(orgname)
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn = mogroup.organization.orgname
            orgid = mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)

        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)

        if not orgn == orgname:
            print('orgn not found')

            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        query = request.data.get("query")
        if not query:
            return Response({'error': 'Query is empty'}, status=status.HTTP_400_BAD_REQUEST)
        print(conversation)
        print('conversationid section works')
        user = request.user
        history = ""
        chats = ChatHistory.objects.filter(user=user, conversation=conversation,organization_id=orgid).order_by('created_at')
        for chat in chats:
            history += f"User: {chat.query}\nAI: {chat.response}\n"
        try:
            print(history)
            response = call_gemini_api(f"{history} {query}")
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        chat = ChatHistory.objects.create(conversation=conversation, user=request.user, query=query, response=response)

        return Response({'reply': response, 'record': ChatHistorySerializer(chat).data}, status=status.HTTP_201_CREATED)

class ConversationHistoryView(APIView):
    permission_classes = [IsAuthenticated, IsMember]
    def get(self, request):
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn = mogroup.organization.orgname
            orgid = mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)

        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)

        conversations = Conversation.objects.filter(user=request.user,organization_id=orgid).order_by('created_at')
        data = [{"id": str(conv.id), "title": conv.title or "Untitled", "created_at": conv.created_at} for conv in conversations]
        return Response(data)
class ConversationMessagesView(APIView):
    permission_classes = [IsAuthenticated, IsMember]
    def get(self, request,conversation_id):
        print('this is history')

        user = request.user
        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        print('this is history too')
        history = []
        chats = ChatHistory.objects.filter(user=user, conversation=conversation).order_by('created_at')
        for chat in chats:
            history.append({"role":"user","content":chat.query})
            history.append({"role":"assistant","content":chat.response})

        return Response(history)
class MockcallHistoryView(APIView):
    permission_classes = [IsAuthenticated, IsMember]
    def get(self, request):
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn = mogroup.organization.orgname
            orgid = mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)

        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)

        print('this is mocallvon')
        conversations = MockcallConversation.objects.filter(user=request.user,organization_id=orgid).order_by('created_at')
        data = [{"id": str(conv.id), "title": conv.title or "Untitled", "created_at": conv.created_at} for conv in conversations]
        return Response(data)
class MockConversationView(APIView):
    permission_classes = [IsAuthenticated, IsMember]
    def get(self, request,conversation_id):
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn = mogroup.organization.orgname
            orgid = mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)

        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)

        print('this is history for mocking call')
        user = request.user
        try:
            conversation = MockcallConversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        print('this is history too')
        chats = MockCall.objects.filter(user=user, conversation=conversation).order_by('timestamp').last()
        return Response({'response':chats.response,'org_type':chats.call_name})
class MockCallAPIView(APIView):
    permission_classes = [IsAuthenticated, IsMember]

    def post(self, request):
        user = request.user
        orgname = request.data.get("orgname")
        print(orgname)
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn=mogroup.organization.orgname
            orgid=mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)

        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)

        if not orgn==orgname:
            print('orgn not found')

            return Response({'error': 'You should be in an organization to continue'}, status=status.HTTP_400_BAD_REQUEST)

        notes = request.data.get('notes', '')
        org_type = request.data.get('org_type', 'General')
        call_name = f"{org_type} Session"

        history = ""
        previous_calls = MockCall.objects.filter(user=user, call_name=call_name).order_by('timestamp')
        for call in previous_calls:
            history += f"User: {call.query}\nAI: {call.response}\n"
        current_input = f"User: {notes}"
        full_prompt = (
            f"Act like you are a customer from a {org_type} organization. This is a mock call. "
            f"Act like a customer and respond to the agent who will be played by me. At the end, rate their performance.\n"
            f"{current_input}. Provide the first dialogue as the customer only as the response, nothing else and then ill provide the next dialogue as the customer care employee . Use imaginary names or situations if you like. Make it look real. This is being build for a customer care employee training app.Begin. Start with the first dialogue "
        )
        ai_response= call_gemini_api(full_prompt)
        titleresult= call_gemini_api(f"Provide a two to four word title that fits {full_prompt} to add it to a list fot eh user to select.Provide the title only as the response, nothing else.")
        mockconversation = MockcallConversation.objects.create(title=titleresult,user=user, organization_id=orgid)
        mock_call = MockCall.objects.create(
            conversation=mockconversation,
            user=user,
            call_name=org_type,
            query=notes,
            response=ai_response
        )
        return Response({'reply': MockCallSerializer(mock_call).data, "conversation_id": str(mockconversation.id)}, status=status.HTTP_201_CREATED)

class MockCallMessage(APIView):
    permission_classes = [IsAuthenticated, IsMember]

    def post(self, request, conversation_id):
        user = request.user
        try:
            conversation = MockcallConversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        notes = request.data.get('notes', '')
        org_type = request.data.get('org_type', 'General')
        call_name = f"{org_type} Session"

        history = ""
        previous_calls = MockCall.objects.filter(conversation=conversation,user=user, call_name=call_name).order_by('timestamp')
        for call in previous_calls:
            history += f"User: {call.query}\nAI: {call.response}\n"
        current_input = f"User: {notes}"
        full_prompt = (
            f"You are a customer from a {org_type} organization. This is a mock call. "
            f"Act like a customer and respond to the agent. At the end, rate their performance.\n"
            f"{history}{current_input} Begin."
        )

        ai_response = call_gemini_api(full_prompt)

        mock_call = MockCall.objects.create(
            conversation=conversation,
            user=user,
            call_name=call_name,
            query=notes,
            response=ai_response
        )
        return Response(MockCallSerializer(mock_call).data, status=status.HTTP_201_CREATED)

# views.py

from datetime import timedelta
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Call, SentimentalAnalysis, Callstatus
from .serializers import CallSerializer, SentimentalAnalysisSerializer
from deepface import DeepFace
from transformers import pipeline
from PIL import Image
import numpy as np
import base64
from io import BytesIO
import whisper
import tempfile
from vosk import Model, KaldiRecognizer
import wave
import json
sentiment_pipeline = pipeline(
    "sentiment-analysis",
    model="distilbert/distilbert-base-uncased-finetuned-sst-2-english",
    framework="tf"
)

whisper_model = whisper.load_model("base")

class StartCallView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        orgname = request.data.get("orgname")
        print(orgname)
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn = mogroup.organization.orgname
            orgid = mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)

        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)

        customer = request.data.get("customer", "")
        call = Call.objects.create(
            user=request.user,
            customer=customer,
            status=Callstatus.ONGOING.value,
            duration=timedelta(seconds=300),
            sentiment_score=0.0,
            organization_id=orgid
        )
        return Response(CallSerializer(call).data, status=status.HTTP_201_CREATED)

class AnalysisChunkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, call_id):
        call = Call.objects.filter(id=call_id, user=request.user, status=Callstatus.ONGOING.value).first()
        if not call:
            return Response({"error": "No ongoing call found"}, status=status.HTTP_404_NOT_FOUND)
        print('this is working yay')
        # --- Handle image ---
        image_file = request.data.get("image")
        if not image_file:
            return Response({"error": "Image is missing"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            header, base64_img = image_file.split(",")
            img_bytes = base64.b64decode(base64_img)
            img = Image.open(BytesIO(img_bytes)).convert("RGB")
            img_np = np.array(img)
            face_analysis = DeepFace.analyze(img_np, actions=["emotion"], enforce_detection=False)
            emotion = face_analysis[0]["dominant_emotion"]
            print(emotion)
        except Exception as e:
            return Response({"error": "Image decoding or emotion detection failed", "detail": str(e)}, status=500)

        # --- Handle audio ---
        audio_file = request.FILES.get("audio")
        if not audio_file:
            return Response({"error": "Audio is missing"}, status=status.HTTP_400_BAD_REQUEST)

        print('Audio received successfully')

        # Define model download path

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"audio_{timestamp}_{uuid.uuid4().hex}.wav"
        folder_path = "audio_storage"
        os.makedirs(folder_path, exist_ok=True)  # Ensure folder exists
        file_path = os.path.join(folder_path, filename)

        # Step 2: Save uploaded file to disk
        with open(file_path, "wb+") as destination:
            for chunk in audio_file.chunks():
                destination.write(chunk)

        # Transcribe the audio
        segments, info = model.transcribe(file_path)
        print(segments)
        print("Language detected:", info.language)
        print("Duration:", info.duration)

        # Concatenate the transcript text
        transcript = " ".join([segment.text for segment in segments])
        print("Transcript:", transcript)

        sentiment = sentiment_pipeline(transcript)[0]
        sa = SentimentalAnalysis.objects.create(
            call=call,
            user=request.user,
            employee_sentiment=sentiment["label"],
            emotion=emotion,
            confidence_score=sentiment["score"],
        )
        score = SentimentalAnalysis.objects.filter(call_id=call_id, user=request.user)
        count1 = 0
        response = ''
        for y in score:
            if y.emotion == 'fear' or y.emotion == 'sad' or y.emotion == 'angry':
                count1 += 1
        if count1 > 2:
            responseai = call_gemini_api(
                'I want a single instruction to follow if im feeling stressed, feared, sad or angry. Make the response within 15-20 words and only respond with the instruction nothing else')
            response = f"You are feeling stressed.{responseai}"
            print(response)
        return Response({'serializer': SentimentalAnalysisSerializer(sa).data,'response': response}, status=status.HTTP_201_CREATED)

class EndCallView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, call_id):
        # Get the ongoing call
        call = Call.objects.filter(id=call_id, user=request.user, status=Callstatus.ONGOING.value).first()
        if not call:
            return Response({"error": "No ongoing call found"}, status=status.HTTP_404_NOT_FOUND)

        # Get sentiment analysis data for the call
        score_entries = SentimentalAnalysis.objects.filter(call_id=call_id, user=request.user)
        count = score_entries.count()

        # Calculate average confidence score
        total_score = sum(entry.confidence_score for entry in score_entries)
        average_score = total_score / count if count > 0 else 0

        # Count negative emotions
        negative_emotions = {'fear', 'sad', 'angry'}
        negative_count = sum(1 for entry in score_entries if entry.emotion in negative_emotions)

        # Generate response if threshold of negative emotions is passed
        response = ''
        print(f"The number of negative count is {negative_count}")
        if negative_count > 2:
            response_ai = call_gemini_api(
                'I want a single instruction to follow if im feeling stressed, feared, sad or angry. '
                'Make the response within 15-20 words and only respond with the instruction nothing else'
            )
            response = f"You are feeling stressed. {response_ai}"
        print(response)
        # Finalize the call
        call.status = Callstatus.COMPLETED.value
        call.duration = timezone.now() - call.timestamp
        call.sentiment_score = average_score

        # Optional: double-check and update sentiment_score from analyses related to call
        analyses = call.analyses.all()
        if analyses.exists():
            avg_analysis_score = sum(a.confidence_score for a in analyses) / analyses.count()
            call.sentiment_score = avg_analysis_score

        call.save()
        return Response({'response': response})

class StoreTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get("token")
        print(token)
        user = request.user
        PushToken.objects.update_or_create(user=user, defaults={"token": token})
        return Response({"status": "saved"})

class SendNotification(APIView):
    permission_classes = [IsAuthenticated,IsMember]
    def post(self,request):
        user_id=request.user
        token=PushToken.objects.get(user=user_id)
        send_expo_push_notification(token=token.token,title='You have a call',body='You got a call')
        return Response({"status": "saved"})

class AudioUpload(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated,IsOrganizer]
    def post(self, request):
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn=mogroup.organization.orgname
            orgid=mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)

        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)
        audio = request.FILES.get('audio_file')
        print(audio.name)
        user = request.user
        Audio.objects.update_or_create(user=user, organization_id=orgid,defaults={'audio_file':audio})
        return Response({"status": "saved"})

class AudioDownload(APIView):
    permission_classes = [IsAuthenticated,IsMember]

    def get(self,request):
        print(request)
        print(request.user)
        print('we have reached this far')
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn=mogroup.organization.orgname
            orgid=mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)

        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            print('we have reached this far')
            audio = Audio.objects.get(organization_id=orgid)
            audio = Audio.objects.get(organization_id=orgid)
            file_path = audio.audio_file.path  # Correct, since it's a FileField

            # Optional: Set correct content-type using mimetypes
            mime_type, _ = mimetypes.guess_type(file_path)

            # Serve file as an attachment with correct headers
            response = FileResponse(open(file_path, 'rb'), content_type=mime_type or 'audio/mpeg')
            response['Content-Disposition'] = f'attachment; filename="{audio.audio_file.name}"'
            return response

        except Audio.DoesNotExist:
            return Response({"error": "No audio found for this user"}, status=404)

class CallStatusCheck(APIView):
    permission_classes = [AllowAny]

    def get(self,request):
        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn=mogroup.organization.orgname
            orgid=mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)

        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'},status=404)
        try:
            call = Call.objects.filter(user_id=request.user, organization_id=orgid).order_by('id').last()
            status = call.status
            if status == 'ongoing':
                return Response({"result": 'true'}, status=200)
            else:
                return Response({"result": 'false'}, status=200)
        except Call.DoesNotExist:
            return Response({"error": "No call found for this user"}, status=404)

class UpdateCustomerSentiment(APIView):
    def post(self,request):
        sentiment=request.data.get('sentiment')
        score=request.data.get('score')

        try:
            mogroup = MOGroup.objects.get(user=request.user, session_status=1)
            orgn = mogroup.organization.orgname
            orgid = mogroup.organization.id
            print("Organization ID:", mogroup.organization.orgname)

        except MOGroup.DoesNotExist:
            return Response({'error': 'You should be in an organization to continue'}, status=404)
        try:
            call = Call.objects.filter(user_id=request.user, organization_id=orgid).order_by('id').last()
            print(call.id)
            CustomerSentimentalAnalysis.objects.create(
                call_id=call.id,
                user=request.user,
                sentiment=sentiment,
            )
            return Response({"result": 'true'}, status=200)
        except Call.DoesNotExist:
            return Response({"error": "No call found for this user"}, status=404)