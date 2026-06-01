import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { apiService } from '../services/apiService';
import Card from '../components/Card';
import MetricCard from '../components/MetricCard';
import CustomButton from '../components/CustomButton';

const { width: screenWidth } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const [metrics, setMetrics] = useState([]);
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [serversData, metricsData] = await Promise.all([
        apiService.getServers(),
        apiService.getMetrics()
      ]);
      
      setServers(serversData);
      setMetrics(metricsData);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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

  const getCriticalServers = () => {
    return servers.filter(server => server.status === 'CRITICAL');
  };

  const getOfflineServers = () => {
    return servers.filter(server => server.status === 'OFFLINE');
  };

  const getAverageMetrics = () => {
    if (metrics.length === 0) return { cpu: 0, ram: 0, disk: 0 };
    
    const totals = metrics.reduce((acc, metric) => ({
      cpu: acc.cpu + (metric.cpu_percent || 0),
      ram: acc.ram + (metric.ram_percent || 0),
      disk: acc.disk + (metric.disk_percent || 0),
    }), { cpu: 0, ram: 0, disk: 0 });

    return {
      cpu: totals.cpu / metrics.length,
      ram: totals.ram / metrics.length,
      disk: totals.disk / metrics.length,
    };
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
        {
          data: last24Hours.map(m => m.disk_percent || 0),
          color: (opacity = 1) => `rgba(243, 156, 18, ${opacity})`,
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

  const averageMetrics = getAverageMetrics();
  const chartData = getChartData();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>Tableau de Bord</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Cartes de métriques principales */}
      <View style={styles.metricsContainer}>
        <MetricCard
          title="CPU Moyen"
          value={`${averageMetrics.cpu.toFixed(1)}%`}
          icon="💻"
          color="#e74c3c"
        />
        <MetricCard
          title="RAM Moyenne"
          value={`${averageMetrics.ram.toFixed(1)}%`}
          icon="🧠"
          color="#3498db"
        />
        <MetricCard
          title="Disk Moyen"
          value={`${averageMetrics.disk.toFixed(1)}%`}
          icon="💾"
          color="#f39c12"
        />
      </View>

      {/* Cartes de statistiques */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Text style={styles.statTitle}>🖥️ Serveurs Total</Text>
          <Text style={styles.statValue}>{servers.length}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statTitle}>🔴 Serveurs Critiques</Text>
          <Text style={styles.statValue}>{getCriticalServers().length}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statTitle}>⚫ Serveurs Hors Ligne</Text>
          <Text style={styles.statValue}>{getOfflineServers().length}</Text>
        </Card>
      </View>

      {/* Graphique de performance */}
      {chartData && (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Performance (24 dernières heures)</Text>
          <LineChart
            data={chartData}
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
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#f39c12' }]} />
              <Text style={styles.legendText}>Disk</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Liste des serveurs récents */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>État des Serveurs</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Servers')}
            style={styles.seeAllButton}
          >
            <Text style={styles.seeAllText}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {metrics.slice(0, 3).map((server) => (
          <Card key={server.serverId} style={styles.serverCard}>
            <View style={styles.serverHeader}>
              <View style={styles.serverInfo}>
                <Text style={styles.serverName}>{server.serverName}</Text>
                <Text style={styles.serverId}>{server.serverId}</Text>
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
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>CPU</Text>
                <Text style={styles.metricValue}>
                  {server.cpu_percent?.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>RAM</Text>
                <Text style={styles.metricValue}>
                  {server.ram_percent?.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Disk</Text>
                <Text style={styles.metricValue}>
                  {server.disk_percent?.toFixed(1)}%
                </Text>
              </View>
            </View>

            <CustomButton
              title="Voir détails"
              onPress={() => navigation.navigate('ServerDetails', { serverId: server.serverId })}
              style={styles.detailsButton}
              small
            />
          </Card>
        ))}
      </View>

      {/* Actions rapides */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions Rapides</Text>
        <View style={styles.actionsContainer}>
          <CustomButton
            title="📊 Voir tous les serveurs"
            onPress={() => navigation.navigate('Servers')}
            style={styles.actionButton}
          />
          <CustomButton
            title="🔄 Actualiser"
            onPress={onRefresh}
            style={styles.actionButton}
          />
        </View>
      </View>
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    gap: 10,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  seeAllButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#3498db',
    borderRadius: 20,
  },
  seeAllText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  serverCard: {
    marginBottom: 15,
  },
  serverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  serverId: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  detailsButton: {
    marginTop: 10,
  },
  actionsContainer: {
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#3498db',
  },
});

export default DashboardScreen;
