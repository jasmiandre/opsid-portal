#!/bin/bash
cd /opt/portal
git pull origin main
npm run build
pm2 restart portal
echo "Deploy selesai: $(date)"
