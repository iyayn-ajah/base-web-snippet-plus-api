import re
import requests
from urllib.parse import quote

def soundcloudsearch(query):
    try:
        encoded_query = quote(query)
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        response = requests.get(f'https://soundcloud.com/search?q={encoded_query}', headers=headers)
        
        if not response.ok:
            raise Exception(f'HTTP error! status: {response.status_code}')
        
        html = response.text
        results = extract_results_from_noscript(html)
        
        return {
            'query': query,
            'results': results,
            'total': len(results)
        }
        
    except Exception as error:
        return {
            'query': query,
            'results': [],
            'total': 0,
            'error': str(error)
        }

def extract_results_from_noscript(html):
    results = []
    noscript_regex = r'<noscript>(.*?)</noscript>'
    noscript_matches = re.findall(noscript_regex, html, re.DOTALL)
    
    for noscript_content in noscript_matches:
        if '<h2>' in noscript_content and '/search' in noscript_content:
            track_regex = r'<h2><a href="([^"]+)">([^<]+)</a></h2>'
            track_matches = re.findall(track_regex, noscript_content)
            
            for relative_url, title in track_matches:
                title = (title
                    .replace('&amp;', '&')
                    .replace('&#x27;', "'")
                    .replace('&quot;', '"')
                    .replace('&lt;', '<')
                    .replace('&gt;', '>'))
                
                full_url = relative_url if relative_url.startswith('http') else f'https://soundcloud.com{relative_url}'
                
                results.append({
                    'title': title,
                    'url': full_url,
                    'username': extract_username_from_url(relative_url)
                })
            
            break
    
    return results

def extract_username_from_url(url):
    parts = [part for part in url.split('/') if len(part) > 0]
    return parts[0] if len(parts) > 0 else None


# Contoh penggunaan
# q = input('Masukan judul musik/lagu:\n')
# search = soundcloudsearch(q)
# print(search)
