#!/usr/bin/env bash
set -euo pipefail

# Write the private key and trust the host fingerprint
mkdir -p ~/.ssh
echo "$SSH_PRIVATE_KEY" > ~/.ssh/deploy_key
chmod 600 ~/.ssh/deploy_key
ssh-keyscan -p "${SSH_PORT:-22}" -H "$SSH_HOST" >> ~/.ssh/known_hosts

SSH="ssh -i ~/.ssh/deploy_key -p ${SSH_PORT:-22}"

# Ensure the remote directory exists
$SSH "$SSH_USER@$SSH_HOST" "mkdir -p '$REMOTE_PATH'"

# Upload only the files the web server needs
rsync -az --delete \
  -e "$SSH" \
  --include='index.html' \
  --include='styles.css' \
  --include='app.js' \
  --include='analytics.js' \
  --include='materials.json' \
  --include='catalogue.json' \
  --include='assets/***' \
  --exclude='*' \
  "$DEPLOY_DIR/" \
  "$SSH_USER@$SSH_HOST:$REMOTE_PATH"

echo "Deployed to $SSH_HOST:$REMOTE_PATH"
