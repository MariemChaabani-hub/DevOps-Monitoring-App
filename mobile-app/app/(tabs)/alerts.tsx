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

export default function AlertsScreen() {
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertRules, setAlertRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, critical, warning, info
  const [timeRange, setTimeRange] = useState('24h'); // 1h, 6h, 24h, 7d

  useEffect(() => {
    fetchServers();
  }, []);

  useEffect(() => {
    if (selectedServer) {
      fetchAlerts();
      fetchAlertRules();
    }
  }, [selectedServer, filter, timeRange]);

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

  const fetchAlerts = async () => {
    if (!selectedServer) return;

    try {
      // Simuler les alertes (à remplacer par vrai appel API)
      const mockAlerts = [
        {
          id: 'alert_' + Date.now(),
          server_id: selectedServer._id,
          server_name: selectedServer.name,
          metric_type: 'cpu',
          threshold: 80,
          current_value: 92.5,
          severity: 'critical',
          message: 'CPU usage exceeds 80% threshold',
          timestamp: new Date().toISOString(),
          status: 'active',
          resolved_at: null,
          acknowledged_by: null,
        },
        {
          id: 'alert_' + (Date.now() - 3600000),
          server_id: selectedServer._id,
          server_name: selectedServer.name,
          metric_type: 'ram',
          threshold: 85,
          current_value: 87.2,
          severity: 'warning',
          message: 'RAM usage exceeds 85% threshold',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'acknowledged',
          resolved_at: null,
          acknowledged_by: 'admin@example.com',
        },
        {
          id: 'alert_' + (Date.now() - 7200000),
          server_id: selectedServer._id,
          server_name: selectedServer.name,
          metric_type: 'disk',
          threshold: 90,
          current_value: 91.8,
          severity: 'critical',
          message: 'Disk usage exceeds 90% threshold',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          status: 'resolved',
          resolved_at: new Date(Date.now() - 1800000).toISOString(),
          acknowledged_by: 'admin@example.com',
        },
        {
          id: 'alert_' + (Date.now() - 10800000),
          server_id: selectedServer._id,
          server_name: selectedServer.name,
          metric_type: 'backup',
          threshold: 24,
          current_value: 48,
          severity: 'critical',
          message: 'Backup not executed in last 24 hours',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          status: 'resolved',
          resolved_at: new Date(Date.now() - 9000000).toISOString(),
          acknowledged_by: 'admin@example.com',
        },
        {
          id: 'alert_' + (Date.now() - 14400000),
          server_id: selectedServer._id,
          server_name: selectedServer.name,
          metric_type: 'network',
          threshold: 1000,
          current_value: 1250,
          severity: 'warning',
          message: 'Network latency exceeds 1000ms threshold',
          timestamp: new Date(Date.now() - 14400000).toISOString(),
          status: 'resolved',
          resolved_at: new Date(Date.now() - 12000000).toISOString(),
          acknowledged_by: 'admin@example.com',
        },
      ];
      
      // Filtrer selon le filtre et la plage temporelle
      let filteredAlerts = mockAlerts;
      const now = new Date();
      
      // Filtrer par sévérité
      if (filter !== 'all') {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === filter);
      }
      
      // Filtrer par plage temporelle
      let cutoffTime = new Date();
      switch (timeRange) {
        case '1h':
          cutoffTime.setHours(now.getHours() - 1);
          break;
        case '6h':
          cutoffTime.setHours(now.getHours() - 6);
          break;
        case '24h':
          cutoffTime.setDate(now.getDate() - 1);
          break;
        case '7d':
          cutoffTime.setDate(now.getDate() - 7);
          break;
      }
      
      filteredAlerts = filteredAlerts.filter(alert => 
        new Date(alert.timestamp) >= cutoffTime
      );
      
      setAlerts(filteredAlerts);
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de charger les alertes');
    }
  };

  const fetchAlertRules = async () => {
    if (!selectedServer) return;

    try {
      // Simuler les règles d'alerte (à remplacer par vrai appel API)
      const mockRules = [
        {
          id: 'rule_1',
          metric_type: 'cpu',
          threshold: 80,
          severity: 'warning',
          enabled: true,
          description: 'CPU usage > 80%',
        },
        {
          id: 'rule_2',
          metric_type: 'cpu',
          threshold: 95,
          severity: 'critical',
          enabled: true,
          description: 'CPU usage > 95%',
        },
        {
          id: 'rule_3',
          metric_type: 'ram',
          threshold: 85,
          severity: 'warning',
          enabled: true,
          description: 'RAM usage > 85%',
        },
        {
          id: 'rule_4',
          metric_type: 'ram',
          threshold: 95,
          severity: 'critical',
          enabled: true,
          description: 'RAM usage > 95%',
        },
        {
          id: 'rule_5',
          metric_type: 'disk',
          threshold: 90,
          severity: 'critical',
          enabled: true,
          description: 'Disk usage > 90%',
        },
        {
          id: 'rule_6',
          metric_type: 'backup',
          threshold: 24,
          severity: 'critical',
          enabled: true,
          description: 'Backup not executed in 24 hours',
        },
        {
          id: 'rule_7',
          metric_type: 'network',
          threshold: 1000,
          severity: 'warning',
          enabled: true,
          description: 'Network latency > 1000ms',
        },
      ];
      
      setAlertRules(mockRules);
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de charger les règles d\'alerte');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchServers();
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    Alert.alert(
      'Acquitter l\'alerte',
      'Voulez-vous marquer cette alerte comme acquittée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Oui', 
          onPress: () => {
            setAlerts(alerts.map(alert => 
              alert.id === alertId 
                ? { ...alert, status: 'acknowledged', acknowledged_by: 'admin@example.com' }
                : alert
            ));
            Alert.alert('Succès', 'Alerte acquittée avec succès');
          }
        }
      ]
    );
  };

  const handleResolveAlert = (alertId: string) => {
    Alert.alert(
      'Résoudre l\'alerte',
      'Voulez-vous marquer cette alerte comme résolue ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Oui', 
          onPress: () => {
            setAlerts(alerts.map(alert => 
              alert.id === alertId 
                ? { ...alert, status: 'resolved', resolved_at: new Date().toISOString() }
                : alert
            ));
            Alert.alert('Succès', 'Alerte résolue avec succès');
          }
        }
      ]
    );
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#e74c3c';
      case 'warning': return '#f39c12';
      case 'info': return '#3498db';
      default: return '#95a5a6';
    }
  };

  const getAlertSeverityText = (severity: string) => {
    switch (severity) {
      case 'critical': return 'Critique';
      case 'warning': return 'Attention';
      case 'info': return 'Information';
      default: return 'Inconnu';
    }
  };

  const getAlertStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#e74c3c';
      case 'acknowledged': return '#f39c12';
      case 'resolved': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const getAlertStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'acknowledged': return 'Acquittée';
      case 'resolved': return 'Résolue';
      default: return 'Inconnu';
    }
  };

  const getAlertSeverityEmoji = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '❔';
    }
  };

  const getChartData = () => {
    if (!selectedServer) return null;

    // Compter les alertes par heure pour les dernières 24h
    const hourlyData = [];
    for (let i = 23; i >= 0; i--) {
      const hour = new Date();
      hour.setHours(hour.getHours() - i);
      hour.setMinutes(0, 0, 0);
      
      const hourStart = hour.getTime();
      const hourEnd = hourStart + 3600000;
      
      const criticalCount = alerts.filter(alert => 
        alert.severity === 'critical' && 
        new Date(alert.timestamp).getTime() >= hourStart && 
        new Date(alert.timestamp).getTime() < hourEnd
      ).length;
      
      const warningCount = alerts.filter(alert => 
        alert.severity === 'warning' && 
        new Date(alert.timestamp).getTime() >= hourStart && 
        new Date(alert.timestamp).getTime() < hourEnd
      ).length;
      
      hourlyData.push({
        hour: hour.getHours(),
        critical: criticalCount,
        warning: warningCount,
      });
    }

    return {
      labels: hourlyData.map(d => `${d.hour}h`),
      datasets: [
        {
          data: hourlyData.map(d => d.critical),
          color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data: hourlyData.map(d => d.warning),
          color: (opacity = 1) => `rgba(243, 156, 18, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  const chartData = getChartData();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement des alertes...</Text>
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
        <Text style={styles.title}>🚨 Alertes</Text>
        <Text style={styles.subtitle}>
          Gestion des alertes - {new Date().toLocaleDateString('fr-FR')}
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
          {/* Statistiques des alertes */}
          <View style={styles.statsContainer}>
            <MetricCard
              title="Alertes Actives"
              value={alerts.filter(a => a.status === 'active').length.toString()}
              icon="🚨"
              color="#e74c3c"
            />
            <MetricCard
              title="Alertes Acquittées"
              value={alerts.filter(a => a.status === 'acknowledged').length.toString()}
              icon="⚠️"
              color="#f39c12"
            />
            <MetricCard
              title="Alertes Résolues"
              value={alerts.filter(a => a.status === 'resolved').length.toString()}
              icon="✅"
              color="#27ae60"
            />
          </View>

          {/* Filtres */}
          <Card style={styles.filtersCard}>
            <Text style={styles.sectionTitle}>🔍 Filtres</Text>
            <View style={styles.filterContainer}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Sévérité:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.filterButtons}>
                    {['all', 'critical', 'warning', 'info'].map((severity) => (
                      <TouchableOpacity
                        key={severity}
                        style={[
                          styles.filterButton,
                          filter === severity && styles.selectedFilterButton
                        ]}
                        onPress={() => setFilter(severity)}
                      >
                        <Text style={[
                          styles.filterButtonText,
                          filter === severity && styles.selectedFilterButtonText
                        ]}>
                          {severity === 'all' ? 'Toutes' : 
                           severity === 'critical' ? 'Critiques' :
                           severity === 'warning' ? 'Attention' : 'Info'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
              
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Période:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.filterButtons}>
                    {['1h', '6h', '24h', '7d'].map((range) => (
                      <TouchableOpacity
                        key={range}
                        style={[
                          styles.filterButton,
                          timeRange === range && styles.selectedFilterButton
                        ]}
                        onPress={() => setTimeRange(range)}
                      >
                        <Text style={[
                          styles.filterButtonText,
                          timeRange === range && styles.selectedFilterButtonText
                        ]}>
                          {range === '1h' ? '1 heure' : 
                           range === '6h' ? '6 heures' :
                           range === '24h' ? '24 heures' : '7 jours'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
          </Card>

          {/* Graphique d'évolution */}
          {chartData && (
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>📈 Évolution des alertes (24h)</Text>
              <LineChart
                data={chartData}
                width={screenWidth - 40}
                height={200}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
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
                  <View style={[styles.legendColor, { backgroundColor: '#e74c3c' }]} />
                  <Text style={styles.legendText}>Critiques</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#f39c12' }]} />
                  <Text style={styles.legendText}>Attention</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Liste des alertes */}
          <Card style={styles.alertsCard}>
            <Text style={styles.sectionTitle}>📋 Liste des Alertes</Text>
            {alerts.map((alert: any, index: number) => (
              <View key={alert.id} style={styles.alertItem}>
                <View style={styles.alertHeader}>
                  <View style={styles.alertInfo}>
                    <View style={styles.alertSeverityContainer}>
                      <Text style={[
                        styles.alertSeverity,
                        { backgroundColor: getAlertSeverityColor(alert.severity) }
                      ]}>
                        {getAlertSeverityEmoji(alert.severity)} {getAlertSeverityText(alert.severity)}
                      </Text>
                    </View>
                    <View style={styles.alertStatusContainer}>
                      <Text style={[
                        styles.alertStatus,
                        { color: getAlertStatusColor(alert.status) }
                      ]}>
                        {getAlertStatusText(alert.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.alertTime}>
                    {new Date(alert.timestamp).toLocaleString('fr-FR')}
                  </Text>
                </View>
                
                <View style={styles.alertDetails}>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                  <View style={styles.alertMetrics}>
                    <Text style={styles.alertMetric}>
                      {alert.metric_type.toUpperCase()}: {alert.current_value} / {alert.threshold}
                    </Text>
                  </View>
                </View>

                <View style={styles.alertActions}>
                  {alert.status === 'active' && (
                    <TouchableOpacity
                      style={styles.alertActionButton}
                      onPress={() => handleAcknowledgeAlert(alert.id)}
                    >
                      <Text style={styles.alertActionText}>Acquitter</Text>
                    </TouchableOpacity>
                  )}
                  {(alert.status === 'active' || alert.status === 'acknowledged') && (
                    <TouchableOpacity
                      style={[styles.alertActionButton, styles.resolveButton]}
                      onPress={() => handleResolveAlert(alert.id)}
                    >
                      <Text style={styles.alertActionText}>Résoudre</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {index < alerts.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ))}
          </Card>

          {/* Règles d'alerte */}
          <Card style={styles.rulesCard}>
            <Text style={styles.sectionTitle}>⚙️ Règles d'Alerte</Text>
            {alertRules.map((rule: any, index: number) => (
              <View key={rule.id} style={styles.ruleItem}>
                <View style={styles.ruleHeader}>
                  <View style={styles.ruleInfo}>
                    <Text style={styles.ruleDescription}>{rule.description}</Text>
                    <View style={styles.ruleMetrics}>
                      <Text style={styles.ruleMetric}>
                        Seuil: {rule.threshold}
                      </Text>
                      <Text style={[
                        styles.ruleSeverity,
                        { color: getAlertSeverityColor(rule.severity) }
                      ]}>
                        {getAlertSeverityEmoji(rule.severity)} {getAlertSeverityText(rule.severity)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.ruleToggle}>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        rule.enabled ? styles.toggleEnabled : styles.toggleDisabled
                      ]}
                      onPress={() => {
                        setAlertRules(alertRules.map(r => 
                          r.id === rule.id ? { ...r, enabled: !r.enabled } : r
                        ));
                      }}
                    >
                      <Text style={styles.toggleText}>
                        {rule.enabled ? '✓' : '✗'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {index < alertRules.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ))}
          </Card>

          {/* Actions */}
          <Card style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>🔧 Actions d'Alerte</Text>
            <View style={styles.actionsContainer}>
              <CustomButton
                title="📧 Envoyer toutes les alertes par email"
                onPress={() => Alert.alert('Info', 'Fonctionnalité à implémenter')}
                style={styles.actionButton}
              />
              <CustomButton
                title="🔕 Acquitter toutes les alertes"
                onPress={() => Alert.alert('Info', 'Fonctionnalité à implémenter')}
                style={styles.actionButton}
              />
              <CustomButton
                title="⚙️ Configurer les notifications"
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
  },
  filtersCard: {
    margin: 20,
    marginBottom: 10,
  },
  filterContainer: {
    gap: 15,
  },
  filterGroup: {
    gap: 10,
  },
  filterLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
    marginBottom: 5,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  selectedFilterButton: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  selectedFilterButtonText: {
    color: 'white',
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
  alertsCard: {
    margin: 20,
    marginBottom: 10,
  },
  alertItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 10,
  },
  alertSeverityContainer: {
    flex: 1,
  },
  alertSeverity: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertStatusContainer: {
    alignItems: 'flex-end',
  },
  alertStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertTime: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  alertDetails: {
    marginBottom: 10,
  },
  alertMessage: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 5,
  },
  alertMetrics: {
    gap: 5,
  },
  alertMetric: {
    fontSize: 12,
    color: '#7f8c8d',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 8,
  },
  alertActionButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resolveButton: {
    backgroundColor: '#27ae60',
  },
  alertActionText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 10,
  },
  rulesCard: {
    margin: 20,
    marginBottom: 10,
  },
  ruleItem: {
    marginBottom: 15,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ruleInfo: {
    flex: 1,
    marginRight: 15,
  },
  ruleDescription: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 5,
  },
  ruleMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleMetric: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  ruleSeverity: {
    fontSize: 12,
    fontWeight: '600',
  },
  ruleToggle: {
    alignItems: 'center',
  },
  toggleButton: {
    width: 40,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleEnabled: {
    backgroundColor: '#27ae60',
  },
  toggleDisabled: {
    backgroundColor: '#e74c3c',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
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
