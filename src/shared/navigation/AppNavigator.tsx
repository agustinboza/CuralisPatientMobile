import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, StackScreenProps } from '@react-navigation/stack';
import { createBottomTabNavigator, BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';

import { COLORS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { MainStackParamList as BaseMainStackParamList } from '../types/navigation';

// Auth Screens
import { SignupScreen } from '../screens/auth/SignupScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';

// Consent Screens
import { DigitalSignatureScreen } from '../../patient/screens/consent/DigitalSignatureScreen';
import { EmailVerificationScreen } from '../../patient/screens/consent/EmailVerificationScreen';

// Patient Screens
import { PatientNavigator } from '../../patient/navigation/PatientNavigator';
import { ProcedureDetailScreen as PatientProcedureDetailScreen } from '../../patient/screens/procedures/ProcedureDetailScreen';
import { ExamDetailScreen } from '../../patient/screens/procedures/ExamDetailScreen';
import { UploadResultScreen } from '../../patient/screens/procedures/UploadResultScreen';
import { FollowUpFormScreen } from '../../patient/screens/followUps/FollowUpFormScreen';
import AICheckInScreen from '../../patient/screens/main/AICheckInScreen';
import { AppointmentsScreen } from '../../patient/screens/main/AppointmentsScreen';
import { MyAppointmentsScreen } from '../../patient/screens/main/MyAppointmentsScreen';

const AuthStack = createStackNavigator();
const ConsentStack = createStackNavigator();
const MainStack = createStackNavigator<MainStackParamList>();
const RootStack = createStackNavigator();

export type MainStackParamList = BaseMainStackParamList & {
  PatientTabs: NavigatorScreenParams<any>; // Using PatientNavigator's param list
  ProcedureDetail: { procedureId: string };
  ExamDetail: { examId: string, procedureId: string };
  UploadResult: { examId: string };
  DigitalSignature: undefined;
  Appointments: undefined;
  MyAppointments: undefined;
  AICheckIn: { appointmentId: string; procedureType?: string };
};

export type TabParamList = {
  Home: undefined;
  Procedures: undefined;
  FollowUps: undefined;
  Appointments: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export type MainStackScreenProps<T extends keyof MainStackParamList> = StackScreenProps<MainStackParamList, T>;
export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  MainStackScreenProps<keyof MainStackParamList>
>;

// Auth Stack Navigator
const AuthStackNavigator = () => {
  return (
    <AuthStack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
};

// Consent Stack Navigator
const ConsentStackNavigator = () => {
  return (
    <ConsentStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <ConsentStack.Screen name="DigitalSignature" component={DigitalSignatureScreen} />
      <ConsentStack.Screen name="EmailVerification" component={EmailVerificationScreen} />
    </ConsentStack.Navigator>
  );
};

// Main App Stack Navigator
const MainStackNavigator = () => {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.surface,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <MainStack.Screen 
        name="PatientTabs" 
        component={PatientNavigator}
        options={{ headerShown: false }}
      />
      <MainStack.Screen 
        name="ProcedureDetail" 
        component={PatientProcedureDetailScreen}
        options={{ title: 'Procedure Details', headerBackTitle: 'Back', headerShown: true }}
      />
      <MainStack.Screen 
        name="ExamDetail" 
        component={ExamDetailScreen}
        options={{ title: 'Exam Details', headerBackTitle: 'Back', headerShown: true }}
      />
      <MainStack.Screen 
        name="UploadResult" 
        component={UploadResultScreen}
        options={{ title: 'Upload Result', headerBackTitle: 'Back', headerShown: true }}
      />
      <MainStack.Screen 
        name="DigitalSignature" 
        component={DigitalSignatureScreen}
        options={{ title: 'Digital Signature', headerBackTitle: 'Back', headerShown: true }}
      />
      <MainStack.Screen 
        name="FollowUpForm" 
        component={FollowUpFormScreen}
        options={{ title: 'Follow-up Form', headerBackTitle: 'Back', headerShown: true }}
      />
      <MainStack.Screen 
        name="Appointments" 
        component={AppointmentsScreen}
        options={{ title: 'Appointments', headerBackTitle: 'Back', headerShown: true }}
      />
      <MainStack.Screen 
        name="MyAppointments" 
        component={MyAppointmentsScreen}
        options={{ title: 'My Appointments', headerBackTitle: 'Back', headerShown: true }}
      />
      <MainStack.Screen 
        name="AICheckIn" 
        component={AICheckInScreen}
        options={{ title: 'AI Check-in', headerBackTitle: 'Back', headerShown: true }}
      />
    </MainStack.Navigator>
  );
};

// Root Navigator
export const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading screen while checking authentication state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainStackNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthStackNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}; 