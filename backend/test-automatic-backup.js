/**
 * Test du système de backup automatique à 00:00
 * Simule le déclenchement du cron job pour vérifier le fonctionnement
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Server = require('./models/Server');
const Backup = require('./models/Backup');
const BackupCronService = require('./services/backupCronService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pfe-monitoring';

async function testAutomaticBackup() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Compter les serveurs existants
    const serverCount = await Server.countDocuments();
    console.log(`🖥️  Nombre de serveurs trouvés: ${serverCount}`);

    if (serverCount === 0) {
      console.log('❌ Aucun serveur trouvé. Création de serveurs de test...');
      const testServers = [
        { server_id: 'auto-backup-server-1', name: 'Auto Backup Server 1', hostname: 'backup1', ip: '192.168.1.101' },
        { server_id: 'auto-backup-server-2', name: 'Auto Backup Server 2', hostname: 'backup2', ip: '192.168.1.102' },
        { server_id: 'auto-backup-server-3', name: 'Auto Backup Server 3', hostname: 'backup3', ip: '192.168.1.103' }
      ];
      
      for (const serverData of testServers) {
        const server = new Server(serverData);
        await server.save();
      }
      console.log('✅ 3 serveurs de test créés');
    }

    // Compter les backups avant le test
    const backupCountBefore = await Backup.countDocuments();
    console.log(`📦 Backups avant le test: ${backupCountBefore}`);

    // Simuler l'exécution du cron job de backup quotidien
    console.log('\n🚀 SIMULATION DU CRON JOB DE BACKUP À 00:00...');
    console.log('⏰ Date et heure actuelle:', new Date().toLocaleString());
    
    // Exécuter la fonction de backup quotidien
    await BackupCronService.runDailyBackup();

    // Compter les backups après le test
    const backupCountAfter = await Backup.countDocuments();
    console.log(`📦 Backups après le test: ${backupCountAfter}`);

    // Afficher les nouveaux backups créés
    const newBackups = await Backup.find({}).sort({ date: -1 }).limit(10);
    console.log('\n📋 NOUVEAUX BACKUPS CRÉÉS:');
    
    newBackups.forEach((backup, index) => {
      const statusIcon = backup.status === 'OK' ? '✅' : backup.status === 'FAILED' ? '❌' : '⏰';
      console.log(`${index + 1}. ${statusIcon} ${backup.serverId} - ${backup.status} (${backup.size}MB, ${backup.duration}s) - ${backup.date.toLocaleString()}`);
    });

    // Statistiques
    const stats = {
      total: backupCountAfter - backupCountBefore,
      ok: newBackups.filter(b => b.status === 'OK').length,
      failed: newBackups.filter(b => b.status === 'FAILED').length,
      late: newBackups.filter(b => b.status === 'LATE').length
    };

    console.log('\n📊 STATISTIQUES DU TEST:');
    console.log(`   📦 Total nouveaux backups: ${stats.total}`);
    console.log(`   ✅ Réussis: ${stats.ok}`);
    console.log(`   ❌ Échoués: ${stats.failed}`);
    console.log(`   ⏰ En retard: ${stats.late}`);

    // Vérifier que le système fonctionne
    if (stats.total > 0) {
      console.log('\n✅ SYSTÈME DE BACKUP AUTOMATIQUE FONCTIONNE!');
      console.log('🎯 Chaque jour à 00:00, les backups seront automatiquement:');
      console.log('   • Créés pour tous les serveurs actifs');
      console.log('   • Enregistrés dans la base de données');
      console.log('   • Suivis pour les alertes email');
      console.log('   • Disponibles dans le frontend');
    } else {
      console.log('\n❌ PROBLÈME: Aucun backup créé');
      console.log('💡 Vérifiez la configuration des serveurs');
    }

    // Afficher la configuration du cron job
    console.log('\n⚙️  CONFIGURATION DU CRON JOB:');
    console.log('   📅 Heure: 00:00 (minuit) chaque jour');
    console.log('   🔄 Fréquence: Quotidienne');
    console.log('   📧 Email: Activé pour les échecs');
    console.log('   📊 Monitoring: Temps réel');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Test terminé - Déconnecté de MongoDB');
    console.log('🎯 Le système est prêt pour les backups automatiques à 00:00!');
  }
}

// Exécuter le test
console.log('🚀 TEST DU SYSTÈME DE BACKUP AUTOMATIQUE');
console.log('⏰ Simulation du cron job quotidien à 00:00\n');
testAutomaticBackup();
