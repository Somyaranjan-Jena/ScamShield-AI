# 🛡️ ScamShield AI

**Citizen Fraud Shield & Digital Public Safety Intelligence**

ScamShield AI is an advanced, real-time fraud detection and public safety intelligence platform designed to protect citizens from digital arrests, phishing, financial fraud, and impersonation scams. It features a modern, glassmorphic Next.js frontend, a high-performance FastAPI Python backend, and tools for real-time call analysis and threat intelligence.

---

## ✨ Key Features

- **Live Call Analysis**: Real-time websocket-based speech analysis that detects coercion, urgency, and financial threats during live phone calls.
- **Threat Intelligence Dashboard**: Visualize scam trends, active threats, and geographical network nodes.
- **AI-Powered Fraud Scanner**: Paste suspicious SMS messages, emails, or links to get instant risk verdicts and actionable recommendations.
- **Citizen Rewards System**: Gamified ecosystem to encourage reporting scams, completing security quizzes, and protecting the community.
- **Browser Extension Integration**: Companion extension to warn users about malicious URLs and phishing sites in real-time.

---

## 🛠️ Technology Stack

**Frontend**
- Next.js 14 (App Router)
- React & TypeScript
- Tailwind CSS (Glassmorphism & Custom Animations)
- Lucide Icons & Recharts

**Backend**
- Python 3 & FastAPI
- WebSockets for real-time streaming
- Pydantic for schema validation

**Infrastructure**
- Docker & Docker Compose
- Supabase (PostgreSQL / Optional)

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- Docker (optional, for full-stack orchestration)

### 1. Clone the Repository
```bash
git clone https://github.com/Somyaranjan-Jena/ScamShield-AI.git
cd ScamShield-AI
```

### 2. Setup Backend (FastAPI)
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*The backend API documentation will be available at `http://127.0.0.1:8000/docs`*

### 3. Setup Frontend (Next.js)
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*The web interface will be available at `http://localhost:3000`*

### 4. Running via Docker
If you prefer running the entire stack via Docker:
```bash
docker-compose up --build
```

---

## 🌍 Deployment

### Deploying Frontend (Vercel)
1. Import the `frontend` folder into a new Vercel project.
2. Set the Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Your deployed backend URL (e.g., `https://scamshield-backend.onrender.com`)
   - `NEXT_PUBLIC_WS_URL`: Your deployed WebSocket URL (e.g., `wss://scamshield-backend.onrender.com`)

### Deploying Backend (Render / Railway)
1. Create a new Web Service pointing to the `backend` folder.
2. Set the Build Command: `pip install -r requirements.txt`
3. Set the Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Set the Environment Variable:
   - `FRONTEND_URL`: Your deployed Vercel URL (for CORS allowance)

---

## 📄 License
This project is licensed under the MIT License.
