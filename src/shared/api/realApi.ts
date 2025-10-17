import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS } from '../constants';
import { 
  Appointment, 
  AvailabilitySlot, 
  Doctor, 
  FollowUp, 
  Patient, 
  User, 
  AppointmentType,
  ApiResponse,
  Procedure,
  Exam,
  ExamResult,
  Notification
} from '../types';

let _logoutHandler: () => void = () => {};

export const setLogoutHandler = (logoutHandler: () => void) => {
  _logoutHandler = logoutHandler;
};

// Utility function to format dates as local time ISO strings without timezone conversion
const formatLocalISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

// Parse an ISO string as local time (avoid timezone shift when backend sends UTC)
const parseAsLocal = (value: string | Date | undefined): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  // Remove trailing Z to treat as local time
  const localish = value.endsWith('Z') ? value.slice(0, -1) : value;
  return new Date(localish);
};

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // Assuming API_TIMEOUT is removed, using a default timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (token) {
          (config.headers as any).Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          // Token expired or invalid
          _logoutHandler();
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<{ user: Patient | Doctor; token: string }>> {
    const response = await this.api.post('/auth/login', { email, password });
    // Transform the response to match expected format and fix date types
    const user = response.data.data.user;
    if (user.createdAt) user.createdAt = new Date(user.createdAt);
    if (user.updatedAt) user.updatedAt = new Date(user.updatedAt);
    
    return {
      ...response.data,
      data: {
        user: user,
        token: response.data.data.accessToken
      }
    };
  }

  async signup(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    weight: number;
    height: number;
    comorbidConditions: string[];
  }): Promise<ApiResponse<{ user: Patient; token: string }>> {
    const response = await this.api.post('/auth/register', userData);
    // Transform the response to match expected format and fix date types
    const user = response.data.data.user;
    if (user.createdAt) user.createdAt = new Date(user.createdAt);
    if (user.updatedAt) user.updatedAt = new Date(user.updatedAt);
    
    return {
      ...response.data,
      data: {
        user: user,
        token: response.data.data.accessToken
      }
    };
  }

  async verifyEmail(token: string): Promise<ApiResponse<{ verified: boolean }>> {
    const response = await this.api.post('/auth/verify-email', { token });
    return response.data;
  }

  async logout(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_DATA,
    ]);
  }

  // QR Code
  async getQRData(qrCode: string): Promise<ApiResponse<{ doctorId: string; clinicId: string }>> {
    const response = await this.api.get(`/qr/${qrCode}`);
    return response.data;
  }

  // Consent
  async submitDigitalSignature(signatureData: string): Promise<ApiResponse<{ success: boolean }>> {
    // signatureData arrives as a JSON string from the DigitalSignature component
    // Expecting shape: { paths: string[]; timestamp: string; dimensions: { width: number; height: number } }
    const parsed = JSON.parse(signatureData);
    const payload = {
      svgPaths: {
        paths: parsed.paths,
        timestamp: parsed.timestamp,
      },
      dimensions: parsed.dimensions,
    };

    const response = await this.api.post('/signatures', payload);
    return response.data;
  }

  async updateConsentStatus(consentData: { consentStatus: any }): Promise<ApiResponse<any>> {
    // Send consentStatus as object (backend DTO expects object, not string)
    const response = await this.api.patch('/users/profile/consent', consentData);
    return response.data;
  }

  async getUserSignatures(): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/signatures');
    return response.data;
  }

  async assignCustomExam(assignData: {
    patientId: string;
    examTemplateId: string;
    assignedProcedureId?: string;
    dueDate?: string;
    customNotes?: string;
  }): Promise<ApiResponse<any>> {
    const response = await this.api.post('/exams/assign', assignData);
    return response.data;
  }

  async getPatients(): Promise<ApiResponse<Patient[]>> {
    const response = await this.api.get('/users/patients');
    return response.data;
  }

  async getClinicians(): Promise<ApiResponse<Doctor[]>> {
    const response = await this.api.get('/users/clinicians');
    return response.data;
  }

  async getConsentStatus(): Promise<ApiResponse<{ consentStatus: any }>> {
    // This endpoint doesn't exist yet, return mock data
    return {
      success: true,
      data: { consentStatus: { digitalSignature: false, emailVerified: false, isComplete: false } }
    };
  }

  // Procedures
  async getProcedures(): Promise<ApiResponse<Procedure[]>> {
    const response = await this.api.get('/procedures/templates');
    return response.data;
  }

  async createProcedureTemplate(templateData: {
    name: string;
    description: string;
    category: string;
    isActive?: boolean;
  }): Promise<ApiResponse<any>> {
    const response = await this.api.post('/procedures/templates', templateData);
    return response.data;
  }

  async updateProcedureTemplate(id: string, templateData: {
    name?: string;
    description?: string;
    category?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<any>> {
    const response = await this.api.patch(`/procedures/templates/${id}`, templateData);
    return response.data;
  }

  async deleteProcedureTemplate(id: string): Promise<ApiResponse<any>> {
    const response = await this.api.delete(`/procedures/templates/${id}`);
    return response.data;
  }

  // Exam Template Management
  async getExamTemplatesForProcedure(procedureTemplateId: string): Promise<ApiResponse<any[]>> {
    const response = await this.api.get(`/exams/templates?procedureTemplateId=${procedureTemplateId}`);
    return response.data;
  }

  async createStandaloneExamTemplate(examData: {
    name: string;
    type: string;
    description?: string;
    defaultDueDays?: number;
  }): Promise<ApiResponse<any>> {
    const response = await this.api.post('/exams/templates', examData);
    return response.data;
  }

  async createExamTemplate(procedureTemplateId: string, examData: {
    name: string;
    type: string;
    description?: string;
    defaultDueDays?: number;
  }): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/exams/templates/${procedureTemplateId}`, examData);
    return response.data;
  }

  async linkExamTemplateToProcedure(examTemplateId: string, procedureTemplateId: string): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/exams/templates/${examTemplateId}/link/${procedureTemplateId}`);
    return response.data;
  }

  async unlinkExamTemplateFromProcedure(examTemplateId: string, procedureTemplateId: string): Promise<ApiResponse<any>> {
    const response = await this.api.delete(`/exams/templates/${examTemplateId}/unlink/${procedureTemplateId}`);
    return response.data;
  }

  async updateExamTemplate(id: string, examData: {
    name?: string;
    type?: string;
    description?: string;
    defaultDueDays?: number;
  }): Promise<ApiResponse<any>> {
    const response = await this.api.patch(`/exams/templates/${id}`, examData);
    return response.data;
  }

  async deleteExamTemplate(id: string): Promise<ApiResponse<any>> {
    const response = await this.api.delete(`/exams/templates/${id}`);
    return response.data;
  }

  async assignProcedure(patientId: string, procedureTemplateId: string, customNotes?: string): Promise<ApiResponse<Procedure>> {
    const response = await this.api.post('/procedures/assign', {
      patientId,
      procedureTemplateId,
      customNotes
    });
    return response.data;
  }

  async getMyProcedures(): Promise<ApiResponse<Procedure[]>> {
    const response = await this.api.get('/procedures/my-procedures');
    
    // Transform the backend response to match the mobile app's expected structure
    const backendData = response.data.data;
    const transformedProcedures: Procedure[] = backendData.map((backendProcedure: any) => ({
      id: backendProcedure.id,
      patientId: backendProcedure.patientId,
      name: backendProcedure.procedureTemplate.name,
      description: backendProcedure.procedureTemplate.description,
      assignedBy: backendProcedure.assignedBy.id,
      assignedAt: new Date(backendProcedure.assignedAt),
      status: backendProcedure.status.toLowerCase() as 'active' | 'completed' | 'cancelled',
      exams: backendProcedure.assignedExams.map((exam: any) => ({
        id: exam.id,
        procedureId: backendProcedure.id,
        name: exam.examTemplate?.name || 'Unknown Exam',
        type: exam.examTemplate?.type?.toLowerCase() as 'blood_test' | 'imaging' | 'other',
        status: exam.status?.toLowerCase() as 'pending' | 'completed' | 'uploaded',
        prescriptionUrl: exam.prescriptionUrl,
        uploadedResults: exam.results?.map((result: any) => ({
          id: result.id,
          examId: exam.id,
          uploadedAt: new Date(result.uploadedAt),
          fileUrl: result.fileUrl,
          fileName: result.fileName,
          fileType: result.fileType,
          aiProcessed: result.aiProcessed,
          extractedData: result.extractedData
        })) || [],
        dueDate: exam.dueDate ? new Date(exam.dueDate) : undefined
      })),
      prescriptionUrl: backendProcedure.prescriptionUrl
    }));
    
    return {
      ...response.data,
      data: transformedProcedures
    };
  }

  async getAssignedProceduresForPatient(patientId: string): Promise<ApiResponse<Procedure[]>> {
    const response = await this.api.get('/procedures/assigned');

    const backendData = response.data.data || [];
    const transformedProcedures: Procedure[] = backendData.map((backendProcedure: any) => {
      const exams: any[] = backendProcedure.assignedExams || [];
      return {
        id: backendProcedure.id,
        patientId: backendProcedure.patientId,
        name: backendProcedure.procedureTemplate?.name || 'Procedure',
        description: backendProcedure.procedureTemplate?.description || '',
        assignedBy: backendProcedure.assignedBy?.id || backendProcedure.assignedById || '',
        assignedAt: new Date(backendProcedure.assignedAt),
        status: (backendProcedure.status || 'active').toLowerCase() as 'active' | 'completed' | 'cancelled',
        exams: exams.map((exam: any) => ({
          id: exam.id,
          procedureId: backendProcedure.id,
          name: exam.examTemplate?.name || 'Unknown Exam',
          type: (exam.examTemplate?.type?.toLowerCase?.() as 'blood_test' | 'imaging' | 'other') || 'other',
          status: (exam.status?.toLowerCase?.() as 'pending' | 'completed' | 'uploaded') || 'pending',
          prescriptionUrl: exam.prescriptionUrl,
          uploadedResults: (exam.results || []).map((result: any) => ({
            id: result.id,
            examId: exam.id,
            uploadedAt: new Date(result.uploadedAt),
            fileUrl: result.fileUrl,
            fileName: result.fileName,
            fileType: result.fileType,
            aiProcessed: result.aiProcessed,
            extractedData: result.extractedData,
          })),
          dueDate: exam.dueDate ? new Date(exam.dueDate) : undefined,
        })),
        prescriptionUrl: backendProcedure.prescriptionUrl,
      } as Procedure;
    });

    const filtered = transformedProcedures.filter(p => p.patientId === patientId);
    return { ...response.data, data: filtered };
  }

  async getProcedure(id: string): Promise<ApiResponse<Procedure>> {
    const response = await this.api.get(`/procedures/my-procedures/${id}`);
    
    // Transform the backend response to match the mobile app's expected structure
    const backendData = response.data.data;
    
    const transformedProcedure: Procedure = {
      id: backendData.id,
      patientId: backendData.patientId,
      name: backendData.procedureTemplate.name,
      description: backendData.procedureTemplate.description,
      assignedBy: backendData.assignedBy.id,
      assignedAt: new Date(backendData.assignedAt),
      status: backendData.status.toLowerCase() as 'active' | 'completed' | 'cancelled',
      exams: backendData.assignedExams.map((exam: any) => ({
        id: exam.id,
        procedureId: backendData.id,
        name: exam.examTemplate?.name || 'Unknown Exam',
        type: exam.examTemplate?.type?.toLowerCase() as 'blood_test' | 'imaging' | 'other',
        status: exam.status?.toLowerCase() as 'pending' | 'completed' | 'uploaded',
        prescriptionUrl: exam.prescriptionUrl,
        uploadedResults: exam.results?.map((result: any) => ({
          id: result.id,
          examId: exam.id,
          uploadedAt: new Date(result.uploadedAt),
          fileUrl: result.fileUrl,
          fileName: result.fileName,
          fileType: result.fileType,
          aiProcessed: result.aiProcessed,
          extractedData: result.extractedData
        })) || [],
        dueDate: exam.dueDate ? new Date(exam.dueDate) : undefined
      })),
      prescriptionUrl: backendData.prescriptionUrl
    };
    
    return {
      ...response.data,
      data: transformedProcedure
    };
  }

  async getDoctorProcedure(id: string): Promise<ApiResponse<Procedure>> {
    const response = await this.api.get(`/procedures/assigned/${id}`);
    
    // Transform the backend response to match the mobile app's expected structure
    const backendData = response.data.data;
    
    const transformedProcedure: Procedure = {
      id: backendData.id,
      patientId: backendData.patientId,
      name: backendData.procedureTemplate.name,
      description: backendData.procedureTemplate.description,
      assignedBy: backendData.assignedBy.id,
      assignedAt: new Date(backendData.assignedAt),
      status: backendData.status.toLowerCase() as 'active' | 'completed' | 'cancelled',
      exams: backendData.assignedExams.map((exam: any) => ({
        id: exam.id,
        procedureId: backendData.id,
        name: exam.examTemplate?.name || 'Unknown Exam',
        type: exam.examTemplate?.type?.toLowerCase() as 'blood_test' | 'imaging' | 'other',
        status: exam.status?.toLowerCase() as 'pending' | 'completed' | 'uploaded',
        prescriptionUrl: exam.prescriptionUrl,
        uploadedResults: exam.results?.map((result: any) => ({
          id: result.id,
          examId: exam.id,
          uploadedAt: new Date(result.uploadedAt),
          fileUrl: result.fileUrl,
          fileName: result.fileName,
          fileType: result.fileType,
          aiProcessed: result.aiProcessed,
          extractedData: result.extractedData
        })) || [],
        dueDate: exam.dueDate ? new Date(exam.dueDate) : undefined,
        customNotes: exam.customNotes,
        assignedDate: new Date(exam.createdAt),
        assignedBy: exam.assignedBy ? {
          id: exam.assignedBy.id,
          name: `${exam.assignedBy.firstName} ${exam.assignedBy.lastName}`
        } : undefined
      })),
      prescriptionUrl: backendData.prescriptionUrl
    };
    
    return {
      ...response.data,
      data: transformedProcedure
    };
  }

  async getExam(id: string): Promise<ApiResponse<Exam>> {
    const response = await this.api.get(`/exams/assigned/${id}`);
    const backendData = response.data.data;

    const transformedExam: Exam = {
      id: backendData.id,
      procedureId: backendData.assignedProcedureId || backendData.procedureId || '',
      name: backendData.examTemplate?.name || 'Unknown Exam',
      type: (backendData.examTemplate?.type?.toLowerCase?.() as 'blood_test' | 'imaging' | 'other') || 'other',
      status: (backendData.status?.toLowerCase?.() as 'pending' | 'completed' | 'uploaded') || 'pending',
      prescriptionUrl: backendData.prescriptionUrl,
      uploadedResults: (backendData.results || []).map((result: any) => ({
        id: result.id,
        examId: backendData.id,
        uploadedAt: new Date(result.uploadedAt),
        fileUrl: result.fileUrl,
        fileName: result.fileName,
        fileType: result.fileType,
        aiProcessed: result.aiProcessed,
        extractedData: result.extractedData,
      })),
      dueDate: backendData.dueDate ? new Date(backendData.dueDate) : undefined,
    };

    return {
      ...response.data,
      data: transformedExam,
    };
  }

  async getExamTemplates(): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/exams/templates');
    return response.data;
  }

  async updateExamStatus(examId: string, status: 'pending' | 'completed'): Promise<ApiResponse<Exam>> {
    try {
      // Map frontend status to backend ExamStatus enum
      const backendStatus = status === 'completed' ? 'COMPLETED' : 'PENDING';
      
      const response = await this.api.patch(`/exams/assigned/${examId}`, {
        status: backendStatus
      });
      
      if (response.data.success && response.data.data) {
        const backendData = response.data.data;
        
        // Transform backend data to frontend Exam format
        const transformedExam: Exam = {
          id: backendData.id,
          procedureId: backendData.assignedProcedureId || backendData.procedureId || '',
          name: backendData.examTemplate?.name || 'Unknown Exam',
          type: (backendData.examTemplate?.type?.toLowerCase?.() as 'blood_test' | 'imaging' | 'other') || 'other',
          status: (backendData.status?.toLowerCase?.() as 'pending' | 'completed' | 'uploaded') || 'pending',
          prescriptionUrl: backendData.prescriptionUrl,
          dueDate: backendData.dueDate,
          customNotes: backendData.customNotes,
          results: backendData.results || [],
          assignedDate: backendData.createdAt,
          assignedBy: backendData.assignedBy ? {
            id: backendData.assignedBy.id,
            name: `${backendData.assignedBy.firstName} ${backendData.assignedBy.lastName}`
          } : undefined
        };
        
        return {
          success: true,
          data: transformedExam
        };
      }
      
      return {
        success: false,
        error: 'Failed to update exam status'
      };
    } catch (error) {
      console.error('Error updating exam status:', error);
      return {
        success: false,
        error: 'Failed to update exam status'
      };
    }
  }

  async downloadPrescription(examId: string): Promise<ApiResponse<{ downloadUrl: string }>> {
    // This endpoint doesn't exist yet, return mock data
    return {
      success: true,
      data: { downloadUrl: 'https://example.com/prescription.pdf' }
    };
  }

  // Exam Results
  async uploadAssignedExamResult(examId: string, payload: { base64?: string; resultUrl?: string }): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/exams/assigned/${examId}/results`, payload);
    return response.data;
  }

  async getExamResults(examId: string): Promise<ApiResponse<ExamResult[]>> {
    // This endpoint doesn't exist yet, return mock data
    return {
      success: true,
      data: []
    };
  }

  // Follow-ups
  async submitFollowUp(followUpData: {
    weight: number;
    wellnessScore: number;
    dailyProteinIntake: number;
    weeklyExerciseHours: number;
    notes?: string;
  }): Promise<ApiResponse<FollowUp>> {
    // This endpoint doesn't exist yet, return mock data
    return {
      success: true,
      data: {
        id: 'mock-followup-id',
        patientId: 'mock-patient-id',
        date: new Date(),
        ...followUpData
      } as FollowUp
    };
  }

  async submitAssignedFollowUp(followUpId: string, followUpData: {
    weight: number;
    wellnessScore: number;
    dailyProteinIntake: number;
    weeklyExerciseHours: number;
    notes?: string;
  }): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/follow-ups/assigned/${followUpId}/submit-form`, followUpData);
    return response.data;
  }

  async getFollowUpHistory(): Promise<ApiResponse<FollowUp[]>> {
    const response = await this.api.get('/follow-ups/my-follow-ups');
    
    // Transform the backend response to match the mobile app's expected structure
    const backendData = response.data.data;
    const transformedFollowUps: FollowUp[] = backendData.map((backendFollowUp: any) => ({
      id: backendFollowUp.id,
      patientId: backendFollowUp.patientId,
      date: new Date(backendFollowUp.dueDate),
      weight: backendFollowUp.weight || 0,
      wellnessScore: backendFollowUp.wellnessScore || 0,
      dailyProteinIntake: backendFollowUp.dailyProteinIntake || 0,
      weeklyExerciseHours: backendFollowUp.weeklyExerciseHours || 0,
      notes: backendFollowUp.notes,
      completed: backendFollowUp.completed || false
    }));
    
    return {
      ...response.data,
      data: transformedFollowUps
    };
  }

  async getFollowUpTemplates(): Promise<ApiResponse<FollowUp[]>> {
    const response = await this.api.get('/follow-ups/templates');
    return response.data;
  }

  async getFollowUpTrends(): Promise<ApiResponse<{
    weight: { date: string; value: number }[];
    wellnessScore: { date: string; value: number }[];
    proteinIntake: { date: string; value: number }[];
    exerciseHours: { date: string; value: number }[];
  }>> {
    // This endpoint doesn't exist yet, return mock data
    return {
      success: true,
      data: {
        weight: [],
        wellnessScore: [],
        proteinIntake: [],
        exerciseHours: []
      }
    };
  }

  // Notifications
  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    // This endpoint doesn't exist yet, return mock data
    return {
      success: true,
      data: []
    };
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<{ success: boolean }>> {
    // This endpoint doesn't exist yet, return mock data
    return {
      success: true,
      data: { success: true }
    };
  }

  async registerPushToken(token: string): Promise<ApiResponse<{ success: boolean }>> {
    // This endpoint doesn't exist yet, return mock data
    return {
      success: true,
      data: { success: true }
    };
  }

  // Profile
  async updateProfile(profileData: Partial<Patient>): Promise<ApiResponse<Patient>> {
    const response = await this.api.put('/users/profile', profileData);
    return response.data;
  }

  // Appointments
  async getDoctorAvailability(doctorId: string, date: string, slotMinutes: number = 30): Promise<ApiResponse<AvailabilitySlot[]>> {
    const response = await this.api.get(`/appointments/doctors/${doctorId}/availability`, { params: { date, slotMinutes } });
    const slots = (response.data.data || []).map((s: any) => ({
      startTime: new Date(s.startTime),
      endTime: new Date(s.endTime),
      available: !!s.available,
    })) as AvailabilitySlot[];
    return { ...response.data, data: slots };
  }

  async bookAppointment(doctorId: string, startTime: Date, durationMinutes: number = 30, appointmentType: AppointmentType = 'GENERAL'): Promise<ApiResponse<Appointment>> {
    const response = await this.api.post('/appointments/book', {
      doctorId,
      startTime: formatLocalISO(startTime),
      durationMinutes,
      appointmentType,
    });
    const a = response.data.data;
    const transformed: Appointment = {
      id: a.id,
      patientId: a.patientId,
      doctorId: a.doctorId,
      startTime: parseAsLocal(a.startTime)!,
      endTime: parseAsLocal(a.endTime)!,
      status: (a.status || 'SCHEDULED').toLowerCase() as Appointment['status'],
      checkInAt: a.checkInAt ? parseAsLocal(a.checkInAt) : undefined,
      appointmentType: (a.appointmentType as AppointmentType) || 'GENERAL',
    };
    return { ...response.data, data: transformed };
  }

  async checkInAppointment(appointmentId: string): Promise<ApiResponse<Appointment>> {
    const response = await this.api.post(`/appointments/${appointmentId}/check-in`, {});
    const a = response.data.data;
    const transformed: Appointment = {
      id: a.id,
      patientId: a.patientId,
      doctorId: a.doctorId,
      startTime: new Date(a.startTime),
      endTime: new Date(a.endTime),
      status: (a.status || 'CHECKED_IN').toLowerCase() as Appointment['status'],
      checkInAt: a.checkInAt ? new Date(a.checkInAt) : undefined,
    };
    return { ...response.data, data: transformed };
  }

  async getMyAppointments(): Promise<ApiResponse<Appointment[]>> {
    const response = await this.api.get('/appointments/me');
    const items: Appointment[] = (response.data.data || []).map((a: any) => ({
      id: a.id,
      patientId: a.patientId,
      doctorId: a.doctorId,
      startTime: parseAsLocal(a.startTime)!,
      endTime: parseAsLocal(a.endTime)!,
      status: (a.status || 'SCHEDULED').toLowerCase() as Appointment['status'],
      checkInAt: a.checkInAt ? parseAsLocal(a.checkInAt) : undefined,
      doctor: a.doctor ? { id: a.doctor.id, firstName: a.doctor.firstName, lastName: a.doctor.lastName, email: a.doctor.email } as any : undefined,
    }));
    return { ...response.data, data: items };
  }

  async getDoctorAppointments(): Promise<ApiResponse<Appointment[]>> {
    const response = await this.api.get('/appointments/my');
    const items: Appointment[] = (response.data.data || []).map((a: any) => ({
      id: a.id,
      patientId: a.patientId,
      doctorId: a.doctorId,
      startTime: parseAsLocal(a.startTime)!,
      endTime: parseAsLocal(a.endTime)!,
      status: (a.status || 'SCHEDULED').toLowerCase() as Appointment['status'],
      checkInAt: a.checkInAt ? parseAsLocal(a.checkInAt) : undefined,
      appointmentType: a.appointmentType,
      checkInData: a.checkInData,
      patient: a.patient ? { id: a.patient.id, firstName: a.patient.firstName, lastName: a.patient.lastName, email: a.patient.email } as any : undefined,
    }));
    return { ...response.data, data: items };
  }

  async getAppointmentById(id: string): Promise<ApiResponse<Appointment>> {
    const response = await this.api.get(`/appointments/${id}`);
    const a = response.data.data;
    const item: Appointment = {
      id: a.id,
      patientId: a.patientId,
      doctorId: a.doctorId,
      startTime: parseAsLocal(a.startTime)!,
      endTime: parseAsLocal(a.endTime)!,
      status: (a.status || 'SCHEDULED').toLowerCase() as Appointment['status'],
      checkInAt: a.checkInAt ? parseAsLocal(a.checkInAt) : undefined,
      appointmentType: a.appointmentType,
      checkInData: a.checkInData,
      patient: a.patient ? { id: a.patient.id, firstName: a.patient.firstName, lastName: a.patient.lastName, email: a.patient.email } as any : undefined,
      assignedExams: a.assignedExams || [],
    } as any;
    return { ...response.data, data: item };
  }

  async getAppointmentRequiredExams(appointmentId: string): Promise<ApiResponse<any[]>> {
    const response = await this.api.get(`/appointments/${appointmentId}/required-exams`);
    return response.data;
  }

  async processAssignedExam(assignedExamId: string, payload: { text?: string; examResultId?: string }): Promise<ApiResponse<{ values: Record<string, any> }>> {
    const response = await this.api.post(`/exams/assigned/${assignedExamId}/process`, payload);
    return response.data;
  }

  async uploadExamResultSimple(assignedExamId: string, fileUrl: string): Promise<ApiResponse<any>> {
    // Simple variant: backend expects a URL (e.g., after presigned upload)
    const response = await this.api.post(`/exams/assigned/${assignedExamId}/results`, { resultUrl: fileUrl });
    return response.data;
  }

  async getWorkingHours(doctorId?: string): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/appointments/working-hours', { params: { doctorId } });
    return response.data;
  }

  async getBlockedTimes(doctorId?: string): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/appointments/blocked', { params: { doctorId } });
    return response.data;
  }

  async setWorkingHours(hours: { dayOfWeek: string; startMinutes: number; endMinutes: number }[], doctorId?: string): Promise<ApiResponse<any[]>> {
    const response = await this.api.post('/appointments/working-hours', { hours, doctorId });
    return response.data;
  }

  async createBlockedTime(startTime: Date, endTime: Date, reason?: string, doctorId?: string): Promise<ApiResponse<any>> {
    const response = await this.api.post('/appointments/blocked', { 
      startTime: formatLocalISO(startTime), 
      endTime: formatLocalISO(endTime), 
      reason, 
      doctorId 
    });
    return response.data;
  }

  async deleteBlockedTime(blockedTimeId: string): Promise<ApiResponse<any>> {
    const response = await this.api.delete(`/appointments/blocked/${blockedTimeId}`);
    return response.data;
  }

  async getProfile(): Promise<ApiResponse<Patient>> {
    const response = await this.api.get('/users/profile');
    // Convert date strings to Date objects
    const user = response.data.data;
    if (user.createdAt) user.createdAt = new Date(user.createdAt);
    if (user.updatedAt) user.updatedAt = new Date(user.updatedAt);
    if (user.consentSignedAt) user.consentSignedAt = new Date(user.consentSignedAt);
    
    return {
      ...response.data,
      data: user
    };
  }

  // AI Processing
  async getExtractedData(examResultId: string): Promise<ApiResponse<any>> {
    // This endpoint doesn't exist yet, return mock data
    return {
      success: true,
      data: {}
    };
  }

  // File Upload (S3)
  async getPresignedUrl(fileName: string, fileType: string): Promise<ApiResponse<{ uploadUrl: string; fileUrl: string }>> {
    // This endpoint doesn't exist yet, return mock data
    return {
      success: true,
      data: { uploadUrl: 'https://example.com/upload', fileUrl: 'https://example.com/file' }
    };
  }

  // HeyGen
  async createHeygenSession(avatarId?: string, voiceId?: string): Promise<ApiResponse<any>> {
    const response = await this.api.post('/heygen/session', {
      avatar_id: avatarId || 'Judy_Doctor_Sitting2_public',
      voice_id: voiceId,
    });
    const raw = response.data; // likely { code, data, message }
    const ok = typeof raw?.code === 'number' ? raw.code === 100 : !!raw?.success;
    return {
      success: ok,
      data: raw?.data,
      message: raw?.message,
      error: ok ? undefined : (raw?.message || 'Failed to create HeyGen session'),
    } as ApiResponse<any>;
  }

  async sendHeygenTask(sessionId: string, text: string, taskMode: 'sync' | 'async' = 'sync', taskType: 'repeat' | 'chat' = 'repeat'): Promise<ApiResponse<any>> {
    try {
      const resp = await this.api.post('/heygen/task', { session_id: sessionId, text, task_mode: taskMode, task_type: taskType });
      const data = resp?.data;
      if (data && data.task_id) return { success: true, data };
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e?.response?.data?.error || e?.message || 'Failed to send task' };
    }
  }

  async getHeygenToken(): Promise<ApiResponse<{ token: string }>> {
    const response = await this.api.get('/heygen/token');
    const raw = response.data; // backend proxies HeyGen: { error:null, data:{ token } }
    const token: string | undefined = raw?.data?.token || raw?.token;
    return {
      success: !!token,
      data: token ? { token } : undefined,
      error: token ? undefined : 'No token returned',
    } as ApiResponse<{ token: string }>;
  }
}

const apiService = new ApiService();
export default apiService; 