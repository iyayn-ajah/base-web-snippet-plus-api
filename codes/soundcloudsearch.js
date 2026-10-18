async function soundcloudsearch(query) {
    try {
        const encodedQuery = encodeURIComponent(query);
        const response = await fetch(`https://soundcloud.com/search?q=${encodedQuery}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const results = extractResultsFromNoscript(html);
        
        return {
            query: query,
            results: results,
            total: results.length
        };
        
    } catch (error) {
        return {
            query: query,
            results: [],
            total: 0,
            error: error.message
        };
    }
}

function extractResultsFromNoscript(html) {
    const results = [];
    const noscriptRegex = /<noscript>([\s\S]*?)<\/noscript>/g;
    const noscriptMatches = [...html.matchAll(noscriptRegex)];
    
    for (const match of noscriptMatches) {
        const noscriptContent = match[1];
        
        if (noscriptContent.includes('<h2>') && noscriptContent.includes('/search')) {
            const trackRegex = /<h2><a href="([^"]+)">([^<]+)<\/a><\/h2>/g;
            const trackMatches = [...noscriptContent.matchAll(trackRegex)];
            
            for (const trackMatch of trackMatches) {
                const relativeUrl = trackMatch[1];
                const title = trackMatch[2]
                    .replace(/&amp;/g, '&')
                    .replace(/&#x27;/g, "'")
                    .replace(/&quot;/g, '"')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>');
                
                const fullUrl = relativeUrl.startsWith('http') 
                    ? relativeUrl 
                    : `https://soundcloud.com${relativeUrl}`;
                
                results.push({
                    title: title,
                    url: fullUrl,
                    username: extractUsernameFromUrl(relativeUrl)
                });
            }
            
            break;
        }
    }
    
    return results;
}

function extractUsernameFromUrl(url) {
    const parts = url.split('/').filter(part => part.length > 0);
    return parts.length > 0 ? parts[0] : null;
}

// Contoh Penggunaan
/*
const search = await soundcloudsearch('ROI Instrumental')
console.log(search)
*/
