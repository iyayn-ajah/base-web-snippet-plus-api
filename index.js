const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'frontend')));

const router = express.Router();
const apiPath = path.join(__dirname, 'api');
let endpointDirs = [];

if (fs.existsSync(apiPath)) {
    endpointDirs = fs.readdirSync(apiPath).filter(f => fs.statSync(path.join(apiPath, f)).isDirectory());

    for (const category of endpointDirs) {
        const categoryPath = path.join(apiPath, category);
        const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
        for (const file of files) {
            const routeName = path.basename(file, '.js');
            const route = require(path.join(categoryPath, file));
            router.use(`/${category}/${routeName}`, route);
        }
    }
}

function getEndpointsFromRouter(category, file) {
    const endpoints = [];
    const route = require(path.join(apiPath, category, file));
    const subRouter = route.stack ? route : route.router || route;
    if (!subRouter || !subRouter.stack) return endpoints;
    
    subRouter.stack.forEach(layer => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
            let params = {};
            if (layer.route.stack && layer.route.stack.length) {
                layer.route.stack.forEach(mw => {
                    const fnString = mw.handle.toString();
                    [...fnString.matchAll(/req\.query\.([a-zA-Z0-9_]+)/g)].forEach(match => {
                        params[match[1]] = "";
                    });
                    [...fnString.matchAll(/req\.body\.([a-zA-Z0-9_]+)/g)].forEach(match => {
                        params[match[1]] = "";
                    });
                });
            }
            endpoints.push({
                name: `/${category}/${file.replace(/\.js$/, "")}`,
                path: `/api/${category}/${file.replace(/\.js$/, "")}`,
                desc: `/${category}/${file.replace(/\.js$/, "")}`,
                status: "ready",
                params,
                methods
            });
        }
    });
    return endpoints;
}

router.get('/apilist', (req, res) => {
    const categories = [];

    for (const category of endpointDirs) {
        const files = fs.readdirSync(path.join(apiPath, category)).filter(f => f.endsWith('.js'));
        const endpoints = [];
        for (const file of files) {
            endpoints.push(...getEndpointsFromRouter(category, file));
        }
        if (endpoints.length) {
            categories.push({
                name: `${category.toUpperCase()} API ENDPOINT`,
                items: endpoints
            });
        }
    }

    res.json({ categories });
});

app.get('/linkbio.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'linkbio.json'));
});

app.get('/apidocs', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'apidocs.html'));
});

app.use('/api', router);

const SUPPORTED_EXTENSIONS = {
    '.js': 'javascript',
    '.py': 'python',
    '.php': 'php',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.ts': 'typescript',
    '.html': 'html',
    '.css': 'css',
    '.json': 'json',
    '.xml': 'xml',
    '.sql': 'sql',
    '.sh': 'bash',
    '.bat': 'batch',
    '.ps1': 'powershell',
    '.kt': 'kotlin',
    '.swift': 'swift',
    '.m': 'objectivec',
    '.scala': 'scala',
    '.pl': 'perl',
    '.lua': 'lua',
    '.r': 'r',
    '.dart': 'dart',
    '.groovy': 'groovy',
    '.vb': 'vbnet',
    '.vbs': 'vbscript',
    '.tf': 'hcl',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.md': 'markdown',
    '.txt': 'plaintext'
};

const LANGUAGE_COLORS = {
    'javascript': '#F7DF1E',
    'typescript': '#3178C6',
    'python': '#3776AB',
    'php': '#777BB4',
    'java': '#007396',
    'cpp': '#00599C',
    'c': '#A8B9CC',
    'csharp': '#239120',
    'ruby': '#CC342D',
    'go': '#00ADD8',
    'rust': '#DEA584',
    'html': '#E34F26',
    'css': '#1572B6',
    'json': '#000000',
    'sql': '#CC2927',
    'bash': '#4EAA25',
    'kotlin': '#7F52FF',
    'swift': '#F05138',
    'dart': '#00B4AB',
    'markdown': '#083FA1',
    'plaintext': '#6B7280'
};

function getLanguageFromExtension(filename) {
    const ext = path.extname(filename).toLowerCase();
    return SUPPORTED_EXTENSIONS[ext] || 'plaintext';
}

function getLanguageColor(language) {
    return LANGUAGE_COLORS[language] || '#6B7280';
}

function getLanguageDisplayName(language) {
    const names = {
        'javascript': 'JavaScript',
        'typescript': 'TypeScript',
        'python': 'Python',
        'php': 'PHP',
        'java': 'Java',
        'cpp': 'C++',
        'c': 'C',
        'csharp': 'C#',
        'ruby': 'Ruby',
        'go': 'Go',
        'rust': 'Rust',
        'html': 'HTML',
        'css': 'CSS',
        'json': 'JSON',
        'sql': 'SQL',
        'bash': 'Bash',
        'kotlin': 'Kotlin',
        'swift': 'Swift',
        'dart': 'Dart',
        'markdown': 'Markdown',
        'plaintext': 'Text'
    };
    return names[language] || language.toUpperCase();
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function cleanCode(code) {
    code = code.replace(/^["']use strict["'];?\s*\n?/gm, '');
    code = code.replace(/\n?\/\/# sourceMappingURL=.*$/gm, '');
    code = code.replace(/\n?\/\*# sourceMappingURL=.*\*\/\s*\n?/gm, '');
    code = code.replace(/\n?\/\/# sourceURL=.*$/gm, '');
    code = code.replace(/^\s*\n+/, '');
    return code;
}

app.get('/api/listcode', (req, res) => {
    const codesFolder = path.join(__dirname, 'codes');

    try {
        if (!fs.existsSync(codesFolder)) {
            fs.mkdirSync(codesFolder, { recursive: true });
        }

        const files = fs.readdirSync(codesFolder).filter(f => {
            const ext = path.extname(f).toLowerCase();
            return SUPPORTED_EXTENSIONS[ext];
        });

        if (files.length === 0) {
            return res.json([]);
        }

        const scrapers = files.map((file) => {
            const filePath = path.join(codesFolder, file);
            let code = fs.readFileSync(filePath, 'utf8');
            code = cleanCode(code);
            
            const ext = path.extname(file);
            const language = getLanguageFromExtension(file);
            const fileNameOnly = path.basename(file, ext);

            let badge = 'free';
            if (fileNameOnly.toLowerCase().includes('premium')) {
                badge = 'premium';
            }
            if (fileNameOnly.toLowerCase().includes('nofee') || fileNameOnly.toLowerCase().includes('no_fee')) {
                badge = 'no_fee';
            }

            const firstLine = code.split('\n')[0].trim();
            let description = 'Code snippet';
            
            if (firstLine.startsWith('//') || firstLine.startsWith('#') || 
                firstLine.startsWith('<!--') || firstLine.startsWith('/*')) {
                description = firstLine.replace(/^(\/\/|#|<!--|\/\*)\s*/, '').replace(/\*\/$/, '').trim();
            }

            return {
                _id: file,
                name: file,
                fileName: file,
                extension: ext,
                language: language,
                description: description,
                badge: badge,
                status: 'online',
                code: code
            };
        });

        res.json(scrapers);
    } catch (error) {
        console.error('Error reading codes folder:', error);
        res.status(500).json({ error: 'Failed to fetch scrapers' });
    }
});

app.get('/api/listcode/:filename', (req, res) => {
    const { filename } = req.params;
    
    const ext = path.extname(filename).toLowerCase();
    if (!SUPPORTED_EXTENSIONS[ext]) {
        return res.status(404).json({ error: 'File type not supported' });
    }
    
    const filePath = path.join(__dirname, 'codes', filename);
    
    if (!filePath.startsWith(path.join(__dirname, 'codes'))) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        let code = fs.readFileSync(filePath, 'utf8');
        code = cleanCode(code);
        const language = getLanguageFromExtension(filename);
        
        res.json({ 
            code, 
            filename,
            language,
            extension: ext
        });
    } catch (error) {
        console.error('Error reading file:', error);
        res.status(500).json({ error: 'Failed to fetch file' });
    }
});

app.get('/raw/:filename', (req, res) => {
    const { filename } = req.params;
    
    const ext = path.extname(filename).toLowerCase();
    if (!SUPPORTED_EXTENSIONS[ext]) {
        return res.status(404).json({ error: 'File type not supported' });
    }
    
    const filePath = path.join(__dirname, 'codes', filename);
    
    if (!filePath.startsWith(path.join(__dirname, 'codes'))) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        let code = fs.readFileSync(filePath, 'utf8');
        code = cleanCode(code);
        
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.send(code);
    } catch (error) {
        console.error('Error reading file:', error);
        res.status(500).json({ error: 'Failed to fetch raw file' });
    }
});

app.get('/raw/download/:filename', (req, res) => {
    const { filename } = req.params;
    
    const ext = path.extname(filename).toLowerCase();
    if (!SUPPORTED_EXTENSIONS[ext]) {
        return res.status(404).json({ error: 'File type not supported' });
    }
    
    const filePath = path.join(__dirname, 'codes', filename);
    
    if (!filePath.startsWith(path.join(__dirname, 'codes'))) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        let code = fs.readFileSync(filePath, 'utf8');
        code = cleanCode(code);
        
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(code);
    } catch (error) {
        console.error('Error reading file:', error);
        res.status(500).json({ error: 'Failed to download raw file' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'home.html'));
});

app.get('/codes', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'listcode.html'));
});

app.get('/codes/:filename', (req, res) => {
    const { filename } = req.params;
    
    const ext = path.extname(filename).toLowerCase();
    if (!SUPPORTED_EXTENSIONS[ext]) {
        return res.status(404).send('File type not supported');
    }
    
    const filePath = path.join(__dirname, 'codes', filename);
    
    if (!filePath.startsWith(path.join(__dirname, 'codes'))) {
        return res.status(403).send('Forbidden');
    }
    
    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File not found');
        }
        
        let code = fs.readFileSync(filePath, 'utf8');
        code = cleanCode(code);
        
        const language = getLanguageFromExtension(filename);
        const langColor = getLanguageColor(language);
        const langName = getLanguageDisplayName(language);
        
        // Gunakan JSON.stringify agar aman dari karakter kutip pada nama file
        const safeFilename = JSON.stringify(filename);
        const safeLangColor = JSON.stringify(langColor);
        const safeLanguage = JSON.stringify(language);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(`<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <title>${escapeHtml(filename)} - CodesVault</title>
    <link rel="icon" type="image/x-icon" href="https://raw.githubusercontent.com/upload-file-lab/fileupload7/main/uploads/1776345124257.jpeg?format=png&name=900x900">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet"/>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet"/>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/${language}.min.js"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    animation: {
                        'float': 'float 3s ease-in-out infinite',
                        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        'fadeIn': 'fadeIn 0.5s ease-out',
                    },
                    keyframes: {
                        float: {
                            '0%, 100%': { transform: 'translateY(0px)' },
                            '50%': { transform: 'translateY(-10px)' },
                        },
                        fadeIn: {
                            'from': { opacity: '0', transform: 'translateY(10px)' },
                            'to': { opacity: '1', transform: 'translateY(0)' },
                        }
                    }
                }
            }
        }
    </script>
    <style>
        * {
            transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease, transform 0.2s ease;
        }
        
        .dark-scrollbar::-webkit-scrollbar { width: 8px; }
        .dark-scrollbar::-webkit-scrollbar-track { background: #1a1a1a; }
        .dark-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
        .dark-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
        .light-scrollbar::-webkit-scrollbar { width: 8px; }
        .light-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .light-scrollbar::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        .light-scrollbar::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }

        .dark-body { background-color: #000000 !important; }
        .light-body { background-color: #f9fafb !important; }

        .btn-primary {
            background: #000; color: white; border: 2px solid #000; border-radius: 40px;
            font-weight: 800; transition: all 0.25s; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            padding: 0.75rem 1.5rem;
            font-size: 1rem;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            white-space: nowrap;
            cursor: pointer;
        }
        .dark-mode .btn-primary { background: #2d3748; border-color: #4a5568; color: #f1f5f9; }
        .btn-primary:hover { transform: scale(1.02) translateY(-2px); box-shadow: 0 10px 20px -5px rgba(0,0,0,0.2); }

        .code-preview pre {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
            background: transparent !important;
        }
        .code-preview code {
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            line-height: 1.5;
        }
        
        .hljs {
            background: transparent !important;
        }

        @media (max-width: 640px) {
            .btn-primary { padding-left: 1.25rem; padding-right: 1.25rem; font-size: 0.9rem; }
        }
    </style>
</head>
<body class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 light-body dark-body transition-colors dark-scrollbar">

<div class="fixed top-4 right-4 z-50">
    <button id="theme-toggle" type="button" 
        class="p-3 rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
               hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-300 
               focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500
               shadow-lg border border-gray-200 dark:border-gray-700">
        <svg id="theme-toggle-dark-icon" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
        </svg>
        <svg id="theme-toggle-light-icon" class="w-6 h-6 hidden" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fill-rule="evenodd" clip-rule="evenodd"></path>
        </svg>
    </button>
</div>

<main class="container mx-auto px-4 py-8 pt-20">
    <div class="max-w-6xl mx-auto">
        <div class="mb-8">
            <a href="/codes" class="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-4 transition">
                <span class="material-icons text-sm">arrow_back</span>
                <span>Other code</span>
            </a>
            
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
                <div class="flex flex-wrap justify-between items-start gap-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-3 flex-wrap">
                            <div class="w-12 h-12 rounded-xl flex items-center justify-center" id="logoContainer">
                                <div id="logoSvg"></div>
                            </div>
                            <div>
                                <h1 class="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white break-all">${escapeHtml(filename)}</h1>
                                <div class="flex items-center gap-2 mt-1">
                                    <div class="w-2 h-2 rounded-full" id="langBullet"></div>
                                    <span class="text-xs font-bold uppercase tracking-wide" id="langNameSpan">${escapeHtml(langName)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-3 flex-wrap">
                        <button id="btnCopy" type="button" class="btn-primary">
                            <span class="material-icons text-sm">content_copy</span>
                            <span>Copy Code</span>
                        </button>
                        <button id="btnDownload" type="button" class="btn-primary">
                            <span class="material-icons text-sm">download</span>
                            <span>Download</span>
                        </button>
                        <button id="btnRaw" type="button" class="btn-primary">
                            <span class="material-icons text-sm">code</span>
                            <span>Raw</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg">
            <div class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-5 py-3">
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-red-500"></div>
                    <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div class="w-3 h-3 rounded-full bg-green-500"></div>
                    <span class="text-xs text-gray-500 dark:text-gray-400 ml-2 font-mono">${escapeHtml(filename)}</span>
                </div>
            </div>
            <div class="p-5 code-preview overflow-auto max-h-[70vh]">
                <pre><code id="codeContent" class="language-${language}">${escapeHtml(code)}</code></pre>
            </div>
        </div>
    </div>
</main>

<section id="social" class="container mx-auto px-4 py-8 border-t border-gray-200 dark:border-gray-800 mt-8">
    <div class="flex flex-wrap justify-center gap-3">
        <a href="https://t.me/AfiqAjah" target="_blank" class="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-semibold transition-all duration-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:transform hover:-translate-y-0.5 shadow-sm">Telegram</a>
        <a href="https://whatsapp.com/channel/0029VaoJb11LikgEpNpBty0e" target="_blank" class="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-semibold transition-all duration-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:transform hover:-translate-y-0.5 shadow-sm">WhatsApp</a>
        <a href="https://www.instagram.com/iyayn_ajah" target="_blank" class="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-semibold transition-all duration-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:transform hover:-translate-y-0.5 shadow-sm">Instagram</a>
        <a href="https://github.com/iyayn-ajah" target="_blank" class="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-semibold transition-all duration-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:transform hover:-translate-y-0.5 shadow-sm">GitHub</a>
        <a href="https://www.youtube.com/@shikaku-doang" target="_blank" class="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-semibold transition-all duration-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:transform hover:-translate-y-0.5 shadow-sm">YouTube</a>
    </div>
</section>

<script>
    const currentFilename = ${safeFilename};
    const langColor = ${safeLangColor};
    const langExt = ${safeLanguage};
    
    function getLogoSvg(color, ext) {
        const badgeMap = {
            python: { label: 'PY', size: '10' },
            javascript: { label: 'JS', size: '10' },
            typescript: { label: 'TS', size: '9' },
            php: { label: 'PHP', size: '9' },
            html: { label: '&lt;/&gt;', size: '8' },
            css: { label: 'CSS', size: '9' },
            json: { label: '{ }', size: '7' },
            sql: { label: 'SQL', size: '9' },
            java: { label: 'JAVA', size: '7' },
            cpp: { label: 'C++', size: '8' },
            c: { label: 'C', size: '11' },
            csharp: { label: 'C#', size: '9' },
            ruby: { label: 'RB', size: '9' },
            go: { label: 'GO', size: '10' },
            rust: { label: 'RS', size: '9' },
            kotlin: { label: 'KT', size: '7' },
            swift: { label: 'SW', size: '7' },
            dart: { label: 'DR', size: '8' },
            bash: { label: '$', size: '11' }
        };
        const item = badgeMap[ext] || { label: '&lt;/&gt;', size: '9' };
        return '<svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
               '<rect width="24" height="24" rx="5" fill="' + color + '"/>' +
               '<text x="12" y="17" text-anchor="middle" fill="white" font-size="' + item.size + '" font-weight="bold" font-family="monospace">' + item.label + '</text>' +
               '</svg>';
    }
    
    document.getElementById('logoContainer').style.backgroundColor = langColor + '15';
    document.getElementById('logoContainer').style.border = '1px solid ' + langColor + '30';
    document.getElementById('logoSvg').innerHTML = getLogoSvg(langColor, langExt);
    document.getElementById('langBullet').style.backgroundColor = langColor;
    document.getElementById('langBullet').style.boxShadow = '0 0 0 1px rgba(0,0,0,0.1)';
    document.getElementById('langNameSpan').style.color = langColor;
    
    if (window.hljs) {
        hljs.highlightAll();
    }
    
    // Fungsi Copy Code (dengan fallback untuk HTTP non-HTTPS)
    document.getElementById('btnCopy').addEventListener('click', function() {
        const codeElement = document.getElementById('codeContent');
        const code = codeElement ? codeElement.textContent : '';
        const copyBtn = this;
        const originalHtml = copyBtn.innerHTML;

        const showSuccess = () => {
            copyBtn.innerHTML = '<span class="material-icons text-sm">check</span> <span>Copied!</span>';
            setTimeout(() => { copyBtn.innerHTML = originalHtml; }, 2000);
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(code).then(showSuccess).catch(() => fallbackCopy(code, showSuccess));
        } else {
            fallbackCopy(code, showSuccess);
        }
    });

    function fallbackCopy(text, callback) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            callback();
        } catch (err) {
            console.error('Copy failed', err);
        }
        document.body.removeChild(textArea);
    }
    
    // Fungsi Download Code
    document.getElementById('btnDownload').addEventListener('click', function() {
        window.location.href = '/raw/download/' + encodeURIComponent(currentFilename);
    });
    
    // Fungsi View Raw
    document.getElementById('btnRaw').addEventListener('click', function() {
        window.open('/raw/' + encodeURIComponent(currentFilename), '_blank');
    });
    
    // Fungsi Theme
    function initTheme() {
        const isDark = localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        const html = document.documentElement;
        const body = document.body;
        
        if (isDark) {
            html.classList.add('dark');
            body.classList.add('dark-body', 'dark-mode');
            body.classList.remove('light-body', 'light-mode');
            document.getElementById('theme-toggle-dark-icon')?.classList.remove('hidden');
            document.getElementById('theme-toggle-light-icon')?.classList.add('hidden');
            body.classList.add('dark-scrollbar');
            body.classList.remove('light-scrollbar');
        } else {
            html.classList.remove('dark');
            body.classList.add('light-body', 'light-mode');
            body.classList.remove('dark-body', 'dark-mode');
            document.getElementById('theme-toggle-dark-icon')?.classList.add('hidden');
            document.getElementById('theme-toggle-light-icon')?.classList.remove('hidden');
            body.classList.add('light-scrollbar');
            body.classList.remove('dark-scrollbar');
        }
    }
    
    function toggleTheme() {
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', !isDark ? 'dark' : 'light');
        initTheme();
    }
    
    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
    initTheme();
</script>
</body>
</html>`);
    } catch (error) {
        console.error('Error reading file:', error);
        res.status(500).send('Internal server error');
    }
});

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'frontend', '404.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
