import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../context/NetworkContext';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { AvatarSelector, AvatarPresetType } from '../../components/common/AvatarSelector';
import { imageService } from '../../services/imageService';
import { profileService } from '../../services/profileService';
import { connectService } from '../../services/connectService';
import { StudentStatusType } from '../../types/profile';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

const STATUS_OPTIONS: { id: StudentStatusType; label: string }[] = [
  { id: 'Student', label: 'Student' },
  { id: 'Graduate', label: 'Graduate' },
  { id: 'Other', label: 'Other' },
];

export const STORY_RING_COLORS = [
  { id: '#FACC15', label: 'Electric Yellow', color: '#FACC15' },
  { id: '#F59E0B', label: 'Golden Amber', color: '#F59E0B' },
  { id: '#E1306C', label: 'Insta Sunset', color: '#E1306C' },
  { id: '#10B981', label: 'Emerald Green', color: '#10B981' },
  { id: '#06B6D4', label: 'Cyan Glow', color: '#06B6D4' },
  { id: '#6366F1', label: 'Indigo Purple', color: '#6366F1' },
  { id: '#8B5CF6', label: 'Neon Violet', color: '#8B5CF6' },
  { id: '#F43F5E', label: 'Rose Pink', color: '#F43F5E' },
];

export const ProfileSetupScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { profile, user, updateProfile } = useAuth();
  const { isOnline } = useNetwork();
  const isEditing = route.params?.isEditing ?? false;

  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [username, setUsername] = useState('');
  const [initialUsername, setInitialUsername] = useState('');
  const [university, setUniversity] = useState(profile?.university || profile?.institution || '');
  const [studentStatus, setStudentStatus] = useState<StudentStatusType>(profile?.studentStatus || 'Student');
  const [studentId, setStudentId] = useState(profile?.studentId || '');
  const [program, setProgram] = useState(profile?.program || '');
  const [semester, setSemester] = useState(profile?.semester || '');
  const [department, setDepartment] = useState(profile?.department || '');
  const [graduationYear, setGraduationYear] = useState(profile?.graduationYear || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [ringColor, setRingColor] = useState<string>(profile?.ringColor || '#6366F1');

  // Username validation state
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'offline'>('idle');
  const [usernameMessage, setUsernameMessage] = useState<string>('');
  const debounceTimerRef = useRef<any>(null);

  const [gender, setGender] = useState<'male' | 'female' | 'other'>(profile?.gender || 'male');
  const [avatarPreset, setAvatarPreset] = useState<AvatarPresetType>(
    profile?.avatarPreset || 'male_student'
  );
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(profile?.avatarUrl);
  const [loading, setLoading] = useState(false);

  // Load existing username from connect profile
  useEffect(() => {
    if (user?.id) {
      connectService.getProfile(user.id).then((p) => {
        if (p?.username && !p.username.startsWith('student_')) {
          setUsername(p.username);
          setInitialUsername(p.username);
        }
      }).catch(() => {});
    }
  }, [user?.id]);

  // Debounced username availability check
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const clean = username.trim().replace(/^@/, '').toLowerCase();
    if (!clean || clean === initialUsername.toLowerCase()) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      setIsCheckingUsername(false);
      return;
    }

    const val = connectService.validateUsername(clean);
    if (!val.isValid) {
      setUsernameStatus('invalid');
      setUsernameMessage(val.error || 'Invalid username format.');
      setIsCheckingUsername(false);
      return;
    }

    if (!isOnline) {
      setUsernameStatus('offline');
      setUsernameMessage('Internet connection required to check availability.');
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await connectService.checkUsernameAvailability(clean, user?.id);
        if (res.available) {
          setUsernameStatus('available');
          setUsernameMessage(`@${clean} is available!`);
        } else if (res.isNetworkError) {
          setUsernameStatus('offline');
          setUsernameMessage('Internet connection required to check availability.');
        } else {
          setUsernameStatus('taken');
          setUsernameMessage(`@${clean} is already taken.`);
        }
      } catch {
        setUsernameStatus('offline');
        setUsernameMessage('Internet connection required to check availability.');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [username, initialUsername, user?.id, isOnline]);

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

    const cleanUser = username.trim().replace(/^@/, '').toLowerCase();
    if (cleanUser && usernameStatus === 'taken') {
      Alert.alert('Username Taken', `@${cleanUser} is already taken. Please choose another username.`);
      return;
    }

    setLoading(true);
    try {
      // 1. Update Core Profile
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
        ringColor,
        profileCompleted: true,
      });

      // 2. Update Student Connect Profile and chosen username
      if (user?.id) {
        await connectService.saveProfile(user.id, {
          username: cleanUser || undefined,
          displayName: fullName.trim(),
          university: university.trim(),
          program: program.trim(),
          semester: semester.trim(),
          bio: bio.trim(),
          avatarUrl,
        });
      }

      setLoading(false);

      if (isEditing) {
        navigation.goBack();
      } else {
        navigation.replace('MainTabs', { screen: 'Home' });
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Save Failed', err.message || 'Failed to save profile. Please check your connection.');
    }
  };

  const studentEmail = profile?.email || user?.email || 'student@university.edu';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <AppHeader
        title={isEditing ? 'Edit Profile' : 'Complete Profile'}
        showBack={isEditing}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[theme.typography.h2, { color: theme.colors.text, marginTop: 8 }]}>
          {isEditing ? 'Update Your Profile' : 'Complete Your Profile'}
        </Text>
        <Text style={[theme.typography.body2, { color: theme.colors.textSecondary, marginTop: 4, marginBottom: 16 }]}>
          {isEditing
            ? 'Update your student details, avatar, and story ring glow color.'
            : "Let's personalize your Student Notes experience."}
        </Text>

        {/* Avatar Selector with Camera / Gallery / Preset Styles */}
        <AvatarSelector
          selectedPreset={avatarPreset}
          customAvatarUrl={avatarUrl}
          onSelectPreset={handleSelectPreset}
          onUploadCustom={handlePickAvatar}
        />

        {/* Profile Story Ring Glow Color Customizer */}
        <View style={[styles.ringColorContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.ringColorHeader}>
            <Ionicons name="color-palette-outline" size={18} color={ringColor} style={{ marginRight: 6 }} />
            <Text style={[theme.typography.subtitle2, { color: theme.colors.text }]}>
              Profile Story Ring Glow Color
            </Text>
          </View>
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginBottom: 10 }]}>
            Choose the glowing light color around your avatar:
          </Text>
          <View style={styles.colorPaletteRow}>
            {STORY_RING_COLORS.map((item) => {
              const isSelected = ringColor === item.color;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => setRingColor(item.color)}
                  style={[
                    styles.colorCircleBtn,
                    {
                      backgroundColor: item.color,
                      borderColor: isSelected ? '#FFFFFF' : 'transparent',
                      shadowColor: item.color,
                    },
                    isSelected && styles.colorCircleSelected,
                  ]}
                >
                  {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

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

        {/* Username Field */}
        <View style={styles.usernameContainer}>
          <AppInput
            label="Unique Username (@) *"
            value={username}
            onChangeText={(t) => setUsername(t.replace(/\s+/g, '').toLowerCase())}
            placeholder="e.g. ahmedaqeel"
            autoCapitalize="none"
            leftIcon="at-outline"
            rightIcon={
              isCheckingUsername ? undefined : usernameStatus === 'available' ? 'checkmark-circle' : undefined
            }
          />

          {usernameStatus !== 'idle' && (
            <View style={styles.usernameBadgeRow}>
              {isCheckingUsername ? (
                <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: 6 }} />
              ) : usernameStatus === 'available' ? (
                <Ionicons name="checkmark-circle" size={15} color="#10B981" style={{ marginRight: 5 }} />
              ) : usernameStatus === 'offline' ? (
                <Ionicons name="warning-outline" size={15} color="#F59E0B" style={{ marginRight: 5 }} />
              ) : (
                <Ionicons name="close-circle" size={15} color="#EF4444" style={{ marginRight: 5 }} />
              )}
              <Text
                style={[
                  styles.usernameBadgeText,
                  {
                    color:
                      usernameStatus === 'available'
                        ? '#10B981'
                        : usernameStatus === 'offline'
                        ? '#F59E0B'
                        : '#EF4444',
                  },
                ]}
              >
                {usernameMessage}
              </Text>
            </View>
          )}
        </View>

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
          placeholder="e.g. Aspiring software engineer studying algorithms & database systems."
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
  scrollContent: { padding: 20, paddingBottom: 60 },
  ringColorContainer: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  ringColorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  colorCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  colorCircleSelected: {
    borderWidth: 2.5,
    transform: [{ scale: 1.15 }],
  },
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
  usernameContainer: {
    marginBottom: 4,
  },
  usernameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  usernameBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
