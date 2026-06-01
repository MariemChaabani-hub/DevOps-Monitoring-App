import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';
import { APP_CONFIG } from './config/constants';
import { initializeApi } from './services/apiService';

export default function App() {
  useEffect(() => {
    // Initialiser l'API au démarrage de l'app
    initializeApi().catch(error => {
      console.error('Erreur lors de l\'initialisation de l\'API:', error);
    });
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <AppNavigator />
    </NavigationContainer>
  );
}
