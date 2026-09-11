import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import Card from '@/components/Card';
import SearchBar from '@/components/SearchBar';
import { Theme } from '@/constants/theme';
import { apiService } from '@/services/apiService';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

type BackupInfo = {
  date: string;
  status?: string;
  size?: number | null;
  duration?: number | null;
  is_from_today?: boolean;
};

type BackupStatus = {
  server_id: string;
  latest_backup: BackupInfo | null;
  last_successful: BackupInfo | null;
  last_failed: BackupInfo | null;
  current_status: 'OK' | 'Failed' | 'Missing';
  summary: {
    has_recent_backup: boolean;
    is_healthy: boolean;
    requires_attention: boolean;
  };
};

// Mirrors frontend/src/components/BackupsPanel.js's getStatusColor exactly
// (verified value-by-value — Missing's #FF9800 is a different orange from
// Theme.status.WARNING's #FFC107, so this can't just reuse Theme.status).
const BACKUP_STATUS_COLORS: Record<string, string> = {
  OK: '#4CAF50',
  Failed: '#F44336',
  Missing: '#FF9800',
};
const getBackupStatusColor = (status?: string) => BACKUP_STATUS_COLORS[status || ''] || '#9E9E9E';

const BACKUP_STATUS_LABELS: Record<string, string> = {
  OK: 'OK',
  Failed: 'Échouée',
  Missing: 'Manquante',
};
const getBackupStatusLabel = (status?: string) => BACKUP_STATUS_LABELS[status || ''] || status || 'Inconnu';

// Same rules as BackupsPanel.js's formatSize — a genuine 0 MB backup is
// real data (e.g. failed before writing anything), only null/undefined
// means "unknown".
const formatSize = (sizeInMB?: number | null) => {
  if (sizeInMB === null || sizeInMB === undefined) return 'Indisponible';
  if (sizeInMB >= 1024) return (sizeInMB / 1024).toFixed(2) + ' GB';
  return sizeInMB.toFixed(2) + ' MB';
};

const formatDuration = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined) return 'Indisponible';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}min ${secs}s`;
};

export default function BackupsScreen() {
  const [servers, setServers] = useState<any[]>([]);
  const [backupStatuses, setBackupStatuses] = useState<Record<string, BackupStatus>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const filteredServers = servers.filter((s) =>
    (s.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const fetchData = useCallback(async () => {
    try {
      const serversData = await apiService.getServers();
      setServers(serversData || []);

      const results = await Promise.all(
        (serversData || []).map((server: any) =>
          apiService
            .getBackupStatus(server.server_id)
            .then((data: BackupStatus) => [server.server_id, data] as const)
            .catch(() => [
              server.server_id,
              {
                server_id: server.server_id,
                latest_backup: null,
                last_successful: null,
                last_failed: null,
                current_status: 'Missing' as const,
                summary: { has_recent_backup: false, is_healthy: false, requires_attention: true },
              },
            ] as const)
        )
      );
      setBackupStatuses(Object.fromEntries(results));
    } catch (error) {
      console.warn('[Backups] fetch error', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sauvegardes</Text>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un serveur..." style={styles.searchBar} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.accent} />}
      >
        {!loading && servers.length === 0 && <Text style={styles.emptyText}>Aucun serveur disponible</Text>}

        {filteredServers.map((server) => {
          const backupInfo = backupStatuses[server.server_id];
          const latestBackup = backupInfo?.latest_backup;
          const currentStatus = backupInfo?.current_status || 'Missing';
          const lastSuccessful = backupInfo?.last_successful;
          const lastFailed = backupInfo?.last_failed;
          const summary = backupInfo?.summary;
          const statusColor = getBackupStatusColor(currentStatus);

          return (
            <Card key={server.server_id} style={[styles.serverCard, { borderTopColor: statusColor, borderTopWidth: 3 }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.serverName}>{server.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}26`, borderColor: `${statusColor}66` }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusText, { color: statusColor }]}>{getBackupStatusLabel(currentStatus)}</Text>
                </View>
              </View>

              {latestBackup ? (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Dernière sauvegarde</Text>
                    <Text style={styles.infoValue}>{formatRelativeTime(latestBackup.date)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Taille</Text>
                    <Text style={styles.infoValue}>{formatSize(latestBackup.size)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Durée</Text>
                    <Text style={styles.infoValue}>{formatDuration(latestBackup.duration)}</Text>
                  </View>
                  {latestBackup.is_from_today && (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayBadgeText}>Sauvegarde d'aujourd'hui</Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.emptyText}>Aucune sauvegarde trouvée</Text>
              )}

              <View style={styles.footer}>
                {lastSuccessful && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Dernier succès</Text>
                    <Text style={styles.infoValue}>{formatRelativeTime(lastSuccessful.date)}</Text>
                  </View>
                )}
                {lastFailed && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Dernier échec</Text>
                    <Text style={[styles.infoValue, { color: Theme.status.CRITICAL }]}>{formatRelativeTime(lastFailed.date)}</Text>
                  </View>
                )}
                {!lastSuccessful && !lastFailed && (
                  <Text style={styles.emptyText}>Aucun historique de sauvegarde</Text>
                )}
              </View>

              {summary && (
                <View style={styles.healthRow}>
                  {summary.is_healthy && (
                    <View style={[styles.healthChip, { backgroundColor: `${Theme.status.OK}26`, borderColor: `${Theme.status.OK}66` }]}>
                      <Text style={[styles.healthChipText, { color: Theme.status.OK }]}>Saine</Text>
                    </View>
                  )}
                  {summary.requires_attention && (
                    <View style={[styles.healthChip, { backgroundColor: '#FF980026', borderColor: '#FF980066' }]}>
                      <Text style={[styles.healthChipText, { color: '#FF9800' }]}>Attention requise</Text>
                    </View>
                  )}
                  {summary.has_recent_backup && (
                    <View style={[styles.healthChip, { backgroundColor: `${Theme.colors.accent}26`, borderColor: `${Theme.colors.accent}66` }]}>
                      <Text style={[styles.healthChipText, { color: Theme.colors.accent }]}>Récente</Text>
                    </View>
                  )}
                </View>
              )}
            </Card>
          );
        })}
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
  searchBar: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl,
  },
  emptyText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
  },
  serverCard: {
    marginBottom: Theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  serverName: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Theme.radius.pill,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  infoLabel: {
    fontSize: 13,
    color: Theme.colors.textMuted,
  },
  infoValue: {
    fontSize: 13,
    color: Theme.colors.textPrimary,
    fontWeight: '600',
  },
  todayBadge: {
    marginTop: Theme.spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: `${Theme.colors.accent}26`,
    borderRadius: Theme.radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.accent,
  },
  footer: {
    marginTop: Theme.spacing.sm,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  healthRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.xs,
    marginTop: Theme.spacing.sm,
  },
  healthChip: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Theme.radius.pill,
    borderWidth: 1,
  },
  healthChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
