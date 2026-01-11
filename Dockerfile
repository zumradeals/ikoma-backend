# Étape de construction
FROM node:22-slim AS builder

WORKDIR /app

# Installation des dépendances
COPY package*.json ./
RUN npm install

# Copie du code source
COPY . .

# Construction du projet
RUN npm run build

# Étape de production
FROM node:22-slim

WORKDIR /app

# Copie des fichiers nécessaires depuis l'étape de construction
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/ikoma.db ./ikoma.db

# Exposition du port (à adapter selon la configuration du serveur)
EXPOSE 5000

# Commande de démarrage
CMD ["npm", "start"]
