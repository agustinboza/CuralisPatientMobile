// API Configuration
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
export const API_TIMEOUT = 30000;

// AWS Configuration
export const AWS_REGION = process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1';
export const S3_BUCKET = process.env.EXPO_PUBLIC_S3_BUCKET || 'follownest-exams';

// Colors
export const COLORS = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  secondary: '#10B981',
  accent: '#F59E0B',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  border: '#E5E7EB',
  disabled: '#D1D5DB',
};

// Typography
export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  light: 'System',
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border Radius
export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Screen Names
export const SCREENS = {
  AUTH: {
    QR_SCAN: 'QRScan',
    SIGNUP: 'Signup',
    LOGIN: 'Login',
  },
  CONSENT: {
    DIGITAL_SIGNATURE: 'DigitalSignature',
    EMAIL_VERIFICATION: 'EmailVerification',
  },
  MAIN: {
    HOME: 'Home',
    PROCEDURES: 'Procedures',
    FOLLOW_UPS: 'FollowUps',
    PROFILE: 'Profile',
  },
  PROCEDURES: {
    DETAIL: 'ProcedureDetail',
    EXAM_DETAIL: 'ExamDetail',
    UPLOAD_RESULT: 'UploadResult',
  },
  FOLLOW_UPS: {
    FORM: 'FollowUpForm',
  },
};

// File Upload
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  COMPRESSION_QUALITY: 0.8,
};

// Notifications
export const NOTIFICATION_TYPES = {
  FOLLOW_UP_REMINDER: 'follow_up_reminder',
  EXAM_DUE: 'exam_due',
  CONSENT_REQUIRED: 'consent_required',
  PROCEDURE_ASSIGNED: 'procedure_assigned',
};

// Validation
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  WEIGHT_MIN: 20, // kg
  WEIGHT_MAX: 300, // kg
  HEIGHT_MIN: 100, // cm
  HEIGHT_MAX: 250, // cm
  WELLNESS_SCORE_MIN: 1,
  WELLNESS_SCORE_MAX: 10,
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  CONSENT_STATUS: 'consent_status',
  PUSH_TOKEN: 'push_token',
  ONBOARDING_COMPLETE: 'onboarding_complete',
}; 