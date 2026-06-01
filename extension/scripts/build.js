// Build script using esbuild - bundles TypeScript into single files for Chrome Extension MV3
// Chrome MV3 content scripts and service workers don't support ES module imports
// All code must be bundled into IIFE format with 'chrome' as external dependency

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');
const distDir = path.join(__dirname, '..', 'dist');

// Ensure dist directories exist
fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(path.join(distDir, 'content'), { recursive: true });
fs.mkdirSync(path.join(distDir, 'background'), { recursive: true });
fs.mkdirSync(path.join(distDir, 'popup'), { recursive: true });
fs.mkdirSync(path.join(distDir, 'icons'), { recursive: true });
fs.mkdirSync(path.join(distDir, '_locales/en'), { recursive: true });
fs.mkdirSync(path.join(distDir, '_locales/zh_CN'), { recursive: true });

const sharedConfig = {
  bundle: true,
  target: 'chrome120',
  format: 'iife',
  platform: 'browser',
  external: ['chrome'],
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production',
};

const entryPoints = [
  {
    entry: 'src/content/index.ts',
    outfile: 'dist/content/index.js',
  },
  {
    entry: 'src/background/service-worker.ts',
    outfile: 'dist/background/service-worker.js',
  },
  {
    entry: 'src/popup/popup.ts',
    outfile: 'dist/popup/popup.js',
  },
];

async function build() {
  try {
    if (isWatch) {
      // Watch mode for development
      const ctx = await esbuild.context({
        ...sharedConfig,
        entryPoints: entryPoints.map(e => path.join(__dirname, '..', e.entry)),
        outdir: path.join(__dirname, '..', 'dist'),
        loader: {
          '.ts': 'ts',
        },
      });
      await ctx.watch();
      console.log('👀 Watching for changes...');
    } else {
      // Build all entry points
      for (const { entry, outfile } of entryPoints) {
        await esbuild.build({
          ...sharedConfig,
          entryPoints: [path.join(__dirname, '..', entry)],
          outfile: path.join(__dirname, '..', outfile),
        });
        console.log(`✓ Built: ${entry} → ${outfile}`);
      }
    }

    // Copy static assets
    const assets = [
      { from: 'manifest.json', to: 'dist/manifest.json' },
      { from: 'src/content/sidebar.css', to: 'dist/content/sidebar.css' },
      { from: 'src/popup/popup.html', to: 'dist/popup/popup.html' },
      { from: 'src/popup/popup.css', to: 'dist/popup/popup.css' },
      { from: 'src/_locales/en/messages.json', to: 'dist/_locales/en/messages.json' },
      { from: 'src/_locales/zh_CN/messages.json', to: 'dist/_locales/zh_CN/messages.json' },
    ];

    for (const { from, to } of assets) {
      const src = path.join(__dirname, '..', from);
      const dest = path.join(__dirname, '..', to);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`✓ Copied: ${from} → ${to}`);
      }
    }

    // Copy or create placeholder icons
    const iconSizes = ['16', '48', '128'];
    for (const size of iconSizes) {
      const iconPath = path.join(__dirname, '..', `src/icons/icon${size}.png`);
      const destPath = path.join(distDir, `icons/icon${size}.png`);
      if (fs.existsSync(iconPath)) {
        fs.copyFileSync(iconPath, destPath);
        console.log(`✓ Copied: icons/icon${size}.png`);
      } else {
        // Create a simple placeholder icon (1x1 transparent PNG)
        fs.writeFileSync(destPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
        console.log(`✓ Created placeholder: icons/icon${size}.png`);
      }
    }

    console.log('\n✅ Build complete!');
    console.log('   Load the extension: chrome://extensions → Developer mode → Load unpacked → select dist/ folder');
    console.log('   Then update manifest.json placeholders with your actual values!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
