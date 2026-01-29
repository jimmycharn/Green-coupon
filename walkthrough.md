# School Coupon System - Walkthrough & Verification

## Prerequisites
1.  **Supabase Setup**: You must run the provided SQL script in your Supabase project's SQL Editor.
    - Go to [Supabase Dashboard](https://supabase.com/dashboard/project/fxqprmcjhwvfpmwlapsv)
    - Open the **SQL Editor**.
    - Copy the content of `schema.sql` (located in the project root) and run it.
2.  **Create Test Users**:
    - Go to **Authentication** -> **Users** in Supabase.
    - Create 3 users manually (or sign up via the app if you add a register page, but manual is faster for testing roles):
        - `student@test.com`
        - `shop@test.com`
        - `staff@test.com`
    - **IMPORTANT**: After creating users, go to the **Table Editor** -> `profiles` table.
    - Update the `role` column for each user to match their email (student, shop, staff).

## Running the App
1.  Open a terminal in `g:/Web App/Green Coupon`.
2.  Run `npm run dev`.
3.  Open `http://localhost:5173` (or the URL shown in terminal).

## Verification Steps

### 1. Staff Top-up Flow
1.  Login as `staff@test.com`.
2.  Click **Top-up**.
3.  Open a new browser window/tab (incognito recommended) and login as `student@test.com`.
4.  On the Student Dashboard, you will see "My QR Code".
5.  Back on Staff screen, click **Scan Student QR** (allow camera access).
6.  Scan the Student's QR code.
7.  Enter amount (e.g., `100`) and confirm.
8.  **Verify**: Student balance should update to `100`.

### 2. Payment Flow
1.  Login as `shop@test.com` in a separate window.
2.  You will see the **Shop QR Code**.
3.  On the Student Dashboard, click **Scan to Pay**.
4.  Scan the Shop's QR code.
5.  Enter amount (e.g., `50`) and confirm.
6.  **Verify**:
    - Student balance decreases to `50`.
    - Shop Dashboard shows a new transaction of `+50` and Total Earnings `50`.

### 3. Refund Flow
1.  On Staff Dashboard, click **Refund**.
2.  Scan Student QR.
3.  Enter amount (e.g., `20`) and confirm.
4.  **Verify**: Student balance decreases to `30`.

## Troubleshooting
- **Camera not working?**: Ensure you are using `localhost` or `https`. Browsers block camera on `http` (except localhost).
- **Database errors?**: Check the browser console and Supabase logs. Ensure RLS policies are correct.
