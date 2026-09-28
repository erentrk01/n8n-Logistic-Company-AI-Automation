# Setup guide

Tested with **n8n 2.40** (Docker) and **Twenty CRM** (self-hosted). About 45 minutes for a first setup.

## 1. Start the stack
```bash
cd infra
cp .env.example .env            # fill in PG_DATABASE_PASSWORD and ENCRYPTION_KEY
openssl rand -base64 32         # use the output as ENCRYPTION_KEY
docker compose up -d
```
- n8n: http://localhost:5678
- Twenty: http://localhost:3000

Inside Docker, n8n reaches Twenty at `http://twenty-server:3000` and Twenty reaches n8n at `http://n8n.demo.local:5678`.

## 2. Google Sheet
Create one spreadsheet with two tabs and import the CSV files from `sheet-templates/`:
- `Rates` – carrier price list (header names must stay exactly as in the CSV)
- `TMS_Orders` – written by the mock TMS

The spreadsheet ID is the part of the URL between `/d/` and `/edit`.

## 3. Twenty CRM
1. Settings → enable **Advanced mode**.
2. Settings → APIs & Webhooks → create an **API key**.
3. Settings → Data model → add custom fields (check the API name in the URL after saving):

| Object | Label | Type | API name |
|---|---|---|---|
| Companies | Margin Pct | Number | `marginPct` |
| Opportunities | Route | Text | `route` |
| Opportunities | Chargeable Kg | Number | `chargeableKg` |
| Opportunities | Tms Order No | Text | `tmsOrderNo` |
| Opportunities | Gmail Thread Id | Text | `gmailThreadId` |

4. Check the opportunity stages: the first stage must be `NEW`, the "won" stage `CUSTOMER` (otherwise change it in the Config nodes).
5. Optional: Settings → Webhooks → `http://n8n.demo.local:5678/webhook/twenty-events`, object *Opportunities*, event *updated*. If Twenty does not accept it, use the polling trigger in workflow 3 (enabled by default).

## 4. Credentials in n8n
| Credential | Type | Settings | Used by |
|---|---|---|---|
| Gmail | Gmail OAuth2 | Google Cloud OAuth client, redirect `http://localhost:5678/rest/oauth2-credential/callback` | Gmail nodes |
| Google Sheets | Google Sheets OAuth2 | same OAuth client | Sheets nodes |
| Claude API | Header Auth | Name `x-api-key`, Value `sk-ant-...` | AI: Extract Transport Data |
| Twenty API | Bearer Auth | Token = Twenty API key (no `Bearer` prefix) | all `Twenty:` nodes |

Google OAuth apps in *Testing* mode lose access after 7 days: reconnect the Google credentials before a demo.

## 5. Import the workflows
Import in this order: `0` → `2` → `3` → `1`.

> **Important:** create a **new, empty** workflow for each file and use *⋯ → Import from File*.
> Importing into an existing workflow adds a second copy of all nodes (two triggers = every email processed twice).

In each workflow:
1. Fill in the **Config** node (Slack webhook URL, Google Sheet ID).
2. Select the credentials on every node that shows a warning.
3. Settings → Error Workflow → `Logistics | 0 - Error Alerts` (workflows 1, 2, 3).
4. Save and **Publish**.

## 6. Test
See [`test-emails.md`](test-emails.md). Mock TMS:
```bash
curl -X POST http://localhost:5678/webhook/tms/orders -H "Content-Type: application/json" \
  -d '{"externalRef":"test-1","customerName":"Test GmbH","route":"80331 → 1010","chargeableKg":959,"priceEur":162.74}'
```
First call → `201 accepted`, second identical call → `200 duplicate`.

## Troubleshooting
| Symptom | Cause / fix |
|---|---|
| `Invalid bearer token` on the AI node | The Twenty credential is selected there. Use the Claude credential (`x-api-key`). |
| Twenty `Forbidden` | The API key has no role with access; give it the Admin role. |
| Twenty `duplicate entry` on create person/company | Record is in Twenty's trash. Delete it permanently. Workflow 1 continues and warns in Slack. |
| Order not handed to the TMS | Webhook cannot reach n8n → the polling trigger picks it up within one minute. Cards without route / weight / price are skipped on purpose. |
| Every email processed twice | Two copies of workflow 1 on the canvas (see import note above). |
