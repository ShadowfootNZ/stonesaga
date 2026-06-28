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

# Stage files, stamping the git SHA into index.html so browsers
# always fetch updated assets after a deploy (cache-busting)
VERSION=$(git rev-parse --short HEAD)
STAGE=$(mktemp -d)
sed "s/STAMP/$VERSION/g" index.html > "$STAGE/index.html"
cp styles.css app.js analytics.js materials.json catalogue.json "$STAGE/"
cp -r assets/ "$STAGE/assets/"

# Set web-safe permissions — mktemp creates 700 dirs which Apache cannot read,
# causing a 403 when tar extracts and overwrites the web root's permissions
find "$STAGE" -type d -exec chmod 755 {} \;
find "$STAGE" -type f -exec chmod 644 {} \;

# Upload
tar -czf - -C "$STAGE" . \
  | $SSH "$SSH_USER@$SSH_HOST" "tar -xzf - -C '$REMOTE_PATH'"

rm -rf "$STAGE"
echo "Deployed $VERSION to $SSH_HOST:$REMOTE_PATH"
