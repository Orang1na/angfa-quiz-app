# AGENTS.md

This repository contains a static quiz app for practicing ANGFA Store product names from product images. It is a plain HTML/CSS/JavaScript app with no build step, designed to be hosted on GitHub Pages.

## Project Structure

- `index.html`: HTML entry point. It directly loads `src/styles.css` and `src/main.js`.
- `src/main.js`: Vanilla JavaScript app logic for state, data loading, category filtering, answer judging, rendering, and event binding.
- `src/styles.css`: App styling. No CSS framework is used.
- `public/data/angfa-quiz-db.json`: Quiz data. The `items` array contains product codes, official answers, image paths, product URLs, categories, prices, and source image URLs.
- `public/assets/products/`: Local product images used by the quiz.
- `scripts/download_images.py`: Helper script that downloads images from `source_image_url`, stores them in `public/assets/products/`, and updates each item's `image_url`.
- `.github/workflows/deploy-pages.yml`: GitHub Pages deployment workflow, triggered by pushes to `prod` or manual dispatch.

## Local Development

Do not open `index.html` through `file://`, because the browser will block `fetch("./public/data/angfa-quiz-db.json")`. Use a local HTTP server instead:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`. On Windows, `python -m http.server 4173` may be the available command.

## Development Notes

- There are no package dependencies or build tools. For small changes, keep the existing vanilla JavaScript structure.
- `src/main.js` currently keeps state, data sanitization, queue handling, rendering, and event binding in one file. Only split responsibilities if a change is large enough to justify it.
- User-facing copy is mostly Japanese. Treat files as UTF-8. In PowerShell, use `Get-Content -Encoding UTF8` when reading Japanese text to avoid mojibake.
- Answer matching is implemented in `normalizeAnswer()`, which applies NFKC normalization, lowercasing, whitespace removal, and removal of selected punctuation before exact comparison. Review that function before changing judging behavior.
- When updating quiz data, make sure `public/data/angfa-quiz-db.json` has `items[].image_url` values that point to actual files in `public/assets/products/`.
- `sanitizeItems()` filters out items without `answer` or `image_url`, and also filters items whose `source_image_url` points to `/images/category/`. This affects how many quiz items are available at runtime.

## Validation

- JSON validity: parse `public/data/angfa-quiz-db.json` with a JSON parser.
- JavaScript syntax: if Node.js is available, run `node --check src/main.js`.
- Browser behavior: run the local server and manually check category selection, answer judging, reveal answer, skip, and reset.

## Deployment

- `prod` is the public deployment branch.
- The GitHub Pages workflow uploads the whole repository as the Pages artifact.
- There is no build step. Before publishing, merge or copy the verified `main` contents into `prod`.
