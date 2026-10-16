# Axioma Therapeutics website

The company website for Axioma Therapeutics: peptide therapeutics for degenerative eye disease.

It is a plain static site (HTML, CSS and a little JavaScript) with no build step, so it runs as-is on GitHub Pages or any static host.

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home |
| `science.html` | Science and platform |
| `pipeline.html` | Pipeline |
| `diseases.html` | Disease areas and a note for patients |
| `team.html` | Founders, advisors and careers |
| `partnering.html` | Partnering |
| `news.html` | News, media contact and logo downloads |
| `contact.html` | Contact details and contact form |
| `404.html` | Page-not-found page (GitHub Pages uses it automatically) |

```
assets/css/styles.css   all styles (colors and type scale are tokens at the top)
assets/js/main.js       mobile menu and form handling
assets/img/             hero and section imagery, social share image
assets/logo/            Axioma logo files (SVG)
favicon.svg, favicon-32.png, apple-touch-icon.png
```

The header and footer are repeated in every page. If you change the menu or footer, change it in all nine files.

## Publish on GitHub Pages

1. Create a new repository on GitHub, for example `axioma-website`.
2. Push this folder to it:
   ```
   git remote add origin https://github.com/<your-account>/axioma-website.git
   git push -u origin main
   ```
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute the site is live at `https://<your-account>.github.io/axioma-website/`.

### Custom domain

When you have a domain, add it under **Settings → Pages → Custom domain**, then point your DNS at GitHub Pages as GitHub describes there. GitHub adds a `CNAME` file to the repository for you. Turn on **Enforce HTTPS** once the certificate is issued.

After the domain is live, change the `og:image` line in each page's `<head>` to the full address, for example `https://<your-domain>/assets/img/og-image.jpg`, so link previews show the image.

## Connect the forms

GitHub Pages cannot receive form submissions on its own. The newsletter signup (in every footer) and the contact form post to a form service such as [Formspree](https://formspree.io):

1. Create two forms in Formspree (one for the newsletter, one for contact).
2. Paste each form's URL into the `FORM_ENDPOINTS` setting at the top of `assets/js/main.js`.

Until you do, the forms tell visitors they are not connected yet and ask them to email instead.

## Before launch: fill in the placeholders

Everything in square brackets is a placeholder. Search the project for `[` to find them all.

- [ ] Email domain: `hello@[domain]`, `bd@[domain]`, `careers@[domain]`, `press@[domain]`, `science@[domain]`
- [ ] Platform name: `[Platform name]` (home and science pages)
- [ ] Program names, target classes and indications in the pipeline chart: `[AX-101]`, `[AX-102]`, `[Target class]`, `[Indication]`
- [ ] Pipeline bar lengths: set with `style="--p: 18%"` on each bar (each stage column is 25%)
- [ ] First programs line on the home page: `[pathway] in [indication]`
- [ ] Team: `Raja [Surname]`, advisor names, degrees, affiliations and short bios
- [ ] Headshots: replace each `<div class="headshot">…</div>` with `<img class="headshot" src="assets/img/team/<name>.jpg" alt="<Name>">` (portrait, 4:5)
- [ ] News dates and summaries, publications and presentations
- [ ] Add LinkedIn links for the team if you want them
- [ ] Add a privacy policy page before collecting emails, and link it in the footer
- [ ] Review the disease and science copy for anything you are not ready to disclose publicly

## Facts and sources used on the site

- AMD prevalence (196 million in 2020, 288 million projected by 2040): Wong WL et al., *Lancet Glob Health* 2014;2(2):e106–16, doi:10.1016/S2214-109X(13)70145-1
- "AMD is a leading cause of severe visual impairment and blindness in the United States": National Eye Institute, *Age-Related Macular Degeneration: Status of Research*
- "In the United States, diabetic eye disease is the leading cause of vision loss among working-age adults": National Eye Institute, *National Diabetes Month* article

## Editing the look

Colors, fonts and the type scale are CSS custom properties at the top of `assets/css/styles.css`. The fonts are IBM Plex Sans and IBM Plex Mono from Google Fonts.

The imagery in `assets/img/` was generated for Axioma and can be replaced with your own renders or photography of the same sizes.

© 2026 Axioma Therapeutics. All rights reserved.
