import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppButton } from '../../components/common/AppButton';
import { Ionicons } from '@expo/vector-icons';
import { imageService } from '../../services/imageService';
import { profileService } from '../../services/profileService';
import { StudentStatusType } from '../../types/profile';
import { STORY_RING_COLORS } from './ProfileSetupScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const STATUS_OPTIONS: { id: StudentStatusType; label: string }[] = [
  { id: 'Student', label: 'Student' },
  { id: 'Graduate', label: 'Graduate' },
  { id: 'Other', label: 'Other' },
];

export const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { profile, user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [university, setUniversity] = useState(profile?.university || profile?.institution || '');
  const [studentStatus, setStudentStatus] = useState<StudentStatusType>(profile?.studentStatus || 'Student');
  const [studentId, setStudentId] = useState(profile?.studentId || '');
  const [program, setProgram] = useState(profile?.program || '');
  const [semester, setSemester] = useState(profile?.semester || '');
  const [department, setDepartment] = useState(profile?.department || '');
  const [graduationYear, setGraduationYear] = useState(profile?.graduationYear || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [ringColor, setRingColor] = useState<string>(profile?.ringColor || '#6366F1');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(profile?.avatarUrl);
  const [loading, setLoading] = useState(false);

  const handlePickAvatar = async () => {
    try {
      const croppedUri = await imageService.pickProfileAvatar();
      if (croppedUri) {
        setAvatarUrl(croppedUri);
        if (user?.id) {
          const uploadedUrl = await profileService.uploadAvatar(user.id, croppedUri);
          if (uploadedUrl) {
            setAvatarUrl(uploadedUrl);
          }
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to select photo.');
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Please enter your Full Name.');
      return;
    }
    if (!university.trim()) {
      Alert.alert('Required', 'Please enter your University or Institution.');
      return;
    }

    setLoading(true);
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
      avatarUrl,
      ringColor,
      profileCompleted: true,
    });
    setLoading(false);
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Edit Student Profile" showBack onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Avatar Section with Glowing Story Ring */}
        <View style={styles.avatarWrapper}>
          <TouchableOpacity
            onPress={handlePickAvatar}
            activeOpacity={0.8}
            style={[
              styles.avatarTouch,
              {
                borderColor: ringColor,
                shadowColor: ringColor,
              },
            ]}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primaryLight }]}>
                <Ionicons name="person-outline" size={44} color={theme.colors.primary} />
              </View>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: ringColor }]}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 8 }]}>
            Tap photo to change
          </Text>
        </View>

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

        <AppInput
          label="Full Name *"
          value={fullName}
          onChangeText={setFullName}
          placeholder="e.g. Ahmed Khan"
          leftIcon="person-outline"
        />

        <AppInput
          label="University / Institution *"
          value={university}
          onChangeText={setUniversity}
          placeholder="e.g. University of Kotli"
          leftIcon="business-outline"
        />

        <AppInput
          label="Student Email (Read Only)"
          value={profile?.email || user?.email || 'Offline User'}
          editable={false}
          leftIcon="mail-outline"
          style={{ opacity: 0.7 }}
        />

        {/* Status selection */}
        <View style={styles.statusGroup}>
          <Text style={[theme.typography.subtitle2, { color: theme.colors.text, marginBottom: 8 }]}>
            Student Status
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

        <AppInput
          label="Student ID / Registration Number"
          value={studentId}
          onChangeText={setStudentId}
          placeholder="e.g. 2024-CS-108"
          leftIcon="card-outline"
        />

        <AppInput
          label="Degree / Program"
          value={program}
          onChangeText={setProgram}
          placeholder="e.g. BS Software Engineering"
          leftIcon="school-outline"
        />

        <AppInput
          label="Department"
          value={department}
          onChangeText={setDepartment}
          placeholder="e.g. Department of Computer Science"
          leftIcon="book-outline"
        />

        <AppInput
          label="Semester / Academic Term"
          value={semester}
          onChangeText={setSemester}
          placeholder="e.g. Semester 4 / Fall 2026"
          leftIcon="calendar-outline"
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
          label="Bio / Description"
          value={bio}
          onChangeText={setBio}
          placeholder="Brief student intro..."
          multiline
          numberOfLines={3}
          leftIcon="document-text-outline"
        />

        <AppButton
          title="Save Profile Changes"
          onPress={handleSave}
          loading={loading}
          size="large"
          style={{ marginTop: 16, marginBottom: 40 }}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarTouch: {
    position: 'relative',
    borderWidth: 3,
    borderRadius: 52,
    padding: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
  },
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
