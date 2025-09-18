import { useAuth } from '@/providers/AuthProvider';
import React from 'react';
import { View, Button, StyleSheet } from 'react-native';

export default function LoginScreen() {
  const { login } = useAuth();

  return (
    <View style={styles.container}>
      <Button title="Login" onPress={() => login()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});