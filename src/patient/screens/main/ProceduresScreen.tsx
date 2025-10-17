import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../../shared/constants';
import api from '../../../shared/api';
import { Procedure } from '../../../shared/types';
import { MainStackParamList } from '../../../shared/types/navigation';

export const ProceduresScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProcedures = async () => {
      try {
        const response = await api.getMyProcedures();
        if (response.success && response.data) {
          setProcedures(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch procedures:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProcedures();
  }, []);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return { container: styles.statusActive, text: styles.statusActiveText, icon: 'play-circle' };
      case 'completed':
        return { container: styles.statusCompleted, text: styles.statusCompletedText, icon: 'checkmark-circle' };
      default:
        return { container: styles.statusPending, text: styles.statusPendingText, icon: 'time' };
    }
  };

  const renderProcedureItem = ({ item }: { item: Procedure }) => {
    const statusStyle = getStatusStyle(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ProcedureDetail', { procedureId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Ionicons name="medical-outline" size={20} color={COLORS.primary} style={styles.procedureIcon} />
            <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
          </View>
          <View style={[styles.statusBadge, statusStyle.container]}>
            <Ionicons name={statusStyle.icon as any} size={12} color={statusStyle.text.color} />
            <Text style={[styles.statusText, statusStyle.text]}>{item.status}</Text>
          </View>
        </View>
        
        <Text style={styles.cardDescription} numberOfLines={3}>{item.description}</Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.footerText}>
              {item.assignedAt ? new Date(item.assignedAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="document-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.footerText}>
              {item.exams?.length || 0} exam{(item.exams?.length || 0) !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Procedures</Text>
          <Text style={styles.headerSubtitle}>Your assigned medical procedures</Text>
        </View>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading Procedures...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Procedures</Text>
        <Text style={styles.headerSubtitle}>Your assigned medical procedures</Text>
      </View>
      
      {procedures.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="medical-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>No procedures assigned</Text>
          <Text style={styles.emptyText}>You don't have any procedures assigned yet. Check back later or contact your healthcare provider.</Text>
        </View>
      ) : (
        <FlatList
          data={procedures}
          renderItem={renderProcedureItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: SPACING.sm,
  },
  procedureIcon: {
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    lineHeight: 24,
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginLeft: SPACING.sm,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginLeft: SPACING.xs,
  },
  statusActive: {
    backgroundColor: '#DBEAFE',
  },
  statusActiveText: {
    color: '#1E40AF',
  },
  statusCompleted: {
    backgroundColor: '#D1FAE5',
  },
  statusCompletedText: {
    color: '#065F46',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPendingText: {
    color: '#92400E',
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
}); 