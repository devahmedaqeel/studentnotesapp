import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Linking,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SavedLink } from '../../types/savedLink';
import { RESOURCE_TYPE_CONFIGS } from '../../services/linkService';

interface ResourceCardProps {
  link: SavedLink;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
  onCopy?: () => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  link,
  onPress,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopy,
}) => {
  const { theme, isDark } = useTheme();

  const typeConfig = RESOURCE_TYPE_CONFIGS[link.resourceType] || RESOURCE_TYPE_CONFIGS.other;
  const displayType = link.resourceType === 'other' && link.customType ? link.customType : typeConfig.label;

  const handleOpenLink = async () => {
    if (onPress) {
      onPress();
      return;
    }

    try {
      const url = link.cleanedUrl || link.originalUrl;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Unable to Open', `Could not open link:\n${url}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to open resource in browser.');
    }
  };

  const handleShare = async () => {
    try {
      const url = link.cleanedUrl || link.originalUrl;
      await Share.share({
        title: link.title,
        message: `${link.title}\n${url}`,
        url,
      });
    } catch {}
  };

  const formatDate = (timestamp: number) => {
    try {
      const d = new Date(timestamp);
      return `Saved ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } catch {
      return '';
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handleOpenLink}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {/* Top Header: Favicon/Icon + Title + Favorite Button */}
      <View style={styles.topRow}>
        <View style={[styles.faviconBox, { backgroundColor: typeConfig.bgColor }]}>
          {link.faviconUrl ? (
            <Image source={{ uri: link.faviconUrl }} style={styles.faviconImage} resizeMode="contain" />
          ) : (
            <Ionicons name={typeConfig.icon as any} size={20} color={typeConfig.color} />
          )}
        </View>

        <View style={styles.titleWrapper}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
            {link.title}
          </Text>
          <Text style={[styles.domain, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {link.domain}
          </Text>
        </View>

        {onToggleFavorite && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onToggleFavorite}
            style={styles.favBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={link.favorite ? 'star' : 'star-outline'}
              size={20}
              color={link.favorite ? '#F59E0B' : theme.colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Badges Row: Resource Type + Subject + Category */}
      <View style={styles.badgesRow}>
        <View style={[styles.typeBadge, { backgroundColor: typeConfig.bgColor }]}>
          <Ionicons name={typeConfig.icon as any} size={12} color={typeConfig.color} style={{ marginRight: 4 }} />
          <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>{displayType}</Text>
        </View>

        {link.subjectName && (
          <View style={[styles.subjectBadge, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="book-outline" size={11} color={theme.colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.subjectBadgeText, { color: theme.colors.primary }]} numberOfLines={1}>
              {link.subjectName}
            </Text>
          </View>
        )}

        {link.category && (
          <View style={[styles.categoryBadge, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <Text style={[styles.categoryBadgeText, { color: theme.colors.textSecondary }]}>
              {link.category}
            </Text>
          </View>
        )}
      </View>

      {/* Personal Note Snippet if provided */}
      {link.personalNote ? (
        <View style={[styles.noteBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC' }]}>
          <Ionicons name="chatbox-ellipses-outline" size={14} color={theme.colors.primary} style={{ marginTop: 2, marginRight: 6 }} />
          <Text style={[styles.noteText, { color: theme.colors.text }]} numberOfLines={2}>
            {link.personalNote}
          </Text>
        </View>
      ) : null}

      {/* Description Snippet if no personal note */}
      {!link.personalNote && link.description ? (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {link.description}
        </Text>
      ) : null}

      {/* Tags Row */}
      {link.tags && link.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {link.tags.map((tag, idx) => (
            <View key={`${tag}-${idx}`} style={[styles.tagPill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <Text style={[styles.tagText, { color: theme.colors.textSecondary }]}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Bottom Footer: Saved Date + Actions */}
      <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
        <Text style={[styles.dateText, { color: theme.colors.textMuted }]}>
          {formatDate(link.createdAt)}
        </Text>

        <View style={styles.actionsGroup}>
          {onCopy && (
            <TouchableOpacity
              onPress={onCopy}
              style={styles.actionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="copy-outline" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleShare}
            style={styles.actionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="share-social-outline" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {onEdit && (
            <TouchableOpacity
              onPress={onEdit}
              style={styles.actionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil-outline" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity
              onPress={onDelete}
              style={styles.actionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleOpenLink}
            style={[styles.openBtn, { backgroundColor: theme.colors.primaryLight }]}
          >
            <Text style={[styles.openBtnText, { color: theme.colors.primary }]}>Open</Text>
            <Ionicons name="open-outline" size={13} color={theme.colors.primary} style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  faviconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  faviconImage: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  titleWrapper: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  domain: {
    fontSize: 12,
    marginTop: 2,
  },
  favBtn: {
    padding: 4,
    marginLeft: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: 160,
  },
  subjectBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 16,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 8,
  },
  tagPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  dateText: {
    fontSize: 11,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 5,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 4,
  },
  openBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
