# Power EV Hub - EV Charger Installation ERP & Financial Dashboard

A production-grade, web-based ERP and Executive Financial Dashboard tailored for **Power EV Hub**, designed for deployment on [Render.com](https://render.com) with monthly cycle management, date-based archiving, effective unit cost lock-in, automated real-time warehouse inventory deductions, and P&L financial reporting.

---

## 🚀 Key Features & Core Business Rules

### 1. Monthly Active Default & Archive Selector
- Defaults strictly to the **current active calendar month** (e.g. `2026-08`).
- Header date-selector allows switching to **archived historical months** in a read-only audit mode.
- **Serial numbers (`Sn.`)** in the CRM auto-increment per installation job and automatically **reset to 1** at the start of each calendar month.

### 2. Effective Unit Cost Lock-In (Price Versioning)
- Admin Settings allow managing global unit rates for:
  - **10mm Cable** (per meter)
  - **6mm Cable** (per meter)
  - **Breaker Box** (per unit)
- **Version Lock-in**: Modifying a master rate applies **ONLY** to new CRM jobs created after the change. Existing jobs permanently preserve their original locked unit rates, ensuring historical gross profits remain fixed and audit-proof.

### 3. Automated Real-Time Inventory Deduction
- Every CRM installation entry automatically deducts the specified cable lengths (10mm, 6mm) and hardware quantities (DB Box, Earthing Rod, WPB, NIN UVR, RCBO Breakers) from central warehouse stock on that job date.
- Vendor procurement entries automatically add restock quantities.
- **Daily Ledger Equation**:
  $$\text{Closing Stock (Date)} = \text{Opening Stock} + \text{Restocked (Vendor Purchases)} - \text{CRM Material Usage}$$
- **Inventory Ledger Reset**:
  - API endpoint: `POST /api/inventory/clear` (or `DELETE /api/inventory/clear`)
  - CLI script: `npm run inventory:clear`
  - Seed baseline inventory: `npm run inventory:seed`
  - UI button: **"Reset Inventory Ledger"** in the Admin Settings panel.

### 4. Manual Billed Amount Override & Dynamic Gross Profit
- Total Job Cost is calculated automatically from material unit costs + additional supplies + misc site expenses.
- Bill Amount is a manual entry field.
- **Dynamic Gross Profit**:
  $$\text{Gross Profit} = \text{Manual Bill Amount} - \text{Total Job Cost}$$

### 5. Financial Balances & Cash/Bank Calculations
- **Total Available Cash** = $(\text{Client Payments in Cash}) - (\text{Vendor Purchases in Cash})$
- **Total Available Bank** = $(\text{Client Payments in Bank}) - (\text{Total Misc Expenses}) - (\text{Vendor Purchases in Bank})$
- **Trade Receivables** = Sum of uncollected client invoices (Pay Status: `Trade Receivable`).
- **Total Paid Revenue** = Verified client receipts.

### 6. Editable Admin Dropdowns & Master Settings
- Admin Settings panel allows adding, editing, or deleting choices for **Lead Sources**, **Technician Teams**, and **Payment Methods**.

---

## 🛠️ Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: Next.js Server Route Handlers (Node.js runtime).
- **Database & ORM**: PostgreSQL / SQLite via Prisma ORM.
- **Styling**: Glassmorphic dark/light dashboard theme with high-density tabular views, modal forms, and print-ready work order vouchers.

---

## 💻 Local Development Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <repo-url>
   cd "ERP Power Ev Hub"
   npm install
   ```

2. **Initialize Database Schema**:
   ```bash
   npx prisma db push
   ```

3. **Seed Demo Data** (Populates active month, historical archived months, inventory ledger, and vendor purchases):
   ```bash
   npm run db:seed
   ```
   *Or click the **"Seed Demo Data"** button directly in the web navbar.*

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deployment to Render.com

### Option A: Deploy via Blueprint (`render.yaml`)
1. Push this repository to GitHub or GitLab.
2. In the Render Dashboard, click **New +** → **Blueprint**.
3. Connect your repository. Render will automatically detect `render.yaml` and provision:
   - A Node.js Web Service (`power-ev-hub-erp`)
   - A Managed PostgreSQL Database (`power-ev-hub-db`)
4. Click **Apply**. Render will run `./render-build.sh` and deploy your ERP.

### Option B: Manual Web Service Setup
1. Create a **PostgreSQL** database on Render.
2. Create a **Web Service** on Render pointing to your repository.
3. Configure settings:
   - **Environment**: Node
   - **Build Command**: `./render-build.sh`
   - **Start Command**: `npm start`
4. Add environment variables:
   - `DATABASE_URL`: Your Render PostgreSQL Internal Database URL
   - `NODE_ENV`: `production`
   - `NEXT_PUBLIC_APP_NAME`: `Power EV Hub`
   - `NEXT_PUBLIC_DEFAULT_CURRENCY`: `PKR`
   - `NEXT_PUBLIC_CURRENCY_SYMBOL`: `Rs.`

---

## 📄 License
Proprietary ERP system developed for **Power EV Hub**.
