import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { Link } from 'expo-router';
import { apiService } from '../../services/apiService';
import Card from '../../components/Card';
import CustomButton from '../../components/CustomButton';
import { APP_CONFIG, getServerStatusColor, getServerStatusEmoji } from '../../config/constants';

export default function ServersScreen() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const data = await apiService.getServers();
      setServers(data);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les serveurs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchServers();
  };

  const filteredServers = servers.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         server.server_id.toLowerCase().includes(searchText.toLowerCase());
    const matchesFilter = filterStatus === 'all' || server.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const renderServerItem = ({ item }) => (
    <Link href={`/server-details/${item._id}`} asChild>
      <TouchableOpacity>
        <Card style={styles.serverCard}>
          <View style={styles.serverHeader}>
            <View style={styles.serverInfo}>
              <Text style={styles.serverName}>{item.name}</Text>
              <Text style={styles.serverId}>{item.server_id}</Text>
              <Text style={styles.serverLocation}>{item.location}</Text>
            </View>
            <View style={styles.statusContainer}>
              <Text style={styles.statusEmoji}>
                {getServerStatusEmoji(item.status)}
              </Text>
              <Text
                style={[
                  styles.statusText,
                  { color: getServerStatusColor(item.status) }
                ]}
              >
                {item.status}
              </Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>CPU</Text>
              <Text style={styles.metricValue}>
                {item.current_metrics?.cpu_percent?.toFixed(1) || 0}%
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>RAM</Text>
              <Text style={styles.metricValue}>
                {item.current_metrics?.ram_percent?.toFixed(1) || 0}%
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Disk</Text>
              <Text style={styles.metricValue}>
                {item.current_metrics?.disk_percent?.toFixed(1) || 0}%
              </Text>
            </View>
          </View>

          <View style={styles.serverFooter}>
            <Text style={styles.lastUpdate}>
              Mis à jour: {new Date(item.last_metric_time).toLocaleString('fr-FR')}
            </Text>
            <Text style={styles.arrow}>→</Text>
          </View>
        </Card>
      </TouchableOpacity>
    </Link>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement des serveurs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête avec recherche et filtres */}
      <View style={styles.header}>
        <Text style={styles.title}>Serveurs</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un serveur..."
          value={searchText}
          onChangeText={setSearchText}
        />
        <View style={styles.filterContainer}>
          {['all', 'OK', 'CRITICAL', 'WARNING', 'OFFLINE'].map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                filterStatus === status && styles.filterButtonActive
              ]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === status && styles.filterButtonTextActive
              ]}>
                {status === 'all' ? 'Tous' : status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Liste des serveurs */}
      <FlatList
        data={filteredServers}
        renderItem={renderServerItem}
        keyExtractor={item => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchText || filterStatus !== 'all' 
                ? 'Aucun serveur trouvé' 
                : 'Aucun serveur disponible'}
            </Text>
            <CustomButton
              title="Réessayer"
              onPress={fetchServers}
              style={styles.retryButton}
            />
          </View>
        )}
      />
    </View>
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
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterButtonActive: {
    backgroundColor: '#3498db',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  listContainer: {
    padding: 20,
  },
  serverCard: {
    marginBottom: 15,
  },
  serverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: 18,
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
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  serverFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastUpdate: {
    fontSize: 11,
    color: '#95a5a6',
    flex: 1,
  },
  arrow: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
  },
});
