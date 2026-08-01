#!/bin/bash
# Fires a sample order at the mock store webhook, standing in for a real
# HitPay online-store order until that integration exists. Usage:
#   ./scripts/send-mock-order.sh [email] [base-url] [fulfilment-date YYYY-MM-DD]
# Pass a fulfilment-date to test the pickup/delivery reminder step; omit it
# to test an order with no scheduled slot (e.g. shipping).
set -euo pipefail

EMAIL="${1:-khailin@gmail.com}"
BASE_URL="${2:-http://localhost:3000}"
FULFILMENT_DATE="${3:-}"
REF="MOCK-$(date +%s)"
PAID_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

EMAIL="$EMAIL" BASE_URL="$BASE_URL" REF="$REF" PAID_AT="$PAID_AT" FULFILMENT_DATE="$FULFILMENT_DATE" python3 <<'PYEOF'
import json
import os
import urllib.request

payload = {
    "order_reference": os.environ["REF"],
    "customer": {
        "name": "Test Customer",
        "email": os.environ["EMAIL"],
        "phone": "+6591234567",
        "address": "123 Example Street, Singapore",
    },
    "items": [
        {"name": "Organic Greek Yogurt 350g", "qty": 2, "unit_price": 9},
        {"name": "Organic Kefir 500ml", "qty": 1, "unit_price": 13},
    ],
    "total": 31,
    "paid_at": os.environ["PAID_AT"],
}

fulfilment_date = os.environ.get("FULFILMENT_DATE")
if fulfilment_date:
    payload["fulfilment"] = {
        "type": "pickup",
        "date": fulfilment_date,
        "time": "4-6pm",
        "location": "Kaho Ferments Main, 123 Example Street",
    }

body = json.dumps(payload).encode()
req = urllib.request.Request(
    os.environ["BASE_URL"] + "/api/webhooks/mock-store-order",
    data=body,
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(req) as res:
    print(res.read().decode())
PYEOF
