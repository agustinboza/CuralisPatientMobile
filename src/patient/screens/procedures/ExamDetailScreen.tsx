import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../../../shared/types/navigation';
import api from '../../../shared/api';
import { Exam } from '../../../shared/types';
import { COLORS, SPACING, BORDER_RADIUS } from '../../../shared/constants';

type ExamDetailRouteProp = RouteProp<MainStackParamList, 'ExamDetail'>;

export const ExamDetailScreen: React.FC = () => {
  const route = useRoute<ExamDetailRouteProp>();
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const { examId } = route.params;

  const [exam, setExam] = useState<Exam | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) return;
      setIsLoading(true);
      try {
        const response = await api.getExam(examId);
        if (response.success && response.data) {
          setExam(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch exam details:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExam();
  }, [examId]);

  const handleToggleStatus = async () => {
    if (!exam) return;

    const newStatus = exam.status === 'completed' ? 'pending' : 'completed';
    
    // Optimistically update UI
    setExam(prev => prev ? { ...prev, status: newStatus } : null);

    try {
      await api.updateExamStatus(exam.id, newStatus);
      // In a real app, you might want to refetch or confirm the update
    } catch (error) {
      console.error("Failed to update exam status:", error);
      // Revert UI on error
      setExam(prev => prev ? { ...prev, status: exam.status } : null);
      Alert.alert("Error", "Could not update the status. Please try again.");
    }
  };

  const renderDetailRow = (icon: keyof typeof Ionicons.glyphMap, label: string, value: string) => (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={20} color={COLORS.textSecondary} style={styles.detailIcon} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!exam) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Exam details not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{exam.name}</Text>
          <Text style={styles.subtitle}>Review the details and upload your results below.</Text>
        </View>

        <View style={styles.detailsContainer}>
          {renderDetailRow('pulse-outline', 'Status', exam.status)}
          {renderDetailRow('medkit-outline', 'Type', (exam.type || 'other').toString().replace('_', ' '))}
          {exam.dueDate && renderDetailRow('calendar-outline', 'Due Date', new Date(exam.dueDate).toLocaleDateString())}
        </View>

        {exam.uploadedResults && exam.uploadedResults.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Uploaded Results</Text>
            {exam.uploadedResults.map(result => (
              <View key={result.id} style={styles.resultCard}>
                <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
                <Text style={styles.resultText}>{result.fileName}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity 
          style={styles.uploadButton}
          onPress={() => navigation.navigate('UploadResult', { examId: exam.id })}
        >
          <Ionicons name="cloud-upload-outline" size={24} color={COLORS.surface} />
          <Text style={styles.uploadButtonText}>Upload Results</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statusToggleButton}
          onPress={handleToggleStatus}
        >
          <Ionicons 
            name={exam.status === 'completed' ? 'close-circle-outline' : 'checkmark-done-outline'} 
            size={20} 
            color={COLORS.primary} 
          />
          <Text style={styles.statusToggleButtonText}>
            {exam.status === 'completed' ? 'Mark as Pending' : 'Mark as Complete'}
          </Text>
        </TouchableOpacity>

        {exam.prescriptionUrl && (
          <TouchableOpacity style={styles.downloadButton}>
            <Ionicons name="download-outline" size={20} color={COLORS.primary} />
            <Text style={styles.downloadButtonText}>Download Prescription</Text>
          </TouchableOpacity>
        )}

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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  detailsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  detailIcon: {
    marginRight: SPACING.md,
  },
  detailLabel: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  resultsSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  resultText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: SPACING.md,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 2,
  },
  uploadButtonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  downloadButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    marginLeft: SPACING.sm,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
  },
  statusToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginTop: SPACING.md,
  },
  statusToggleButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: SPACING.sm,
  },
}); 