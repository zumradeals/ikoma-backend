# Guide de Déploiement sur VPS - Ikoma Backend

Ce projet est configuré pour être déployé facilement sur un VPS en utilisant Docker.

## Prérequis

- Un VPS sous Linux (Ubuntu recommandé)
- Docker et Docker Compose installés sur le VPS
- Git installé sur le VPS

## Étapes de déploiement

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/zumradeals/ikoma-backend.git
   cd ikoma-backend
   ```

2. **Configurer les variables d'environnement**
   Créez un fichier `.env` si nécessaire (bien que le projet utilise actuellement SQLite par défaut).

3. **Lancer avec Docker Compose**
   ```bash
   docker-compose up -d --build
   ```

4. **Vérification**
   Le serveur devrait être accessible sur le port `5000` de votre VPS.

## Maintenance

- Pour voir les logs : `docker-compose logs -f`
- Pour arrêter le service : `docker-compose down`
- Pour mettre à jour le code :
  ```bash
  git pull
  docker-compose up -d --build
  ```
