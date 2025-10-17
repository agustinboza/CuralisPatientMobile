export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'PATIENT' | 'CLINICIAN' | 'ADMIN';
  weight?: number;
  height?: number;
  comorbidConditions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Patient extends User {
  role: 'PATIENT';
  weight: number;
  height: number;
  comorbidConditions: string[];
  consentStatus: ConsentStatus;
  consentSignedAt?: Date;
  emailVerified: boolean;
  // Aggregated counts from backend
  _aggr_count_assignedProcedures?: number;
  _aggr_count_assignedFollowUps?: number;
  _aggr_count_assignedExams?: number;
  // Alternative count structure from backend
  _count?: {
    assignedProcedures?: number;
    assignedFollowUps?: number;
    assignedExams?: number;
  };
}

export interface Doctor extends User {
  role: 'CLINICIAN';
  specialization?: string;
  licenseNumber?: string;
  patients: Patient[];
}

export interface ConsentStatus {
  digitalSignature: boolean;
  emailVerified: boolean;
  isComplete: boolean;
  // Backend actually sends these properties
  signed?: boolean;
  version?: string;
}

export interface Procedure {
  id: string;
  patientId: string;
  name: string;
  description: string;
  assignedBy: string; // doctor ID
  assignedAt: Date;
  status: 'active' | 'completed' | 'cancelled';
  exams: Exam[];
  prescriptionUrl?: string;
}

export interface Exam {
  id: string;
  procedureId: string;
  name: string;
  type: 'blood_test' | 'imaging' | 'other';
  status: 'pending' | 'completed' | 'uploaded';
  prescriptionUrl?: string;
  uploadedResults?: ExamResult[];
  results?: ExamResult[];
  dueDate?: Date;
  customNotes?: string;
  assignedDate?: Date;
  assignedBy?: {
    id: string;
    name: string;
  };
}

export interface ExamResult {
  id: string;
  examId: string;
  uploadedAt: Date;
  fileUrl: string;
  fileName: string;
  fileType: string;
  aiProcessed: boolean;
  extractedData?: ExtractedData;
}

export interface ExtractedData {
  id: string;
  examResultId: string;
  extractedAt: Date;
  values: Record<string, any>;
  confidence: number;
}

export interface FollowUp {
  id: string;
  patientId: string;
  date: Date;
  weight: number;
  wellnessScore: number; // 1-10
  dailyProteinIntake: number; // grams
  weeklyExerciseHours: number;
  notes?: string;
  completed?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'push' | 'email' | 'whatsapp';
  title: string;
  message: string;
  sentAt: Date;
  readAt?: Date;
  status: 'pending' | 'sent' | 'failed';
}

export type AppointmentStatus = 'scheduled' | 'checked_in' | 'completed' | 'cancelled';

export type AppointmentType = 'GENERAL';

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  checkInAt?: Date;
  appointmentType?: AppointmentType;
  checkInData?: any;
  // Optionally included relations
  patient?: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'email'>;
  doctor?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
}

export interface AvailabilitySlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthState {
  user: Patient | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AppState {
  auth: AuthState;
  procedures: Procedure[];
  followUps: FollowUp[];
  notifications: Notification[];
  isLoading: boolean;
} 