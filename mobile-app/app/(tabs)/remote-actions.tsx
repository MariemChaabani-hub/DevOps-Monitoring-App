import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Card from '@/components/Card';
import StatusBadge from '@/components/StatusBadge';
import { Theme } from '@/constants/theme';
import { apiService } from '@/services/apiService';

export default function RemoteActionsScreen() {
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [servicesStatus, setServicesStatus] = useState<Record<string, any>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [rebooting, setRebooting] = useState(false);
  const burstTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const selectedServer = servers.find((s) => s.server_id === selectedServerId);
  const detectedServices: string[] = selectedServer?.services || [];

  useEffect(() => {
    apiService
      .getServers()
      .then((data) => {
        setServers(data || []);
        if (data?.length && !selectedServerId) {
          setSelectedServerId(data[0].server_id);
        }
      })
      .catch((error: any) => Alert.alert('Erreur', error.message || 'Impossible de charger les serveurs'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStatus = useCallback(async (serverId: string) => {
    try {
      const data = await apiService.getServicesStatus(serverId);
      setServicesStatus(data.services || {});
    } catch (error: any) {
      console.warn('[RemoteActions] status fetch error', error);
    }
  }, []);

  useEffect(() => {
    setServicesStatus({});
    if (selectedServerId) fetchStatus(selectedServerId);
    return () => {
      burstTimeouts.current.forEach(clearTimeout);
      burstTimeouts.current = [];
    };
  }, [selectedServerId, fetchStatus]);

  // After an action, a service takes a few seconds to actually change
  // state — a short burst of re-checks (like the web RemoteActionsPanel)
  // is more useful here than a permanent background poll.
  const scheduleStatusBurst = (serverId: string) => {
    burstTimeouts.current.forEach(clearTimeout);
    burstTimeouts.current = [3000, 6000, 9000, 12000, 15000].map((delay) =>
      setTimeout(() => fetchStatus(serverId), delay)
    );
  };

  const runServiceAction = async (action: 'restart' | 'stop', serviceName: string) => {
    if (!selectedServerId) return;
    const key = `${serviceName}_${action}`;
    setBusyKey(key);
    try {
      const fn = action === 'restart' ? apiService.restartService : apiService.stopService;
      const result = await fn(selectedServerId, serviceName);
      Alert.alert('Succès', result.message);
      fetchStatus(selectedServerId);
      scheduleStatusBurst(selectedServerId);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || `Échec de l'action sur ${serviceName}`);
    } finally {
      setBusyKey(null);
    }
  };

  const handleRebootServer = () => {
    if (!selectedServer) return;
    Alert.alert(
      'Redémarrer le serveur',
      `Êtes-vous sûr de vouloir redémarrer ${selectedServer.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            setRebooting(true);
            try {
              const result = await apiService.restartServer(selectedServer.server_id, 30);
              Alert.alert('Succès', result.message);
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Impossible de redémarrer le serveur');
            } finally {
              setRebooting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Actions à distance</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chipsContent}>
        {servers.map((server) => {
          const isActive = server.server_id === selectedServerId;
          return (
            <TouchableOpacity
              key={server.server_id}
              onPress={() => setSelectedServerId(server.server_id)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{server.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        {!selectedServer && (
          <Text style={styles.emptyText}>Sélectionnez un serveur</Text>
        )}

        {selectedServer && (
          <>
            <Card style={styles.rebootCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rebootTitle}>Redémarrer le serveur</Text>
                <Text style={styles.rebootSubtitle}>{selectedServer.name}</Text>
              </View>
              <TouchableOpacity
                style={[styles.rebootButton, rebooting && styles.disabledButton]}
                onPress={handleRebootServer}
                disabled={rebooting}
              >
                <Text style={styles.rebootButtonText}>
                  {rebooting ? '...' : 'Redémarrer'}
                </Text>
              </TouchableOpacity>
            </Card>

            {detectedServices.length === 0 && (
              <Text style={styles.emptyText}>
                Aucun service détecté pour ce serveur pour le moment.
              </Text>
            )}

            {detectedServices.map((serviceName) => {
              const status = servicesStatus[serviceName];
              const restartKey = `${serviceName}_restart`;
              const stopKey = `${serviceName}_stop`;
              return (
                <Card key={serviceName} style={styles.serviceCard}>
                  <View style={styles.serviceHeader}>
                    <Text style={styles.serviceName}>{serviceName}</Text>
                    <StatusBadge status={status?.status} label={status?.label} />
                  </View>
                  <View style={styles.serviceActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.restartButton, busyKey === restartKey && styles.disabledButton]}
                      onPress={() => runServiceAction('restart', serviceName)}
                      disabled={busyKey === restartKey}
                    >
                      <Text style={styles.actionButtonText}>
                        {busyKey === restartKey ? '...' : 'Redémarrer'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.stopButton, busyKey === stopKey && styles.disabledButton]}
                      onPress={() => runServiceAction('stop', serviceName)}
                      disabled={busyKey === stopKey}
                    >
                      <Text style={styles.actionButtonText}>
                        {busyKey === stopKey ? '...' : 'Arrêter'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
  },
  chipsRow: {
    flexGrow: 0,
    marginBottom: Theme.spacing.sm,
  },
  chipsContent: {
    paddingHorizontal: Theme.spacing.lg,
    gap: Theme.spacing.sm,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginRight: Theme.spacing.sm,
  },
  chipActive: {
    backgroundColor: Theme.colors.accent,
    borderColor: Theme.colors.accent,
  },
  chipText: {
    color: Theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: Theme.colors.textPrimary,
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl,
  },
  emptyText: {
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginTop: Theme.spacing.lg,
  },
  rebootCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    borderColor: Theme.colors.danger,
  },
  rebootTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  rebootSubtitle: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  rebootButton: {
    backgroundColor: Theme.colors.danger,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Theme.radius.sm,
  },
  rebootButtonText: {
    color: Theme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  serviceCard: {
    marginBottom: Theme.spacing.sm,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  serviceActions: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Theme.radius.sm,
    alignItems: 'center',
  },
  restartButton: {
    backgroundColor: Theme.colors.accent,
  },
  stopButton: {
    backgroundColor: Theme.colors.danger,
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: Theme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
});
