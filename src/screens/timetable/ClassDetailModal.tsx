import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { TimetableClass } from '../../types/timetable';
import { timetableService, DAYS_LIST } from '../../services/timetableService';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface ClassDetailModalProps {
  visible: boolean;
  cls: TimetableClass | null;
  onClose: () => void;
  onEdit: (cls: TimetableClass) => void;
  onDelete: (id: string) => void;
  onOpenSubject?: (subjectId: string) => void;
}

export const ClassDetailModal: React.FC<ClassDetailModalProps> = ({
  visible,
  cls,
  onClose,
  onEdit,
  onDelete,
  onOpenSubject,
}) => {
  const { theme } = useTheme();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!cls) return null;

  const dayConfig = DAYS_LIST.find((d) => d.id === cls.dayOfWeek);
  const start12 = timetableService.formatTime12(cls.startTime);
  const end12 = timetableService.formatTime12(cls.endTime);
  const durationText = timetableService.calculateDuration(cls.startTime, cls.endTime);

  const subjectColor = cls.subjectColor || '#4F46E5';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {/* Drag Handle */}
              <View style={[styles.handleBar, { backgroundColor: theme.colors.border }]} />

              {/* Header Card */}
              <View style={[styles.headerCard, { backgroundColor: subjectColor + '15', borderColor: subjectColor + '40' }]}>
                <View style={[styles.subjectDot, { backgroundColor: subjectColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subjectTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {cls.subjectName}
                  </Text>
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                    {dayConfig?.name} • {start12} – {end12} ({durationText})
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                {/* Teacher Info */}
                {cls.teacherName ? (
                  <View style={[styles.detailRow, { borderBottomColor: theme.colors.borderLight }]}>
                    <View style={styles.iconCircle}>
                      <Ionicons name="person-outline" size={16} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.metaLabel, { color: theme.colors.textSecondary }]}>Instructor / Teacher</Text>
                      <Text style={[styles.metaValue, { color: theme.colors.text }]}>{cls.teacherName}</Text>
                    </View>
                  </View>
                ) : null}

                {/* Location */}
                {(cls.room || cls.building) ? (
                  <View style={[styles.detailRow, { borderBottomColor: theme.colors.borderLight }]}>
                    <View style={styles.iconCircle}>
                      <Ionicons name="location-outline" size={16} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.metaLabel, { color: theme.colors.textSecondary }]}>Classroom & Location</Text>
                      <Text style={[styles.metaValue, { color: theme.colors.text }]}>
                        {[cls.room, cls.building].filter(Boolean).join(' • ')}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Reminder Setting */}
                <View style={[styles.detailRow, { borderBottomColor: theme.colors.borderLight }]}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="notifications-outline" size={16} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.metaLabel, { color: theme.colors.textSecondary }]}>Class Reminder</Text>
                    <Text style={[styles.metaValue, { color: theme.colors.text }]}>
                      {cls.reminderEnabled
                        ? `${cls.reminderMinutes} minutes before class starts`
                        : 'Reminders Disabled'}
                    </Text>
                  </View>
                </View>

                {/* Notes */}
                {cls.notes ? (
                  <View style={[styles.detailRow, { borderBottomColor: theme.colors.borderLight }]}>
                    <View style={styles.iconCircle}>
                      <Ionicons name="document-text-outline" size={16} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.metaLabel, { color: theme.colors.textSecondary }]}>Notes / Instructions</Text>
                      <Text style={[styles.metaValue, { color: theme.colors.text }]}>{cls.notes}</Text>
                    </View>
                  </View>
                ) : null}
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.actionBtnRow}>
                {cls.subjectId && onOpenSubject && (
                  <TouchableOpacity
                    style={[styles.subjectBtn, { backgroundColor: theme.colors.cardSecondary }]}
                    onPress={() => {
                      onClose();
                      onOpenSubject(cls.subjectId!);
                    }}
                  >
                    <Ionicons name="folder-open-outline" size={16} color={theme.colors.primary} />
                    <Text style={[styles.btnText, { color: theme.colors.primary }]}>Subject Workspace</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.editBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={() => {
                    onClose();
                    onEdit(cls);
                  }}
                >
                  <Ionicons name="pencil" size={16} color="#FFFFFF" />
                  <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Edit Class</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.deleteBtn, { backgroundColor: theme.colors.dangerLight }]}
                  onPress={() => setShowDeleteConfirm(true)}
                >
                  <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Class?"
        message={`Are you sure you want to remove "${cls.subjectName}" on ${dayConfig?.name} from your weekly timetable?`}
        confirmTitle="Delete"
        isDanger
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onClose();
          onDelete(cls.id);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 20,
    paddingBottom: 36,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  subjectDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  subjectTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  closeBtn: {
    padding: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  subjectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  deleteBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
