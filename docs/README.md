# Master controller teardown

A scroll-driven 3D teardown of the v0.1 haptic master controller. The model stays pinned while
the page scrolls and comes apart from the handle down to the base, one subassembly per section.

## Files

- `index.html`: the page (HTML, CSS and JS in one file, three.js r128 from a CDN)
- `controller.glb`: the model, 3.3 MB, Z-up millimetres, one node per part

## Run it

The model is fetched with an HTTP request, so open it through a web server, not by double-clicking:

    cd teardown_site
    python3 -m http.server 8000      # then visit http://localhost:8000

Any static host works the same way (GitHub Pages, Netlify, Vercel, your own server).
Keep `controller.glb` next to `index.html`, or set its location before the main script:

    <script>window.TEARDOWN_MODEL_URL = "/assets/controller.glb";</script>

## Put it inside an existing page

Option 1, the quick one: host the folder and embed it with an iframe. Give the iframe a fixed height
(for example `height: 100vh`). The teardown then scrolls inside the frame instead of with your page.

    <iframe src="/teardown/index.html" style="width:100%;height:100vh;border:0" title="Controller teardown"></iframe>

Option 2, scrolls with your page: copy the `<style>` block, the `<div class="teardown">` element and the
three `<script>` tags at the end of `<body>` into your page. Everything is scoped under `.teardown`,
except the CSS variables on `:root` and the `body` rule, which you can drop if your site sets its own.

## Edit the story

- Text: each `<section class="chapter">` is one card. Change the words freely.
- Which parts move in which chapter: `CHAPTERS` in the script maps chapters to build steps.
- How far parts fly apart: the `o` offsets in `META` (mm), or scale them all at once in `tick()`.
- Colours: `TYPES` in the script; page colours are the CSS variables at the top.
