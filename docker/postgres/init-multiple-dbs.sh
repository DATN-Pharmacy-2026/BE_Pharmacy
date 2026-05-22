#!/bin/sh
set -eu

if [ -z "${POSTGRES_MULTIPLE_DATABASES:-}" ]; then
  echo "No databases requested in POSTGRES_MULTIPLE_DATABASES."
  exit 0
fi

create_database() {
  db_name="$1"
  if [ -z "$db_name" ]; then
    return
  fi

  db_exists=$(psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db_name}'")
  if [ "$db_exists" = "1" ]; then
    echo "Database '$db_name' already exists, skipping."
  else
    echo "Creating database '$db_name'..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -c "CREATE DATABASE \"$db_name\";"
  fi
}

OLD_IFS="$IFS"
IFS=','
for db in $POSTGRES_MULTIPLE_DATABASES; do
  create_database "$db"
done
IFS="$OLD_IFS"

echo "Database initialization completed."
