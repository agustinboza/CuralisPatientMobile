import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../../../shared/types/navigation';
import api from '../../../shared/api';
import { Procedure, Exam } from '../../../shared/types';
import { COLORS, SPACING, BORDER_RADIUS } from '../../../shared/constants';

type ProcedureDetailRouteProp = RouteProp<MainStackParamList, 'ProcedureDetail'>;

export const ProcedureDetailScreen: React.FC = () => {
  const route = useRoute<ProcedureDetailRouteProp>();
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const { procedureId } = route.params;

  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProcedure = async () => {
    try {
      setIsLoading(true);
      // This is a mock API method we need to add
      const response = await api.getProcedure(procedureId);
      if (response.success && response.data) {
        setProcedure(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch procedure details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (procedureId) {
      fetchProcedure();
    }
  }, [procedureId]);

  // Refresh data when screen comes into focus (e.g., returning from exam detail)
  useFocusEffect(
    useCallback(() => {
      if (procedureId) {
        fetchProcedure();
      }
    }, [procedureId])
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return { name: 'checkmark-circle' as const, color: COLORS.success };
      case 'uploaded':
        return { name: 'cloud-upload' as const, color: COLORS.primary };
      case 'pending':
        return { name: 'time' as const, color: COLORS.warning };
      default:
        return { name: 'help-circle' as const, color: COLORS.textSecondary };
    }
  };

  const renderExamItem = ({ item }: { item: Exam }) => {
    const statusIcon = getStatusIcon(item.status);

    return (
      <TouchableOpacity
        style={styles.examCard}
        onPress={() => navigation.navigate('ExamDetail', { examId: item.id })}
      >
        <Ionicons name={statusIcon.name} size={28} color={statusIcon.color} style={styles.examIcon} />
        <View style={styles.examContent}>
          <Text style={styles.examTitle}>{item.name}</Text>
          <Text style={styles.examStatus}>Status: {item.status}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!procedure) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Procedure not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{procedure.name}</Text>
          <Text style={styles.description}>{procedure.description}</Text>
        </View>

        <Text style={styles.sectionTitle}>Required Exams</Text>
        
        <FlatList
          data={procedure.exams.sort((a, b) => a.name.localeCompare(b.name))}
          renderItem={renderExamItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false} // The parent ScrollView handles scrolling
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 1,
  },
  examIcon: {
    marginRight: SPACING.md,
  },
  examContent: {
    flex: 1,
  },
  examTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  examStatus: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
    marginTop: SPACING.xs,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
  },
}); 