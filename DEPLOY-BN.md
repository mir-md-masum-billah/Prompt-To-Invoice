# ডিপ্লয় গাইড (Cloudflare + Render)

## ১. ব্যাকএন্ড (Render.com)
1. GitHub-এ এই প্রজেক্ট push করুন।
2. Render → New → Web Service → repo বেছে নিন।
   Root Directory: `backend`, Build: `npm install`, Start: `npm start`
   (অথবা repo-র `render.yaml` দিয়ে Blueprint ব্যবহার করুন)
3. Environment variables দিন (`backend/.env.example` দেখুন):
   MONGODB_URI, JWT_SECRET, GEMINI_API_KEY, FRONTEND_URL, BACKEND_URL
4. Deploy শেষে ব্যাকএন্ডের URL পাবেন (যেমন https://xxx.onrender.com)

## ২. ফ্রন্টএন্ড (Cloudflare Workers)
Cloudflare → Workers & Pages → Create → GitHub repo বেছে নিন:
- Project/Worker name: `prompt-to-invoice`
- Root directory: `frontend`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Build variable: `NEXT_PUBLIC_API_BASE` = ব্যাকএন্ডের URL (শেষে / ছাড়া)

## ৩. শেষ ধাপ
ফ্রন্টএন্ডের URL পাওয়ার পর Render-এ `FRONTEND_URL` সেট করুন (CORS-এর জন্য)।

দ্রষ্টব্য: Render-এর ফ্রি প্ল্যানে আপলোড করা লোগো/সিগনেচার ফাইল রিস্টার্টে মুছে যায়।
স্থায়ী রাখতে চাইলে Cloudflare R2 বা Cloudinary লাগবে।
