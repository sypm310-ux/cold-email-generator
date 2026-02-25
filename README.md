# Cold Email Generator

A small web app that generates cold outreach emails using the **Google Gemini API**. Enter your product/service, target audience, and optional context; the app returns a subject line and email body.

## Setup

1. **Install root dependencies** (backend + runner):
   ```bash
   npm install
   ```

2. **Install client dependencies**:
   ```bash
   cd client && npm install
   ```

3. **API key**  
   The app reads `GEMINI_API_KEY` from the `.env` file in the project root. A key is already set there. For production, use a `.env` file that is not committed (e.g. add `.env` to `.gitignore`, which is already done).

## Run

From the project root:

```bash
npm run dev
```

This starts:

- **Backend** at `http://localhost:3001`
- **Frontend** at `http://localhost:5173`

Open `http://localhost:5173` in your browser. The frontend proxies `/api` to the backend, so you can use the UI without CORS issues.

## Usage

1. **Product or service** – What you’re offering (e.g. “B2B analytics dashboard for sales teams”).
2. **Target audience** – Who you’re writing to (e.g. “VP Sales at mid-size SaaS companies”).
3. **Tone** – Professional, friendly, direct, or casual.
4. **Extra context** (optional) – Any specifics (e.g. “We help reduce churn by 20%. Focus on time-saving.”).

Click **Generate cold email**. The result shows a subject and body; use **Copy to clipboard** to paste into your email client.

## Tech

- **Backend**: Node.js, Express, `@google/genai` (Gemini).
- **Frontend**: React, Vite.
- **API key**: Stored in `.env` and used only on the server.
