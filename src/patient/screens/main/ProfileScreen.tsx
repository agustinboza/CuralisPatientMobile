import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { COLORS } from '../../../shared/constants';
import { Patient } from '../../../shared/types';
import apiService from '../../../shared/api';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { generateConsentDocumentFromSignature, shareConsentDocument } from '../../../shared/utils/pdfGenerator';

interface ProfileSectionProps {
  title: string;
  children: React.ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface MenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ title, children, icon }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      {icon && <Ionicons name={icon} size={20} color={COLORS.primary} style={styles.sectionIcon} />}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

interface InfoRowProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, unit, icon }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLabelContainer}>
      {icon && <Ionicons name={icon} size={16} color={COLORS.textSecondary} style={styles.infoIcon} />}
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={styles.infoValue}>
      {value}{unit && ` ${unit}`}
    </Text>
  </View>
);

const StatusBadge: React.FC<{ status: string; type: 'success' | 'warning' | 'info' }> = ({ status, type }) => {
  const getStatusColor = () => {
    switch (type) {
      case 'success': return COLORS.success;
      case 'warning': return COLORS.warning;
      case 'info': return COLORS.primary;
      default: return COLORS.textSecondary;
    }
  };

  return (
    <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20', borderColor: getStatusColor() }]}>
      <Text style={[styles.statusText, { color: getStatusColor() }]}>{status}</Text>
    </View>
  );
};

export const ProfileScreen: React.FC = () => {
  const [profile, setProfile] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const navigation = useNavigation();
  const { logout } = useAuth();

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProfile();
      if (response.success && response.data) {
        setProfile(response.data);
      } else {
        Alert.alert('Error', response.error || 'Failed to load profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Navigation will be handled automatically by AppNavigator
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const handleDownloadConsentDocument = async () => {
    if (!profile) {
      Alert.alert('Error', 'Profile data not available');
      return;
    }

    try {
      // Get user's signatures from backend
      const signaturesResponse = await apiService.getUserSignatures();
      
      if (!signaturesResponse.success || !signaturesResponse.data || signaturesResponse.data.length === 0) {
        Alert.alert('No Signature Found', 'No digital signature found. Please sign the consent first.');
        return;
      }

      // Get the most recent signature
      const latestSignature = signaturesResponse.data[0];
      
      // Debug: Log the signature data structure
      console.log('Signature data from backend:', JSON.stringify(latestSignature, null, 2));
      
      // Prepare patient info
      const patientInfo = {
        name: `${profile.firstName} ${profile.lastName}`,
        dateOfBirth: profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A',
        patientId: profile.id,
      };

      // Generate consent document
      const filePath = await generateConsentDocumentFromSignature(latestSignature, patientInfo);
      
      // Share the document
      await shareConsentDocument(filePath);
      
    } catch (error) {
      console.error('Error downloading consent document:', error);
      Alert.alert('Error', 'Failed to download consent document. Please try again.');
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: '1',
      title: 'Edit Profile',
      icon: 'person',
      onPress: () => Alert.alert('Edit Profile', 'Edit profile functionality would go here'),
    },
    {
      id: '2',
      title: 'Notifications',
      icon: 'notifications',
      onPress: () => Alert.alert('Notifications', 'Notification settings would go here'),
      showSwitch: true,
      switchValue: notificationsEnabled,
      onSwitchChange: setNotificationsEnabled,
    },
    {
      id: '3',
      title: 'Dark Mode',
      icon: 'moon',
      onPress: () => Alert.alert('Dark Mode', 'Dark mode settings would go here'),
      showSwitch: true,
      switchValue: darkModeEnabled,
      onSwitchChange: setDarkModeEnabled,
    },
    {
      id: '4',
      title: 'Privacy & Security',
      icon: 'shield-checkmark',
      onPress: () => Alert.alert('Privacy & Security', 'Privacy settings would go here'),
    },
    {
      id: '5',
      title: 'Help & Support',
      icon: 'help-circle',
      onPress: () => Alert.alert('Help & Support', 'Help and support would go here'),
    },
    {
      id: '6',
      title: 'About',
      icon: 'information-circle',
      onPress: () => Alert.alert('About', 'About information would go here'),
    },
    {
      id: '7',
      title: 'Logout',
      icon: 'log-out',
      onPress: handleLogout,
    },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.onPress}>
      <View style={styles.menuItemLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon} size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.menuItemTitle}>{item.title}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {item.showSwitch ? (
          <Switch
            value={item.switchValue}
            onValueChange={item.onSwitchChange}
            trackColor={{ false: COLORS.border, true: COLORS.primary + '40' }}
            thumbColor={item.switchValue ? COLORS.primary : COLORS.textSecondary}
          />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );

  useEffect(() => {
    loadProfile();
  }, []);

  // Refresh profile when screen comes into focus (e.g., after signing consent)
  useFocusEffect(
    React.useCallback(() => {
      if (profile) {
        loadProfile();
      }
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
      }
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={COLORS.primary} />
          </View>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.patientName}>
            {profile.firstName ? `${profile.firstName} ${profile.lastName}` : 'Patient'}
          </Text>
          <Text style={styles.patientEmail}>{profile.email}</Text>
          <Text style={styles.patientId}>Patient ID: {profile.id}</Text>
          {profile.createdAt && (
            <Text style={styles.memberSince}>Member since {new Date(profile.createdAt).toLocaleDateString()}</Text>
          )}
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>3</Text>
          <Text style={styles.statLabel}>Active Procedures</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>2</Text>
          <Text style={styles.statLabel}>Upcoming Appointments</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>1</Text>
          <Text style={styles.statLabel}>Pending Follow-ups</Text>
        </View>
      </View>

      {/* Consent Status */}
      <View style={styles.consentSection}>
        <View style={styles.consentHeader}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} style={styles.sectionIcon} />
          <Text style={styles.sectionTitle}>Consent & Verification</Text>
        </View>
        <View style={styles.consentContent}>
          <View style={styles.consentRow}>
            <View style={styles.consentItem}>
              <Ionicons 
                name={profile.consentStatus?.digitalSignature ? "checkmark-circle" : "close-circle"} 
                size={24} 
                color={profile.consentStatus?.digitalSignature ? COLORS.success : COLORS.error} 
              />
              <Text style={styles.consentLabel}>Digital Signature</Text>
            </View>
            <View style={styles.consentItem}>
              <Ionicons 
                name={profile.consentStatus?.emailVerified ? "checkmark-circle" : "close-circle"} 
                size={24} 
                color={profile.consentStatus?.emailVerified ? COLORS.success : COLORS.error} 
              />
              <Text style={styles.consentLabel}>Email Verified</Text>
            </View>
          </View>
          
          <View style={styles.consentButtonsContainer}>
            <TouchableOpacity 
              style={[
                styles.signConsentButton,
                profile.consentStatus?.digitalSignature && styles.resignConsentButton
              ]}
              onPress={() => navigation.navigate('DigitalSignature' as never)}
            >
              <Ionicons 
                name={profile.consentStatus?.digitalSignature ? "refresh" : "create-outline"} 
                size={20} 
                color={COLORS.surface} 
              />
              <Text style={styles.signConsentButtonText}>
                {profile.consentStatus?.digitalSignature ? 'Re-sign' : 'Sign Consent'}
              </Text>
            </TouchableOpacity>
            
            {profile.consentStatus?.digitalSignature && (
              <TouchableOpacity 
                style={styles.downloadConsentButton}
                onPress={handleDownloadConsentDocument}
              >
                <Ionicons 
                  name="download-outline" 
                  size={20} 
                  color={COLORS.surface} 
                />
                <Text style={styles.downloadConsentButtonText}>
                  Download
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          {profile.consentStatus?.isComplete && (
            <View style={styles.consentComplete}>
              <StatusBadge status="Consent Complete" type="success" />
              {profile.consentSignedAt && (
                <Text style={styles.consentDate}>
                  Signed on {new Date(profile.consentSignedAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {menuItems.map(renderMenuItem)}
      </View>

      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>FollowNest v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  profileHeader: {
    backgroundColor: COLORS.surface,
    padding: 20,
    paddingTop: 70,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
  },
  patientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  patientEmail: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  patientId: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  menuSection: {
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemTitle: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  menuItemRight: {
    marginLeft: 12,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  consentSection: {
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  consentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  consentContent: {
    padding: 20,
  },
  consentRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  consentItem: {
    alignItems: 'center',
    flex: 1,
  },
  consentLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  signConsentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  resignConsentButton: {
    backgroundColor: COLORS.warning,
  },
  signConsentButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  consentComplete: {
    alignItems: 'center',
  },
  consentDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  consentButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  downloadConsentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  downloadConsentButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginTop: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionContent: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  headerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  headerActionButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
    marginLeft: 8,
  },
  logoutButton: {
    marginLeft: 16,
  },
  bottomSpacing: {
    height: 32,
  },
}); 