from django.urls import path
from . import views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import SentimentalAnalysisCreateView

urlpatterns=[
    path('efe/',views.efe.as_view(), name='efe'),
    path('api/csrf-token/', views.CSRFTokenView.as_view(), name='csrf-token'),
    path('verify-email/', views.VerifyEmail.as_view(), name='verify-email'),
    path('logino/', views.LoginView.as_view(), name='logino'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),  # for login
    path('api/token/refresh/', views.CookieTokenRefreshView.as_view(), name='token-refresh'),
    path('auth/verify-token/', views.VerifyTokenView.as_view(), name='verify-token'),
    path('createorg/', views.OrganizationCreateView.as_view(), name='createorg'),
    path('joinorg/', views.JoinOrganizationView.as_view(), name='createorg'),
    path('pending-requests/', views.PendingJoinRequestsView.as_view(), name='pending-requests'),
    path('accept-request/<int:request_id>/', views.AcceptJoinRequestView.as_view(), name='accept-request'),
    path('reject-request/<int:request_id>/', views.RejectJoinRequestView.as_view()),
    path('members/', views.OrganizationMembersView.as_view()),
    path('remove-member/<int:member_id>/', views.RemoveMemberView.as_view()),
    path('organizerorganizations/', views.OrgOrganizationslist.as_view()),
    path('memberorganizations/', views.MembOrganizationslist.as_view()),

    path('remove-member/<int:member_id>/', views.RemoveMemberView.as_view()),
    path('change-organization/<int:orgId>/', views.ChangeOrgView.as_view()),
    path('change-organization-member/<int:orgId>/', views.ChangeOrgViewMem.as_view()),

    path('calls/', views.CallCreateView.as_view(), name='calls'),
    path('analysis/', SentimentalAnalysisCreateView.as_view(), name='create-analysis'),
    path('employeeactivity/',views.Employeeactivity.as_view(),name='employeeactivity'),
    path('datarecords/', views.Datarecords.as_view(), name='datarecords'),
    path('membersignup/', views.MemberSignup.as_view(), name='membersignup'),
    path('auth/verify-token-organizer/', views.VerifyTokenViewOrganizer.as_view(), name='verify-token-organizer'),
    path('chat/', views.ChatAPIView.as_view(), name='chat'),
    path('mock-call/', views.MockCallAPIView.as_view(), name='mock-call'),
    path('mock-call-message/<uuid:conversation_id>/messages/', views.MockCallMessage.as_view(), name='mock-call'),

    path('analysis/start/', views.StartCallView.as_view(), name='start-call'),
    path('analysis/<int:call_id>/chunk/', views.AnalysisChunkView.as_view(), name='analysis-chunk'),
    path('analysis/<int:call_id>/end/', views.EndCallView.as_view(), name='end-call'),
    path("api/conversations/<uuid:conversation_id>/messages/", views.AddMessageToConversationView.as_view(),name="add_message"),
    path('conversations/history/', views.ConversationHistoryView.as_view(), name='conversation_history'),
    path('mockconversations/history/', views.MockcallHistoryView.as_view(), name='mockconversation_history'),
    path('conversations/<uuid:conversation_id>/all/', views.ConversationMessagesView.as_view(), name='conversation_messages'),
    path('mockconversations/<uuid:conversation_id>/all/', views.MockConversationView.as_view(), name='mockconversation_messages'),
    path('storetok/', views.StoreTokenView.as_view(),name='storetok'),
    path('sendnotification/', views.SendNotification.as_view(), name='sendnotification'),
    path('audioupload/', views.AudioUpload.as_view(), name='audioupload'),
    path('audiodownload/', views.AudioDownload.as_view(), name='audiodownload'),
    path('checkcallstatus/', views.CallStatusCheck.as_view(), name='checkcallstatus'),
    path('updatecustomersentiment/', views.UpdateCustomerSentiment.as_view(), name='updatecustomersentiment'),


]
