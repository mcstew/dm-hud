# DM HUD - Deployment Guide

Version 0.8.0 is ready for deployment! This guide covers GitHub and Vercel setup.

---

## ✅ Pre-Deployment Checklist

- [x] All code committed to git
- [x] Version bumped to 0.8.0
- [x] README.md updated
- [x] CHANGELOG.md created
- [x] vercel.json configured
- [x] Dev server tested locally
- [ ] Pushed to GitHub
- [ ] Deployed to Vercel

---

## 📦 GitHub Setup

### Option 1: GitHub Website (Recommended)

1. **Create Repository**
   - Go to https://github.com/new
   - Repository name: `dm-hud`
   - Description: `Real-time AI-powered assistant for D&D 5.5e Dungeon Masters`
   - Visibility: **Public** (no secrets in code)
   - Don't initialize with README (we have one)
   - Click "Create repository"

2. **Push Local Code**
   ```bash
   cd "/Users/michael/Desktop/Claude Code/dm-hud"
   git remote add origin https://github.com/YOUR_USERNAME/dm-hud.git
   git branch -M main
   git push -u origin main
   ```

3. **Create Release Tag**
   ```bash
   git tag -a v0.8.0 -m "v0.8.0: Major feature update - Entity system redesign, Events, Session reports"
   git push origin v0.8.0
   ```

4. **Create GitHub Release** (Optional but recommended)
   - Go to your repo → Releases → Draft a new release
   - Choose tag: `v0.8.0`
   - Release title: `v0.8.0 - Entity System Redesign & Session Reports`
   - Description: Copy from CHANGELOG.md
   - Publish release

### Option 2: GitHub CLI

```bash
# Install GitHub CLI if needed
brew install gh

# Authenticate
gh auth login

# Create repo and push
cd "/Users/michael/Desktop/Claude Code/dm-hud"
gh repo create dm-hud --public --source=. --remote=origin --push --description "Real-time AI-powered assistant for D&D 5.5e Dungeon Masters"

# Create release
gh release create v0.8.0 --title "v0.8.0 - Entity System Redesign & Session Reports" --notes-file CHANGELOG.md
```

---

## 🚀 Vercel Deployment

### Why Vercel?
- Perfect for static React apps
- Automatic HTTPS
- Global CDN
- Zero config for Vite
- Free tier is generous
- Automatic deployments on push

### Safety Confirmation
✅ **100% safe to deploy publicly**
- No API keys in code (users bring their own)
- No backend server
- All processing client-side
- No sensitive data stored on server
- No database connections

### Option 1: Vercel Dashboard (Easiest)

1. **Connect GitHub**
   - Go to https://vercel.com
   - Sign up/login with GitHub
   - Click "Add New Project"
   - Import your `dm-hud` repository

2. **Configure Project**
   - Framework Preset: **Vite** (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)
   - Install Command: `npm install` (auto-detected)
   - No environment variables needed

3. **Deploy**
   - Click "Deploy"
   - Wait ~2 minutes for build
   - Get your URL: `https://dm-hud.vercel.app` (or similar)

4. **Configure Domain** (Optional)
   - Settings → Domains
   - Add custom domain if you have one
   - Or use the Vercel-provided subdomain

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Navigate to project
cd "/Users/michael/Desktop/Claude Code/dm-hud"

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Set up automatic deployments
# (Vercel will auto-deploy on every git push)
```

### Post-Deployment

After deploying, Vercel gives you:
- **Preview URL**: `https://dm-hud-xxxxx.vercel.app`
- **Production URL**: `https://dm-hud.vercel.app`
- **Auto-deploy**: Every push to main → new deployment
- **Preview deploys**: Every PR → preview deployment

---

## 🔧 Configuration Files

### vercel.json
Already created with optimal settings:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

The rewrite rule ensures SPA routing works correctly (all routes serve index.html).

### package.json
Scripts are already configured:
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run preview` - Preview production build

---

## 🧪 Testing Deployment

After deploying, test these features:

### Basic Functionality
1. Open deployed URL
2. Create a campaign
3. Type a transcript entry
4. Verify entity extraction works
5. Check that data persists after refresh

### API Keys
1. Click Settings
2. Add Anthropic API key
3. Add Deepgram API key
4. Verify they're stored in localStorage
5. Refresh page - keys should persist

### Features
1. Test Roster (player → character mapping)
2. Test Arc (DM context)
3. Create entities
4. Toggle combat/exploration modes
5. Edit HP and stats
6. Generate session report
7. Export report as Markdown
8. Test live audio (if you have API keys)

---

## 📊 Monitoring

### Vercel Dashboard
- View deployment logs
- Check build times
- Monitor bandwidth usage
- See visitor analytics (if enabled)

### Browser Console
- Check for JavaScript errors
- Verify API calls work
- Monitor localStorage usage

---

## 🔄 Update Workflow

After deployment is set up:

1. **Make changes locally**
   ```bash
   # Make your changes
   npm run dev  # Test locally
   ```

2. **Commit changes**
   ```bash
   git add .
   git commit -m "Add feature X"
   ```

3. **Push to GitHub**
   ```bash
   git push origin main
   ```

4. **Automatic deployment**
   - Vercel auto-detects push
   - Builds and deploys automatically
   - New version live in ~2 minutes

---

## 🏷️ Version Tags

For releases, use semantic versioning:

```bash
# Patch (0.8.0 → 0.8.1) - bug fixes
git tag -a v0.8.1 -m "Fix HP calculation bug"

# Minor (0.8.0 → 0.9.0) - new features
git tag -a v0.9.0 -m "Add export/import functionality"

# Major (0.9.0 → 1.0.0) - breaking changes
git tag -a v1.0.0 -m "Official release"

# Push tags
git push origin --tags
```

---

## 🐛 Troubleshooting

### Build Fails on Vercel
- Check Vercel logs for specific error
- Verify build works locally: `npm run build`
- Check node version compatibility
- Ensure all dependencies in package.json

### API Keys Not Working
- API keys must be set by each user
- Keys stored in localStorage (not deployed)
- Users need their own Anthropic + Deepgram keys

### SPA Routing Issues
- Ensure vercel.json has rewrite rule
- Vercel should auto-handle SPA routing
- Check that all routes serve index.html

### localStorage Not Persisting
- Check browser privacy settings
- Verify not in incognito/private mode
- Check localStorage quota (10MB limit)

---

## 📧 Share Your Deployment

After deployment, share with:

**For Users:**
```
Check out DM HUD - an AI assistant for D&D!
🎲 https://dm-hud.vercel.app

Features:
✨ Real-time entity tracking
🎤 Audio transcription
📊 Character milestones
📝 Session reports

You'll need API keys:
- Anthropic (Claude): https://console.anthropic.com
- Deepgram (optional): https://console.deepgram.com
```

**For Developers:**
```
DM HUD - Open source D&D assistant
📦 GitHub: https://github.com/YOUR_USERNAME/dm-hud
🚀 Demo: https://dm-hud.vercel.app
📖 Docs: README.md

Tech: React + Vite + Tailwind + Claude AI
```

---

## ✅ Deployment Complete!

Once both GitHub and Vercel are set up:

1. Share your repo URL with other Claude sessions
2. Vercel auto-deploys on every push
3. Users can fork and deploy their own instances
4. Continuous delivery is set up

**Next:** Continue development, users can test the live version!

---

## 🎉 You're Done!

Your DM HUD is now:
- ✅ Version controlled on GitHub
- ✅ Publicly accessible on Vercel
- ✅ Auto-deploying on changes
- ✅ Ready for users and collaborators

Happy DMing! 🎲✨
