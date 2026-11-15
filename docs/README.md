# Asclepius website

A static site for **Asclepius**, a 3D-printed surgical robot trainer with force-feedback hand controllers and a Godot simulator.

| Page | File |
| --- | --- |
| Home and scroll teardown | `index.html` |
| Interactive 3D rig | `demo.html` |
| How it works | `how-it-works.html` |
| Team | `team.html` |
| FAQ | `faq.html` |

Everything the site needs is in this folder (three.js, the 3D models, images and the simulator video), so there is no build step. The only outside request is Google Fonts.

## Publish on GitHub Pages

1. Create a new repository on GitHub, for example `asclepius`.
2. Upload the **contents** of this folder to the root of the repository, keeping the `assets` folder as it is. You can drag the files into the GitHub web page ("Add file" → "Upload files"), or from a terminal:
   ```bash
   git init
   git add .
   git commit -m "Asclepius website"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/asclepius.git
   git push -u origin main
   ```
3. In the repository, open **Settings → Pages**. Under "Build and deployment", set **Source** to "Deploy from a branch", choose the `main` branch and the `/ (root)` folder, and save.
4. After a minute or two the site is live at `https://YOUR-USERNAME.github.io/asclepius/`.

The empty `.nojekyll` file tells GitHub Pages to serve the files exactly as they are. If you upload through the web page, check that it was included. Hidden files are sometimes skipped. The site works without it.

## Preview locally

The 3D pages need to be served over http rather than opened as files:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Editing

- Text, links and images are plain HTML in each page file.
- The header, mobile menu and footer are repeated in every page, so change all five when you edit navigation.
- The teardown animation code is at the bottom of `index.html`. The demo page logic is in `assets/js/demo.js`, and the 3D rig scene is in `assets/js/asclepius-rig-engine.js`.
- The site follows the visitor's light or dark system setting.
