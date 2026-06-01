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

export default function MetricsScreen() {
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [metricsData, setMetricsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('24h'); // 1h, 6h, 24h, 7d

  useEffect(() => {
    fetchServers();
  }, []);

  useEffect(() => {
    if (selectedServer) {
      fetchServerMetrics();
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

  const fetchServerMetrics = async () => {
    if (!selectedServer) return;

    try {
      const data = await apiService.getServerMetrics(selectedServer._id);
      setMetricsData(data);
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de charger les métriques du serveur');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchServers();
  };

  const getChartData = () => {
    if (!metricsData || metricsData.length === 0) return null;

    let filteredData = metricsData;
    const now = new Date();
    
    // Filtrer selon la plage temporelle
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

    filteredData = metricsData.filter((metric: any) => 
      new Date(metric.timestamp) >= cutoffTime
    );

    return {
      labels: filteredData.map((_: any, index: number) => {
        if (timeRange === '1h') return `${index * 5}m`;
        if (timeRange === '6h') return `${index * 30}m`;
        if (timeRange === '24h') return `${index}h`;
        return `${index}d`;
      }),
      datasets: [
        {
          data: filteredData.map((m: any) => m.cpu_percent || 0),
          color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data: filteredData.map((m: any) => m.ram_percent || 0),
          color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data: filteredData.map((m: any) => m.disk_percent || 0),
          color: (opacity = 1) => `rgba(243, 156, 18, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data: filteredData.map((m: any) => m.network_usage || 0),
          color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  const chartData = getChartData();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement des métriques...</Text>
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
        <Text style={styles.title}>📊 Métriques Détaillées</Text>
        <Text style={styles.subtitle}>
          Supervision en temps réel - {new Date().toLocaleDateString('fr-FR')}
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
          {/* Métriques actuelles */}
          <View style={styles.currentMetricsContainer}>
            <MetricCard
              title="CPU Actuel"
              value={`${selectedServer.current_metrics?.cpu_percent?.toFixed(1) || 0}%`}
              icon="💻"
              color="#e74c3c"
            />
            <MetricCard
              title="RAM Actuelle"
              value={`${selectedServer.current_metrics?.ram_percent?.toFixed(1) || 0}%`}
              icon="🧠"
              color="#3498db"
            />
            <MetricCard
              title="Disque Actuel"
              value={`${selectedServer.current_metrics?.disk_percent?.toFixed(1) || 0}%`}
              icon="💾"
              color="#f39c12"
            />
            <MetricCard
              title="Réseau Actuel"
              value={`${selectedServer.current_metrics?.network_usage?.toFixed(1) || 0} MB/s`}
              icon="🌐"
              color="#2ecc71"
            />
          </View>

          {/* Sélecteur de plage temporelle */}
          <Card style={styles.timeRangeCard}>
            <Text style={styles.sectionTitle}>⏰ Plage temporelle</Text>
            <View style={styles.timeRangeButtons}>
              {['1h', '6h', '24h', '7d'].map((range) => (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.timeRangeButton,
                    timeRange === range && styles.selectedTimeRangeButton
                  ]}
                  onPress={() => setTimeRange(range)}
                >
                  <Text style={[
                    styles.timeRangeButtonText,
                    timeRange === range && styles.selectedTimeRangeButtonText
                  ]}>
                    {range === '1h' ? '1 heure' : 
                     range === '6h' ? '6 heures' : 
                     range === '24h' ? '24 heures' : '7 jours'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Graphiques d'évolution */}
          {chartData && (
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>
                📈 Évolution temporelle - {selectedServer.name}
              </Text>
              <LineChart
                data={chartData}
                width={screenWidth - 40}
                height={300}
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
                    r: '3',
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
                  <Text style={styles.legendText}>Disque</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#2ecc71' }]} />
                  <Text style={styles.legendText}>Réseau</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Informations du serveur */}
          <Card style={styles.infoCard}>
            <Text style={styles.sectionTitle}>ℹ️ Informations du serveur</Text>
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nom:</Text>
                <Text style={styles.infoValue}>{selectedServer.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>ID:</Text>
                <Text style={styles.infoValue}>{selectedServer.server_id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>IP:</Text>
                <Text style={styles.infoValue}>{selectedServer.ip}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Location:</Text>
                <Text style={styles.infoValue}>{selectedServer.location}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>État:</Text>
                <Text style={[
                  styles.infoValue,
                  { color: getServerStatusColor(selectedServer.status) }
                ]}>
                  {getServerStatusEmoji(selectedServer.status)} {selectedServer.status}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Dernière mise à jour:</Text>
                <Text style={styles.infoValue}>
                  {new Date(selectedServer.last_metric_time).toLocaleString('fr-FR')}
                </Text>
              </View>
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
  serverChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginRight: 6,
  },
  selectedServerChip: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  selectedServerChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginRight: 6,
  },
  serverChipStatus: {
    fontSize: 16,
  },
  currentMetricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    gap: 10,
    flexWrap: 'wrap',
  },
  timeRangeCard: {
    margin: 20,
    marginBottom: 10,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    backgroundColor: '#e9ecef',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedTimeRangeButton: {
    backgroundColor: '#3498db',
  },
  timeRangeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  selectedTimeRangeButtonText: {
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
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 5,
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
  infoCard: {
    margin: 20,
    marginBottom: 20,
  },
  infoContainer: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
});
