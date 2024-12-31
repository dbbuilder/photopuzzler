// build.js
const fs = require('fs-extra');
const path = require('path');
const { createElement } = require('react');
const { renderToString } = require('react-dom/server');
const esbuild = require('esbuild');
const sharp = require('sharp');
const cssnano = require('cssnano');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');
const { globby } = require('globby');
const pMap = require('p-map');
const { LRUCache } = require('lru-cache');
const minifyHtml = require('@minify-html/node');
const validator = require('html-validator');
const chalk = require('chalk');
const StaticApp = require('./StaticApp').default;

// Configuration
const config = {
  input: {
    js: ['src/hydrate.js'],
    css: ['src/styles/main.css'],
    images: 'public/images'
  },
  output: {
    dir: 'build',
    assets: 'build/assets',
    images: 'build/assets/images'
  },
  optimization: {
    images: {
      formats: ['webp', 'avif'],
      sizes: [640, 1024, 1920],
      quality: 80
    },
    js: {
      minify: true,
      target: ['es2020']
    },
    css: {
      minify: true,
      autoprefixer: true
    }
  }
};

// Initialize cache
const cache = new LRUCache({
  max: 500,
  ttl: 1000 * 60 * 60 // 1 hour
});

// Utility Functions
async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function generateHash(content) {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
}

// HTML Validation
async function validateHTML(html) {
  console.log('🔍 Validating HTML...');
  
  const options = {
    data: html,
    format: 'text',
    validator: 'WHATWG',
    rules: {
      'no-conditional-comment': 0,
      'attr-lowercase': true,
      'tagname-lowercase': true,
      'spec-char-escape': true,
      'id-unique': true,
      'src-not-empty': true,
      'attr-no-duplication': true,
      'no-duplicate-attributes': true,
      'no-missing-alt': true,
      'no-multiple-h1': true
    }
  };

  try {
    const result = await validator(options);
    if (result.includes('Error:')) {
      throw new Error(`HTML Validation Failed:\n${result}`);
    }
    console.log(chalk.green('✔ HTML validation passed'));
    return true;
  } catch (error) {
    console.error(chalk.red('\nHTML Validation Errors:'));
    console.error(error.message);
    if (!process.env.FORCE_BUILD) {
      throw new Error('HTML validation failed. Use FORCE_BUILD=true to bypass validation.');
    }
    console.warn(chalk.yellow('\nProceeding with build despite validation errors (FORCE_BUILD=true)'));
    return false;
  }
}

// JS Bundling and Optimization
async function bundleJavaScript(files) {
  console.log('📦 Bundling JavaScript...');
  
  try {
    const result = await esbuild.build({
      entryPoints: files,
      bundle: true,
      minify: config.optimization.js.minify,
      target: config.optimization.js.target,
      outdir: path.join(config.output.assets, 'js'),
      splitting: true,
      format: 'esm',
      metafile: true,
      loader: {
        '.js': 'jsx',
        '.svg': 'dataurl'
      },
      plugins: [
        {
          name: 'externals',
          setup(build) {
            build.onResolve({ filter: /^react(-dom)?$/ }, args => ({
              path: args.path,
              external: true
            }));
          }
        }
      ]
    });

    await fs.writeFile(
      path.join(config.output.dir, 'bundle-analysis.txt'),
      await esbuild.analyzeMetafile(result.metafile)
    );

    return result;
  } catch (error) {
    console.error('Error bundling JavaScript:', error);
    throw error;
  }
}

// CSS Processing with caching
async function processCss(files) {
  console.log('🎨 Processing CSS...');
  
  const cacheKey = files.join(':');
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('Using cached CSS...');
    return cached;
  }

  try {
    const cssContent = await Promise.all(
      files.map(file => fs.readFile(file, 'utf-8'))
    );
    
    const { css } = await postcss([
      autoprefixer,
      cssnano({
        preset: ['advanced', {
          discardComments: { removeAll: true },
          normalizeWhitespace: true
        }]
      })
    ]).process(cssContent.join('\n'), { from: undefined });

    const hash = generateHash(css);
    const fileName = `main.${hash}.css`;
    
    await fs.writeFile(
      path.join(config.output.assets, 'css', fileName),
      css
    );

    cache.set(cacheKey, fileName);
    return fileName;
  } catch (error) {
    console.error('Error processing CSS:', error);
    throw error;
  }
}

// Image Processing with caching
async function processImages() {
  console.log('🖼️ Processing images...');
  
  try {
    const files = await globby([
      path.join(config.input.images, '**/*.{jpg,jpeg,png}')
    ]);

    const results = await pMap(files, async (file) => {
      const cacheKey = `image:${file}:${await fs.stat(file).then(s => s.mtimeMs)}`;
      const cached = cache.get(cacheKey);
      
      if (cached) {
        console.log(`Using cached image: ${path.basename(file)}`);
        return cached;
      }

      console.log(`Processing image: ${path.basename(file)}`);
      const image = sharp(file);
      const metadata = await image.metadata();

      const versions = await pMap(
        config.optimization.images.formats,
        async (format) => {
          const sizes = await pMap(
            config.optimization.images.sizes.filter(width => width <= metadata.width),
            async width => {
              const height = Math.round(width * (metadata.height / metadata.width));
              const outputFile = path.join(
                config.output.images,
                `${path.basename(file, path.extname(file))}-${width}.${format}`
              );

              await image
                .resize(width, height)
                [format]({
                  quality: config.optimization.images.quality,
                  effort: 6
                })
                .toFile(outputFile);

              return {
                format,
                width,
                height,
                file: path.relative(config.output.dir, outputFile)
              };
            }
          );

          return sizes;
        }
      );

      const result = {
        original: path.relative(config.input.images, file),
        versions: versions.flat().filter(Boolean)
      };

      cache.set(cacheKey, result);
      return result;
    }, { concurrency: 4 });

    const manifest = Object.fromEntries(
      results.map(({ original, versions }) => [original, versions])
    );

    await fs.writeFile(
      path.join(config.output.dir, 'image-manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    return manifest;
  } catch (error) {
    console.error('Error processing images:', error);
    throw error;
  }
}

// HTML Generation with validation and minification
async function generateHtml(cssFile, jsFiles, imageManifest) {
  console.log('📝 Generating HTML...');
  
  const content = renderToString(createElement(StaticApp));
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Static React Site</title>
    
    <!-- Preload fonts -->
    <link rel="preload" href="/assets/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
    
    <!-- Preload critical assets -->
    ${jsFiles.map(file => `
      <link rel="modulepreload" href="/assets/js/${file}">
    `).join('')}
    
    <!-- Async CSS -->
    <link rel="stylesheet" href="/assets/css/${cssFile}" media="print" onload="this.media='all'">
    
    <!-- Meta tags -->
    <meta name="description" content="Static React Site">
    
    <!-- Image preload hints -->
    ${Object.entries(imageManifest)
      .filter(([, versions]) => versions[0].width <= 1024)
      .map(([, versions]) => `
        <link
          rel="preload"
          as="image"
          href="/${versions[0].file}"
          imagesrcset="${versions
            .filter(v => v.format === 'webp')
            .map(v => `/${v.file} ${v.width}w`)
            .join(', ')}"
        >
      `).join('')}
</head>
<body>
    <div id="root">${content}</div>
    
    <!-- Load React -->
    <script async src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script async src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    
    <!-- Hydration -->
    ${jsFiles.map(file => `
      <script type="module" src="/assets/js/${file}"></script>
    `).join('')}
</body>
</html>`;

  // Validate HTML before minification
  await validateHTML(html);

  // Minify HTML using minify-html
  const cfg = minifyHtml.createConfiguration({
    do_not_minify_doctype: true,
    ensure_spec_compliant_unquoted_attribute_values: true,
    keep_closing_tags: true,
    keep_html_and_head_opening_tags: true,
    keep_spaces_between_attributes: true,
    minify_css: true,
    minify_js: true,
  });

  const minified = minifyHtml.minify(Buffer.from(html), cfg);
  
  await fs.writeFile(
    path.join(config.output.dir, 'index.html'),
    minified
  );
}

// Main build function
async function build() {
  const startTime = Date.now();
  console.log('🚀 Starting build process...');

  try {
    // Create directories
    await Promise.all([
      ensureDir(config.output.dir),
      ensureDir(config.output.assets),
      ensureDir(path.join(config.output.assets, 'js')),
      ensureDir(path.join(config.output.assets, 'css')),
      ensureDir(config.output.images)
    ]);

    // Process everything in parallel
    const [
      bundleResult,
      cssFile,
      imageManifest
    ] = await Promise.all([
      bundleJavaScript(config.input.js),
      processCss(config.input.css),
      processImages()
    ]);

    // Generate HTML with processed assets
    await generateHtml(
      cssFile,
      Object.keys(bundleResult.metafile.outputs),
      imageManifest
    );

    const buildTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(chalk.green(`✨ Build completed in ${buildTime}s`));

    // Generate build report
    const buildReport = {
      timeInSeconds: buildTime,
      assets: {
        js: Object.keys(bundleResult.metafile.outputs),
        css: [cssFile],
        images: imageManifest
      },
      outputDirectory: config.output.dir,
      cacheStats: {
        size: cache.size,
        entries: [...cache.keys()]
      }
    };

    await fs.writeFile(
      path.join(config.output.dir, 'build-report.json'),
      JSON.stringify(buildReport, null, 2)
    );

  } catch (error) {
    console.error(chalk.red('❌ Build failed:'), error);
    process.exit(1);
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--watch')) {
    console.log('Watch mode not implemented yet');
    process.exit(1);
  } else {
    build();
  }
}

module.exports = { build };