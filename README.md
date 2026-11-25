# PromptToInvoice

AI-powered invoicing. Next.js 16 frontend + Express 5 / MongoDB backend + Gemini.

## Setup
```bash
npm run install:all
cp backend/.env.example backend/.env      # set JWT_SECRET (>=32 chars), MONGODB_URI, GEMINI_API_KEY
cp frontend/.env.example frontend/.env.local
npm run dev                                # API :4000, web :5173
```
Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## Security model
- Server refuses to start without a strong `JWT_SECRET`; JWTs are HS256 with issuer/audience and 12h expiry.
- Passwords: bcrypt (cost 12), strength policy, constant-time login, no account enumeration, rate-limited (10/15min).
- Every invoice/profile query is scoped to the authenticated owner (IDOR fixed); invoice numbers unique per owner.
- NoSQL operator stripping, regex escaping, enum whitelists for status/currency, numeric clamping, money rounding.
- `/api/ai/generate` now requires auth, is rate-limited, caps input, isolates user text, and whitelists/cleans model output; raw model errors are never returned.
- Uploads: PNG/JPG/WEBP only, 2 MB, random filenames, magic-byte verification, `nosniff`.
- Helmet, strict CORS allow-list (`CLIENT_ORIGINS`), 1 MB body limit, global rate limit, generic error responses.
- Frontend: strict CSP + security headers, open-redirect-safe login, token held in `sessionStorage`, API origin via `NEXT_PUBLIC_API_BASE`.

## Production checklist
Serve both apps over HTTPS, set `NODE_ENV=production`, `PUBLIC_API_URL`, `CLIENT_ORIGINS`, `NEXT_PUBLIC_API_BASE`. For the strongest posture, move the session to an httpOnly SameSite cookie (+CSRF token) and store uploads in object storage.
