import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630 });

    const routes = [
        { path: '/', name: 'home.png' },
        { path: '/blogs', name: 'blogs.png' },
        { path: '/photos', name: 'photos.png' },
        { path: '/repos', name: 'repos.png' }
    ];

    const publicDir = path.join(__dirname, 'public', 'og');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    for (const route of routes) {
        console.log(`Capturing ${route.path}...`);
        try {
            await page.goto(`http://localhost:5173${route.path}`, { waitUntil: 'networkidle0', timeout: 30000 });
            // wait extra for animations and data
            await new Promise(r => setTimeout(r, 3000));
            await page.screenshot({ path: path.join(publicDir, route.name) });
            console.log(`Saved ${route.name}`);
        } catch (e) {
            console.error(`Failed to capture ${route.path}:`, e);
        }
    }

    await browser.close();
    console.log('Done!');
})();
