# Axioma Therapeutics website

The company website for Axioma Therapeutics: peptide and mini-protein therapeutics for degenerative retinal disease.

It is a one-page static site (HTML, CSS and JavaScript) with no build step on the server, so it runs as-is on GitHub Pages or any static host. Live at https://kabirsinghji.github.io/axioma-website/.

## What is on the page

`index.html` is the whole site. The menu jumps between its sections:

1. Hero: the retina, the one-line pitch and a facts row
2. Mission and goals
3. The macula, in an OCT-style cross-section
4. Science (`#science`): a pinned scene that walks through target surface, sequence search, docking and molecular dynamics
5. Why it matters (`#why`): who loses what, then a portrait whose central vision worsens through the stages of AMD as you scroll
6. Focus (`#focus`): the diseases, with sourced figures
7. Progress (`#progress`): the four development stages and what customer discovery taught us
8. Founders (`#team`)
9. Updates sign-up (`#updates`)
10. Contact (`#contact`)

`404.html` is the page-not-found page; GitHub Pages uses it automatically.

```
assets/css/styles.css   all styles (colors and type are tokens at the top)
assets/js/site.js       menu, section highlighting, copy-email, sign-up form, the vision-loss scene
assets/js/scene.js      the pinned science scene and the footer contours (canvas)
assets/img/             retina, OCT, portrait, headshots, a still of the science scene, social share image
assets/logo/            Axioma logo files (SVG)
favicon.svg, favicon-32.png, apple-touch-icon.png
```

The illustrations of people are Open Peeps by Pablo Stanley (CC0), inlined as SVG.

## Before it is finished

- [ ] Contact email: replace `hello@[domain]` in `index.html`
- [ ] Ravi's bio is a short draft; add his background
- [ ] Connect the sign-up form (below), then add a privacy policy and link it in the footer
- [ ] Custom domain, if you get one (below)

## Connect the sign-up form

GitHub Pages cannot receive form submissions on its own. Create a form at a service such as [Formspree](https://formspree.io) and paste its URL into `SIGNUP_ENDPOINT` at the top of the sign-up code in `assets/js/site.js`. Until then the form tells visitors sign-ups open soon and asks them to email instead.

## Publish on GitHub Pages

The repository is set to **Settings → Pages → Deploy from a branch**, branch `main`, folder `/ (root)`. Every push to `main` goes live within a minute or two.

### Custom domain

Add it under **Settings → Pages → Custom domain** and point your DNS at GitHub Pages as GitHub describes there. Turn on **Enforce HTTPS** once the certificate is issued. Then change the `canonical`, `og:url` and `og:image` addresses at the top of `index.html` to the new domain.

## Facts and sources used on the site

- AMD prevalence (196 million projected for 2020, 288 million by 2040): Wong WL et al., *Lancet Glob Health* 2014;2(2):e106–16, doi:10.1016/S2214-109X(13)70145-1
- Stages and symptoms of AMD used in the vision-loss scene: National Eye Institute, [Age-Related Macular Degeneration](https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/age-related-macular-degeneration)
- Kabir's publication: *European Journal of Medicinal Chemistry* (2026), doi:10.1016/j.ejmech.2026.119173

The protein, binder and every plotted number in the science scene are illustrative; they are not results or a real target, and the page says so.

© 2026 Axioma Therapeutics. All rights reserved.
