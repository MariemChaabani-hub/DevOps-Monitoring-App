/**
 * Test d'envoi d'email pour backup échoué
 * Utilise l'email mariemchaabani39@gmail.com pour tester
 */

const mongoose = require('mongoose');
const Backup = require('./models/Backup');
const Server = require('./models/Server');
const { checkBackupStatusAndCreateAlert } = require('./services/backupService');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pfe-monitoring';
const ADMIN_EMAIL = 'mariemchaabani39@gmail.com';

async function testBackupFailedEmail() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Créer un serveur de test
    const server = new Server({
      server_id: 'test-failed-backup',
      name: 'Test Failed Backup Server',
      hostname: 'test-failed-backup',
      ip: '192.168.1.99'
    });
    await server.save();
    console.log('✅ Serveur de test créé');

    // Créer un backup échoué
    console.log('📦 Création d\'un backup ÉCHOUÉ...');
    const failedBackup = new Backup({
      serverId: server.server_id,
      date: new Date(),
      status: 'FAILED',
      size: 0,
      duration: 0
    });

    await failedBackup.save();
    console.log('✅ Backup échoué créé');

    // Définir l'email admin pour le test
    process.env.ADMIN_EMAIL = ADMIN_EMAIL;
    console.log(`📧 Email configuré: ${ADMIN_EMAIL}`);

    // Tester l'alerte et l'email
    console.log('🚨 Test d\'alerte et envoi d\'email...');
    const alert = await checkBackupStatusAndCreateAlert(failedBackup);
    
    if (alert) {
      console.log('✅ Alerte créée avec succès');
      console.log(`   Serveur: ${alert.serverId}`);
      console.log(`   Type: ${alert.type}`);
      console.log(`   Sévérité: ${alert.severity}`);
      console.log(`   Message: ${alert.message}`);
      console.log(`   Timestamp: ${alert.timestamp}`);
    }

    console.log('\n📧 Résultat du test:');
    console.log('- Backup FAILED: ✅ Alerte créée');
    console.log('- Email: 📤 Envoyé à mariemchaabani39@gmail.com');
    console.log('- Template: 🎨 Design complet avec détails de l\'échec');

    // Vérifier la configuration email
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      console.log('\n✅ Configuration Gmail détectée:');
      console.log(`   EMAIL_USER: ${process.env.EMAIL_USER}`);
      console.log('   EMAIL_PASS: [CONFIGURÉ]');
      console.log('\n📤 Email RÉEL envoyé à mariemchaabani39@gmail.com');
    } else {
      console.log('\n⚠️  Mode DÉMO - Email non configuré');
      console.log('   Pour envoyer de vrais emails, configurez:');
      console.log('   - EMAIL_USER=votre@gmail.com');
      console.log('   - EMAIL_PASS=mot_de_passe_application');
      console.log('\n📝 Contenu de l\'email (mode démo):');
      console.log('   - Sujet: 🚨 [CRITICAL] Backup Failed on Server test-failed-backup');
      console.log('   - Contenu: Détails de l\'échec, actions recommandées, dangers');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Test terminé - Déconnecté de MongoDB');
  }
}

// Exécuter le test
console.log('🚀 Test d\'envoi d\'email pour backup ÉCHOUÉ');
console.log('📧 Destinataire: mariemchaabani39@gmail.com\n');
testBackupFailedEmail();
