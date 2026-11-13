const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const ejsPath = path.join(rootDir, 'backend/node_modules/ejs');

let ejs;
try {
    ejs = require(ejsPath);
} catch (e) {
    try {
        ejs = require('ejs');
    } catch (e2) {
        console.error('EJS not found, please run npm install');
        process.exit(1);
    }
}

// Clean and recreate dist
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy directory helper
function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            if (entry.name.endsWith('.sql') || entry.name.startsWith('.env') || entry.name.endsWith('.env')) continue;
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Render EJS helper
async function renderPage(ejsRelPath, outRelPaths) {
    const fullEjs = path.join(rootDir, 'frontend', ejsRelPath);
    if (!fs.existsSync(fullEjs)) return;
    try {
        const html = await ejs.renderFile(fullEjs, {
            user: {},
            official: {},
            worker: {}
        }, { views: [path.join(rootDir, 'frontend')] });

        for (const outPath of outRelPaths) {
            const fullOut = path.join(distDir, outPath);
            fs.mkdirSync(path.dirname(fullOut), { recursive: true });
            fs.writeFileSync(fullOut, html, 'utf8');
        }
    } catch (err) {
        console.warn(`Warning rendering ${ejsRelPath}:`, err.message);
    }
}

async function build() {
    console.log('📦 Generating static site distribution in ./dist ...');

    // 1. Copy public static assets into dist
    copyDir(path.join(rootDir, 'public'), distDir);

    // 2. Copy frontend assets (css, js, styles)
    copyDir(path.join(rootDir, 'frontend'), distDir);

    // 3. Render EJS views to static HTML
    await renderPage('landing/front.ejs', ['index.html']);
    await renderPage('landing/services.ejs', ['services/index.html', 'services.html']);
    await renderPage('landing/about.ejs', ['about/index.html', 'about.html']);
    await renderPage('landing/contact.ejs', ['contact/index.html', 'contact.html']);
    await renderPage('user/user.login.ejs', ['user/login/index.html', 'user/login.html']);
    await renderPage('user/user.register.ejs', ['user/register/index.html', 'user/register.html']);
    await renderPage('official/official.login.ejs', ['official/login/index.html', 'official/login.html']);
    await renderPage('official/official.register.ejs', ['official/register/index.html', 'official/register.html']);
    await renderPage('worker/worker.login.ejs', ['worker/login/index.html', 'worker/login.html']);
    await renderPage('admin/admin.login.ejs', ['admin/login/index.html', 'admin/login.html']);

    console.log('✅ ./dist created successfully with all static pages and assets!');
}

build();
