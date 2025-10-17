import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MainStackScreenProps } from '../../../shared/navigation/AppNavigator';
import { useRoute } from '@react-navigation/native';
import api from '../../../shared/api';
import { COLORS, SPACING, BORDER_RADIUS } from '../../../shared/constants';
import { FollowUp } from '../../../shared/types';

type Props = MainStackScreenProps<'FollowUpForm'>;

export const FollowUpFormScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute();
  const { followUp } = route.params as { followUp: FollowUp };

  const [patientHeight, setPatientHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState('');
  const [wellnessScore, setWellnessScore] = useState('');
  const [proteinIntake, setProteinIntake] = useState('');
  const [exerciseHours, setExerciseHours] = useState('');
  const [notes, setNotes] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchPatientProfile = async () => {
      try {
        const response = await api.getProfile();
        if (response.success && response.data) {
          setPatientHeight(response.data.height);
        } else {
          Alert.alert('Error', 'Could not fetch patient profile.');
        }
      } catch (error) {
        Alert.alert('Error', 'An unexpected error occurred while fetching your profile.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatientProfile();
  }, []);

  const bmi = useMemo(() => {
    if (weight && patientHeight) {
      const weightKg = parseFloat(weight);
      const heightM = patientHeight / 100;
      if (heightM > 0) {
        return (weightKg / (heightM * heightM)).toFixed(1);
      }
    }
    return null;
  }, [weight, patientHeight]);

  const getBMICategory = (bmiValue: string) => {
    const bmiNum = parseFloat(bmiValue);
    if (bmiNum < 18.5) return { category: 'Underweight', color: COLORS.warning };
    if (bmiNum < 25) return { category: 'Normal', color: COLORS.success };
    if (bmiNum < 30) return { category: 'Overweight', color: COLORS.warning };
    return { category: 'Obese', color: COLORS.error };
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!weight || !wellnessScore || !proteinIntake || !exerciseHours) {
      Alert.alert('Missing Information', 'Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const followUpData = {
        weight: parseFloat(weight),
        wellnessScore: parseInt(wellnessScore, 10),
        dailyProteinIntake: parseInt(proteinIntake, 10),
        weeklyExerciseHours: parseFloat(exerciseHours),
        notes,
      };

      const response = await api.submitAssignedFollowUp(followUp.id, followUpData);

      if (response.success) {
        Alert.alert('Success', 'Your follow-up has been submitted successfully!');
        navigation.goBack();
      } else {
        Alert.alert('Submission Failed', response.error || 'An unknown error occurred.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>New Follow-up</Text>
          <Text style={styles.subtitle}>Track your health progress</Text>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="scale-outline" size={20} color={COLORS.primary} />
            <Text style={styles.label}>Weight (kg)</Text>
          </View>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholder="Enter your current weight"
            placeholderTextColor={COLORS.textSecondary}
          />
          {bmi && (
            <View style={styles.bmiCard}>
              <View style={styles.bmiHeader}>
                <Ionicons name="analytics-outline" size={16} color={COLORS.primary} />
                <Text style={styles.bmiTitle}>Calculated BMI</Text>
              </View>
              <View style={styles.bmiContent}>
                <Text style={styles.bmiValue}>{bmi}</Text>
                <Text style={[styles.bmiCategory, { color: getBMICategory(bmi).color }]}>
                  {getBMICategory(bmi).category}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="heart-outline" size={20} color={COLORS.primary} />
            <Text style={styles.label}>Wellness Score</Text>
          </View>
          <TextInput
            style={styles.input}
            value={wellnessScore}
            onChangeText={setWellnessScore}
            keyboardType="number-pad"
            placeholder="Rate your overall wellness (1-10)"
            placeholderTextColor={COLORS.textSecondary}
            maxLength={2}
          />
          <Text style={styles.helperText}>1 = Poor, 10 = Excellent</Text>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="nutrition-outline" size={20} color={COLORS.primary} />
            <Text style={styles.label}>Daily Protein Intake (grams)</Text>
          </View>
          <TextInput
            style={styles.input}
            value={proteinIntake}
            onChangeText={setProteinIntake}
            keyboardType="number-pad"
            placeholder="Enter your daily protein intake"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="fitness-outline" size={20} color={COLORS.primary} />
            <Text style={styles.label}>Weekly Exercise (hours)</Text>
          </View>
          <TextInput
            style={styles.input}
            value={exerciseHours}
            onChangeText={setExerciseHours}
            keyboardType="numeric"
            placeholder="Enter your weekly exercise hours"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
            <Text style={styles.label}>Notes (Optional)</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional comments or observations..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.surface} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.surface} />
              <Text style={styles.buttonText}>Submit Follow-up</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    marginTop: SPACING.xs,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  bmiCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bmiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  bmiTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  bmiContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bmiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  bmiCategory: {
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  buttonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
}); 