# Runbook de Déploiement - IKOMA Gateway

Ce document décrit la procédure complète pour déployer le backend **IKOMA Gateway** sur un serveur VPS Ubuntu 22.04 LTS.

---

## 1. Pré-requis

- **Système d'Exploitation** : Ubuntu 22.04 LTS vierge.
- **Accès** : Privilèges `root` ou `sudo`.
- **Domaine** : `automate.ikomadigit.com` pointant vers l'adresse IP du VPS (A record).
- **Réseau** : Ports `80` (HTTP) et `443` (HTTPS) ouverts dans le pare-feu.

---

## 2. Nettoyage et Installation de Node.js

Il est impératif d'utiliser Node.js 20 LTS. Nous allons d'abord nettoyer les versions obsolètes.

### Suppression des versions résiduelles
```bash
sudo apt-get purge nodejs npm -y
sudo apt-get autoremove -y
```

### Installation de Node.js 20 LTS (NodeSource)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Vérification
```bash
node -v # Doit afficher v20.x.x
npm -v  # Doit afficher 10.x.x
```

---

## 3. Création de l’utilisateur système

Pour des raisons de sécurité, le service fonctionnera sous un utilisateur dédié sans privilèges root.

```bash
sudo useradd -m -s /bin/bash ikoma
sudo mkdir -p /var/lib/ikoma/gateway
sudo chown -R ikoma:ikoma /var/lib/ikoma
```

---

## 4. Clonage du repository

Connectez-vous en tant qu'utilisateur `ikoma` pour manipuler les fichiers du projet.

```bash
sudo -u ikoma -i
cd /var/lib/ikoma/gateway
git clone https://github.com/zumradeals/ikoma-backend.git .
```

---

## 5. Installation & Build

Installez les dépendances et compilez le projet TypeScript.

```bash
npm install
npm run build
```

**Résultat attendu** : Un dossier `dist/` doit être créé à la racine, contenant le fichier `index.cjs`.

---

## 6. Base de données SQLite

Initialisez la structure de la base de données avec Drizzle ORM.

```bash
# Pousser le schéma vers la base SQLite
npx drizzle-kit push

# Vérification de la création du fichier
ls -l /var/lib/ikoma/gateway/ikoma.db
```

---

## 7. Installation du service systemd

Quittez la session de l'utilisateur `ikoma` (`exit`) et créez le fichier de service en tant que `root`.

### Création du fichier `/etc/systemd/system/ikoma-gateway.service`
```ini
[Unit]
Description=Ikoma Gateway Service
After=network.target

[Service]
Type=simple
User=ikoma
WorkingDirectory=/var/lib/ikoma/gateway
ExecStart=/usr/bin/node dist/index.cjs
Restart=always
Environment=NODE_ENV=production
Environment=PORT=8080
Environment=DB_PATH=/var/lib/ikoma/gateway/ikoma.db
Environment=LOG_LEVEL=info

[Install]
WantedBy=multi-user.target
```

### Activation du service
```bash
sudo systemctl daemon-reload
sudo systemctl enable ikoma-gateway
sudo systemctl start ikoma-gateway
```

### Vérification du statut
```bash
sudo systemctl status ikoma-gateway
```

---

## 8. Tests API en local

Vérifiez que le backend répond correctement sur le port local `8080`.

```bash
# Lister les runners
curl -s http://localhost:8080/api/runners | jq .

# Créer un ordre pour un runner (remplacer {id} par un ID réel)
curl -s -X POST http://localhost:8080/api/runners/{id}/orders \
     -H "Content-Type: application/json" \
     -d '{"type": "runner.selftest"}' | jq .
```

---

## 9. Installation de Caddy

Nous utilisons Caddy comme reverse proxy pour sa gestion automatique du TLS.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy -y
```

---

## 10. Configuration Caddyfile

Modifiez le fichier `/etc/caddy/Caddyfile` :

```caddy
automate.ikomadigit.com {
    reverse_proxy localhost:8080
}
```

### Application de la configuration
```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

---

## 11. Tests publics

Vérifiez l'accès via le domaine public en HTTPS.

```bash
curl -I https://automate.ikomadigit.com/api/runners
```
**Résultat attendu** : `HTTP/2 200` avec certificat TLS valide.

---

## 12. Dépannage courant

| Problème | Solution |
| :--- | :--- |
| **Service en boucle (Restart)** | Vérifiez les logs : `journalctl -u ikoma-gateway -f`. Souvent dû à un port déjà utilisé ou une permission manquante sur la DB. |
| **Port 8080 non écouté** | Vérifiez si le processus tourne : `ss -tulpn \| grep 8080`. |
| **Erreur SQLite "no such table"** | Relancez `npx drizzle-kit push` sous l'utilisateur `ikoma`. |
| **Permissions Denied** | Assurez-vous que `/var/lib/ikoma` appartient bien à l'utilisateur `ikoma`. |
| **Caddy TLS Failure** | Vérifiez que le port 80 est ouvert et que le DNS pointe bien sur le VPS. |
