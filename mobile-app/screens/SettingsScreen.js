import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '../config/constants';

const SettingsScreen = ({ navigation }) => {
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadServerUrl();
  }, []);

  const loadServerUrl = async () => {
    try {
      const savedUrl = await AsyncStorage.getItem('SERVER_URL');
      setServerUrl(savedUrl || APP_CONFIG.API_BASE_URL.replace('/api', ''));
      setLoading(false);
    } catch (error) {
      console.error('Erreur en chargeant l\'URL:', error);
      setServerUrl(APP_CONFIG.API_BASE_URL.replace('/api', ''));
      setLoading(false);
    }
  };

  const saveServerUrl = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une URL valide');
      return;
    }

    try {
      // Valider l'URL
      new URL(serverUrl);
      
      await AsyncStorage.setItem('SERVER_URL', serverUrl);
      Alert.alert('Succès', 'URL du serveur sauvegardée avec succès');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erreur', 'URL invalide. Veuillez vérifier le format.\nFormat: http://localhost:3000 ou http://192.168.x.x:3000');
    }
  };

  const testConnection = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une URL');
      return;
    }

    setTesting(true);
    try {
      const response = await fetch(`${serverUrl}/api/servers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': APP_CONFIG.ADMIN_EMAIL,
        },
        timeout: 5000,
      });

      if (response.ok) {
        Alert.alert('✓ Connexion réussie', 'Le serveur est accessible');
      } else {
        Alert.alert('⚠ Réponse serveur', `Statut: ${response.status}`);
      }
    } catch (error) {
      Alert.alert('✗ Connexion échouée', 'Impossible de joindre le serveur.\n' + error.message);
    } finally {
      setTesting(false);
    }
  };

  const resetToDefault = async () => {
    Alert.alert(
      'Réinitialiser',
      'Recharger l\'URL par défaut ?',
      [
        { text: 'Annuler', onPress: () => {} },
        {
          text: 'Réinitialiser',
          onPress: async () => {
            const defaultUrl = APP_CONFIG.API_BASE_URL.replace('/api', '');
            setServerUrl(defaultUrl);
            await AsyncStorage.removeItem('SERVER_URL');
            Alert.alert('Succès', 'URL réinitialisée à la valeur par défaut');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={APP_CONFIG.COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Section Info */}
        <View style={styles.section}>
          <Text style={styles.title}>Configuration du Serveur API</Text>
          <Text style={styles.description}>
            Configurez l'URL de votre serveur backend pour vous connecter.
          </Text>
        </View>

        {/* URL Input */}
        <View style={styles.section}>
          <Text style={styles.label}>URL du Serveur Backend</Text>
          <TextInput
            style={styles.input}
            placeholder="http://localhost:3000"
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholderTextColor="#999"
            editable={!testing}
          />
          <Text style={styles.hint}>
            Format: http://[adresse]:[port]{'\n'}
            Exemple chez vous: http://192.168.1.202:3000{'\n'}
            Exemple à l'entreprise: http://localhost:3000
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, styles.testButton]}
            onPress={testConnection}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>🧪 Tester la connexion</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={saveServerUrl}
            disabled={testing}
          >
            <Text style={styles.buttonText}>💾 Sauvegarder</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={resetToDefault}
            disabled={testing}
          >
            <Text style={styles.buttonText}>↺ Réinitialiser</Text>
          </TouchableOpacity>
        </View>

        {/* Current Settings */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Paramètres actuels</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>URL Base:</Text>
            <Text style={styles.infoValue}>{serverUrl}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>API Endpoint:</Text>
            <Text style={styles.infoValue}>{serverUrl}/api</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Email Admin:</Text>
            <Text style={styles.infoValue}>{APP_CONFIG.ADMIN_EMAIL}</Text>
          </View>
        </View>

        {/* Help Section */}
        <View style={[styles.section, styles.helpSection]}>
          <Text style={styles.subtitle}>Aide</Text>
          <Text style={styles.helpText}>
            • Si vous êtes chez vous, utilisez votre adresse IP locale (ex: 192.168.1.x){'\n\n'}
            • Si vous êtes à l'entreprise, utilisez localhost ou l'IP du serveur interne{'\n\n'}
            • Cliquez sur "Tester la connexion" pour vérifier que l'URL est correcte{'\n\n'}
            • L'URL est sauvegardée localement sur votre téléphone
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CONFIG.COLORS.BACKGROUND,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
    backgroundColor: APP_CONFIG.COLORS.WHITE,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: APP_CONFIG.COLORS.BLACK,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_CONFIG.COLORS.BLACK,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: APP_CONFIG.COLORS.GRAY,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_CONFIG.COLORS.BLACK,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: APP_CONFIG.COLORS.BLACK,
    marginBottom: 10,
    backgroundColor: APP_CONFIG.COLORS.WHITE,
  },
  hint: {
    fontSize: 12,
    color: APP_CONFIG.COLORS.GRAY,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  testButton: {
    backgroundColor: APP_CONFIG.COLORS.INFO,
  },
  saveButton: {
    backgroundColor: APP_CONFIG.COLORS.SUCCESS,
  },
  resetButton: {
    backgroundColor: APP_CONFIG.COLORS.WARNING,
  },
  buttonText: {
    color: APP_CONFIG.COLORS.WHITE,
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: APP_CONFIG.COLORS.LIGHT_GRAY,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: APP_CONFIG.COLORS.PRIMARY,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: APP_CONFIG.COLORS.GRAY,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    color: APP_CONFIG.COLORS.BLACK,
    fontFamily: 'monospace',
  },
  helpSection: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: APP_CONFIG.COLORS.PRIMARY,
  },
  helpText: {
    fontSize: 13,
    color: APP_CONFIG.COLORS.BLACK,
    lineHeight: 20,
  },
});

export default SettingsScreen;
