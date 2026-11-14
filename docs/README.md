# Asclepius website

A one-page site for the Asclepius hackathon project. The hero sits over a live 3D model of the hand
controller; scrolling pulls every part out at once while the camera orbits, then the page continues
with features, a data-flow diagram, specs, team, FAQ and links.

## Files

- `index.html`: the whole page (HTML, CSS and JS in one file; three.js r128 loads from a CDN)
- `controller.glb`: the controller model, 3.3 MB, one node per part
- `images/`: feature renders made from the same model (transparent PNG)

## Run it

The model loads over HTTP, so use a web server rather than opening the file directly:

    cd asclepius_site
    python3 -m http.server 8000     # then open http://localhost:8000

Any static host works: GitHub Pages, Netlify, Vercel or your own server.

## Fill in the placeholders (marked TBD on the page)

1. Links: near the bottom of `index.html`, set
   `window.ASCLEPIUS_LINKS = { devpost: "https://…", demo: "https://…", github: "https://…" }`.
   Every button with that link updates and loses its TBD badge.
2. Event name: in the top banner (`<div class="banner">`).
3. Team: the two `.member` cards. Replace the `?` avatar with initials or an `<img>`.
4. Simulator footage: replace the `.placeholder` block with
   `<video src="sim.mp4" autoplay muted loop playsinline></video>` inside a `.media` element.
5. Check the specs and FAQ against what you actually built before judging.

## Tuning

- Teardown length: `.td { height: 430vh }`. Taller is slower.
- Explode timing: in `tick()`, the hero fades over the first 12 % and the parts spread from 14 % to 80 %.
- Camera: the `az` and `el` lines in `tick()` set the orbit (degrees).
- Colours: CSS variables at the top. The page follows the visitor's light or dark setting.
