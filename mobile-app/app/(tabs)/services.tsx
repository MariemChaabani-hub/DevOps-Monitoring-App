import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { apiService } from '../../services/apiService';
import Card from '../../components/Card';
import MetricCard from '../../components/MetricCard';
import CustomButton from '../../components/CustomButton';
import { APP_CONFIG, getServerStatusColor, getServerStatusEmoji } from '../../config/constants';

const { width: screenWidth } = Dimensions.get('window');

export default function ServicesScreen() {
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);

  useEffect(() => {
    fetchServers();
  }, []);

  useEffect(() => {
    if (selectedServer) {
      fetchServerServices();
    }
  }, [selectedServer]);

  const fetchServers = async () => {
    try {
      const data = await apiService.getServers();
      setServers(data);
      if (data.length > 0) {
        setSelectedServer(data[0]);
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de charger les serveurs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchServerServices = async () => {
    if (!selectedServer) return;

    try {
      // Simuler les services du serveur (à remplacer par vrai appel API)
      const mockServices = [
        {
          name: 'Apache',
          status: 'running',
          icon: '🌐',
          uptime: '15 jours 3h 42m',
          cpu_usage: 12.5,
          memory_usage: 8.3,
          last_restart: '2024-05-01 14:30:00',
        },
        {
          name: 'Nginx',
          status: 'running',
          icon: '⚙️',
          uptime: '15 jours 3h 42m',
          cpu_usage: 5.2,
          memory_usage: 3.1,
          last_restart: '2024-05-01 14:30:00',
        },
        {
          name: 'MySQL',
          status: 'warning',
          icon: '🗄️',
          uptime: '8 jours 12h 15m',
          cpu_usage: 25.8,
          memory_usage: 45.2,
          last_restart: '2024-05-08 09:15:00',
        },
        {
          name: 'Docker',
          status: 'running',
          icon: '🐳',
          uptime: '15 jours 3h 42m',
          cpu_usage: 8.1,
          memory_usage: 12.4,
          last_restart: '2024-05-01 14:30:00',
        },
        {
          name: 'Redis',
          status: 'stopped',
          icon: '🔴',
          uptime: '0 jours 0h 0m',
          cpu_usage: 0,
          memory_usage: 0,
          last_restart: '2024-05-07 16:45:00',
        },
        {
          name: 'MongoDB',
          status: 'running',
          icon: '🍃',
          uptime: '15 jours 3h 42m',
          cpu_usage: 15.3,
          memory_usage: 22.7,
          last_restart: '2024-05-01 14:30:00',
        },
      ];
      setServices(mockServices);
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de charger les services du serveur');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchServers();
  };

  const handleRestartService = (service: string) => {
    setSelectedService(service);
    setShowServiceModal(true);
  };

  const confirmRestartService = async () => {
    if (!selectedService || !selectedServer) return;

    setActionLoading(true);
    try {
      const result = await apiService.restartService(selectedServer._id, selectedService);
      Alert.alert('Succès', `Service ${selectedService} redémarré avec succès\n${result.message}`);
      setShowServiceModal(false);
      setSelectedService(null);
      fetchServerServices(); // Rafraîchir les services
    } catch (error: any) {
      Alert.alert('Erreur', `Impossible de redémarrer le service ${selectedService}\n${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#27ae60';
      case 'warning': return '#f39c12';
      case 'stopped': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getServiceStatusText = (status: string) => {
    switch (status) {
      case 'running': return 'Actif';
      case 'warning': return 'Attention';
      case 'stopped': return 'Arrêté';
      default: return 'Inconnu';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement des services...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ Services</Text>
        <Text style={styles.subtitle}>
          Gestion des services - {new Date().toLocaleDateString('fr-FR')}
        </Text>
      </View>

      {/* Sélection du serveur */}
      <Card style={styles.serverSelectorCard}>
        <Text style={styles.sectionTitle}>🖥️ Sélectionner un serveur</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.serverList}>
            {servers.map((server) => (
              <TouchableOpacity
                key={server._id}
                style={[
                  styles.serverChip,
                  selectedServer?._id === server._id && styles.selectedServerChip
                ]}
                onPress={() => setSelectedServer(server)}
              >
                <Text style={styles.serverChipText}>{server.name}</Text>
                <Text style={styles.serverChipStatus}>
                  {getServerStatusEmoji(server.status)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Card>

      {selectedServer && (
        <>
          {/* Statistiques des services */}
          <View style={styles.statsContainer}>
            <MetricCard
              title="Services Actifs"
              value={services.filter(s => s.status === 'running').length.toString()}
              icon="✅"
              color="#27ae60"
            />
            <MetricCard
              title="Services en Alert"
              value={services.filter(s => s.status === 'warning').length.toString()}
              icon="⚠️"
              color="#f39c12"
            />
            <MetricCard
              title="Services Arrêtés"
              value={services.filter(s => s.status === 'stopped').length.toString()}
              icon="❌"
              color="#e74c3c"
            />
          </View>

          {/* Liste des services */}
          <Card style={styles.servicesCard}>
            <Text style={styles.sectionTitle}>📋 Liste des Services</Text>
            {services.map((service, index) => (
              <View key={index} style={styles.serviceItem}>
                <View style={styles.serviceHeader}>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceIcon}>{service.icon}</Text>
                    <View style={styles.serviceDetails}>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      <Text style={styles.serviceUptime}>⏰ {service.uptime}</Text>
                    </View>
                  </View>
                  <View style={styles.serviceStatusContainer}>
                    <Text style={[
                      styles.serviceStatus,
                      { color: getServiceStatusColor(service.status) }
                    ]}>
                      {getServiceStatusText(service.status)}
                    </Text>
                    <TouchableOpacity
                      style={styles.restartButton}
                      onPress={() => handleRestartService(service.name)}
                      disabled={service.status === 'stopped'}
                    >
                      <Text style={styles.restartButtonText}>🔄</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Métriques du service */}
                <View style={styles.serviceMetrics}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>CPU:</Text>
                    <Text style={styles.metricValue}>{service.cpu_usage.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>RAM:</Text>
                    <Text style={styles.metricValue}>{service.memory_usage.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Dernier redémarrage:</Text>
                    <Text style={styles.metricValue}>{service.last_restart}</Text>
                  </View>
                </View>

                {index < services.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ))}
          </Card>

          {/* Actions globales */}
          <Card style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>🔧 Actions Globales</Text>
            <View style={styles.globalActionsContainer}>
              <CustomButton
                title="🔄 Redémarrer tous les services"
                onPress={() => Alert.alert('Info', 'Fonctionnalité à implémenter')}
                style={styles.globalActionButton}
              />
              <CustomButton
                title="🛑 Arrêter tous les services critiques"
                onPress={() => Alert.alert('Info', 'Fonctionnalité à implémenter')}
                style={[styles.globalActionButton, styles.dangerActionButton]}
              />
            </View>
          </Card>
        </>
      )}

      {/* Modal de confirmation de redémarrage */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showServiceModal}
        onRequestClose={() => {
          setShowServiceModal(false);
          setSelectedService(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Redémarrer le Service</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowServiceModal(false);
                  setSelectedService(null);
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalServiceName}>{selectedService}</Text>
              <Text style={styles.modalQuestion}>
                Êtes-vous sûr de vouloir redémarrer ce service sur le serveur {selectedServer?.name} ?
              </Text>
              <Text style={styles.modalWarning}>
                ⚠️ Cette action peut affecter les applications utilisant ce service
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowServiceModal(false);
                    setSelectedService(null);
                  }}
                >
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={confirmRestartService}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Text style={styles.modalConfirmText}>Chargement...</Text>
                  ) : (
                    <Text style={styles.modalConfirmText}>Confirmer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#7f8c8d',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  serverSelectorCard: {
    margin: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  serverList: {
    flexDirection: 'row',
    gap: 10,
  },
  serverChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  selectedServerChip: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  serverChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginRight: 6,
  },
  selectedServerChipText: {
    color: 'white',
  },
  serverChipStatus: {
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    gap: 10,
  },
  servicesCard: {
    margin: 20,
    marginBottom: 10,
  },
  serviceItem: {
    marginBottom: 15,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  serviceUptime: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  serviceStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serviceStatus: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  restartButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  restartButtonText: {
    fontSize: 14,
    color: 'white',
  },
  serviceMetrics: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  metricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 10,
  },
  actionsCard: {
    margin: 20,
    marginBottom: 20,
  },
  globalActionsContainer: {
    gap: 10,
  },
  globalActionButton: {
    backgroundColor: '#3498db',
  },
  dangerActionButton: {
    backgroundColor: '#e74c3c',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    width: screenWidth - 40,
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#7f8c8d',
  },
  modalBody: {
    alignItems: 'center',
  },
  modalServiceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  modalQuestion: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalWarning: {
    fontSize: 12,
    color: '#f39c12',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#e9ecef',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});
