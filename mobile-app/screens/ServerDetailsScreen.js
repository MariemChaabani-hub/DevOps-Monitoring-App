import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { apiService } from '../services/apiService';
import Card from '../components/Card';
import MetricCard from '../components/MetricCard';
import CustomButton from '../components/CustomButton';

const { width: screenWidth } = Dimensions.get('window');

const ServerDetailsScreen = ({ route, navigation }) => {
  const { serverId } = route.params;
  const [server, setServer] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [showServiceModal, setShowServiceModal] = useState(false);

  useEffect(() => {
    fetchServerDetails();
  }, [serverId]);

  const fetchServerDetails = async () => {
    try {
      const [serverData, metricsData] = await Promise.all([
        apiService.getServer(serverId),
        apiService.getServerMetrics(serverId)
      ]);
      
      setServer(serverData);
      setMetrics(metricsData);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les détails du serveur');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchServerDetails();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OK':
        return '#27ae60';
      case 'CRITICAL':
        return '#e74c3c';
      case 'WARNING':
        return '#f39c12';
      case 'OFFLINE':
        return '#95a5a6';
      default:
        return '#95a5a6';
    }
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'OK':
        return '🟢';
      case 'CRITICAL':
        return '🔴';
      case 'WARNING':
        return '🟡';
      case 'OFFLINE':
        return '⚫';
      default:
        return '⚫';
    }
  };

  const handleRemoteAction = (action) => {
    Alert.alert(
      'Action à Distance',
      `Êtes-vous sûr de vouloir ${action} ce serveur ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              await apiService.executeRemoteAction(serverId, action);
              Alert.alert('Succès', `Action ${action} exécutée avec succès`);
              fetchServerDetails();
            } catch (error) {
              Alert.alert('Erreur', `Impossible d'exécuter l'action ${action}`);
            }
          },
        },
      ]
    );
  };

  const handleRebootServer = async () => {
    Alert.alert(
      'Redémarrage du Serveur',
      `Êtes-vous sûr de vouloir redémarrer le serveur ${server.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const result = await apiService.rebootServer(serverId);
              Alert.alert('Succès', `Serveur redémarré avec succès\n${result.message}`);
              fetchServerDetails(); // Rafraîchir les données
            } catch (error) {
              Alert.alert('Erreur', `Impossible de redémarrer le serveur\n${error.message}`);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRestartService = (service) => {
    setSelectedService(service);
    setShowServiceModal(true);
  };

  const confirmRestartService = async () => {
    if (!selectedService) return;

    setActionLoading(true);
    try {
      const result = await apiService.restartService(serverId, selectedService);
      Alert.alert('Succès', `Service ${selectedService} redémarré avec succès\n${result.message}`);
      setShowServiceModal(false);
      setSelectedService(null);
      fetchServerDetails(); // Rafraîchir les données
    } catch (error) {
      Alert.alert('Erreur', `Impossible de redémarrer le service ${selectedService}\n${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getChartData = () => {
    if (metrics.length === 0) return null;

    const last24Hours = metrics.slice(-24);
    
    return {
      labels: last24Hours.map((_, index) => `${index}h`),
      datasets: [
        {
          data: last24Hours.map(m => m.cpu_percent || 0),
          color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data: last24Hours.map(m => m.ram_percent || 0),
          color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!server) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Serveur non trouvé</Text>
        <CustomButton
          title="Retour"
          onPress={() => navigation.goBack()}
          style={styles.errorButton}
        />
      </View>
    );
  }

  const chartData = getChartData();
  const services = [
    { name: 'Apache', icon: '🌐' },
    { name: 'MySQL', icon: '🗄️' },
    { name: 'Nginx', icon: '⚙️' },
    { name: 'Docker', icon: '🐳' },
    { name: 'Redis', icon: '🔴' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* En-tête du serveur */}
      <Card style={styles.headerCard}>
        <View style={styles.serverHeader}>
          <View style={styles.serverInfo}>
            <Text style={styles.serverName}>{server.name}</Text>
            <Text style={styles.serverId}>{server.server_id}</Text>
            <Text style={styles.serverLocation}>{server.location}</Text>
          </View>
          <View style={styles.statusContainer}>
            <Text style={styles.statusEmoji}>
              {getStatusEmoji(server.status)}
            </Text>
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(server.status) }
              ]}
            >
              {server.status}
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            title="CPU"
            value={`${server.current_metrics?.cpu_percent?.toFixed(1) || 0}%`}
            icon="💻"
            color="#e74c3c"
            small
          />
          <MetricCard
            title="RAM"
            value={`${server.current_metrics?.ram_percent?.toFixed(1) || 0}%`}
            icon="🧠"
            color="#3498db"
            small
          />
          <MetricCard
            title="Disk"
            value={`${server.current_metrics?.disk_percent?.toFixed(1) || 0}%`}
            icon="💾"
            color="#f39c12"
            small
          />
        </View>
      </Card>

      {/* Graphique de performance */}
      {chartData && (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Performance (24 dernières heures)</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 40}
            height={200}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: '#e74c3c',
              },
            }}
            bezier
            style={styles.chart}
          />
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#e74c3c' }]} />
              <Text style={styles.legendText}>CPU</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#3498db' }]} />
              <Text style={styles.legendText}>RAM</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Actions principales */}
      <Card style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>Actions Principales</Text>
        <View style={styles.mainActionsContainer}>
          <CustomButton
            title="🔄 Redémarrer le serveur"
            onPress={handleRebootServer}
            isLoading={actionLoading}
            style={styles.mainActionButton}
          />
        </View>
      </Card>

      {/* Actions de services */}
      <Card style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>Services</Text>
        <View style={styles.servicesContainer}>
          {services.map((service) => (
            <TouchableOpacity
              key={service.name}
              style={styles.serviceItem}
              onPress={() => handleRestartService(service.name)}
            >
              <Text style={styles.serviceIcon}>{service.icon}</Text>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceAction}>Redémarrer</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Informations système */}
      <Card style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Informations Système</Text>
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Adresse IP:</Text>
            <Text style={styles.infoValue}>{server.ip}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hostname:</Text>
            <Text style={styles.infoValue}>{server.hostname}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dernière mise à jour:</Text>
            <Text style={styles.infoValue}>
              {new Date(server.last_metric_time).toLocaleString('fr-FR')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>État actif:</Text>
            <Text style={[styles.infoValue, { color: server.is_active ? '#27ae60' : '#e74c3c' }]}>
              {server.is_active ? 'Oui' : 'Non'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Modal de sélection de service */}
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
                Êtes-vous sûr de vouloir redémarrer ce service ?
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
};

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#3498db',
  },
  headerCard: {
    margin: 20,
    marginBottom: 10,
  },
  serverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  serverId: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  serverLocation: {
    fontSize: 12,
    color: '#95a5a6',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  chartCard: {
    margin: 20,
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  actionsCard: {
    margin: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  actionsContainer: {
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#3498db',
  },
  shutdownButton: {
    backgroundColor: '#e74c3c',
  },
  infoCard: {
    margin: 20,
  },
  infoContainer: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
});

export default ServerDetailsScreen;
