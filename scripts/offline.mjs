import { readFile, writeFile, readdir } from "node:fs/promises";
const files = await readdir("dist/assets");
const js = await readFile(
    "dist/assets/" + files.find((f) => f.endsWith(".js")),
    "utf8",
  ),
  css = await readFile(
    "dist/assets/" + files.find((f) => f.endsWith(".css")),
    "utf8",
  );
await writeFile(
  "dist/BRINEWAKE.html",
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BRINEWAKE — Coastal rescue division</title><style>${css}</style></head><body><div id="app"></div><script type="module">${js.replaceAll("</script", "<\\/script")}</script></body></html>`,
);
console.log("Wrote dist/BRINEWAKE.html (self-contained offline build)");
