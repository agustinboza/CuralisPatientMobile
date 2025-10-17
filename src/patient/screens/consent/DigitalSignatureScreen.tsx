import React, { useState, useEffect } from 'react';
import { SafeAreaView, Alert, ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { DigitalSignature } from '../../components/DigitalSignature';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../../shared/constants';
import apiService from '../../../shared/api';
import { Patient } from '../../../shared/types';
import { generateConsentPDF, shareConsentDocument } from '../../../shared/utils/pdfGenerator';

export const DigitalSignatureScreen: React.FC = () => {
  const navigation = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(true);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const response = await apiService.getProfile();
        if (response.success && response.data) {
          setPatientData(response.data);
        } else {
          console.error('Failed to fetch patient data:', response.error);
        }
      } catch (error) {
        console.error('Error fetching patient data:', error);
      } finally {
        setIsLoadingPatient(false);
      }
    };

    fetchPatientData();
  }, []);

  const handleSignatureComplete = async (signatureDataString: string) => {
    if (!patientData) {
      Alert.alert('Error', 'Patient data is not loaded yet. Please try again in a moment.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Submit the digital signature
      const apiResponse = await apiService.submitDigitalSignature(signatureDataString);
      
      if (apiResponse.success) {
        // Update consent status to mark digital signature as complete
        const consentUpdateResponse = await apiService.updateConsentStatus({
          consentStatus: {
            digitalSignature: true,
            emailVerified: patientData.emailVerified || false,
            isComplete: true
          }
        });

        if (consentUpdateResponse.success) {
          const signatureData = JSON.parse(signatureDataString);
          const patientInfo = {
            name: `${patientData.firstName} ${patientData.lastName}`,
            dateOfBirth: patientData.createdAt.toLocaleDateString(),
            patientId: patientData.id,
          };

          const filePath = await generateConsentPDF(signatureData, patientInfo);
          await shareConsentDocument(filePath);

          Alert.alert(
            'Signature Submitted',
            'Your digital signature has been successfully submitted and your consent status has been updated.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          Alert.alert('Warning', 'Signature was saved but consent status could not be updated. Please check your profile.');
        }

      } else {
        Alert.alert('Error', apiResponse.error || 'Failed to submit signature');
      }
    } catch (error) {
      console.error('Error in signature submission:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingPatient) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading patient information...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <DigitalSignature 
        onSignatureComplete={handleSignatureComplete} 
        isProcessing={isSubmitting}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
}); 