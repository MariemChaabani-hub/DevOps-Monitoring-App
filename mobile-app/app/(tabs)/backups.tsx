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
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { apiService } from '../../services/apiService';
import Card from '../../components/Card';
import MetricCard from '../../components/MetricCard';
import CustomButton from '../../components/CustomButton';
import { APP_CONFIG, getServerStatusColor, getServerStatusEmoji } from '../../config/constants';

const { width: screenWidth } = Dimensions.get('window');

export default function BackupsScreen() {
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [backupStatuses, setBackupStatuses] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('7d'); // 1d, 7d, 30d

  useEffect(() => {
    fetchServers();
  }, []);

  useEffect(() => {
    if (selectedServer) {
      fetchBackupStatuses();
    }
  }, [selectedServer, timeRange]);

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

  const fetchBackupStatuses = async () => {
    if (!selectedServer || !selectedServer._id) return;

    try {
      // Simuler les données de backup (à remplacer par vrai appel API)
      const mockBackupData = {
        [selectedServer._id]: {
          server_id: selectedServer._id,
          latest_backup: {
            id: 'backup_' + Date.now(),
            timestamp: new Date().toISOString(),
            size: '2.5 GB',
            duration: '15 minutes 42 secondes',
            status: 'success',
            files_count: 1247,
            compressed_size: '1.8 GB',
          },
          current_status: 'success',
          summary: {
            has_recent_backup: true,
            is_healthy: true,
            requires_attention: false,
            last_backup_age_hours: 2,
            backup_frequency: 'daily',
            success_rate: 98.5,
          },
          history: [
            {
              id: 'backup_' + (Date.now() - 86400000),
              timestamp: new Date(Date.now() - 86400000).toISOString(),
              size: '2.3 GB',
              duration: '14 minutes 18 secondes',
              status: 'success',
              files_count: 1198,
            },
            {
              id: 'backup_' + (Date.now() - 172800000),
              timestamp: new Date(Date.now() - 172800000).toISOString(),
              size: '2.4 GB',
              duration: '16 minutes 05 secondes',
              status: 'success',
              files_count: 1234,
            },
            {
              id: 'backup_' + (Date.now() - 259200000),
              timestamp: new Date(Date.now() - 259200000).toISOString(),
              size: '0 GB',
              duration: '0 secondes',
              status: 'failed',
              error_message: 'Connection timeout to backup server',
              files_count: 0,
            },
          ],
        }
      };
      
      setBackupStatuses(mockBackupData);
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de charger les statuts de backup');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchServers();
  };

  const getBackupStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#27ae60';
      case 'warning': return '#f39c12';
      case 'failed': return '#e74c3c';
      case 'missing': return '#95a5a6';
      default: return '#7f8c8d';
    }
  };

  const getBackupStatusText = (status: string) => {
    switch (status) {
      case 'success': return 'Succès';
      case 'warning': return 'Attention';
      case 'failed': return 'Échoué';
      case 'missing': return 'Manquant';
      case 'running': return 'En cours';
      default: return 'Inconnu';
    }
  };

  const getBackupStatusEmoji = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'failed': return '❌';
      case 'missing': return '❓';
      case 'running': return '⏳';
      default: return '❔';
    }
  };

  const getChartData = () => {
    if (!selectedServer || !backupStatuses[selectedServer._id]) return null;

    const history = backupStatuses[selectedServer._id]?.history || [];
    const filteredHistory = history.slice(-7); // 7 derniers jours

    return {
      labels: filteredHistory.map((_: any, index: number) => `J-${index + 1}`),
      datasets: [
        {
          data: filteredHistory.map((backup: any) => 
            backup.status === 'success' ? parseFloat(backup.size) || 0 : 0
          ),
          color: (opacity = 1) => `rgba(39, 174, 96, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data: filteredHistory.map((backup: any) => 
            backup.status === 'failed' ? 5 : 0
          ),
          color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  const chartData = getChartData();
  const currentBackup = selectedServer && selectedServer._id ? backupStatuses[selectedServer._id] : null;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement des backups...</Text>
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
        <Text style={styles.title}>💾 Backup Monitoring</Text>
        <Text style={styles.subtitle}>
          Suivi des sauvegardes - {new Date().toLocaleDateString('fr-FR')}
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

      {selectedServer && currentBackup && (
        <>
          {/* Statistiques de backup */}
          <View style={styles.statsContainer}>
            <MetricCard
              title="Dernier Backup"
              value={currentBackup.summary.has_recent_backup ? '✅ Récent' : '⚠️ Ancien'}
              icon={currentBackup.summary.has_recent_backup ? '✅' : '⚠️'}
              color={currentBackup.summary.has_recent_backup ? '#27ae60' : '#f39c12'}
            />
            <MetricCard
              title="Taux de Succès"
              value={`${currentBackup.summary.success_rate?.toFixed(1) || 0}%`}
              icon="📈"
              color="#3498db"
            />
            <MetricCard
              title="Âge du Backup"
              value={`${currentBackup.summary.last_backup_age_hours || 0}h`}
              icon="⏰"
              color={currentBackup.summary.last_backup_age_hours > 24 ? '#e74c3c' : '#27ae60'}
            />
            <MetricCard
              title="Fréquence"
              value={currentBackup.summary.backup_frequency || 'Quotidien'}
              icon="🔄"
              color="#9b59b6"
            />
          </View>

          {/* Détails du dernier backup */}
          <Card style={styles.lastBackupCard}>
            <Text style={styles.sectionTitle}>📋 Dernier Backup</Text>
            <View style={styles.lastBackupContainer}>
              <View style={styles.backupStatusRow}>
                <View style={styles.backupStatusItem}>
                  <Text style={styles.backupStatusLabel}>Statut:</Text>
                  <View style={[
                    styles.backupStatusBadge,
                    { backgroundColor: getBackupStatusColor(currentBackup.latest_backup.status) }
                  ]}>
                    <Text style={styles.backupStatusText}>
                      {getBackupStatusEmoji(currentBackup.latest_backup.status)} {getBackupStatusText(currentBackup.latest_backup.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.backupTimestamp}>
                  {new Date(currentBackup.latest_backup.timestamp).toLocaleString('fr-FR')}
                </Text>
              </View>

              <View style={styles.backupDetailsGrid}>
                <View style={styles.backupDetailItem}>
                  <Text style={styles.backupDetailLabel}>Taille:</Text>
                  <Text style={styles.backupDetailValue}>{currentBackup.latest_backup.size}</Text>
                </View>
                <View style={styles.backupDetailItem}>
                  <Text style={styles.backupDetailLabel}>Durée:</Text>
                  <Text style={styles.backupDetailValue}>{currentBackup.latest_backup.duration}</Text>
                </View>
                <View style={styles.backupDetailItem}>
                  <Text style={styles.backupDetailLabel}>Fichiers:</Text>
                  <Text style={styles.backupDetailValue}>{currentBackup.latest_backup.files_count?.toLocaleString() || 0}</Text>
                </View>
                <View style={styles.backupDetailItem}>
                  <Text style={styles.backupDetailLabel}>Compression:</Text>
                  <Text style={styles.backupDetailValue}>{currentBackup.latest_backup.compressed_size}</Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Graphique d'historique */}
          {chartData && (
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>📈 Historique des 7 derniers jours</Text>
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
                  },
                }}
                bezier
                style={styles.chart}
              />
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#27ae60' }]} />
                  <Text style={styles.legendText}>Taille (GB)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#e74c3c' }]} />
                  <Text style={styles.legendText}>Échecs</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Historique détaillé */}
          <Card style={styles.historyCard}>
            <Text style={styles.sectionTitle}>📜 Historique des Backups</Text>
            {currentBackup.history.map((backup: any, index: number) => (
              <View key={backup.id} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyStatus}>
                    <View style={[
                      styles.historyStatusBadge,
                      { backgroundColor: getBackupStatusColor(backup.status) }
                    ]}>
                      <Text style={styles.historyStatusText}>
                        {getBackupStatusEmoji(backup.status)} {getBackupStatusText(backup.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.historyDate}>
                    {new Date(backup.timestamp).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                
                <View style={styles.historyDetails}>
                  <View style={styles.historyDetailItem}>
                    <Text style={styles.historyDetailLabel}>Taille:</Text>
                    <Text style={styles.historyDetailValue}>{backup.size}</Text>
                  </View>
                  <View style={styles.historyDetailItem}>
                    <Text style={styles.historyDetailLabel}>Durée:</Text>
                    <Text style={styles.historyDetailValue}>{backup.duration}</Text>
                  </View>
                  <View style={styles.historyDetailItem}>
                    <Text style={styles.historyDetailLabel}>Fichiers:</Text>
                    <Text style={styles.historyDetailValue}>{backup.files_count?.toLocaleString() || 0}</Text>
                  </View>
                </View>

                {backup.error_message && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorLabel}>Erreur:</Text>
                    <Text style={styles.errorMessage}>{backup.error_message}</Text>
                  </View>
                )}
              </View>
            ))}
          </Card>

          {/* Actions */}
          <Card style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>🔧 Actions de Backup</Text>
            <View style={styles.actionsContainer}>
              <CustomButton
                title="🚀 Lancer un backup manuel"
                onPress={() => Alert.alert('Info', 'Fonctionnalité à implémenter')}
                style={styles.actionButton}
              />
              <CustomButton
                title="📋 Voir les logs de backup"
                onPress={() => Alert.alert('Info', 'Fonctionnalité à implémenter')}
                style={styles.actionButton}
              />
              <CustomButton
                title="⚙️ Configurer les backups"
                onPress={() => Alert.alert('Info', 'Fonctionnalité à implémenter')}
                style={styles.actionButton}
              />
            </View>
          </Card>
        </>
      )}
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
    flexWrap: 'wrap',
  },
  lastBackupCard: {
    margin: 20,
    marginBottom: 10,
  },
  lastBackupContainer: {
    gap: 15,
  },
  backupStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backupStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backupStatusLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  backupStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  backupStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  backupTimestamp: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  backupDetailsGrid: {
    gap: 12,
  },
  backupDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backupDetailLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
    flex: 1,
  },
  backupDetailValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  chartCard: {
    margin: 20,
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 18,
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
    marginTop: 15,
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
    fontWeight: '600',
  },
  historyCard: {
    margin: 20,
    marginBottom: 10,
  },
  historyItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  historyDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  historyDetails: {
    gap: 8,
  },
  historyDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDetailLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
    flex: 1,
  },
  historyDetailValue: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  errorContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#fee',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  errorLabel: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '600',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 12,
    color: '#c0392b',
  },
  actionsCard: {
    margin: 20,
    marginBottom: 20,
  },
  actionsContainer: {
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#3498db',
  },
});
