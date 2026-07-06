#!/usr/bin/env bash
# Wipe all ChopRent data on the linked Supabase project (schema kept).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=============================================="
echo " ChopRent MVP DATA RESET"
echo " Deletes: orgs, units, leases, payments,"
echo "           storage files, and ALL auth users"
echo " Keeps:   migrations, RLS, empty buckets"
echo "=============================================="
echo ""

if ! supabase projects list &>/dev/null; then
  echo "Not logged in. Run:"
  echo "  supabase login"
  echo "  supabase link --project-ref YOUR_PROJECT_REF"
  exit 1
fi

if [[ "${1:-}" != "--yes" ]]; then
  read -r -p "Type RESET to continue: " confirm || true
  confirm="${confirm//$'\r'/}"
  confirm="$(echo "$confirm" | xargs)"
  if [[ "$confirm" != "RESET" ]]; then
    echo "Aborted (expected RESET, got: '${confirm:-empty}')."
    echo "Or run: npm run db:reset-mvp:yes"
    exit 1
  fi
fi

echo "Running reset on linked project..."

echo "Clearing storage buckets (receipts, documents)..."
for bucket in receipts documents; do
  supabase storage rm -r --linked --yes "ss:///${bucket}" 2>/dev/null || echo "  ${bucket}: empty or already cleared"
done

supabase db query --linked -f supabase/scripts/reset_mvp_data.sql

echo ""
echo "Done. Next steps:"
echo "  1. Sign up fresh at /login (landlord → access-pending → dashboard)"
echo "  2. Add your real plaza, units, and settlement account"
echo "  3. Vercel + Supabase env vars unchanged"
