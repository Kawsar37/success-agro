# Success Agro Management System - Production Deployment Guide

## 1. Prerequisites
- Node.js v20+ or v24 LTS
- MongoDB Atlas cluster (M0 free tier or higher)
- Domain names or cloud hosting accounts (e.g. Vercel for frontend, Render/Railway/DigitalOcean for backend)

---

## 2. MongoDB Atlas Setup
1. Create a free or dedicated cluster on MongoDB Atlas.
2. Under **Network Access**, whitelist your server IP or `0.0.0.0/0` (with strong database credentials).
3. Under **Database Access**, create a user with read/write privileges (e.g., `success_agro_user`).
4. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/success_agro?retryWrites=true&w=majority
   ```

---

## 3. Backend Deployment (Render / Railway / DigitalOcean / VPS)
1. Clone the repository on your server or connect via Git.
2. Navigate to `backend/`.
3. Set environment variables:
   ```env
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb+srv://success_agro:9uysMG7BGT6ztMpf@cluster0.abcde.mongodb.net/success_agro?retryWrites=true&w=majority
   JWT_SECRET=YOUR_SECURE_LONG_RANDOM_SECRET_KEY_MINIMUM_32_CHARS
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=https://your-frontend-domain.vercel.app
   TIMEZONE=Asia/Dhaka
   CURRENCY=BDT
   ```
4. Build and start:
   ```bash
   npm install
   npm run build
   npm run seed    # (Optional: seeds initial admin and products if empty)
   npm start
   ```

---

## 4. Frontend Deployment (Vercel / Netlify / VPS)
1. Navigate to `frontend/`.
2. Set environment variables in your Vercel project settings:
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend-api.onrender.com/api/v1
   ```
3. Deploy build command:
   ```bash
   npm install
   npm run build
   ```

---

## 5. Security Checklist
- [x] HTTPS enforced on both frontend and backend.
- [x] CORS restricted to explicit frontend domain.
- [x] Secure HTTP-only cookies with `SameSite=None; Secure` in production.
- [x] Rate limiting active on login and API endpoints.
- [x] Passwords hashed using bcrypt.
- [x] Strict Sales Officer isolation enforced at database query & middleware levels.
