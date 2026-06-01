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
import { apiService } from '../services/apiService';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';

const ServersScreen = ({ navigation }) => {
  const [servers, setServers] = useState([]);
  const [filteredServers, setFilteredServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    fetchServers();
  }, []);

  useEffect(() => {
    filterServers();
  }, [servers, searchText, filterStatus]);

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

  const filterServers = () => {
    let filtered = servers;

    // Filtrer par statut
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(server => server.status === filterStatus);
    }

    // Filtrer par texte de recherche
    if (searchText) {
      filtered = filtered.filter(server =>
        server.name.toLowerCase().includes(searchText.toLowerCase()) ||
        server.server_id.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredServers(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchServers();
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

  const renderServerItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('ServerDetails', { serverId: item.server_id })}
    >
      <Card style={styles.serverCard}>
        <View style={styles.serverHeader}>
          <View style={styles.serverInfo}>
            <Text style={styles.serverName}>{item.name}</Text>
            <Text style={styles.serverId}>{item.server_id}</Text>
            <Text style={styles.serverLocation}>{item.location}</Text>
          </View>
          <View style={styles.statusContainer}>
            <Text style={styles.statusEmoji}>
              {getStatusEmoji(item.status)}
            </Text>
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) }
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

        <View style={styles.actionRow}>
          <CustomButton
            title="🔧 Actions"
            onPress={() => {
              // TODO: Naviguer vers les actions à distance
              Alert.alert('Actions', `Actions pour ${item.name}`);
            }}
            style={[
              styles.actionButton,
              { backgroundColor: getStatusColor(item.status) }
            ]}
            small
          />
          <CustomButton
            title="📊 Détails"
            onPress={() => navigation.navigate('ServerDetails', { serverId: item.server_id })}
            style={styles.actionButton}
            small
          />
        </View>
      </Card>
    </TouchableOpacity>
  );

  const getFilterButtons = () => {
    const filters = [
      { key: 'ALL', label: 'Tous', color: '#95a5a6' },
      { key: 'OK', label: 'OK', color: '#27ae60' },
      { key: 'CRITICAL', label: 'CRITICAL', color: '#e74c3c' },
      { key: 'WARNING', label: 'WARNING', color: '#f39c12' },
      { key: 'OFFLINE', label: 'OFFLINE', color: '#95a5a6' },
    ];

    return (
      <View style={styles.filterContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              {
                backgroundColor: filterStatus === filter.key ? filter.color : '#ecf0f1',
                borderColor: filter.color,
              }
            ]}
            onPress={() => setFilterStatus(filter.key)}
          >
            <Text
              style={[
                styles.filterButtonText,
                {
                  color: filterStatus === filter.key ? 'white' : filter.color,
                }
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement des serveurs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Serveurs</Text>
        <Text style={styles.subtitle}>
          {filteredServers.length} serveur{filteredServers.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un serveur..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Filtres */}
      {getFilterButtons()}

      {/* Liste des serveurs */}
      <FlatList
        data={filteredServers}
        renderItem={renderServerItem}
        keyExtractor={(item) => item.server_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun serveur trouvé</Text>
          </View>
        }
      />
    </View>
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
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  searchContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
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
    marginBottom: 2,
  },
  serverLocation: {
    fontSize: 11,
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
});

export default ServersScreen;
