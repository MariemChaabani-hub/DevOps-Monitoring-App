import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ServersScreen from '../screens/ServersScreen';
import ServerDetailsScreen from '../screens/ServerDetailsScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Stack Navigator principal
const Stack = createStackNavigator();

const AppNavigator = () => {
  // TODO: Implémenter la logique d'authentification
  // Pour l'instant, nous allons directement au tableau de bord
  const isAuthenticated = true;

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'Home' : 'Login'}
        screenOptions={({ navigation }) => ({
          headerStyle: {
            backgroundColor: '#3498db',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={{ marginRight: 15 }}
            >
              <Ionicons name="settings" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        })}
      >
        {isAuthenticated ? (
          // Screens pour utilisateur authentifié
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'Monitoring Dashboard' }}
            />
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen}
              options={{
                title: 'Tableau de Bord',
                headerLeft: () => null,
              }}
            />
            <Stack.Screen 
              name="Servers" 
              component={ServersScreen}
              options={{
                title: 'Serveurs',
              }}
            />
            <Stack.Screen 
              name="ServerDetails" 
              component={ServerDetailsScreen}
              options={{
                title: 'Détails du Serveur',
              }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                title: 'Paramètres du Serveur',
                headerRight: () => null,
              }}
            />
          </>
        ) : (
          // Screen de connexion
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{
              title: 'Connexion',
              headerShown: false,
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
