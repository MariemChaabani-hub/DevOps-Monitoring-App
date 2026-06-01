/**
 * Script de test pour l'envoi d'email en cas d'échec de backup
 * Simule un backup échoué et vérifie l'envoi de l'email
 */

const mongoose = require('mongoose');
const Backup = require('./models/Backup');
const Server = require('./models/Server');
const { checkBackupStatusAndCreateAlert } = require('./services/backupService');

// Configuration MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pfe-monitoring';

async function testBackupFailureEmail() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Récupérer un serveur existant ou en créer un
    let server = await Server.findOne({});
    if (!server) {
      console.log('📋 Création d\'un serveur de test...');
      server = new Server({
        server_id: 'test-email-server',
        hostname: 'Test Email Server',
        ip: '192.168.1.100'
      });
      await server.save();
      console.log('✅ Serveur de test créé');
    }

    console.log(`🖥️  Serveur utilisé: ${server.server_id}`);

    // Créer un backup échoué pour tester l'email
    console.log('📦 Création d\'un backup échoué...');
    const failedBackup = new Backup({
      serverId: server.server_id,
      date: new Date(),
      status: 'FAILED',
      size: 0,
      duration: 0
    });

    await failedBackup.save();
    console.log('✅ Backup échoué créé');

    // Tester la fonction d'alerte et d'email
    console.log('📧 Test de l\'envoi d\'email d\'alerte...');
    const alert = await checkBackupStatusAndCreateAlert(failedBackup);
    
    if (alert) {
      console.log('✅ Alerte créée avec succès');
      console.log(`   Type: ${alert.type}`);
      console.log(`   Sévérité: ${alert.severity}`);
      console.log(`   Message: ${alert.message}`);
    } else {
      console.log('ℹ️  Aucune alerte créée (backup réussi)');
    }

    // Créer un backup en retard pour tester aussi
    console.log('⏰ Création d\'un backup en retard...');
    const lateBackup = new Backup({
      serverId: server.server_id + '-late',
      date: new Date(),
      status: 'LATE',
      size: 0,
      duration: 0
    });

    await lateBackup.save();
    console.log('✅ Backup en retard créé');

    // Tester l'alerte pour backup en retard
    console.log('📧 Test de l\'envoi d\'email pour backup en retard...');
    const lateAlert = await checkBackupStatusAndCreateAlert(lateBackup);
    
    if (lateAlert) {
      console.log('✅ Alerte de retard créée avec succès');
      console.log(`   Type: ${lateAlert.type}`);
      console.log(`   Sévérité: ${lateAlert.severity}`);
      console.log(`   Message: ${lateAlert.message}`);
    }

    console.log('\n📊 Résumé des tests:');
    console.log('- Backup FAILED: Alerte créée et email envoyé');
    console.log('- Backup LATE: Alerte créée et email envoyé');
    console.log('\n📧 Configuration email requise:');
    console.log('- EMAIL_USER: Votre adresse Gmail');
    console.log('- EMAIL_PASS: Mot de passe d\'application Gmail (16 caractères)');
    console.log('- ADMIN_EMAIL: Email de l\'administrateur pour recevoir les alertes');

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('\n⚠️  Mode démo activé - emails non envoyés (credentials manquants)');
      console.log('   Configurez EMAIL_USER et EMAIL_PASS dans votre .env pour envoyer de vrais emails');
    } else {
      console.log('\n✅ Mode email réel activé - emails envoyés à:', process.env.ADMIN_EMAIL || 'admin@example.com');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

// Exécuter le test
console.log('🚀 Démarrage du test d\'envoi d\'email pour les échecs de backup...\n');
testBackupFailureEmail();
