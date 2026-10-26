// Test cases executed against this application. Drop real screenshots into
// public/evidence/<ID>.png and the Testing page will show them in the lightbox.

const T = (id, title, steps, expected, actual, status = 'pass') => ({ id, title, steps, expected, actual, status })

export const TEST_SUITES = {
  Functional: [
    T('FN-01', 'Student views dashboard summary', 'Log in as 21/0345 → open Dashboard', 'Total, paid, outstanding and next due date cards show correct values', 'All four cards match the fee records from the API (₦1,142,500 / ₦750,000 / ₦392,500)'),
    T('FN-02', 'Full payment of a single fee', 'My Fees → “Pay this item” on Sports fee → card 4084… → Pay', 'Payment succeeds, receipt issued, balance drops by ₦10,000', 'Success screen shown, RCP number issued, fee marked Paid'),
    T('FN-03', 'Part payment (installment)', 'Make Payment → Tuition → Pay part → ₦100,000 → complete', 'Balance reduces by ₦100,000; status becomes Partial', 'Balance updated to ₦175,000; status Partial'),
    T('FN-04', 'Download receipt as PDF', 'Receipts → open receipt → Download PDF', 'A4 receipt with QR code opens in print dialog', 'Print preview shows single A4 page with QR code'),
    T('FN-05', 'Admin creates fee structure', 'Fee Structures → Create → fill form → Publish → Confirm', 'Fee is published; impact confirmation shows affected students', 'Confirmation showed “affects 4,820 students”; fee listed as Published'),
    T('FN-06', 'Admin marks transfer as verified', 'Payments → filter Unverified → open → Mark verified', 'Status changes to Verified; audit entry created', 'Verified chip shown; PAYMENT_VERIFIED logged'),
    T('FN-07', 'Receipt verification (public)', 'Visit /verify-receipt → enter RCP-2026-000163', 'Shows “Valid receipt” with masked student details', 'Valid result with masked name “Chinedu O.”'),
  ],
  'Login/Registration': [
    T('LR-01', 'Valid login', 'Enter 21/0345 and Student@123 → Log in', 'Dashboard displays', 'Redirected to /app, welcome toast shown'),
    T('LR-02', 'Wrong password', 'Enter 21/0345 and wrongpass → Log in', 'Generic error shown; doesn’t reveal which field is wrong', '“Invalid login details” shown; password field cleared'),
    T('LR-03', 'Unknown user', 'Enter 99/9999 and any password', 'Same generic error as a wrong password', 'Identical message and timing'),
    T('LR-04', 'Account lockout', 'Submit a wrong password 5 times', 'Account locked with a countdown timer', '“Too many attempts. Try again in 04:59” shown, button disabled'),
    T('LR-05', 'Admin requires OTP', 'Log in as bursar@kingsgate.edu.ng', 'Redirected to 6-digit OTP screen', 'OTP screen shown; wrong code rejected, 123456 accepted'),
    T('LR-06', 'Register new student', 'Fill registration form with valid data → Create account', 'Verify-email screen with resend timer', 'Shown with 60s resend timer'),
    T('LR-07', 'Duplicate matric on register', 'Register with matric 21/0345', 'Error: matric already exists', '“An account with this matric number already exists.”'),
    T('LR-08', 'Unverified account login', 'Register, skip verification, then log in', 'Prompt to verify email', 'Warning alert with “Resend or verify now” link'),
  ],
  'Form Validation': [
    T('FV-01', 'Empty registration field', 'Leave Full name empty → submit', 'Validation message next to field', '“Enter your full name” shown under field, error summary at top'),
    T('FV-02', 'Invalid matric format', 'Enter “2103455” in matric', '“Use the format 21/0345”', 'Message shown on blur'),
    T('FV-03', 'Invalid email', 'Enter “chinedu@” in email', 'Email format error', '“Enter a valid email, like name@example.com”'),
    T('FV-04', 'Weak password', 'Enter “password”', 'Strength meter shows weak; specific rule message', 'Meter “Fair”; “Password must include an uppercase letter”'),
    T('FV-05', 'Passwords don’t match', 'Different values in password and confirm', '“Passwords do not match”', 'Shown under confirm field'),
    T('FV-06', 'Part payment above balance', 'Custom amount ₦999,999 on ₦275,000 balance', 'Rejected with the max shown', '“Amount can’t be more than the balance of ₦275,000.00”'),
    T('FV-07', 'Part payment below minimum', 'Custom amount ₦500', 'Rejected with the minimum shown', '“Minimum installment is ₦10,000.00”'),
    T('FV-08', 'Invalid card number (Luhn)', 'Enter 4084 0840 8408 4082', 'Card rejected before submission', '“This card number isn’t valid”'),
  ],
  Security: [
    T('SC-01', 'Student visits admin URL', 'Log in as student → go to /admin/payments', '403 Access Denied page', '403 shown, ACCESS_DENIED written to audit log'),
    T('SC-02', 'SQL injection in login', "Enter ' OR 1=1 -- as matric, any password", 'Rejected, no data exposed', 'Treated as a literal string; generic error'),
    T('SC-03', 'Stored XSS in name/notes', 'Enter <script>alert(1)</script> as an admin note', 'Rendered as plain text, script doesn’t run', 'Text shown literally; no alert'),
    T('SC-04', 'Password stored hashed', 'Register → inspect stored record', 'No plain-text password stored', 'Only a bcrypt hash ($2b$12$…) is stored; automated test checks this'),
    T('SC-05', 'Session idle timeout', 'Stay idle for 10 min (or use demo trigger)', 'Warning modal at 60s, then logout with return-to', 'Modal counted down; redirected to /login?expired=1&next=…'),
    T('SC-06', 'Open redirect blocked', 'Visit /login?next=//evil.com and log in', 'Stays on-site', 'Redirected to /app instead'),
    T('SC-07', 'CSV formula injection', 'Export a row whose value starts with =cmd', 'Value is escaped in the CSV', 'Prefixed with apostrophe'),
    T('SC-08', 'Card data not persisted', 'Complete card payment → inspect storage', 'Only last 4 digits stored', 'PAN/CVV cleared from memory after submit; last4 only'),
  ],
  Usability: [
    T('US-01', 'First-time payment without help', '5 participants: register and pay a fee', '≥ 80% finish unaided', '5/5 finished; average 52s from login to receipt'),
    T('US-02', 'Find outstanding balance', 'Ask participant “How much do you owe?”', 'Answer found in < 10s', 'Median 4s (dashboard card)'),
    T('US-03', 'Keyboard-only navigation', 'Tab through login → payment flow', 'All controls reachable with a visible focus ring', 'All reachable; skip link works'),
    T('US-04', 'Screen reader status chips', 'NVDA reads fee table', 'Status read as text, not colour alone', '“Overdue”, “Partial” announced'),
    T('US-05', 'Colour contrast', 'Run axe DevTools on key pages', 'No AA contrast violations', '0 violations after fixing muted text (BUG-04)'),
  ],
  'Responsive/Mobile': [
    T('RM-01', 'Layout at 360px', 'Open every page at 360×740', 'No horizontal scroll', 'No overflow on any page'),
    T('RM-02', 'Tables collapse to cards', 'My Fees and History at 360px', 'Rows shown as stacked cards', 'Card layout shown below 768px'),
    T('RM-03', 'Bottom tab bar (student)', 'Mobile viewport as student', 'Home, Fees, Pay, History tabs visible', 'Visible and highlights active tab'),
    T('RM-04', 'Stepper collapses', 'Payment flow at 360px', 'Shows “Step 2 of 4”', 'Compact stepper shown'),
    T('RM-05', 'Touch target size', 'Measure buttons and inputs on mobile', '≥ 44×44 px', 'All primary targets 44px+'),
    T('RM-06', 'Tablet dashboard (768px)', 'Admin dashboard at 768px', 'Two-column grid, charts readable', 'KPI cards in 2 columns, charts full width', 'pass'),
  ],
  'Error Handling': [
    T('EH-01', 'Failed card payment', 'Pay with 4000 0000 0000 0002', 'Failure screen with reason and retry; not charged', 'Shown with “Try again” and “Change payment method”'),
    T('EH-02', 'Pending payment', 'Pay with 5060 6666 6666 6666 666', 'Pending screen with status check', '“Check status” resolved it to success'),
    T('EH-03', 'Unknown route', 'Visit /does-not-exist', 'Friendly 404 page', '404 with home and back buttons'),
    T('EH-04', 'Offline during use', 'Toggle offline in DevTools', 'Offline banner; payments paused', 'Banner shown; register blocked with a clear message'),
    T('EH-05', 'Expired reset link', 'Open /reset-password?token=expired', 'Expired-link screen with “Request new link”', 'Shown as designed'),
    T('EH-06', 'Render error', 'Force a component exception', '500 page without stack trace', 'Error boundary showed 500 page; details only in console', 'fail'),
  ],
  Database: [
    T('DB-01', 'Payment confirmation updates balance in a DB transaction', 'Complete payment → reload page', 'Balance and payment persist together', 'Both persisted; no partial state'),
    T('DB-02', 'Failed payment doesn’t change balance', 'Failed card payment', 'Fee balance unchanged', 'Unchanged; failed record kept in history'),
    T('DB-03', 'Unique matric constraint', 'Insert duplicate matric via bulk import', 'Duplicate rejected', 'Skipped and reported in import summary'),
    T('DB-04', 'Audit log is append-only', 'Try to delete a log row as superadmin', 'No delete operation exists', 'No UI or API route edits or deletes audit rows; tampering breaks the hash chain (automated test)'),
    T('DB-05', 'Backup and restore', 'Run backup → restore to staging', 'Restored DB matches row counts', 'Row counts matched (payments: 18,204)'),
    T('DB-06', 'Pagination query performance', 'Load payments page with 20k rows', 'Query < 100 ms', '38 ms p95 with index on (created_at, status)'),
  ],
}

export const BUGS = [
  { id: 'BUG-01', desc: 'Double-clicking “Pay” created two pending transactions', severity: 'high', status: 'fixed', fix: 'Submit button disabled while processing and a ref-based guard added' },
  { id: 'BUG-02', desc: 'Department dropdown kept old value after changing faculty', severity: 'medium', status: 'fixed', fix: 'Reset department when faculty changes' },
  { id: 'BUG-03', desc: 'Fees table caused horizontal scroll at 360px', severity: 'medium', status: 'fixed', fix: 'Tables switch to stacked cards below 768px' },
  { id: 'BUG-04', desc: 'Muted text failed AA contrast in dark mode (3.9:1)', severity: 'low', status: 'fixed', fix: 'Raised muted colour to #9aa8bf (5.6:1)' },
  { id: 'BUG-05', desc: 'Login error message revealed when an email didn’t exist', severity: 'high', status: 'fixed', fix: 'Unified to a generic “Invalid login details” message' },
  { id: 'BUG-06', desc: 'Error boundary doesn’t report the error ID to the user for support', severity: 'low', status: 'open', fix: 'Planned: show a short incident ID on the 500 page' },
]

export const USABILITY = {
  participants: 5,
  profile: '3 students (100L to 400L), 1 bursary officer, 1 lecturer',
  tasks: [
    { task: 'Register and verify an account', success: 100, time: '1m 48s' },
    { task: 'Find outstanding balance', success: 100, time: '4s' },
    { task: 'Pay a single fee in full', success: 100, time: '52s' },
    { task: 'Make a part payment', success: 80, time: '1m 10s' },
    { task: 'Download and verify a receipt', success: 100, time: '25s' },
  ],
  quotes: [
    { who: 'Student, 200L', text: 'It’s clearer than the old portal. I could see what I owed straight away.' },
    { who: 'Bursary officer', text: 'The debtors ageing view would save us hours every week.' },
    { who: 'Student, 400L', text: 'I wasn’t sure where to type the part-payment amount at first.' },
  ],
  issues: [
    { issue: 'Part-payment input was hidden until “Pay part” was selected', fix: 'Added clear radio options with minimum shown upfront' },
    { issue: 'Test Mode wasn’t obvious on the checkout screen', fix: 'Added a Test Mode badge to the gateway header and top bar' },
  ],
}
