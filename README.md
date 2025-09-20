# SGSA Scouts Website

## Local Development Setup

### Setting up the GitHub token:

1. **Set environment variable:**
   ```bash
   # Windows (Command Prompt)
   set IMAGE_UPLOAD_TOKEN=your_github_token_here

   # Windows (PowerShell)
   $env:IMAGE_UPLOAD_TOKEN="your_github_token_here"

   # Mac/Linux
   export IMAGE_UPLOAD_TOKEN=your_github_token_here
   ```

2. **Build for local development:**
   ```bash
   # Windows
   build-local.bat

   # Mac/Linux
   ./build-local.sh
   ```

3. **Open the website:**
   - Open `index.html` in your browser
   - Admin panel: Open `admin.html`

### GitHub Pages Deployment

The site automatically deploys to GitHub Pages when you push to the main branch. The `IMAGE_UPLOAD_TOKEN` secret you set up in GitHub will be automatically injected during deployment.

### Resetting config.js

After local development, reset the config file:
```bash
git checkout config.js
```

## Features

- 📢 Announcements with image upload
- 📅 Interactive calendar with RSVP
- 🖼️ Photo gallery
- 👥 Team management
- 🔐 Admin panel with authentication