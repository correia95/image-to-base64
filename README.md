# Image to Base64

Convert an image to a Base64 data URI (and back) in the browser.

- Drag & drop or pick an image → data URI, plus its dimensions, file size and encoded size (+%).
- Copy as: raw **data URI**, **`<img>` tag**, **CSS `background-image`**, a full **CSS rule**, or
  **Markdown**.
- **Base64 → Image** tab: paste a data URI to preview it and download the image.
- Nothing is uploaded — `FileReader` does the work locally. Output-format choice persists in
  `localStorage`.

## Develop

```
npm install
npm run dev
npm run build
```

Helpers and tests: [`src/b64img.ts`](src/b64img.ts). Static site on Cloudflare Workers.

Part of [Tiny Tools](https://tinytools.correia95.workers.dev).
