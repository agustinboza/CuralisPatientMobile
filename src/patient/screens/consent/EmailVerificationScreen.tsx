import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../../shared/constants';

export const EmailVerificationScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Email Verification Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  text: {
    fontSize: 18,
    color: COLORS.text,
  },
}); 