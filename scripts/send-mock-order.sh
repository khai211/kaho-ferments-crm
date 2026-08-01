#!/bin/bash
# Fires a sample order at the mock store webhook, standing in for a real
# HitPay online-store order until that integration exists. Usage:
#   ./scripts/send-mock-order.sh [email] [base-url]
set -euo pipefail

EMAIL="${1:-khailin@gmail.com}"
BASE_URL="${2:-http://localhost:3000}"
REF="MOCK-$(date +%s)"

curl -s -X POST "$BASE_URL/api/webhooks/mock-store-order" \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "order_reference": "$REF",
  "customer": {
    "name": "Test Customer",
    "email": "$EMAIL",
    "phone": "+6591234567",
    "address": "123 Example Street, Singapore"
  },
  "items": [
    { "name": "Organic Greek Yogurt 350g", "qty": 2, "unit_price": 9 },
    { "name": "Organic Kefir 500ml", "qty": 1, "unit_price": 13 }
  ],
  "total": 31,
  "paid_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
echo
