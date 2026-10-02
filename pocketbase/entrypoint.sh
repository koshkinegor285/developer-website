#!/bin/sh
set -e
# Администратор создаётся или обновляется при каждом запуске из ADMIN_EMAIL / ADMIN_PASSWORD
pocketbase superuser upsert "$ADMIN_EMAIL" "$ADMIN_PASSWORD" --dir=/pb_data --migrationsDir=/pb_migrations
exec pocketbase serve --http=0.0.0.0:8090 --dir=/pb_data --hooksDir=/pb_hooks --migrationsDir=/pb_migrations --origins="${SITE_ORIGINS:-*}"
