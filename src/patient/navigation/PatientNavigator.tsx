import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../shared/constants';
import { HomeScreen } from '../../patient/screens/main/HomeScreen';
import { AppointmentsScreen } from '../../patient/screens/main/AppointmentsScreen';
import { ProceduresScreen } from '../../patient/screens/main/ProceduresScreen';
import { FollowUpsScreen } from '../../patient/screens/main/FollowUpsScreen';
import { ProfileScreen } from '../../patient/screens/main/ProfileScreen';

export type PatientTabParamList = {
  Home: undefined;
  Appointments: undefined;
  Procedures: undefined;
  FollowUps: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<PatientTabParamList>();

export const PatientNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Appointments') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Procedures') {
            iconName = focused ? 'medical' : 'medical-outline';
          } else if (route.name === 'FollowUps') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Appointments" 
        component={AppointmentsScreen}
        options={{ title: 'Appointments' }}
      />
      <Tab.Screen 
        name="Procedures" 
        component={ProceduresScreen}
        options={{ title: 'Procedures' }}
      />
      <Tab.Screen 
        name="FollowUps" 
        component={FollowUpsScreen}
        options={{ title: 'Follow-ups' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};
