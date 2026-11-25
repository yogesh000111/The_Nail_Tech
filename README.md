# The Nail Academy website

Next.js (App Router) + Supabase + Razorpay. Pages: Home (`/`), Courses (`/courses`), Join Academy (`/apply` & `/apply/[id]`), Services (`/services`), Book Appointment (`/book`), About & Contact (`/about`), My Account (`/account`), and Admin Portal (`/admin`).

## Features
- **Passwordless Email Sign-In / Sign-Up** via Supabase Auth OTP & magic links, with editable profile name & phone on `/account`.
- **Paid Join Academy Flow (`/apply`, `/apply/[id]`):** Collects course, preferred batch, experience, student/parent details, and Razorpay seat reservation/instalment/full fee payment (or manual UPI QR) before confirming `"Your slot is booked!"`.
- **Paid Appointment Booking (`/book`):** Checks booked slot availability, validates Razorpay Checkout payments via `/api/razorpay/order` and `/api/razorpay/verify`, and supports manual UPI QR fallback.
- **Admin Portal (`/admin`):** Dedicated email/password admin sign-in (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) with HTTP-only signed session cookies:
  - **Pending queue:** Review and accept/reject pending bookings, academy applications, and inquiries.
  - **Both Flows analytics:** Track total site visitors, Join Academy applicants, Book Appointment clients, and visitors who applied for **both** courses and appointments.
  - **Users & Students:** Inspect user details, switch account roles (`client` / `student` / `admin`), and sign off the 58-skill Digital Logbook.

## One-time Supabase setup
1. SQL Editor: run `schema.sql` (base tables) followed by `schema_update.sql`.
2. Authentication → Sign In / Providers → **Email**: enable Email OTP/Magic Link.
3. Authentication → URL Configuration: set **Site URL** to `http://localhost:3000` for local testing, and your live domain (e.g. `https://thenailacademy.in`) when deployed.
4. For production customer emails, configure custom SMTP under Authentication → Emails → SMTP Settings.

## Run locally
```bash
npm install
cp .env.example .env.local   # Fill in Supabase, Razorpay, and Admin credentials
npm run dev
```
Open http://localhost:3000 (Admin portal: http://localhost:3000/admin).

## Deploy to Vercel (Production Checklist)
1. Push the repository to GitHub (`.env*.local` and `.data` are gitignored).
2. Import the project in **Vercel** (`npm run build`).
3. Add all environment variables from `.env.example` in Vercel Project Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (required on serverless deployments so the Admin Portal reads/writes Supabase tables directly across instances)
   - `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET` (switch from `rzp_test_...` to `rzp_live_...` after Razorpay KYC)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (use a strong password & 64-char random hex secret)
4. Update Supabase **Site URL** and **Redirect URLs** to your live Vercel/custom domain.
5. Deploy and verify `/`, `/apply`, `/book`, and `/admin`.
