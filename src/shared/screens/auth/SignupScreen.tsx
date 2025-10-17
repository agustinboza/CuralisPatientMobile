import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS, SPACING, BORDER_RADIUS, VALIDATION } from '../../constants';
import api from '../../api';
import { AuthStackParamList } from '../../types/navigation';
import { useAuth } from '../../contexts/AuthContext';

export const SignupScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>();
  const route = useRoute<RouteProp<AuthStackParamList, 'Signup'>>();
  const { signup } = useAuth();

  // Parameters from QRScanScreen
  const { doctorId, clinicId, qrCode } = route.params;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    weight: '',
    height: '',
    comorbidConditions: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.weight || !formData.height) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    if (!VALIDATION.EMAIL_REGEX.test(formData.email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (formData.password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      Alert.alert('Weak Password', `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters.`);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    const weight = parseFloat(formData.weight);
    const height = parseFloat(formData.height);

    if (isNaN(weight) || weight < VALIDATION.WEIGHT_MIN || weight > VALIDATION.WEIGHT_MAX) {
      Alert.alert('Invalid Weight', `Weight must be between ${VALIDATION.WEIGHT_MIN} and ${VALIDATION.WEIGHT_MAX} kg.`);
      return;
    }

    if (isNaN(height) || height < VALIDATION.HEIGHT_MIN || height > VALIDATION.HEIGHT_MAX) {
      Alert.alert('Invalid Height', `Height must be between ${VALIDATION.HEIGHT_MIN} and ${VALIDATION.HEIGHT_MAX} cm.`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.signup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        weight,
        height,
        comorbidConditions: formData.comorbidConditions ? formData.comorbidConditions.split(',').map(s => s.trim()) : [],
      });

      if (response.success && response.data) {
        // Use the auth context to store authentication data
        await signup(response.data.token, response.data.user);
        
        // Navigation will be handled automatically by the AppNavigator
        // based on the authentication state change
      } else {
        Alert.alert('Error', response.message || 'Failed to create account.');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      Alert.alert(
        'Error', 
        error.response?.data?.message || 'Failed to create account. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join FollowNest for better health tracking</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            value={formData.firstName}
            onChangeText={(text) => setFormData({ ...formData, firstName: text })}
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder="Last Name"
            value={formData.lastName}
            onChangeText={(text) => setFormData({ ...formData, lastName: text })}
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder="Email Address"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            secureTextEntry
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
            secureTextEntry
          />

          <TextInput
            style={styles.input}
            placeholder="Weight (kg)"
            value={formData.weight}
            onChangeText={(text) => setFormData({ ...formData, weight: text })}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Height (cm)"
            value={formData.height}
            onChangeText={(text) => setFormData({ ...formData, height: text })}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Comorbid Conditions (optional, comma-separated)"
            value={formData.comorbidConditions}
            onChangeText={(text) => setFormData({ ...formData, comorbidConditions: text })}
            multiline
            numberOfLines={2}
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
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
    flexGrow: 1,
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: SPACING.xl,
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
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  buttonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  buttonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 16,
  },
}); 