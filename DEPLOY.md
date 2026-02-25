# Get a public sharing link (deploy this app)

You can host this app for free and get a public URL. Pick one of the options below.

**Don't have Git/GitHub set up?** Use **Option 4 (Railway CLI)** or **Option 5 (Fly.io)** to deploy straight from your Mac—no GitHub needed.

---

## Option 1: Render (recommended, free tier)

1. **Push this project to GitHub**  
   - Create a new repo, then:
   - `git init && git add . && git commit -m "Cold email generator" && git remote add origin <your-repo-url> && git push -u origin main`

2. **Sign up at [render.com](https://render.com)** (free).

3. **New → Web Service**  
   - Connect your GitHub account and select this repository.

4. **Configure the service**
   - **Name:** e.g. `cold-email-generator`
   - **Runtime:** Node
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
   - **Environment:** Add variable `GEMINI_API_KEY` = your Gemini API key (from [Google AI Studio](https://aistudio.google.com/app/apikey))

5. **Create Web Service**  
   - Render will build and deploy. When it's done, you get a URL like `https://cold-email-generator.onrender.com`. That's your **public sharing link**.

**Note:** On the free tier the app may spin down after inactivity; the first load after a while can take ~30 seconds.

---

## Option 2: Railway (from GitHub)

1. Push the project to GitHub (same as Option 1).
2. Go to [railway.app](https://railway.app), sign in with GitHub.
3. **New Project → Deploy from GitHub** and select this repo.
4. In the service **Variables** tab, add `GEMINI_API_KEY`.
5. Railway will detect Node and run `npm start`. Set **Build Command** to `npm run build` in the service settings if needed.
6. Use **Generate Domain** to get a public URL.

---

## Option 3: Run locally and share with ngrok

If you only need a **temporary** public link:

1. Build and start the app:
   ```bash
   npm run build
   NODE_ENV=production npm start
   ```
2. In another terminal, run [ngrok](https://ngrok.com):
   ```bash
   npx ngrok http 3001
   ```
3. Use the `https://...ngrok.io` URL ngrok prints. Your API key stays on your machine; don't share the ngrok URL widely if the app uses a sensitive key.

---

## Option 4: Railway CLI (no GitHub needed)

Deploy from your project folder using Railway's CLI. No git push required.

1. **Install Node** (if you haven't): [nodejs.org](https://nodejs.org).

2. **Install Railway CLI and log in:**
   ```bash
   npm install -g @railway/cli
   railway login
   ```
   (A browser window opens to sign in with GitHub or email.)

3. **From your project folder, deploy:**
   ```bash
   cd /Users/sy/Downloads/test-vibe-code-app
   railway init
   railway up
   ```
   When prompted, create a new project and choose your project folder.

4. **Set the API key and get a URL:**
   - In the [Railway dashboard](https://railway.app/dashboard), open your project → your service → **Variables**.
   - Add `GEMINI_API_KEY` with your key.
   - Under **Settings**, click **Generate Domain** to get a public URL.

5. **Tell Railway how to build and start** (if it didn't detect it):
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`

---

## Option 5: Fly.io (no GitHub needed)

Deploy from your Mac with the Fly CLI. No GitHub required.

1. **Install Fly CLI:**  
   [fly.io/docs/hands-on/install-flyctl](https://fly.io/docs/hands-on/install-flyctl)  
   Or: `brew install flyctl` (if you use Homebrew).

2. **Log in and launch from your project folder:**
   ```bash
   cd /Users/sy/Downloads/test-vibe-code-app
   fly auth login
   fly launch
   ```
   Answer the prompts (e.g. app name, region). Choose **no** to deploying Postgres or Redis if asked.

3. **Set the API key:**
   ```bash
   fly secrets set GEMINI_API_KEY=your_key_here
   ```

4. **Add a Dockerfile** (Fly uses it to run Node). Create a file named `Dockerfile` in the project root with:
   ```dockerfile
   FROM node:20-slim
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   RUN npm run build
   ENV NODE_ENV=production
   EXPOSE 3000
   CMD ["node", "server.js"]
   ```
   Your app already uses `process.env.PORT || 3001`, so Fly's `PORT` will work.

5. **Deploy:**
   ```bash
   fly deploy
   ```
   Your app will be at `https://<your-app-name>.fly.dev`.

---

## Option 6: Glitch

Good for quick, free hosting with a simple UI. You can import from GitHub or upload files.

1. Go to [glitch.com](https://glitch.com) and sign in.
2. **New project → Import from GitHub.**  
   If the repo isn't on GitHub yet, use **New project → glitch-hello-node** and then replace the files by uploading or pasting (more manual).
3. In the project, open **Tools → Environment** (or `.env`) and add `GEMINI_API_KEY`.
4. Glitch runs `npm start` by default. Ensure **Start command** in the project settings is `npm start`, and add a **Build** step: `npm install && npm run build` if Glitch supports it (or run `npm run build` once in the Glitch console).
5. Use **Share → Live site** to get a public URL like `https://your-project.glitch.me`.

---

## Option 7: Koyeb

1. Push the project to GitHub (same as Option 1).
2. Sign up at [koyeb.com](https://www.koyeb.com).
3. **Create App → GitHub** and select this repo.
4. Set **Build command:** `npm install && npm run build`, **Run command:** `npm start`.
5. Add environment variable `GEMINI_API_KEY`.
6. Deploy; Koyeb gives you a URL like `https://your-app.koyeb.app`.

---

## Environment variable

- **`GEMINI_API_KEY`** (required in production) – Get it from [Google AI Studio](https://aistudio.google.com/app/apikey). Set it in your host's environment (e.g. Render "Environment", Railway "Variables", Fly "secrets"). Do not commit `.env` or the key to the repo.
