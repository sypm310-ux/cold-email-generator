#!/bin/sh
# Run this from the project root to prepare and push to GitHub.
# Usage: chmod +x upload-to-github.sh && ./upload-to-github.sh
# Or copy-paste the commands below into your terminal.

set -e
cd "$(dirname "$0")"

echo "→ Initializing git repo (if needed)..."
git init

echo "→ Staging files..."
git add .

echo "→ Creating initial commit..."
git commit -m "Initial commit: Cold Email Generator (React + Express + Gemini)" || true

echo ""
echo "✓ Done. Next steps:"
echo "  1. Create a new repository on GitHub: https://github.com/new"
echo "     (Do NOT add a README, .gitignore, or license—repo should be empty)"
echo "  2. Run these commands (replace USERNAME and REPO with your repo name):"
echo ""
echo "     git remote add origin https://github.com/USERNAME/REPO.git"
echo "     git branch -M main"
echo "     git push -u origin main"
echo ""
echo "  If you already added 'origin' before, use instead:"
echo "     git remote set-url origin https://github.com/USERNAME/REPO.git"
echo "     git push -u origin main"
echo ""
