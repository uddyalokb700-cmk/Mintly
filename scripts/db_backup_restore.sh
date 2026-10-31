#!/usr/bin/env bash
# ==============================================================================
# Mintly Database Backup & Restore Utility
# Provides automated, timestamped pg_dump backups and safe restoration.
# Never runs destructive operations without explicit confirmation.
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

usage() {
    echo "Usage: $0 {backup|restore <backup_file>|verify}"
    echo ""
    echo "Commands:"
    echo "  backup               Create a timestamped compressed PostgreSQL backup"
    echo "  restore <file>       Restore database from a specified backup file"
    echo "  verify               Test database connection via Django manage.py"
    exit 1
}

if [ $# -lt 1 ]; then
    usage
fi

ACTION="$1"

if [ -z "${DATABASE_URL:-}" ]; then
    echo "[-] Error: DATABASE_URL environment variable is not set."
    echo "    Example: postgres://mintly_user:password@localhost:5432/mintly_db"
    exit 1
fi

case "$ACTION" in
    backup)
        BACKUP_FILE="${BACKUP_DIR}/mintly_backup_${TIMESTAMP}.sql.gz"
        echo "[+] Starting backup of Mintly database to ${BACKUP_FILE}..."
        pg_dump --format=plain --no-owner --no-privileges "$DATABASE_URL" | gzip > "$BACKUP_FILE"
        echo "[+] Backup successfully completed! File size: $(du -h "$BACKUP_FILE" | cut -f1)"
        echo "[+] Backup location: $BACKUP_FILE"
        ;;

    restore)
        if [ $# -lt 2 ]; then
            echo "[-] Error: You must specify the backup file to restore."
            echo "    Usage: $0 restore backups/mintly_backup_YYYYMMDD_HHMMSS.sql.gz"
            exit 1
        fi
        TARGET_FILE="$2"
        if [ ! -f "$TARGET_FILE" ]; then
            echo "[-] Error: File not found: $TARGET_FILE"
            exit 1
        fi

        echo "[!] WARNING: Restoring will overwrite existing data in the database!"
        read -p "Type 'RESTORE-MINTLY' to confirm: " CONFIRMATION
        if [ "$CONFIRMATION" != "RESTORE-MINTLY" ]; then
            echo "[-] Restoration aborted by user."
            exit 0
        fi

        echo "[+] Restoring from $TARGET_FILE..."
        gunzip -c "$TARGET_FILE" | psql "$DATABASE_URL"
        echo "[+] Database restore completed successfully."
        ;;

    verify)
        echo "[+] Verifying database connection..."
        python3 backend/manage.py migrate --check
        echo "[+] Database migrations verified successfully."
        ;;

    *)
        usage
        ;;
esac
