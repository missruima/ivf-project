#!/bin/bash
# Deploy IVF Project to production server

set -e

echo "🚀 Deploying IVF Project..."

# Push latest code to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

# SSH into server: pull, build, restart
echo "🔄 Updating server..."
ssh ivfproject@164.92.103.33 "cd ivf-project && git pull && npm run build && pm2 restart ivf-project"

echo "✅ Deployed! Site is live at https://ivfproject.org"
