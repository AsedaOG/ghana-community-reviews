"""Thin Paystack client. Paystack covers Ghana well: cards plus MTN MoMo,
Telecel Cash and AT Money.

No keys configured (the current state) → `configured` is False and the API
runs in sandbox mode: payments are recorded locally and activated immediately,
no network calls. Add PAYSTACK_SECRET_KEY / PAYSTACK_PUBLIC_KEY to go live —
no code changes needed.
"""
import hashlib
import hmac
import json
import urllib.request

from django.conf import settings


class PaystackClient:
    def __init__(self):
        self.secret_key = settings.PAYSTACK_SECRET_KEY
        self.public_key = settings.PAYSTACK_PUBLIC_KEY
        self.base_url = settings.PAYSTACK_BASE_URL

    @property
    def configured(self) -> bool:
        return bool(self.secret_key)

    def _post(self, path: str, payload: dict) -> dict:
        req = urllib.request.Request(
            f"{self.base_url}{path}",
            data=json.dumps(payload).encode(),
            headers={
                "Authorization": f"Bearer {self.secret_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())

    def initialize_transaction(self, *, email: str, amount_ghs, reference: str,
                               callback_url: str) -> dict:
        """Returns Paystack's init payload; caller redirects the customer to
        data.authorization_url. Amount goes over in pesewas."""
        return self._post("/transaction/initialize", {
            "email": email,
            "amount": int(float(amount_ghs) * 100),
            "currency": settings.PAYMENT_CURRENCY,
            "reference": reference,
            "callback_url": callback_url,
            "channels": ["card", "mobile_money"],
        })

    def verify_transaction(self, reference: str) -> dict:
        req = urllib.request.Request(
            f"{self.base_url}/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {self.secret_key}"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())

    def valid_webhook_signature(self, body: bytes, signature: str) -> bool:
        """Paystack signs webhooks with HMAC-SHA512 of the raw body using the
        secret key, sent in the x-paystack-signature header."""
        if not self.configured or not signature:
            return False
        expected = hmac.new(self.secret_key.encode(), body, hashlib.sha512).hexdigest()
        return hmac.compare_digest(expected, signature)
