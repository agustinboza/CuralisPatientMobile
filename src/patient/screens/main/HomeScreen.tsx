import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../../shared/constants';
import api from '../../../shared/api';
import { Patient } from '../../../shared/types';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [stats, setStats] = useState({
    activeProcedures: 0,
    pendingFollowUps: 0,
    uploadedResults: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch profile and statistics in parallel
      const [profileResponse, proceduresResponse, followUpsResponse] = await Promise.all([
        api.getProfile(),
        api.getMyProcedures(),
        api.getFollowUpHistory(),
      ]);

      if (profileResponse.success && profileResponse.data) {
        setPatient(profileResponse.data);
      }

      // Calculate statistics
      const activeProcedures = proceduresResponse.success && proceduresResponse.data 
        ? proceduresResponse.data.filter((p: any) => p.status === 'active').length 
        : 0;
      
      const pendingFollowUps = followUpsResponse.success && followUpsResponse.data 
        ? followUpsResponse.data.filter((f: any) => !f.completed).length 
        : 0;

      setStats({
        activeProcedures,
        pendingFollowUps,
        uploadedResults: 0, // This would need a separate API call
      });

    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}!</Text>
          <Text style={styles.name}>
            {patient?.firstName && patient?.lastName 
              ? `${patient.firstName} ${patient.lastName}`
              : patient?.firstName 
                ? patient.firstName
                : 'Patient'
            }
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="medical" size={24} color={COLORS.primary} />
            <Text style={styles.statNumber}>{stats.activeProcedures}</Text>
            <Text style={styles.statLabel}>Active Procedures</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color={COLORS.secondary} />
            <Text style={styles.statNumber}>{stats.pendingFollowUps}</Text>
            <Text style={styles.statLabel}>Pending Follow-ups</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="document" size={24} color={COLORS.accent} />
            <Text style={styles.statNumber}>{stats.uploadedResults}</Text>
            <Text style={styles.statLabel}>Uploaded Results</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('FollowUps')}>
            <Ionicons name="add-circle" size={24} color={COLORS.primary} />
            <Text style={styles.actionText}>Submit Follow-up</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Procedures')}>
            <Ionicons name="medical" size={24} color={COLORS.secondary} />
            <Text style={styles.actionText}>View Procedures</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Appointments') as any}>
            <Ionicons name="calendar" size={24} color={COLORS.secondary} />
            <Text style={styles.actionText}>Book Appointment</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="person" size={24} color={COLORS.accent} />
            <Text style={styles.actionText}>View Profile</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          {stats.activeProcedures > 0 ? (
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="medical" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Active procedures available</Text>
                <Text style={styles.activityTime}>Check your procedures tab</Text>
              </View>
            </View>
          ) : (
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="information-circle" size={20} color={COLORS.textSecondary} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>No recent activity</Text>
                <Text style={styles.activityTime}>Start by submitting a follow-up</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginLeft: SPACING.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  activityTime: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
  },
}); 