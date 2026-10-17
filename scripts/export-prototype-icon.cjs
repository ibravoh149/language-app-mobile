// Usage: NODE_PATH=<directory containing playwright> node scripts/export-prototype-icon.cjs <prototype.html>
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  if (!process.argv[2]) throw new Error('Provide the path to the HTML prototype');
  const output = path.resolve(__dirname, '../assets/images');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
    await page.goto(pathToFileURL(path.resolve(process.argv[2])).href);
    await page.locator('.brand svg').waitFor();
    const svg = await page.locator('.brand svg').evaluate((element) => {
      const copy = element.cloneNode(true);
      copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      copy.setAttribute('width', '1024');
      copy.setAttribute('height', '1024');
      copy.setAttribute('style', 'display:block');
      return copy.outerHTML;
    });
    await fs.writeFile(path.join(output, 'sprachbar-mark.svg'), svg + '\n');
    // Keep the prototype's embedded font faces so the letterform is identical.
    await page.evaluate(async (markup) => {
      document.body.innerHTML = markup;
      document.documentElement.style.cssText = 'background:transparent!important';
      document.body.style.cssText = 'margin:0;padding:0;display:block;background:transparent!important';
      await document.fonts.load('700 31px "Space Grotesk"');
      await document.fonts.ready;
    }, svg);
    await page.screenshot({ path: path.join(output, 'sprachbar-mark.png'), omitBackground: true });
    for (const variant of ['launcher', 'background', 'foreground', 'monochrome', 'favicon']) {
      const size = variant === 'favicon' ? 64 : 1024;
      await page.setViewportSize({ width: size, height: size });
      await page.evaluate(async ({ markup, variant, size }) => {
        document.body.innerHTML = markup;
        const root = document.querySelector('svg');
        root.setAttribute('width', String(size));
        root.setAttribute('height', String(size));
        const artwork = root.querySelector('g');
        if (variant !== 'favicon') artwork.removeAttribute('clip-path');
        const foreground = variant === 'foreground' || variant === 'monochrome';
        const mark = [...artwork.children].filter((node) =>
          node.tagName === 'text' || (node.tagName === 'circle' && node.getAttribute('r') === '3.4'));
        if (variant === 'background') mark.forEach((node) => node.remove());
        if (foreground) {
          [...artwork.children].filter((node) => !mark.includes(node)).forEach((node) => node.remove());
          // Keep the complete mark within Android's central 66/108 safe circle.
          artwork.setAttribute('transform', 'translate(24 24) scale(0.65) translate(-24 -24)');
          if (variant === 'monochrome') mark.forEach((node) => node.setAttribute('fill', '#fff'));
        }
        await document.fonts.ready;
      }, { markup: svg, variant, size });
      await page.screenshot({
        path: path.join(output, `sprachbar-${variant}.png`),
        omitBackground: variant !== 'launcher' && variant !== 'background',
      });
    }
    console.log('Exported mark, opaque launcher, adaptive layers, monochrome, and favicon');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
