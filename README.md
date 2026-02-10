# 📜 Certificate Registry

Webová aplikácia pre správu a monitoring certifikátov s automatickými email notifikáciami o expirácii.

## 🎯 Popis projektu

Certificate Registry je Next.js 14 aplikácia s TypeScript, ktorá umožňuje:
- **Správu certifikátov** - pridávanie, editácia a mazanie certifikátov
- **Import z Excel/CSV** - hromadné nahrávanie certifikátov zo súborov
- **Automatické notifikácie** - email upozornenia na certifikáty expirujúce do 30 dní
- **Prehľadné zobrazenie** - farebné kódovanie statusov (aktívny, expiruje čoskoro, expirovaný)
- **Vyhľadávanie a filtrovanie** - rýchle nájdenie potrebných certifikátov

## 🛠️ Technológie

- **Next.js 14** s App Router
- **TypeScript** pre type-safe kód
- **SQLite** databáza
- **Prisma ORM** pre databázové operácie
- **Tailwind CSS** pre styling
- **Nodemailer** pre odosielanie emailov
- **XLSX** pre prácu s Excel súbormi
- **date-fns** pre prácu s dátumami

## 📋 Požiadavky

- Node.js 18.0 alebo vyššia
- npm alebo yarn

## 🚀 Inštalácia

### 1. Klonovanie repozitára

```bash
git clone https://github.com/pista1997/CertReg.git
cd CertReg
```

### 2. Inštalácia závislostí

```bash
npm install
```

### 3. Konfigurácia prostredia

Vytvorte súbor `.env` v koreňovom priečinku projektu (skopírujte z `.env.example`):

```bash
cp .env.example .env
```

Upravte `.env` súbor a nastavte svoje SMTP údaje:

```env
DATABASE_URL="file:./dev.db"

# SMTP konfigurácia pre email notifikácie
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=vas-email@gmail.com
SMTP_PASS=vase-heslo-alebo-app-password
SMTP_FROM=vas-email@gmail.com
```

#### Nastavenie Gmail SMTP

Ak používate Gmail:
1. Prejdite na https://myaccount.google.com/security
2. Zapnite 2-Step Verification
3. Vytvorte "App Password" pre aplikáciu
4. Použite tento App Password v `.env` súbore ako `SMTP_PASS`

### 4. Inicializácia databázy

```bash
npx prisma generate
npx prisma db push
```

### 5. Spustenie aplikácie

```bash
npm run dev
```

Aplikácia bude dostupná na: **http://localhost:3000**

## 📖 Použitie

### Pridanie certifikátu manuálne

1. Kliknite na tlačidlo **"➕ Pridať nový certifikát"**
2. Vyplňte formulár:
   - **Názov certifikátu** - napr. "SSL Certifikát - www.example.com"
   - **Dátum expirácie** - vyberte dátum z kalendára
   - **Emailová adresa** - email pre notifikácie
3. Kliknite na **"Pridať certifikát"**

### Import certifikátov z Excel/CSV súboru

#### Očakávaný formát súboru

Súbor musí obsahovať tieto stĺpce:

| názov | dátum_platnosti | email |
|-------|----------------|-------|
| SSL Certifikát - www.example.com | 2026-03-15 | admin@example.com |
| API Certifikát | 15.03.2026 | devops@example.com |
| Doménový certifikát | 31/12/2026 | it@example.com |

**Podporované názvy stĺpcov:**
- **Názov**: `názov`, `name`, `nazov`
- **Dátum**: `dátum_platnosti`, `datum_platnosti`, `expiry_date`, `expiryDate`
- **Email**: `email`, `email_address`, `emailAddress`

**Podporované formáty dátumu:**
- `DD.MM.YYYY` (napr. 15.03.2026)
- `DD/MM/YYYY` (napr. 15/03/2026)
- `YYYY-MM-DD` (napr. 2026-03-15)
- Excel serial date (automaticky)

#### Postup importu

1. Pripravte Excel (.xlsx, .xls) alebo CSV súbor s certifikátmi
2. V sekcii **"Import certifikátov"** kliknite alebo pretiahnite súbor do upload zóny
3. Aplikácia automaticky spracuje a importuje certifikáty
4. Zobrazí sa výsledok importu s počtom úspešných a neúspešných záznamov

### Správa certifikátov

- **Vyhľadávanie** - zadajte názov certifikátu alebo email do vyhľadávacieho poľa
- **Filtrovanie** - filtrujte podľa statusu (Všetky, Aktívne, Exspirujú čoskoro, Expirované)
- **Editácia** - kliknite na tlačidlo "Upraviť" v riadku certifikátu
- **Mazanie** - kliknite na tlačidlo "Zmazať" (vyžaduje potvrdenie)

### Farebné kódovanie statusov

- 🟢 **Zelená (Aktívny)** - certifikát expiruje o viac ako 30 dní
- 🟠 **Oranžová (Expiruje čoskoro)** - certifikát expiruje do 30 dní
- 🔴 **Červená (Expirovaný)** - certifikát už expiroval

## 📧 Automatická kontrola certifikátov

Aplikácia poskytuje endpoint pre kontrolu expirujúcich certifikátov a odoslanie email notifikácií:

```
GET http://localhost:3000/api/certificates/check-expiry
```

### Nastavenie automatickej kontroly

#### Linux / macOS (cron)

Otvorte crontab editor:
```bash
crontab -e
```

Pridajte riadok pre dennú kontrolu o 9:00:
```bash
0 9 * * * curl http://localhost:3000/api/certificates/check-expiry
```

#### Windows (Task Scheduler)

1. Otvorte **Task Scheduler**
2. Vytvorte **New Task**
3. **Trigger**: Denné o 9:00
4. **Action**: 
   - Program: `curl`
   - Arguments: `http://localhost:3000/api/certificates/check-expiry`

#### Docker / Kubernetes

Pre produkčné prostredie odporúčame použiť:
- **Kubernetes CronJob**
- **Docker s crond**
- **Externý monitoring službu** (napr. UptimeRobot, Pingdom)

### Obsah email notifikácie

Pri kontrole certifikátov sa automaticky odošle email s týmito informáciami:

```
Predmet: ⚠️ Certifikát čoskoro expiruje - [Názov certifikátu]

Dobrý deň,

upozorňujeme Vás, že certifikát "[Názov certifikátu]" čoskoro expiruje.

Dátum expirácie: 15.03.2026
Zostáva: 25 dní

Prosím, obnovte certifikát čo najskôr.

S pozdravom,
Certificate Registry System
```

## 🔧 API Endpoints

### GET /api/certificates
Vráti zoznam všetkých certifikátov.

**Response:**
```json
{
  "certificates": [
    {
      "id": 1,
      "name": "SSL Certifikát",
      "expiryDate": "2026-03-15T00:00:00.000Z",
      "emailAddress": "admin@example.com",
      "notificationSent": false
    }
  ]
}
```

### POST /api/certificates
Vytvorí nový certifikát.

**Body:**
```json
{
  "name": "SSL Certifikát",
  "expiryDate": "2026-03-15",
  "emailAddress": "admin@example.com"
}
```

### PUT /api/certificates/[id]
Aktualizuje existujúci certifikát.

### DELETE /api/certificates/[id]
Zmaže certifikát podľa ID.

### POST /api/certificates/import
Importuje certifikáty z Excel/CSV súboru.

**Content-Type:** `multipart/form-data`

### GET /api/certificates/check-expiry
Kontroluje expirujúce certifikáty a odošle email notifikácie.

## 🗂️ Štruktúra projektu

```
CertReg/
├── app/
│   ├── api/
│   │   └── certificates/
│   │       ├── route.ts                # GET, POST
│   │       ├── [id]/route.ts           # PUT, DELETE
│   │       ├── import/route.ts         # Import Excel/CSV
│   │       └── check-expiry/route.ts   # Kontrola expirácie
│   ├── layout.tsx                      # Layout aplikácie
│   ├── page.tsx                        # Hlavná stránka
│   └── globals.css                     # Globálne štýly
├── components/
│   ├── CertificateTable.tsx            # Tabuľka certifikátov
│   ├── FileUpload.tsx                  # Upload komponent
│   └── AddCertificateForm.tsx          # Formulár pre certifikáty
├── lib/
│   ├── db.ts                           # Prisma client
│   └── email.ts                        # Email služba
├── prisma/
│   └── schema.prisma                   # Databázová schéma
├── .env.example                        # Príklad konfigurácie
├── package.json
└── README.md
```

## 🐛 Troubleshooting

### Aplikácia sa nespustí

**Problém:** Chyba pri spustení `npm run dev`

**Riešenie:**
```bash
# Vyčistite node_modules a cache
rm -rf node_modules
rm package-lock.json
npm install

# Regenerujte Prisma client
npx prisma generate
```

### Databázové chyby

**Problém:** `Error: Environment variable not found: DATABASE_URL`

**Riešenie:**
- Overte, že existuje súbor `.env` v koreňovom priečinku
- Skontrolujte, či `.env` obsahuje `DATABASE_URL="file:./dev.db"`

**Problém:** `Table 'Certificate' does not exist`

**Riešenie:**
```bash
npx prisma db push
```

### Email sa neodosiela

**Problém:** Emailové notifikácie nefungujú

**Riešenie:**
1. Overte SMTP nastavenia v `.env` súbore
2. Pre Gmail použite App Password, nie bežné heslo
3. Skontrolujte firewall a port 587
4. Otestujte SMTP pripojenie:
```bash
curl http://localhost:3000/api/certificates/check-expiry
```

### Import Excel súboru zlyhá

**Problém:** Chyba pri importe súboru

**Riešenie:**
- Skontrolujte, či súbor obsahuje správne názvy stĺpcov
- Overte formát dátumu (DD.MM.YYYY alebo YYYY-MM-DD)
- Skontrolujte, či emailové adresy sú validné
- Uistite sa, že súbor nie je poškodený

### Problémy s produkčným buildom

**Problém:** `npm run build` zlyháva

**Riešenie:**
```bash
# Overte TypeScript chyby
npm run lint

# Vyčistite .next priečinok
rm -rf .next
npm run build
```

## 📦 Produkčné nasadenie

### Build aplikácie

```bash
npm run build
npm start
```

### Odporúčania pre produkciu

1. **Databáza**: Prejdite z SQLite na PostgreSQL alebo MySQL
2. **SMTP**: Použite profesionálnu SMTP službu (SendGrid, AWS SES, Mailgun)
3. **Monitoring**: Nastavte monitoring pre dostupnosť aplikácie
4. **Backup**: Pravidelne zálohujte databázu
5. **HTTPS**: Používajte SSL certifikát
6. **Environment variables**: Používajte bezpečné úložisko pre .env (napr. Vercel, Railway)

### Nasadenie na Vercel

```bash
# Nainštalujte Vercel CLI
npm i -g vercel

# Nasaďte aplikáciu
vercel
```

**Poznámka:** SQLite databáza nie je vhodná pre Vercel (read-only filesystem). Odporúčame prejsť na PostgreSQL.

## 🤝 Prispievanie

Príspevky sú vítané! Pre väčšie zmeny prosím najprv otvorte issue.

## 📄 Licencia

ISC

## 👤 Autor

Certificate Registry System

---

**Verzia:** 1.0.0  
**Posledná aktualizácia:** Február 2026
