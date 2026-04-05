# EchoDesk 🎙️

> **Build your AI voice receptionist in 60 seconds — no code, no call centre.**

EchoDesk is a browser-based platform that lets any small business create an AI-powered voice agent. Customers can search for a business by phone number or name and talk directly to the AI agent — which answers questions from a custom FAQ database instantly.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎤 **Voice AI Agent** | Speech-to-text input, AI-generated responses, text-to-speech output |
| 📋 **FAQ Matching** | Questions matched against business FAQ database before any API call |
| 🔍 **Business Search** | Customers search by phone number or business name to reach any registered agent |
| 💬 **Messaging System** | If the AI can't answer, the question is forwarded to the shopkeeper |
| 📊 **Shop Dashboard** | Shopkeepers view and reply to customer messages in real time |
| 🔒 **Auth System** | Sign up / log in with email and password (localStorage-based) |
| 🌙 **Dark Mode UI** | Premium dark design with animated gradients, glassmorphism, and micro-animations |
| 📱 **Mobile Responsive** | Works on all screen sizes |

---

## 🗂️ Project Structure

```
echoDesk/
│
├── index.html          # Home page (hero + business search)
├── auth.html           # Login / Sign Up page
├── create.html         # Business agent creation form
├── agent.html          # Customer-facing AI agent interface
├── dashboard.html      # Shopkeeper message dashboard
│
├── style.css           # All styles (dark theme, animations, responsive)
│
├── app.js              # Logic for create.html (form, dynamic FAQs, registry)
├── agent.js            # Logic for agent.html (voice, FAQ match, messaging)
├── auth.js             # Logic for auth.html (sign up, log in)
├── dashboard.js        # Logic for dashboard.html (messages, replies, polling)
│
├── config.js           # API key management (rotate between 3 keys)
├── env.js              # Local env reference (gitignored)
├── .env                # Secret keys (gitignored — never commit this)
└── .gitignore
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/echoDesk.git
cd echoDesk
```

### 2. Add your Gemini API key

Open `config.js` and add your key(s):

```js
const GEMINI_KEYS = {
  key1: "YOUR_GEMINI_API_KEY_HERE",
  key2: "",   // optional backup
  key3: "",   // optional backup
};
const ACTIVE_KEY = 1;  // change to 2 or 3 to rotate keys
const GEMINI_API_KEY = GEMINI_KEYS[`key${ACTIVE_KEY}`];
```

> 🔑 Get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey)

### 3. Open in browser

No build step needed — it's plain HTML/CSS/JS.

```bash
# Option A: just open the file
open index.html

# Option B: use a local server (recommended for mic access)
npx serve .
# or
python -m http.server 8080
```

> ⚠️ **Important:** The Web Speech API (microphone) requires either `localhost` or `https://`. Opening as a `file://` URL will not work for voice features.

---

## 🧭 User Flow

```
┌─────────────────────────────────────────────────────┐
│                  BUSINESS OWNER                     │
│                                                     │
│  auth.html → index.html → create.html → agent.html │
│  (sign up)   (home)       (fill form)   (test AI)  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    CUSTOMER                         │
│                                                     │
│  auth.html → index.html ──────────────► agent.html │
│  (sign up)   (search by phone / name)   (talk to AI)│
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   SHOPKEEPER                        │
│                                                     │
│  dashboard.html → enter phone → view messages      │
│                             → reply to customers   │
└─────────────────────────────────────────────────────┘
```

---

## 🤖 How the AI Agent Works

1. **Customer speaks** → captured via Web Speech API (`en-IN` locale)
2. **FAQ match first** → compared against all FAQs using word-overlap scoring (≥40% = match)
   - ✅ Match found → instant answer, no API call, 📋 badge shown
   - ❌ No match → message forwarded to shop team, `⏳ Forwarded` badge shown
3. **Fallback message** → *"I don't have that information right now, but I've forwarded your question to the team."*
4. **Agent speaks** → response read aloud via `SpeechSynthesis` (female voice preferred)
5. **Customer can type** → additional questions saved as `pendingMessages` in localStorage
6. **Polls every 5s** → checks for shopkeeper replies automatically

---

## 💬 Messaging System

| What | How |
|---|---|
| Customer sends message | Saved to `localStorage.pendingMessages` with `status: "pending"` |
| Shopkeeper replies | Opens `dashboard.html`, enters phone number, types reply |
| Reply delivered | Customer's `agent.html` polls every 5s and shows reply in chat |
| Notification | Sound plays + toast pops up + tab title flashes |

---

## 🗝️ API Key Rotation

If one key hits the Gemini rate limit, switch keys without touching every file:

```js
// config.js
const ACTIVE_KEY = 2;   // switch from 1 to 2 or 3
```

---

## 🔐 Security Notes

- `config.js` and `.env` are **gitignored** — API keys never reach GitHub
- Auth is localStorage-based (suitable for demos/hackathons — not production)
- No backend, no server — 100% client-side

---

## 🧪 Quick Demo

Click **✨ Try Demo** on the home page to auto-fill a sample business (*Meera's Salon*) with phone number `9876543210` and 5 pre-loaded FAQs.

Try asking:
- *"Do I need an appointment?"*
- *"What are your prices?"*
- *"Do you offer bridal packages?"*

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | Vanilla CSS (custom properties, animations) |
| Logic | Vanilla JavaScript (ES6+) |
| Voice Input | Web Speech API (`webkitSpeechRecognition`) |
| Voice Output | Web Speech Synthesis API |
| AI | Google Gemini 2.0 Flash Lite |
| Storage | `localStorage` |
| Fonts | Google Fonts — Inter |

---

## 📜 License

MIT — free to use, modify, and distribute.

---

*Made with 💚 for small businesses everywhere.*
