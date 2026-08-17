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
      profileCompleted: true,
    });
    setLoading(false);
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Edit Student Profile" showBack onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Avatar Section */}
        <View style={styles.avatarWrapper}>
          <TouchableOpacity
            onPress={handlePickAvatar}
            activeOpacity={0.8}
            style={[styles.avatarTouch, { borderColor: theme.colors.primary }]}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primaryLight }]}>
                <Ionicons name="person-outline" size={44} color={theme.colors.primary} />
              </View>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 8 }]}>
            Tap photo to change
          </Text>
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
          label="Short Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Brief student summary..."
          multiline
          numberOfLines={3}
          leftIcon="document-text-outline"
          style={{ minHeight: 64 }}
        />

        <AppButton
          title="Save Changes"
          onPress={handleSave}
          loading={loading}
          size="large"
          style={{ marginTop: 8, marginBottom: 40 }}
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
    marginBottom: 20,
  },
  avatarTouch: {
    position: 'relative',
    borderRadius: 50,
    borderWidth: 2.5,
    padding: 3,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
