import { FollowUp } from './index';

export type AuthStackParamList = {
  QRScan: undefined;
  Signup: {
    doctorId: string;
    clinicId: string;
    qrCode: string;
  };
  Login: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  ProcedureDetail: { procedureId: string };
  ProcedureTemplateDetail: { template: any };
  ExamDetail: { examId: string };
  UploadResult: { examId: string };
  FollowUpForm: { followUp: FollowUp };
  FollowUpHistory: undefined;
  ExamTemplates: undefined;
  AppointmentDetail: { appointmentId: string };
};

export type DoctorStackParamList = {
  DoctorTabs: undefined;
  PatientDetail: { patient: any };
  ProcedureDetail: { procedureId: string; patientId: string };
  ProcedureTemplateDetail: { template: any };
}; 