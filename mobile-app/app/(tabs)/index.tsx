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
import { Link } from 'expo-router';
import { apiService } from '../../services/apiService';
import Card from '../../components/Card';
import MetricCard from '../../components/MetricCard';
import CustomButton from '../../components/CustomButton';
import { APP_CONFIG, getServerStatusColor, getServerStatusEmoji } from '../../config/constants';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Données mockées standard pour le Dashboard
  const mockDashboardData = {
    cpu_usage: 45.2,
    ram_usage: 62.8,
    disk_usage: 78.5,
    total_servers: 5,
    active_servers: 4,
    critical_servers: 1,
    alerts: [
      {
        server_name: 'Server-01',
        severity: 'HIGH',
        message: 'CPU usage above 80%',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        server_name: 'Server-03',
        severity: 'MEDIUM',
        message: 'Disk space low',
        timestamp: new Date(Date.now() - 7200000).toISOString()
      },
      {
        server_name: 'Server-05',
        severity: 'LOW',
        message: 'Memory usage warning',
        timestamp: new Date(Date.now() - 10800000).toISOString()
      }
    ],
    performance_data: {
      labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
      cpu: [35, 42, 55, 48, 62, 45],
      ram: [58, 62, 65, 60, 68, 63]
    },
    last_updated: new Date().toISOString()
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Utiliser les données mockées directement pour le moment
      setDashboardData(mockDashboardData);
    } catch (error: any) {
      console.log('Erreur lors du chargement, utilisation des données mockées');
      setDashboardData(mockDashboardData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement du dashboard...</Text>
      </View>
    );
  }

  if (!dashboardData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Impossible de charger les données</Text>
        <CustomButton
          title="Réessayer"
          onPress={fetchDashboardData}
          style={styles.retryButton}
        />
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
        <Text style={styles.title}>Monitoring Dashboard</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Métriques principales */}
      <View style={styles.metricsContainer}>
        <MetricCard
          title="CPU Usage"
          value={`${dashboardData.cpu_usage?.toFixed(1) || 0}%`}
          icon="💻"
          color="#e74c3c"
        />
        <MetricCard
          title="RAM Usage"
          value={`${dashboardData.ram_usage?.toFixed(1) || 0}%`}
          icon="🧠"
          color="#3498db"
        />
        <MetricCard
          title="Disk Usage"
          value={`${dashboardData.disk_usage?.toFixed(1) || 0}%`}
          icon="💾"
          color="#f39c12"
        />
      </View>

      {/* Statistiques serveurs */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Text style={styles.statTitle}>🖥️ Serveurs Total</Text>
          <Text style={styles.statValue}>{dashboardData.total_servers || 0}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statTitle}>🟢 Serveurs Actifs</Text>
          <Text style={styles.statValue}>{dashboardData.active_servers || 0}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statTitle}>🔴 Serveurs Critiques</Text>
          <Text style={styles.statValue}>{dashboardData.critical_servers || 0}</Text>
        </Card>
      </View>

      {/* Alertes */}
      {dashboardData.alerts && dashboardData.alerts.length > 0 && (
        <Card style={styles.alertsCard}>
          <Text style={styles.alertsTitle}>🚨 Alertes Actives</Text>
          {dashboardData.alerts.slice(0, 3).map((alert: any, index: number) => (
            <View key={index} style={styles.alertItem}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertServer}>{alert.server_name}</Text>
                <Text style={[
                  styles.alertSeverity,
                  { color: getServerStatusColor(alert.severity) }
                ]}>
                  {getServerStatusEmoji(alert.severity)} {alert.severity}
                </Text>
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertTime}>
                {new Date(alert.timestamp).toLocaleTimeString('fr-FR')}
              </Text>
            </View>
          ))}
          {dashboardData.alerts.length > 3 && (
            <TouchableOpacity style={styles.viewAllAlerts}>
              <Text style={styles.viewAllText}>
                Voir toutes les alertes ({dashboardData.alerts.length})
              </Text>
            </TouchableOpacity>
          )}
        </Card>
      )}

      {/* Graphique de performance */}
      {dashboardData.performance_data && (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Performance (6 dernières heures)</Text>
          <LineChart
            data={{
              labels: dashboardData.performance_data.labels || [],
              datasets: [
                {
                  data: dashboardData.performance_data.cpu || [],
                  color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
                  strokeWidth: 2,
                },
                {
                  data: dashboardData.performance_data.ram || [],
                  color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
                  strokeWidth: 2,
                },
              ],
            }}
            width={screenWidth - 40}
            height={220}
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

      {/* Actions rapides */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Actions Rapides</Text>
        <View style={styles.actionsContainer}>
          <Link href="/servers" asChild>
            <CustomButton
              title="📊 Voir les serveurs"
              onPress={() => {}}
              style={styles.actionButton}
            />
          </Link>
          <CustomButton
            title="🔄 Actualiser"
            onPress={onRefresh}
            style={styles.actionButton}
          />
        </View>
      </View>

      {/* Dernière mise à jour */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Dernière mise à jour: {new Date(dashboardData.last_updated).toLocaleString('fr-FR')}
        </Text>
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3498db',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    gap: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  statTitle: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  alertsCard: {
    margin: 20,
    marginBottom: 10,
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  alertItem: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertServer: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  alertSeverity: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertMessage: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 11,
    color: '#95a5a6',
  },
  viewAllAlerts: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  viewAllText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
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
  actionsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
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
  footer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  footerText: {
    fontSize: 12,
    color: '#95a5a6',
  },
});
