# Test emails

Send these from a **different** address than the connected demo mailbox
(workflow 1 ignores mails sent by the mailbox itself).

| # | Scenario | Expected result |
|---|----------|-----------------|
| 1 | Complete request | Offer draft, CRM record, Slack "Neues Angebot bereit" |
| 2 | Weight missing | Draft asking for the weight, Slack "Anfrage unvollständig" |
| 3 | Light but bulky goods | Price based on chargeable weight (volume × 333 kg) |
| 4 | Reply "passt, wir beauftragen Sie hiermit" to the offer | Slack suggestion "Kunde hat bestätigt" with CRM link |
| 5 | Reply with a price question to the offer | Slack "Kunde hat auf ein Angebot geantwortet" |

## 1 – Complete request
**Subject:** `Transportanfrage München – Wien`
```
Hallo zusammen,

wir bräuchten kurzfristig ein Angebot:

3 EUR-Paletten, je 120 x 80 x 120 cm, insgesamt ca. 1,2 t
Abholung: 80331 München
Zustellung: 1010 Wien
Abholung am Donnerstag möglich, Anlieferung mit Hebebühne.

Danke und viele Grüße
```
Expected with the sample `Rates.csv`: 1,200 kg chargeable, Carrier B, **€209.08** (15 % default margin).

## 2 – Weight missing
**Subject:** `Preisanfrage Nürnberg – Mailand`
```
Hallo,
wir bräuchten einen Preis für 3 Paletten von 90402 Nürnberg nach 20121 Mailand (Italien).
Abholung nächste Woche möglich.
```

## 3 – Light but bulky
**Subject:** `Quote request Munich – Milan`
```
Hello,
please send us a quote: pickup 80995 Munich, Germany; delivery 20121 Milan, Italy.
Lamp shades, total weight 200 kg, total volume 3 m3. No dangerous goods.
```
Expected: chargeable weight 999 kg (3 m³ × 333), offer in English.

## 4 – Order confirmation (reply to the offer, keep the quoted text)
```
Hallo,
passt, wir beauftragen Sie hiermit.
Viele Grüße
```

## 5 – Question (reply to the offer)
```
Hallo,
geht es auch für 190 Euro?
```
