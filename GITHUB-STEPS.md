# Upload this project to GitHub (step-by-step)

Do this **after** you've installed the Command Line Developer Tools (`xcode-select --install` in Terminal).

---

## Step 1: Open Terminal

Open **Terminal** (Spotlight → type "Terminal" → Enter).

---

## Step 2: Go to the project folder

```bash
cd /Users/sy/Downloads/test-vibe-code-app
```

---

## Step 3: Initialize Git and create the first commit

Run the script:

```bash
chmod +x upload-to-github.sh
./upload-to-github.sh
```

Or do it manually:

```bash
git init
git add .
git commit -m "Initial commit: Cold Email Generator (React + Express + Gemini)"
```

---

## Step 4: Create a new repository on GitHub

1. Go to **https://github.com/new**
2. **Repository name:** e.g. `cold-email-generator`
3. Leave **Description** empty if you like
4. Choose **Public**
5. **Do NOT** check "Add a README", ".gitignore", or "License" — the repo should be **empty**
6. Click **Create repository**

---

## Step 5: Connect your folder to GitHub and push

GitHub will show you "…or push an existing repository from the command line." Use those commands, but with your repo URL.

**If this is the first time** (no remote yet):

```bash
git remote add origin https://github.com/YOUR_USERNAME/cold-email-generator.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username (e.g. `sypm310-ux`).

**If you already added `origin` before** (e.g. ran the script twice):

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/cold-email-generator.git
git branch -M main
git push -u origin main
```

---

## Step 6: Sign in when asked

If Git asks for your **username** and **password**:

- **Username:** your GitHub username  
- **Password:** use a **Personal Access Token**, not your GitHub password  
  - Go to GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**  
  - **Generate new token**, give it a name, check **repo**, then generate  
  - Copy the token and paste it when Git asks for a password  

---

## Done

Your code is on GitHub. You can now use **DEPLOY.md** to deploy (e.g. Render or Railway) by connecting that repo.
