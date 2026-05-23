# 🪴 Yoga — Smart Business App

## ⚡ Setup (one time only)

### 1. Add Firebase secrets to GitHub
Go to your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these one by one:
| Name | Value |
|------|-------|
| `VITE_FIREBASE_API_KEY` | your Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | yourproject.firebaseapp.com |
| `VITE_FIREBASE_DB_URL` | https://yourproject-default-rtdb.firebaseio.com |
| `VITE_FIREBASE_PROJECT_ID` | yourproject |
| `VITE_FIREBASE_APP_ID` | your app ID |
| `VITE_ADMIN_EMAIL` | yogeshchapagain733@gmail.com |

### 2. Enable GitHub Pages
Settings → Pages → Source: **gh-pages** branch

### 3. Push code
Every push to `main` auto-builds and deploys via GitHub Actions.

## 🌐 Live URL
`https://yogesh10-tech.github.io/Shopwithme/`

## ✅ Features
- 📵 Full offline support — records save locally, sync when online
- ⚡ Instant load — Vite build, no Babel runtime
- 🔐 Secure — Firebase keys in GitHub Secrets, never in code
- 👥 Same UI for all — owner and cashier see same screens, role controls permissions
- ✏️ Edit/delete transactions and parties
- 📅 Custom date on all records
- 🧮 Built-in calculator
- 📊 Reports with payment breakdown
- 🧾 Print invoices
