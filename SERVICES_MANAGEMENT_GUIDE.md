# 🔧 Guide de Gestion des 4 Services (PM2, Nginx, MongoDB, Docker)

## 📋 Vue d'ensemble

L'application dispose maintenant d'un système complet de gestion des 4 services critiques:
- **PM2** (⚙️) - Gestionnaire de processus
- **Nginx** (⚡) - Serveur web
- **MongoDB** (🍃) - Base de données
- **Docker** (🐳) - Conteneurs

## 🎯 Fonctionnalités Principales

### 1. **Consulter le Statut des Services**
- État actuel (Actif/Arrêté/Erreur)
- Uptime du service
- Nombre de redémarrages
- Utilisation mémoire et CPU
- Dernière vérification d'état

### 2. **Actions Disponibles**
Chaque service dispose de 2 actions:
- **🔄 Redémarrer** - Redémarre le service
- **⏹️ Arrêter** - Arrête le service

### 3. **Historique et Traçabilité**
- Compteur de redémarrages automatique
- Enregistrement de la date du dernier redémarrage
- Journalisation complète des actions (audit logs)

## 🚀 Comment Utiliser

### Accéder au Panneau de Gestion

1. Allez dans le dashboard
2. Cherchez la section **"🔧 Actions à Distance"** ou **"🔧 Gestion des Services"**
3. Sélectionnez un serveur dans le menu déroulant

### Exécuter une Action

1. **Sélectionnez un serveur**
   ```
   Sélectionner un serveur → [Choisir un serveur] → Serveur souhaité
   ```

2. **Voir les services**
   - Les 4 services s'affichent automatiquement en cards
   - Chaque card montre l'état du service

3. **Redémarrer un service**
   - Cliquez sur le bouton **🔄 Redémarrer**
   - Confirmez l'action
   - Le service redémarre et le compteur s'incrémente

4. **Arrêter un service**
   - Cliquez sur le bouton **⏹️ Arrêter**
   - Confirmez l'action
   - Le service s'arrête

## 📊 Architecture Technique

### Backend (Node.js + Express)

**Modèles:**
- `Service.js` - Stocke l'état de chaque service
  ```javascript
  {
    server_id: String,
    service_name: 'pm2' | 'nginx' | 'mongodb' | 'docker',
    status: 'running' | 'stopped' | 'error',
    uptime: String,
    process_id: Number,
    memory_usage: Number,
    cpu_usage: Number,
    restart_count: Number,
    last_restart: Date,
    last_health_check: Date
  }
  ```

**Routes:**
- `GET /api/services/:server_id` - Récupère tous les services d'un serveur
- `GET /api/services/:server_id/:service_name` - Récupère un service spécifique
- `PUT /api/services/:server_id/:service_name` - Mettre à jour le statut d'un service
- `POST /api/services/:server_id/:service_name/restart-log` - Enregistrer un redémarrage
- `GET /api/services/:server_id/:service_name/restart-history` - Voir l'historique

**Actions Distantes (via SSH):**
- `POST /api/remote-actions/:server_id/restart-service`
  ```bash
  PM2:     sudo pm2 restart all
  Nginx:   sudo systemctl restart nginx
  MongoDB: sudo systemctl restart mongod
  Docker:  sudo systemctl restart docker
  ```

- `POST /api/remote-actions/:server_id/stop-service`
  ```bash
  PM2:     sudo pm2 stop all
  Nginx:   sudo systemctl stop nginx
  MongoDB: sudo systemctl stop mongod
  Docker:  sudo systemctl stop docker
  ```

### Frontend (React)

**Composants:**
- `ServicesPanel.js` - Interface principale pour gérer les services
- `RemoteActionsPanel.js` - Actions à distance (redémarrer/arrêter)
- `RemoteActionsModal.js` - Modal pour accéder aux actions distantes

**Fonctionnalités:**
- Sélection du serveur
- Affichage des services en grille responsive
- Boutons d'action (Redémarrer/Arrêter)
- Auto-refresh toutes les 30 secondes
- Messages de résultat (succès/erreur)
- Affichage du statut avec codes couleurs

## 🔐 Sécurité

- ✅ Authentification admin requise (`x-admin-email`)
- ✅ Toutes les actions sont journalisées
- ✅ Email admin configuré: `mariemchaabani39@gmail.com`
- ✅ Commandes exécutées via SSH sécurisé
- ✅ Pas d'exposition de mots de passe

## 📝 Exemple de Workflow

### Scénario 1: Redémarrer Nginx suite à une alerte

```
1. Dashboard → Voir une alerte Nginx
2. Cliquer sur "🔧 Actions à Distance"
3. Sélectionner le serveur problématique
4. Cliquer sur le bouton "🔄 Redémarrer" pour Nginx
5. ✅ Nginx redémarre
6. Vérifier les métriques pour confirmer la récupération
7. L'action est enregistrée dans l'audit
```

### Scénario 2: Maintenance planifiée

```
1. Aller dans "Gestion des Services"
2. Sélectionner le serveur
3. Arrêter les services non essentiels:
   - ⏹️ Arrêter PM2 (applications)
   - ⏹️ Arrêter Docker (conteneurs)
4. Effectuer la maintenance
5. Redémarrer les services:
   - 🔄 Redémarrer Docker
   - 🔄 Redémarrer PM2
6. Vérifier l'état général du système
```

## 🔍 Vérifier l'État Actuel

Pour consulter l'historique des actions:
1. Aller dans "Journal d'Audit" du panneau d'actions distantes
2. Voir toutes les actions effectuées avec:
   - Timestamp
   - Admin qui a exécuté l'action
   - Service affecté
   - Résultat (succès/échec)

## 🛠️ Dépannage

### Les services ne s'affichent pas?
- Vérifiez que le serveur est sélectionné
- Vérifiez la connexion au backend
- Consultez les logs du backend

### L'action de redémarrage échoue?
- Vérifiez les informations SSH du serveur (IP, username, password)
- Vérifiez que vous êtes admin
- Consultez les logs d'audit pour le détail de l'erreur

### Le statut ne se met pas à jour?
- L'auto-refresh se déclenche toutes les 30 secondes
- Cliquez sur "Rafraîchir" pour forcer la mise à jour
- Vérifiez la connexion réseau

## 📈 Prochaines Améliorations

- [ ] Health checks automatiques pour détecter les services morts
- [ ] Alertes automatiques si un service s'arrête inopinément
- [ ] Graphiques historiques des restarts
- [ ] Webhook pour intégration Slack/Teams
- [ ] Scripts de récupération automatique
- [ ] Monitoring de la performance post-redémarrage
