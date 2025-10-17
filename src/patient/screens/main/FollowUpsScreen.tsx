import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { TabScreenProps } from '../../../shared/navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../shared/api';
import { FollowUp } from '../../../shared/types';
import { COLORS, SPACING, BORDER_RADIUS } from '../../../shared/constants';

type Props = TabScreenProps<'FollowUps'>;

export const FollowUpsScreen: React.FC<Props> = ({ navigation }) => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [patientHeight, setPatientHeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [historyResponse, profileResponse] = await Promise.all([
        api.getFollowUpHistory(),
        api.getProfile(),
      ]);

      if (historyResponse.success && historyResponse.data) {
        const sortedData = historyResponse.data.sort((a: FollowUp, b: FollowUp) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setFollowUps(sortedData);
      } else {
        console.error("Failed to fetch follow-ups:", historyResponse.error);
      }

      if (profileResponse.success && profileResponse.data) {
        setPatientHeight(profileResponse.data.height);
      } else {
        console.error("Failed to fetch profile:", profileResponse.error);
      }

    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const getBmi = (weight: number) => {
    if (!patientHeight) return 'N/A';
    const heightInMeters = patientHeight / 100;
    if (heightInMeters <= 0) return 'N/A';
    return (weight / Math.pow(heightInMeters, 2)).toFixed(1);
  };

  const renderItem = ({ item }: { item: FollowUp }) => (
    <TouchableOpacity
      disabled={item.completed}
      onPress={() => {
        if (!item.completed) {
          navigation.navigate('FollowUpForm', { followUp: item });
        }
      }}
      style={[styles.itemContainer, item.completed && { opacity: 0.7 }]}
    >
      <View style={styles.itemHeader}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
          <Text style={styles.itemDate}>{new Date(item.date).toLocaleDateString()}</Text>
        </View>
        <View style={styles.bmiContainer}>
          <Text style={styles.bmiLabel}>BMI</Text>
          <Text style={styles.bmiValue}>{getBmi(item.weight)}</Text>
        </View>
      </View>
      
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Ionicons name="scale-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.metricValue}>{item.weight} kg</Text>
          <Text style={styles.metricLabel}>Weight</Text>
        </View>
        
        <View style={styles.metricItem}>
          <Ionicons name="heart-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.metricValue}>{item.wellnessScore}/10</Text>
          <Text style={styles.metricLabel}>Wellness</Text>
        </View>
        
        <View style={styles.metricItem}>
          <Ionicons name="nutrition-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.metricValue}>{item.dailyProteinIntake}g</Text>
          <Text style={styles.metricLabel}>Protein</Text>
        </View>
        
        <View style={styles.metricItem}>
          <Ionicons name="fitness-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.metricValue}>{item.weeklyExerciseHours}h</Text>
          <Text style={styles.metricLabel}>Exercise</Text>
        </View>
      </View>

      {!item.completed && (
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.pendingContainer}
            onPress={() => navigation.navigate('FollowUpForm', { followUp: item })}
          >
            <Ionicons name="time-outline" size={16} color={COLORS.warning} />
            <Text style={styles.pendingText}>Pending</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.completed && (
        <View style={styles.completedContainer}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          <Text style={styles.completedText}>Completed</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Follow-ups</Text>
          <Text style={styles.headerSubtitle}>Track your health progress</Text>
        </View>
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Follow-ups</Text>
        <Text style={styles.headerSubtitle}>Track your health progress</Text>
      </View>
      
      <FlatList
        data={followUps}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No follow-ups yet</Text>
            <Text style={styles.emptyText}>Your doctor will schedule follow-up appointments to track your progress.</Text>
          </View>
        }
      />
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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  itemContainer: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDate: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: SPACING.xs,
  },
  bmiContainer: {
    alignItems: 'center',
  },
  bmiLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  bmiValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
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
    paddingHorizontal: SPACING.lg,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  pendingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.warning,
    marginLeft: SPACING.xs,
  },
  completedContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  completedText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.success,
    marginLeft: SPACING.xs,
  },
}); 