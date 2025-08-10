# SCM-Slang GitHub Pages

This repository provides a GitHub Pages deployment of the SCM-Slang library for testing with Source Academy.

## 🚀 Quick Start

### Library URL for Source Academy
```
https://nguyetanhlanghong.github.io/scm-slang-pages/dist/index.js
```

### How to use in Source Academy Playground

1. Go to Source Academy settings
2. Navigate to the feature flags section  
3. Find the external library configuration
4. Paste the URL above as the library source
5. Enable the Scheme language feature

## 📦 What's Included

- **dist/index.js** - Built SCM-Slang library
- **index.html** - Demo page with usage instructions

## 🧪 Testing

Visit the demo page at: https://nguyetanhlanghong.github.io/scm-slang-pages/

You can test the library by opening the browser console and running:

```javascript
// Load the library
const script = document.createElement('script');
script.src = 'https://nguyetanhlanghong.github.io/scm-slang-pages/dist/index.js';
document.head.appendChild(script);

// After loading, you can test:
// parseSchemeSimple('(+ 1 2)');
// evaluate('(+ 1 2)', ...);
```

## 📚 Available Exports

- `parseSchemeSimple` - Simple Scheme parser
- `evaluate` - Scheme evaluator using CSE machine  
- `createProgramEnvironment` - Create Scheme environment
- `SchemeEvaluator` - Conductor-compatible evaluator
- `BasicEvaluator` - Basic evaluator implementation
- `SchemeComplexNumber` - Complex number support

## 🔄 Updates

This repository is automatically updated from the main SCM-Slang development branch. To update:

1. Pull latest changes from source-academy/scm-slang
2. Rebuild the library
3. Copy new dist/index.js to this repository
4. Commit and push

## 📄 License

Apache-2.0 - Same as the original SCM-Slang repository
