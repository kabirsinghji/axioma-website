# Axioma Therapeutics website

The company website for Axioma Therapeutics: peptide therapeutics for degenerative eye disease.

It is a one-page static site (HTML, CSS and a little JavaScript) with no build step, so it runs as-is on GitHub Pages or any static host.

## What is on the page

`index.html` is the whole site. The menu jumps between its sections:

1. Hero, with a "Follow our progress" prompt
2. Our vision
3. Our approach (`#approach`)
4. Why peptides, with a small diagram comparing drug types
5. Focus: the retinal diseases we are starting with, with sourced figures (`#focus`)
6. Founders (`#team`)
7. Contact: who we want to work with, plus a contact form (`#contact`)
8. Footer with a newsletter signup (`#updates`)

`404.html` is the page-not-found page; GitHub Pages uses it automatically.

```
assets/css/styles.css   all styles (colors and type scale are tokens at the top)
assets/js/main.js       mobile menu and form handling
assets/js/motion.js     animation: hero model, the four-step approach scene, footer contours
assets/img/             still versions of the animations (shown with reduced motion), social share image
assets/logo/            Axioma logo files (SVG)
favicon.svg, favicon-32.png, apple-touch-icon.png
```

`index.html` and `404.html` share the same header and footer. If you change the menu or footer, change it in both.

## Publish on GitHub Pages

1. Create a new, empty repository on GitHub, for example `axioma-website`.
2. Push this folder to it:
   ```
   git remote add origin https://github.com/<your-account>/axioma-website.git
   git push -u origin main
   ```
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute the site is live at `https://<your-account>.github.io/axioma-website/`.

### Custom domain

When you have a domain, add it under **Settings → Pages → Custom domain**, then point your DNS at GitHub Pages as GitHub describes there. GitHub adds a `CNAME` file to the repository for you. Turn on **Enforce HTTPS** once the certificate is issued.

After the domain is live, change the `og:image` line in the `<head>` of both pages to the full address, for example `https://<your-domain>/assets/img/og-image.jpg`, so link previews show the image.

## Connect the forms

GitHub Pages cannot receive form submissions on its own. The newsletter signup (in the footer) and the contact form post to a form service such as [Formspree](https://formspree.io):

1. Create two forms in Formspree (one for the newsletter, one for contact).
2. Paste each form's URL into the `FORM_ENDPOINTS` setting at the top of `assets/js/main.js`.

Until you do, the forms tell visitors they are not connected yet and ask them to email instead.

## Before launch: fill in the placeholders

Everything in square brackets is a placeholder. Search `index.html` for `[` to find them.

- [ ] Email address: `hello@[domain]`
- [ ] `Raja [Surname]`
- [ ] Raja's bio: `[Short bio: …]` (Kabir's bio is written; review it)
- [ ] Headshots: replace each `<div class="headshot">…</div>` with `<img class="headshot" src="assets/img/team/<name>.jpg" alt="<Name>">` (portrait, 4:5)
- [ ] Add a privacy policy before collecting emails, and link it in the footer
- [ ] Review the copy for anything you are not ready to disclose publicly

## Adding more later

When there is more to show (advisors, a named platform, programs, news), add a section to `index.html` using the existing section pattern, or add a page that copies the header and footer from `404.html`.

## Facts and sources used on the site

- AMD prevalence (196 million in 2020, 288 million projected by 2040): Wong WL et al., *Lancet Glob Health* 2014;2(2):e106–16, doi:10.1016/S2214-109X(13)70145-1
- "AMD is a leading cause of severe visual impairment and blindness in the United States": National Eye Institute, *Age-Related Macular Degeneration: Status of Research*
- "In the United States, diabetic eye disease is the leading cause of vision loss among working-age adults": National Eye Institute, *National Diabetes Month* article

## Editing the look

Colors, fonts and the type scale are CSS custom properties at the top of `assets/css/styles.css`. The fonts are IBM Plex Sans and IBM Plex Mono from Google Fonts.

The animations follow the design workflow on the page: target surface, sequence search, docking funnel, then molecular dynamics and an alanine scan. The protein, peptide and every plotted number are illustrative and generated in `motion.js`; they are not results or a real target, and the panels say so. The still images in `assets/img/` are frames rendered from the same animations.

© 2026 Axioma Therapeutics. All rights reserved.
