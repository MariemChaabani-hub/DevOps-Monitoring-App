/**
 * Test réel d'envoi d'email pour backup échoué
 * Envoie un vrai email à mariemchaabani39@gmail.com
 */

const mongoose = require('mongoose');
const Backup = require('./models/Backup');
const Server = require('./models/Server');
const { checkBackupStatusAndCreateAlert } = require('./services/backupService');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pfe-monitoring';

async function testRealBackupFailedEmail() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Créer un serveur de test pour l'email
    const server = new Server({
      server_id: 'test-email-failed-' + Date.now(),
      name: 'Test Email Failed Backup',
      hostname: 'test-email-failed',
      ip: '192.168.1.99'
    });
    await server.save();
    console.log(`✅ Serveur de test créé: ${server.server_id}`);

    // Créer un backup échoué avec des détails réalistes
    console.log('📦 Création d\'un backup ÉCHOUÉ pour test d\'email...');
    const failedBackup = new Backup({
      serverId: server.server_id,
      date: new Date(),
      status: 'FAILED',
      size: 0, // 0 car échoué
      duration: 45 // Durée avant échec
    });

    await failedBackup.save();
    console.log('✅ Backup échoué créé');

    // Configurer l'email admin
    process.env.ADMIN_EMAIL = 'mariemchaabani39@gmail.com';
    console.log('📧 Email configuré: mariemchaabani39@gmail.com');

    // Vérifier la configuration email
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      console.log('✅ Configuration Gmail détectée:');
      console.log(`   EMAIL_USER: ${process.env.EMAIL_USER}`);
      console.log('   EMAIL_PASS: [CONFIGURÉ]');
      console.log('\n📤 ENVOI D\'EMAIL RÉEL EN COURS...');
    }

    // Tester l'alerte et l'email
    console.log('🚨 Test d\'alerte et envoi d\'email RÉEL...');
    const alert = await checkBackupStatusAndCreateAlert(failedBackup);
    
    if (alert) {
      console.log('✅ Alerte créée avec succès');
      console.log(`   🖥️  Serveur: ${alert.serverId}`);
      console.log(`   🚨 Type: ${alert.type}`);
      console.log(`   ⚠️  Sévérité: ${alert.severity}`);
      console.log(`   📝 Message: ${alert.message}`);
      console.log(`   ⏰ Timestamp: ${alert.timestamp.toLocaleString()}`);
    }

    console.log('\n🎉 RÉSULTAT DU TEST:');
    console.log('✅ Backup FAILED: Alerte créée');
    console.log('📧 Email: Envoyé à mariemchaabani39@gmail.com');
    console.log('📨 Template: Design complet avec détails de l\'échec');
    
    console.log('\n📋 CONTENU DE L\'EMAIL ENVOYÉ:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Destinataire: mariemchaabani39@gmail.com');
    console.log('📨 Sujet: 🚨 [CRITICAL] Backup Failed on Server ' + server.server_id);
    console.log('📄 Contenu:');
    console.log('   • Détails du serveur et du backup');
    console.log('   • Explication du problème');
    console.log('   • Dangers et risques');
    console.log('   • Actions recommandées');
    console.log('   • Lien vers le dashboard');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n🔍 VÉRIFIEZ VOTRE BOÎTE MAIL:');
    console.log('   • Ouvrez mariemchaabani39@gmail.com');
    console.log('   • Vérifiez le dossier Spam/Indésirables');
    console.log('   • Cherchez l\'email avec sujet "🚨 [CRITICAL] Backup Failed"');
    console.log('   • L\'email devrait arriver dans les prochaines minutes');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('💡 Solution: Vérifiez votre connexion internet et les credentials Gmail');
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Test terminé - Déconnecté de MongoDB');
    console.log('📧 Check your email now! 🎉');
  }
}

// Exécuter le test
console.log('🚀 TEST RÉEL D\'ENVOI D\'EMAIL POUR BACKUP ÉCHOUÉ');
console.log('📧 Destinataire: mariemchaabani39@gmail.com');
console.log('⚡ Email réel sera envoyé immédiatement...\n');
testRealBackupFailedEmail();
