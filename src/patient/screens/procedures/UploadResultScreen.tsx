import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../../../shared/types/navigation';
import api from '../../../shared/api';
import { API_BASE_URL } from '../../../shared/constants';
import * as FileSystem from 'expo-file-system';
import { COLORS, SPACING, BORDER_RADIUS } from '../../../shared/constants';

type UploadResultRouteProp = RouteProp<MainStackParamList, 'UploadResult'>;

export const UploadResultScreen: React.FC = () => {
  const route = useRoute<UploadResultRouteProp>();
  const navigation = useNavigation();
  const { examId } = route.params;

  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document. Please try again.');
      console.error(err);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('No File', 'Please select a file to upload.');
      return;
    }

    setIsUploading(true);

    try {
      console.log('[UploadResultScreen] examId=', examId);
      console.log('[UploadResultScreen] api base=', API_BASE_URL);
      console.log('[UploadResultScreen] file uri=', selectedFile.uri, 'name=', selectedFile.name, 'size=', selectedFile.size);
      // Read file as base64 using Expo FileSystem (works reliably on iOS/Android)
      const base64 = await FileSystem.readAsStringAsync(selectedFile.uri, { encoding: FileSystem.EncodingType.Base64 });
      console.log('[UploadResultScreen] base64 length=', (base64 || '').length);
      const result = await api.uploadAssignedExamResult(examId, { base64 });
      console.log('[UploadResultScreen] api response=', JSON.stringify(result || {}, null, 2));
      setIsUploading(false);
      if (result.success) {
        Alert.alert('Success', `${selectedFile.name} uploaded and processed.` , [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        console.log('[UploadResultScreen] api error=', result.error);
        Alert.alert('Upload failed', result.error || 'Please try again.');
      }
    } catch (err) {
      setIsUploading(false);
      const anyErr: any = err as any;
      const resp = anyErr?.response?.data;
      console.log('[UploadResultScreen] exception:', anyErr?.message || String(anyErr));
      if (resp) console.log('[UploadResultScreen] response data:', JSON.stringify(resp || {}, null, 2));
      Alert.alert('Error', resp?.message || anyErr?.message || 'Failed to upload and process the file.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Upload Exam Result</Text>
        <Text style={styles.subtitle}>
          Please select the PDF document for your exam results.
        </Text>

        <TouchableOpacity style={styles.pickerButton} onPress={pickDocument}>
          <Ionicons name="document-attach-outline" size={24} color={COLORS.primary} />
          <Text style={styles.pickerButtonText}>
            {selectedFile ? 'Change File' : 'Select PDF File'}
          </Text>
        </TouchableOpacity>

        {selectedFile && (
          <View style={styles.fileInfo}>
            <Ionicons name="document-text-outline" size={32} color={COLORS.text} />
            <View style={styles.fileTextContainer}>
              <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
              <Text style={styles.fileSize}>
                {((selectedFile.size || 0) / 1024).toFixed(2)} KB
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, (!selectedFile || isUploading) && styles.disabledButton]}
          onPress={handleUpload}
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? (
            <Text style={styles.submitButtonText}>Uploading...</Text>
          ) : (
            <Text style={styles.submitButtonText}>Submit for AI Processing</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl * 2,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  pickerButtonText: {
    fontSize: 18,
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.xl,
    width: '100%',
  },
  fileTextContainer: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    color: COLORS.text,
  },
  fileSize: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    width: '100%',
    alignItems: 'center',
    marginTop: SPACING.xl * 2,
  },
  submitButtonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: COLORS.disabled,
  },
}); 