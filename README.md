# Ikoma Gateway

Service backend pour la gestion des runners et l'exécution des ordres.

## Installation sur VPS Ubuntu

### Prérequis
- Node.js 20+
- Un utilisateur `ikoma`

### Étapes

1. Créer l'utilisateur et le dossier :
   ```bash
   sudo useradd -m -s /bin/bash ikoma
   sudo mkdir -p /var/lib/ikoma/gateway
   sudo chown -R ikoma:ikoma /var/lib/ikoma
   ```

2. Déployer le code (build) dans `/var/lib/ikoma/gateway`.
   Assurez-vous d'avoir fait `npm run build` localement.

3. Installer les dépendances de prod :
   ```bash
   cd /var/lib/ikoma/gateway
   npm ci --omit=dev
   ```

4. Installer le service systemd :
   Copier `ikoma-gateway.service` dans `/etc/systemd/system/`.
   ```bash
   sudo cp ikoma-gateway.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable ikoma-gateway
   sudo systemctl start ikoma-gateway
   ```

## API Examples

### GET /runners
```bash
curl -s http://localhost:8080/api/runners
```

### POST Order (Selftest)
```bash
curl -X POST http://localhost:8080/api/runners/r_local/orders \
  -H "Content-Type: application/json" \
  -d '{"type":"runner.selftest"}'
```

### GET Evidences
```bash
curl -s "http://localhost:8080/api/evidences?runner_id=r_local"
```

## Développement
- `npm run dev`: Démarrer en mode dev (watch)
- `npm run db:push`: Appliquer le schéma DB
- `npm run build`: Compiler pour la prod
