import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { AvatarSelector, AvatarPresetType } from '../../components/common/AvatarSelector';
import { imageService } from '../../services/imageService';
import { profileService } from '../../services/profileService';
import { StudentStatusType } from '../../types/profile';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

const STATUS_OPTIONS: { id: StudentStatusType; label: string }[] = [
  { id: 'Student', label: 'Student' },
  { id: 'Graduate', label: 'Graduate' },
  { id: 'Other', label: 'Other' },
];

export const ProfileSetupScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { profile, user, updateProfile } = useAuth();
  const isEditing = route.params?.isEditing ?? false;

  const [fullName, setFullName] = useState(
    profile?.fullName || user?.displayName || ''
  );
  const [university, setUniversity] = useState(profile?.university || profile?.institution || '');
  const [studentStatus, setStudentStatus] = useState<StudentStatusType>(profile?.studentStatus || 'Student');
  const [studentId, setStudentId] = useState(profile?.studentId || '');
  const [program, setProgram] = useState(profile?.program || '');
  const [semester, setSemester] = useState(profile?.semester || '');
  const [department, setDepartment] = useState(profile?.department || '');
  const [graduationYear, setGraduationYear] = useState(profile?.graduationYear || '');
  const [bio, setBio] = useState(profile?.bio || '');

  React.useEffect(() => {
    if (!fullName && (profile?.fullName || user?.displayName)) {
      setFullName(profile?.fullName || user?.displayName || '');
    }
    if (!university && (profile?.university || profile?.institution)) {
      setUniversity(profile?.university || profile?.institution || '');
    }
  }, [profile, user]);

  const [gender, setGender] = useState<'male' | 'female' | 'other'>(profile?.gender || 'male');
  const [avatarPreset, setAvatarPreset] = useState<AvatarPresetType>(
    profile?.avatarPreset || 'male_student'
  );
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(profile?.avatarUrl);
  const [loading, setLoading] = useState(false);

  const handlePickAvatar = async () => {
    try {
      const croppedUri = await imageService.pickProfileAvatar();
      if (croppedUri) {
        setAvatarUrl(croppedUri);
        // Upload to cloud storage if user is logged in
        if (user?.id) {
          const uploadedUrl = await profileService.uploadAvatar(user.id, croppedUri);
          if (uploadedUrl) {
            setAvatarUrl(uploadedUrl);
          }
        }
      }
    } catch (e: any) {
      Alert.alert('Image Selection', e.message || 'Failed to select image.');
    }
  };

  const handleSelectPreset = (preset: AvatarPresetType) => {
    setAvatarPreset(preset);
    setAvatarUrl(undefined);
    setGender(preset.startsWith('female') ? 'female' : 'male');
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required Field', 'Please enter your Full Name.');
      return;
    }
    if (!university.trim()) {
      Alert.alert('Required Field', 'Please enter your University or Institution name.');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        university: university.trim(),
        institution: university.trim(),
        studentStatus,
        studentId: studentId.trim(),
        program: program.trim(),
        semester: semester.trim(),
        department: department.trim(),
        graduationYear: graduationYear.trim(),
        bio: bio.trim(),
        gender,
        avatarPreset,
        avatarUrl,
        profileCompleted: true,
      });

      setLoading(false);

      if (isEditing) {
        navigation.goBack();
      } else {
        navigation.replace('MainTabs', { screen: 'Home' });
      }
    } catch {
      setLoading(false);
      if (isEditing) {
        navigation.goBack();
      } else {
        navigation.replace('MainTabs', { screen: 'Home' });
      }
    }
  };

  const studentEmail = profile?.email || user?.email || 'student@university.edu';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <AppHeader
        title={isEditing ? 'Edit Profile' : 'Complete Profile'}
        showBack={isEditing}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 160 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[theme.typography.h2, { color: theme.colors.text, marginTop: 8 }]}>
          {isEditing ? 'Update Your Profile' : 'Complete Your Profile'}
        </Text>
        <Text style={[theme.typography.body2, { color: theme.colors.textSecondary, marginTop: 4, marginBottom: 16 }]}>
          {isEditing
            ? 'Update your student details, academic info, and avatar.'
            : "Let's personalize your Student Notes workspace."}
        </Text>

        {/* Avatar Selector with Camera / Gallery / Preset Styles */}
        <AvatarSelector
          selectedPreset={avatarPreset}
          customAvatarUrl={avatarUrl}
          onSelectPreset={handleSelectPreset}
          onUploadCustom={handlePickAvatar}
        />

        {/* Required Fields Section */}
        <View style={styles.sectionDivider}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>REQUIRED INFORMATION</Text>
        </View>

        <AppInput
          label="Full Name *"
          value={fullName}
          onChangeText={setFullName}
          placeholder="e.g. Ahmed Khan"
          autoCapitalize="words"
          leftIcon="person-outline"
        />

        <AppInput
          label="University / Institution *"
          value={university}
          onChangeText={setUniversity}
          placeholder="e.g. University of Kotli"
          autoCapitalize="words"
          leftIcon="business-outline"
        />

        <AppInput
          label="Student Email"
          value={studentEmail}
          editable={false}
          leftIcon="mail-outline"
          style={{ opacity: 0.7 }}
        />

        {/* Student Status Picker */}
        <View style={styles.statusGroup}>
          <Text style={[theme.typography.subtitle2, { color: theme.colors.text, marginBottom: 8 }]}>
            Student Status *
          </Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((item) => {
              const isSelected = studentStatus === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setStudentStatus(item.id)}
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      theme.typography.body2,
                      { color: isSelected ? '#FFFFFF' : theme.colors.text, fontWeight: '600' },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Optional Academic Details Section */}
        <View style={[styles.sectionDivider, { marginTop: 12 }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            OPTIONAL ACADEMIC DETAILS
          </Text>
        </View>

        <AppInput
          label="Student ID / Registration Number"
          value={studentId}
          onChangeText={setStudentId}
          placeholder="e.g. 2024-CS-108"
          autoCapitalize="characters"
          leftIcon="card-outline"
        />

        <AppInput
          label="Degree / Program"
          value={program}
          onChangeText={setProgram}
          placeholder="e.g. BS Computer Science"
          autoCapitalize="words"
          leftIcon="school-outline"
        />

        <AppInput
          label="Semester"
          value={semester}
          onChangeText={setSemester}
          placeholder="e.g. 5th Semester / Fall 2026"
          leftIcon="calendar-outline"
        />

        <AppInput
          label="Department"
          value={department}
          onChangeText={setDepartment}
          placeholder="e.g. Department of Computer Science"
          autoCapitalize="words"
          leftIcon="book-outline"
        />

        <AppInput
          label="Graduation Year"
          value={graduationYear}
          onChangeText={setGraduationYear}
          placeholder="e.g. 2028"
          keyboardType="numeric"
          leftIcon="ribbon-outline"
        />

        <AppInput
          label="Short Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="e.g. Studying computer science, algorithms & database systems."
          multiline
          numberOfLines={3}
          leftIcon="document-text-outline"
          style={{ minHeight: 64 }}
        />

        <AppButton
          title={isEditing ? 'Save Profile Changes' : 'Save & Continue'}
          onPress={handleSave}
          loading={loading}
          size="large"
          style={{ marginTop: 16, marginBottom: 40 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 160 },
  sectionDivider: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  statusGroup: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
