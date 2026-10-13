# Electricity Bill Management System — PowerBill

- **Full name:** Atitebi Emmanuel Omobolaji
- **Matric number:** 23/SCI01/032
- **Course:** CSC 407
- **Project title:** Design and Implementation of an Electricity Bill Management System

PowerBill lets customers manage electricity bills, meter readings, payment records and receipts through a responsive web application. Billing officers manage meters, readings and bills, while administrators manage users and tariffs. The backend enforces authentication, role permissions, ownership checks, input validation and CSRF protection.

## Links

- Live application: https://powerbill-app-thuv.onrender.com
- Standalone source repository: https://github.com/Cyberforgex-06/PowerBill
- Submission source snapshot: `25128e4719ac1bd2119d986648ac82115a24d861`

## Tech stack

Next.js, React, TypeScript and Tailwind CSS; Python, Flask, SQLAlchemy and bcrypt; PostgreSQL/Supabase for deployment and SQLite for the isolated local demo; Render for hosting.

## Features and scope

- Customer registration, login, logout, dashboard and profile.
- Meter assignments, meter reading submission, tariff-based billing and bill filters.
- Customer bills, verified payment records, receipts and complaints.
- Administrator and billing officer roles with server-side access controls.
- Responsive navigation and forms for desktop and mobile.
- Password hashing, secure production session cookies, CSRF and Origin validation, audit logging, and tests for authorization and input handling.

A customer needs a meter assigned by staff before submitting readings. Real payment-gateway collection and prepaid-token vending are not integrated; payment records and receipts are supported. Render's free services can take about a minute to wake after inactivity.

## Install and run locally

Prerequisites: Python 3.11 or newer, Node.js 22 or newer, npm and Git. The local demo creates its own SQLite database and requires no production credentials. Start in this student folder:

```bash
git clone https://github.com/Cyberforgex-06/class-project.git
cd class-project/students/emmanuel-23-sci01-032-electricity-bill-management-system
python -m venv .venv
```

Activate the environment:

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

```bash
# macOS / Linux
source .venv/bin/activate
```

Install the API dependencies and start the backend in terminal 1:

```bash
python -m pip install -r powerbill/backend/requirements.txt
python run_local.py
```

The backend runs at http://127.0.0.1:5000; `/health` returns `{"ok":true}` when ready. Ensure this terminal has no existing `DATABASE_URL` variable pointing at a different database. The local SQLite file is created under `powerbill/backend/instance/` and is ignored by Git.

In terminal 2, start from the same student folder:

```bash
cd powerbill/frontend
npm ci
npm run dev
```

Open **http://localhost:3000**. The frontend defaults to the local API on port 5000. Create a customer account with a password of at least 10 characters containing an uppercase letter, lowercase letter and number, then sign in. Your new dashboard starts empty.

### Optional administrator setup

In a separate terminal, activate the Python environment and run from the student folder:

```bash
python run_local.py --create-admin
```

Enter a new local administrator email, name and password at the prompts. No default administrator credentials are included. Use the administrator interface to configure tariffs and manage users; a billing officer assigns customer meters and issues bills. Local demo data remains separate from the deployed database.

## Validation commands

With the Python environment activated:

```bash
cd powerbill/backend
python -m pytest
```

From the frontend folder:

```bash
npm test
npm run build
```

Browser tests are optional and require Playwright Chromium. From the frontend folder:

```bash
npx playwright install chromium
npm run test:e2e
```

The browser-test configuration launches isolated test servers; it does not use the live customer database.

## Directory guide

- `run_local.py`: local demo launcher and interactive administrator setup.
- `powerbill/frontend/`: UI, same-origin API transport and frontend tests.
- `powerbill/backend/`: API, data models, schema, security and backend tests.
- `powerbill/reports/`: implementation and verification reports.

For deployment with PostgreSQL, refer to the standalone repository's deployment guide. Secrets, dependency folders and generated build output are excluded from this submission.
