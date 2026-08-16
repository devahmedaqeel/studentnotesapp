import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { TabNavigator } from './TabNavigator';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';

// Auth & Profile Screens
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { OtpVerificationScreen } from '../screens/auth/OtpVerificationScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { TermsPrivacyConsentScreen } from '../screens/auth/TermsPrivacyConsentScreen';
import { TermsAndConditionsScreen } from '../screens/auth/TermsAndConditionsScreen';
import { PrivacyPolicyScreen } from '../screens/auth/PrivacyPolicyScreen';
import { ProfileSetupScreen } from '../screens/profile/ProfileSetupScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';

// Core Screens
import { SubjectDetailScreen } from '../screens/SubjectDetailScreen';
import { FolderDetailScreen } from '../screens/FolderDetailScreen';
import { CreateSubjectScreen } from '../screens/CreateSubjectScreen';
import { CreateFolderScreen } from '../screens/CreateFolderScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { DocumentCropScreen } from '../screens/DocumentCropScreen';
import { ScanPreviewScreen } from '../screens/ScanPreviewScreen';
import { SaveNoteScreen } from '../screens/SaveNoteScreen';
import { NoteViewerScreen } from '../screens/NoteViewerScreen';
import { CreatePdfScreen } from '../screens/CreatePdfScreen';
import { PdfViewerScreen } from '../screens/PdfViewerScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { TrashScreen } from '../screens/TrashScreen';
import { CompressionCenterScreen } from '../screens/CompressionCenterScreen';
import { ImageCompressionScreen } from '../screens/ImageCompressionScreen';
import { PdfCompressionScreen } from '../screens/PdfCompressionScreen';
import { ImportantDocumentsScreen } from '../screens/ImportantDocumentsScreen';
import { DocumentFolderDetailScreen } from '../screens/DocumentFolderDetailScreen';
import { StudentDiaryScreen } from '../screens/diary/StudentDiaryScreen';
import { CreateDiaryEventScreen } from '../screens/diary/CreateDiaryEventScreen';
import { DiaryEventDetailScreen } from '../screens/diary/DiaryEventDetailScreen';
import { TodayScheduleScreen } from '../screens/diary/TodayScheduleScreen';
import { MyTimetableScreen } from '../screens/timetable/MyTimetableScreen';
import { AddClassScreen } from '../screens/timetable/AddClassScreen';
import { TimetableSettingsScreen } from '../screens/timetable/TimetableSettingsScreen';
import { SavedLinksScreen } from '../screens/links/SavedLinksScreen';
import { SaveLinkScreen } from '../screens/links/SaveLinkScreen';
import { InboxScreen } from '../screens/connect/InboxScreen';
import { StudentSearchScreen } from '../screens/connect/StudentSearchScreen';
import { StudentProfileScreen } from '../screens/connect/StudentProfileScreen';
import { ChatScreen } from '../screens/connect/ChatScreen';
import { MyFriendsScreen } from '../screens/connect/MyFriendsScreen';
import { FollowersScreen } from '../screens/connect/FollowersScreen';
import { FollowingScreen } from '../screens/connect/FollowingScreen';
import { FollowRequestsScreen } from '../screens/connect/FollowRequestsScreen';
import { SentRequestsScreen } from '../screens/connect/SentRequestsScreen';
import { CreateStatusScreen } from '../screens/connect/CreateStatusScreen';
import { StatusViewerScreen } from '../screens/connect/StatusViewerScreen';
import { UsernameSettingsScreen } from '../screens/profile/UsernameSettingsScreen';
import { BlockedStudentsScreen } from '../screens/connect/BlockedStudentsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { theme } = useTheme();
  const { hasAcceptedTerms, hasChosenMode, session, isProfileComplete, pendingPasswordReset } = useAuth();

  const getInitialRoute = (): keyof RootStackParamList => {
    if (!hasAcceptedTerms) {
      return 'TermsPrivacyConsent';
    }
    if (pendingPasswordReset) {
      return 'ResetPassword';
    }
    if (session?.user) {
      return isProfileComplete ? 'MainTabs' : 'ProfileSetup';
    }
    if (hasChosenMode) {
      return 'MainTabs';
    }
    return 'Welcome';
  };

  return (
    <Stack.Navigator
      initialRouteName={getInitialRoute()}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
      }}
    >
      {/* Onboarding & Legal Stack */}
      <Stack.Screen name="TermsPrivacyConsent" component={TermsPrivacyConsentScreen} />
      <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />

      {/* Auth & Profile Stack */}
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />

      {/* Main Tab Navigator */}
      <Stack.Screen name="MainTabs" component={TabNavigator} />

      {/* Core Note & Document Screens */}
      <Stack.Screen name="SubjectDetail" component={SubjectDetailScreen} />
      <Stack.Screen name="FolderDetail" component={FolderDetailScreen} />
      <Stack.Screen name="CreateSubject" component={CreateSubjectScreen} />
      <Stack.Screen name="CreateFolder" component={CreateFolderScreen} />
      <Stack.Screen name="Scanner" component={ScannerScreen} />
      <Stack.Screen name="DocumentCropScreen" component={DocumentCropScreen} />
      <Stack.Screen name="ScanPreview" component={ScanPreviewScreen} />
      <Stack.Screen name="SaveNote" component={SaveNoteScreen} />
      <Stack.Screen name="NoteViewer" component={NoteViewerScreen} />
      <Stack.Screen name="CreatePdf" component={CreatePdfScreen} />
      <Stack.Screen name="PdfViewer" component={PdfViewerScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="Trash" component={TrashScreen} />
      <Stack.Screen name="CompressionCenter" component={CompressionCenterScreen} />
      <Stack.Screen name="ImageCompression" component={ImageCompressionScreen} />
      <Stack.Screen name="PdfCompression" component={PdfCompressionScreen} />
      <Stack.Screen name="ImportantDocuments" component={ImportantDocumentsScreen} />
      <Stack.Screen name="DocumentFolderDetail" component={DocumentFolderDetailScreen} />
      <Stack.Screen name="StudentDiary" component={StudentDiaryScreen} />
      <Stack.Screen name="CreateDiaryEvent" component={CreateDiaryEventScreen} />
      <Stack.Screen name="DiaryEventDetail" component={DiaryEventDetailScreen} />
      <Stack.Screen name="TodaySchedule" component={TodayScheduleScreen} />
      <Stack.Screen name="MyTimetable" component={MyTimetableScreen} />
      <Stack.Screen name="AddClass" component={AddClassScreen} />
      <Stack.Screen name="TimetableSettings" component={TimetableSettingsScreen} />
      <Stack.Screen name="SavedLinks" component={SavedLinksScreen} />
      <Stack.Screen name="SaveLink" component={SaveLinkScreen} />
      
      {/* Connect Screens */}
      <Stack.Screen name="Inbox" component={InboxScreen} />
      <Stack.Screen name="StudentSearch" component={StudentSearchScreen} />
      <Stack.Screen name="StudentProfile" component={StudentProfileScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="MyFriends" component={MyFriendsScreen} />
      <Stack.Screen name="Followers" component={FollowersScreen} />
      <Stack.Screen name="Following" component={FollowingScreen} />
      <Stack.Screen name="FollowRequests" component={FollowRequestsScreen} />
      <Stack.Screen name="SentRequests" component={SentRequestsScreen} />
      <Stack.Screen name="CreateStatus" component={CreateStatusScreen} />
      <Stack.Screen name="StatusViewer" component={StatusViewerScreen} />
      <Stack.Screen name="UsernameSettings" component={UsernameSettingsScreen} />
      <Stack.Screen name="BlockedStudents" component={BlockedStudentsScreen} />
    </Stack.Navigator>
  );
};
