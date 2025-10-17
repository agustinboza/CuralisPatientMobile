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
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS, SPACING, BORDER_RADIUS, VALIDATION } from '../../constants';
import api from '../../api';
import { AuthStackParamList } from '../../types/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { User, Patient, Doctor } from '../../types';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demoRole, setDemoRole] = useState<'PATIENT' | 'CLINICIAN'>('PATIENT');

  const handleLogin = async () => {
    if (demoMode) {
      // Demo mode - create mock user data
      const mockUser: User = demoRole === 'PATIENT' 
        ? {
            id: '1',
            email: 'patient@demo.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'PATIENT',
            weight: 85.5,
            height: 175,
            comorbidConditions: ['Hypertension'],
            consentStatus: { digitalSignature: true, emailVerified: true, isComplete: true },
            consentSignedAt: new Date(),
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Patient
        : {
            id: '2',
            email: 'doctor@demo.com',
            firstName: 'Sarah',
            lastName: 'Wilson',
            role: 'CLINICIAN',
            specialization: 'Bariatric Surgery',
            licenseNumber: 'MD123456',
            patients: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Doctor;

      await login('demo-token', mockUser);
      return;
    }

    // Real login logic
    if (!formData.email || !formData.password) {
      Alert.alert('Missing Information', 'Please fill in all fields.');
      return;
    }

    if (!VALIDATION.EMAIL_REGEX.test(formData.email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.login(formData.email, formData.password);

      if (response.success && response.data) {
        await login(response.data.token, response.data.user);
      } else {
        Alert.alert('Error', response.message || 'Login failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert(
        'Login Failed', 
        error.response?.data?.message || 'Invalid email or password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your FollowNest account</Text>
        </View>

        {/* Demo Mode Toggle */}
        <View style={styles.demoContainer}>
          <TouchableOpacity
            style={[styles.demoToggle, demoMode && styles.demoToggleActive]}
            onPress={() => setDemoMode(!demoMode)}
          >
            <Text style={[styles.demoToggleText, demoMode && styles.demoToggleTextActive]}>
              Demo Mode
            </Text>
          </TouchableOpacity>
          
          {demoMode && (
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[styles.roleButton, demoRole === 'PATIENT' && styles.roleButtonActive]}
                onPress={() => setDemoRole('PATIENT')}
              >
                <Text style={[styles.roleButtonText, demoRole === 'PATIENT' && styles.roleButtonTextActive]}>
                  Patient
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleButton, demoRole === 'CLINICIAN' && styles.roleButtonActive]}
                onPress={() => setDemoRole('CLINICIAN')}
              >
                <Text style={[styles.roleButtonText, demoRole === 'CLINICIAN' && styles.roleButtonTextActive]}>
                  Doctor
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!demoMode && (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry
              autoCorrect={false}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.surface} />
          ) : (
            <Text style={styles.buttonText}>
              {demoMode ? `Sign In as ${demoRole === 'PATIENT' ? 'Patient' : 'Doctor'}` : 'Sign In'}
            </Text>
          )}
        </TouchableOpacity>

        {!demoMode && (
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Signup', { doctorId: '', clinicId: '', qrCode: '' })}
          >
            <Text style={styles.linkText}>Don't have an account? Sign up</Text>
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
  },
  demoContainer: {
    marginBottom: SPACING.lg,
  },
  demoToggle: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  demoToggleActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  demoToggleText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  demoToggleTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  roleButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  roleButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  form: {
    flex: 1,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    fontSize: 16,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
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
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 14,
  },
}); 