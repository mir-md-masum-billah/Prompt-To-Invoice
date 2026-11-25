# ডিপ্লয় গাইড (Cloudflare Workers + Vercel)

## ১. ব্যাকএন্ড (Vercel, Root Directory = `backend`)
Environment Variables (Settings → Environment Variables):

| নাম | মান |
|---|---|
| MONGODB_URI | Atlas-এর connection string |
| JWT_SECRET | **কমপক্ষে ৩২ অক্ষর** (নইলে অ্যাপ চালুই হবে না) |
| GEMINI_API_KEY | আপনার Gemini key |
| GEMINI_MODELS | gemini-2.5-flash,gemini-2.5-flash-lite |
| PUBLIC_API_URL | https://backend-seven-weld-69.vercel.app |
| CLIENT_ORIGINS | https://prompt-to-invoice.mirmohammadmasumbillah.workers.dev |

JWT_SECRET বানাতে: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
ভ্যারিয়েবল বদলালে Redeploy দিতে হবে। Atlas → Network Access-এ `0.0.0.0/0` থাকতে হবে।
যাচাই: `https://backend-seven-weld-69.vercel.app/` খুললে `API WORKING` দেখাবে।

## ২. ফ্রন্টএন্ড (Cloudflare Workers)
- Worker name: `prompt-to-invoice`
- Root directory: `frontend`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Build variable: `NEXT_PUBLIC_API_BASE` = https://backend-seven-weld-69.vercel.app (শেষে / নেই)

এই মান বিল্ডের সময় বসে যায়, তাই বদলালে আবার বিল্ড (Retry deployment) করতে হবে।

## ৩. লোকালে চালাতে
`frontend/.env.local` ফাইল বানিয়ে লিখুন: `NEXT_PUBLIC_API_BASE=http://localhost:4000`
(এখন কোডে localhost ডিফল্ট নেই, তাই এই ফাইল ছাড়া লোকালে API কল যাবে না।)
ব্যাকএন্ডের জন্য `backend/.env` (দেখুন `backend/.env.example`)।

## দ্রষ্টব্য
Vercel-এ আপলোড করা লোগো/স্ট্যাম্প/সিগনেচার স্থায়ীভাবে সেভ হয় না (ডিস্ক অস্থায়ী)।
স্থায়ী রাখতে Cloudflare R2 বা Cloudinary লাগবে।
