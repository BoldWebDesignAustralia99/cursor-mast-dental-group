# Webhook payload contracts (stable)

## Make.com — patient lead
POST `/functions/v1/webhook-make`
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "phone": "+61400111222",
  "email": "john@example.com",
  "suburb": "Brisbane",
  "source": "make.com"
}
```

## Make.com — clinic lead
```json
{
  "type": "clinic_lead",
  "clinic_name": "Example Dental",
  "suburb": "Sydney",
  "email": "clinic@example.com",
  "phone": "+61290000000",
  "country": "AU"
}
```

## Facebook Lead Ads
GET verify: `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge`
POST: standard Facebook leadgen webhook format

## Stripe
POST `/functions/v1/webhook-stripe` — checkout.session.completed with `metadata.booking_id`

## GoCardless
POST `/functions/v1/webhook-gocardless` — payment confirmed/failed events
