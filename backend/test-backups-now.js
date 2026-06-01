/**
 * Script de test pour générer des backups immédiatement
 * Permet de tester le système de backup monitoring sans attendre 23:46
 */

const mongoose = require('mongoose');
const Backup = require('./models/Backup');
const Server = require('./models/Server');

// Configuration MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pfe-monitoring';

async function generateTestBackups() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Récupérer tous les serveurs
    const servers = await Server.find({});
    console.log(`📋 Trouvé ${servers.length} serveur(s)`);

    if (servers.length === 0) {
      console.log('❌ Aucun serveur trouvé. Création de serveurs de test...');
      
      // Créer des serveurs de test s'il n'y en a pas
      const testServers = [
        { server_id: 'server-1', hostname: 'Production Web Server', ip: '192.168.1.10' },
        { server_id: 'server-2', hostname: 'Database Server', ip: '192.168.1.11' },
        { server_id: 'server-3', hostname: 'API Server', ip: '192.168.1.12' },
        { server_id: 'server-4', hostname: 'Backup Server', ip: '192.168.1.13' }
      ];

      for (const serverData of testServers) {
        const server = new Server(serverData);
        await server.save();
        servers.push(server);
      }
      console.log(`✅ Créé ${testServers.length} serveurs de test`);
    }

    // Supprimer les anciens backups de test pour éviter les doublons
    await Backup.deleteMany({});
    console.log('🗑️ Anciens backups supprimés');

    // Générer des backups pour chaque serveur avec différents statuts
    const backupConfigs = [
      { serverId: servers[0]?.server_id || 'server-1', status: 'OK', size: 2500, duration: 180 },
      { serverId: servers[1]?.server_id || 'server-2', status: 'FAILED', size: 0, duration: 0 },
      { serverId: servers[2]?.server_id || 'server-3', status: 'OK', size: 1800, duration: 120 },
      { serverId: servers[3]?.server_id || 'server-4', status: 'LATE', size: 0, duration: 0 }
    ];

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    for (const config of backupConfigs) {
      if (!config.serverId) continue;

      // Créer un backup d'hier (réussi)
      const yesterdayBackup = new Backup({
        serverId: config.serverId,
        date: yesterday,
        status: 'OK',
        size: Math.floor(Math.random() * 2000) + 1000,
        duration: Math.floor(Math.random() * 300) + 60,
        createdAt: yesterday
      });
      await yesterdayBackup.save();

      // Créer le backup d'aujourd'hui avec le statut configuré
      const todayBackup = new Backup({
        serverId: config.serverId,
        date: today,
        status: config.status,
        size: config.size,
        duration: config.duration,
        createdAt: today
      });
      await todayBackup.save();

      console.log(`📦 Backup créé pour ${config.serverId}: ${config.status} (${config.size}MB, ${config.duration}s)`);
    }

    console.log('\n✅ Backups de test générés avec succès!');
    console.log('\n📊 Résumé des backups créés:');
    
    // Afficher le résumé
    const allBackups = await Backup.find({}).sort({ date: -1 });
    for (const backup of allBackups) {
      const dateStr = backup.date.toLocaleDateString();
      const statusIcon = backup.status === 'OK' ? '✅' : backup.status === 'FAILED' ? '❌' : '⏰';
      console.log(`${statusIcon} ${backup.serverId} - ${dateStr}: ${backup.status} (${backup.size}MB, ${backup.duration}s)`);
    }

    console.log('\n🌐 Vous pouvez maintenant vérifier le frontend à http://localhost:3000');
    console.log('📋 Allez dans la section "Backup Monitoring" pour voir les résultats');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

// Exécuter le script
generateTestBackups();
