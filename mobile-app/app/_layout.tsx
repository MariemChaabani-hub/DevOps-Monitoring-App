import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Theme } from '@/constants/theme';

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <Image
        source={require('../assets/images/logo-clediss.jpg')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color={Theme.colors.accent} style={styles.spinner} />
    </View>
  );
}

function RootLayoutNav() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="server-details/[id]"
          options={{
            headerShown: true,
            title: 'Détails du serveur',
            headerStyle: { backgroundColor: Theme.colors.surface },
            headerTintColor: Theme.colors.textPrimary,
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
      <StatusBar style="light" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 16,
    marginBottom: 24,
  },
  spinner: {
    marginTop: 8,
  },
});
