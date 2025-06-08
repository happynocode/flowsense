import feedparser
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import validators
import logging
from datetime import datetime
from dateutil import parser as date_parser
import time
import re
# from newspaper import Article  # Commented out due to Windows compilation issues
import ssl
import urllib3

# Disable SSL warnings for development
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

def validate_source_url(url):
    """Validate if a URL can be used as a content source"""
    try:
        # Basic URL validation
        if not validators.url(url):
            return {
                'valid': False,
                'message': 'Invalid URL format',
                'source_type': None,
                'has_rss': False,
                'rss_url': None
            }
        
        # Try to access the URL
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Check if it's an RSS feed
        content_type = response.headers.get('content-type', '').lower()
        if 'xml' in content_type or 'rss' in content_type or 'atom' in content_type:
            # Try to parse as RSS
            feed = feedparser.parse(response.content)
            if feed.entries:
                return {
                    'valid': True,
                    'message': 'Valid RSS feed',
                    'source_type': 'blog',  # Default to blog for RSS
                    'has_rss': True,
                    'rss_url': url,
                    'title': feed.feed.get('title', ''),
                    'description': feed.feed.get('description', '')
                }
        
        # Parse HTML to look for RSS feeds
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Look for RSS/Atom links
        rss_links = soup.find_all('link', {'type': ['application/rss+xml', 'application/atom+xml']})
        rss_url = None
        
        if rss_links:
            rss_href = rss_links[0].get('href')
            if rss_href:
                rss_url = urljoin(url, rss_href)
                
                # Validate the RSS feed
                try:
                    rss_response = requests.get(rss_url, headers=headers, timeout=10)
                    rss_response.raise_for_status()
                    feed = feedparser.parse(rss_response.content)
                    
                    if feed.entries:
                        return {
                            'valid': True,
                            'message': 'Valid website with RSS feed',
                            'source_type': 'blog',
                            'has_rss': True,
                            'rss_url': rss_url,
                            'title': feed.feed.get('title', soup.title.string if soup.title else ''),
                            'description': feed.feed.get('description', '')
                        }
                except:
                    pass  # RSS feed not working, continue with web scraping validation
        
        # Check if it's scrapable (has content)
        title = soup.title.string if soup.title else ''
        
        # Look for common content selectors
        content_selectors = [
            'article', '.post', '.entry', '.content', 
            '.post-content', '.entry-content', '.article-content',
            'main', '.main-content', '#content'
        ]
        
        content_found = False
        for selector in content_selectors:
            elements = soup.select(selector)
            if elements and any(len(elem.get_text().strip()) > 100 for elem in elements):
                content_found = True
                break
        
        if content_found or len(soup.get_text().strip()) > 500:
            return {
                'valid': True,
                'message': 'Valid website (web scraping)',
                'source_type': 'blog',
                'has_rss': False,
                'rss_url': None,
                'title': title,
                'description': ''
            }
        
        return {
            'valid': False,
            'message': 'Website does not appear to have scrapable content',
            'source_type': None,
            'has_rss': False,
            'rss_url': None
        }
        
    except requests.exceptions.Timeout:
        return {
            'valid': False,
            'message': 'Website took too long to respond',
            'source_type': None,
            'has_rss': False,
            'rss_url': None
        }
    except requests.exceptions.RequestException as e:
        return {
            'valid': False,
            'message': f'Could not access website: {str(e)}',
            'source_type': None,
            'has_rss': False,
            'rss_url': None
        }
    except Exception as e:
        logger.error(f"Error validating source URL {url}: {str(e)}")
        return {
            'valid': False,
            'message': 'Error validating URL',
            'source_type': None,
            'has_rss': False,
            'rss_url': None
        }

def scrape_rss_feed(rss_url, last_scraped=None):
    """Scrape content from an RSS feed"""
    try:
        headers = {
            'User-Agent': 'Daily Content Digest Bot 1.0'
        }
        
        response = requests.get(rss_url, headers=headers, timeout=15)
        response.raise_for_status()
        
        feed = feedparser.parse(response.content)
        
        if not feed.entries:
            return []
        
        items = []
        for entry in feed.entries:
            try:
                # Parse publication date
                published_date = None
                if hasattr(entry, 'published'):
                    try:
                        published_date = date_parser.parse(entry.published)
                    except:
                        pass
                
                # Skip items older than last scraped date
                if last_scraped and published_date and published_date <= last_scraped:
                    continue
                
                # Get content
                content = ''
                if hasattr(entry, 'content'):
                    content = entry.content[0].value if entry.content else ''
                elif hasattr(entry, 'summary'):
                    content = entry.summary
                elif hasattr(entry, 'description'):
                    content = entry.description
                
                # Clean content
                if content:
                    soup = BeautifulSoup(content, 'html.parser')
                    content = soup.get_text().strip()
                
                item = {
                    'title': entry.title if hasattr(entry, 'title') else '',
                    'content': content,
                    'url': entry.link if hasattr(entry, 'link') else '',
                    'published_date': published_date,
                    'author': entry.author if hasattr(entry, 'author') else ''
                }
                
                items.append(item)
                
            except Exception as e:
                logger.warning(f"Error processing RSS entry: {str(e)}")
                continue
        
        return items
        
    except Exception as e:
        logger.error(f"Error scraping RSS feed {rss_url}: {str(e)}")
        return []

def scrape_website(url, selector=None, last_scraped=None):
    """Scrape content from a website using enhanced extraction methods"""
    try:
        logger.info(f"Scraping website: {url}")
        
        # Use enhanced BeautifulSoup method for content extraction
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        session = requests.Session()
        session.headers.update(headers)
        
        response = session.get(url, timeout=30, verify=False)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove unwanted elements
        for unwanted in soup(["script", "style", "nav", "header", "footer", "aside", "advertisement", "ads"]):
            unwanted.decompose()
        
        # Extract content using multiple strategies
        content = ''
        title = ''
        
        # Strategy 1: Use specific selector if provided
        if selector:
            content_elements = soup.select(selector)
            if content_elements:
                content = ' '.join([elem.get_text() for elem in content_elements])
        
        # Strategy 2: Try common article selectors
        if not content:
            article_selectors = [
                'article',
                '[role="main"]',
                '.post-content', '.entry-content', '.article-content', '.content',
                '.post-body', '.entry-body', '.article-body',
                '.post', '.entry', '.article',
                'main', '.main', '#main',
                '.container .content', '.content-area'
            ]
            
            for sel in article_selectors:
                elements = soup.select(sel)
                if elements:
                    # Get the largest content block
                    largest_element = max(elements, key=lambda x: len(x.get_text()))
                    content = largest_element.get_text()
                    if len(content.strip()) > 200:  # Minimum content threshold
                        break
        
        # Strategy 3: Use readability-style extraction
        if not content or len(content.strip()) < 200:
            content = extract_main_content(soup)
        
        # Clean up content
        if content:
            content = clean_text_content(content)
        
        # Extract title
        title = extract_title(soup, url)
        
        # Extract publication date
        published_date = extract_publication_date(soup)
        
        # Extract author
        author = extract_author(soup)
        
        # Skip if older than last scraped
        if last_scraped and published_date <= last_scraped:
            return []
        
        if len(content.strip()) < 100:  # Too short to be useful
            logger.warning(f"Content too short for {url}: {len(content)} characters")
            return []
        
        logger.info(f"Successfully extracted content using BeautifulSoup: {len(content)} characters")
        return [{
            'title': title,
            'content': content,
            'url': url,
            'published_date': published_date,
            'author': author
        }]
        
    except Exception as e:
        logger.error(f"Error scraping website {url}: {str(e)}")
        return []

def extract_main_content(soup):
    """Extract main content using readability-style approach"""
    # Remove obviously non-content elements
    for unwanted in soup(['script', 'style', 'nav', 'header', 'footer', 'aside', 'advertisement']):
        unwanted.decompose()
    
    # Find text-heavy elements
    text_blocks = []
    for elem in soup.find_all(['p', 'div', 'article', 'section']):
        text = elem.get_text().strip()
        if len(text) > 50:  # Minimum text length
            text_blocks.append((elem, len(text)))
    
    if not text_blocks:
        return soup.get_text()
    
    # Sort by text length and take the largest blocks
    text_blocks.sort(key=lambda x: x[1], reverse=True)
    
    # Combine the top text blocks
    main_content = []
    total_length = 0
    for elem, length in text_blocks[:10]:  # Top 10 blocks
        if total_length + length > 10000:  # Limit total content
            break
        main_content.append(elem.get_text().strip())
        total_length += length
    
    return '\n\n'.join(main_content)

def clean_text_content(content):
    """Clean and normalize text content"""
    # Remove excessive whitespace
    content = re.sub(r'\s+', ' ', content)
    
    # Remove common unwanted patterns
    content = re.sub(r'(Share|Tweet|Pin|Like|Follow)(\s+\d+)?', '', content, flags=re.IGNORECASE)
    content = re.sub(r'(Advertisement|Sponsored|Ad)', '', content, flags=re.IGNORECASE)
    
    # Remove email patterns
    content = re.sub(r'\S+@\S+\.\S+', '', content)
    
    # Remove excessive punctuation
    content = re.sub(r'[.]{3,}', '...', content)
    
    return content.strip()

def extract_title(soup, url):
    """Extract title using multiple strategies"""
    # Strategy 1: Meta title
    title_tag = soup.find('title')
    if title_tag and title_tag.string:
        title = title_tag.string.strip()
        # Clean up title
        title = re.sub(r'\s*[\|\-\–\—]\s*.*$', '', title)  # Remove site name
        if len(title) > 10:
            return title
    
    # Strategy 2: Open Graph title
    og_title = soup.find('meta', property='og:title')
    if og_title and og_title.get('content'):
        return og_title.get('content').strip()
    
    # Strategy 3: H1 tag
    h1 = soup.find('h1')
    if h1:
        return h1.get_text().strip()
    
    # Strategy 4: Extract from URL
    return extract_title_fallback(url)

def extract_title_fallback(url):
    """Extract title from URL as fallback"""
    try:
        path = urlparse(url).path
        # Remove file extension and clean up
        title = path.split('/')[-1].split('.')[0]
        title = re.sub(r'[-_]', ' ', title)
        title = title.title()
        return title if title else 'Untitled Article'
    except:
        return 'Untitled Article'

def extract_publication_date(soup):
    """Extract publication date using multiple strategies"""
    # Strategy 1: JSON-LD structured data
    try:
        for script in soup.find_all('script', type='application/ld+json'):
            import json
            data = json.loads(script.string)
            if isinstance(data, dict):
                date_str = data.get('datePublished') or data.get('dateModified')
                if date_str:
                    return date_parser.parse(date_str)
    except:
        pass
    
    # Strategy 2: Meta tags
    meta_selectors = [
        'meta[property="article:published_time"]',
        'meta[name="publish-date"]',
        'meta[name="date"]',
        'meta[name="DC.date.issued"]'
    ]
    
    for selector in meta_selectors:
        meta = soup.select_one(selector)
        if meta and meta.get('content'):
            try:
                return date_parser.parse(meta.get('content'))
            except:
                continue
    
    # Strategy 3: Time elements
    time_elements = soup.find_all('time')
    for time_elem in time_elements:
        datetime_attr = time_elem.get('datetime')
        if datetime_attr:
            try:
                return date_parser.parse(datetime_attr)
            except:
                continue
    
    # Strategy 4: Date patterns in text
    date_selectors = [
        '.date', '.published', '.post-date', '.entry-date',
        '[class*="date"]', '[id*="date"]'
    ]
    
    for selector in date_selectors:
        date_elem = soup.select_one(selector)
        if date_elem:
            date_text = date_elem.get_text().strip()
            try:
                return date_parser.parse(date_text)
            except:
                continue
    
    # Fallback to current time
    return datetime.utcnow()

def extract_author(soup):
    """Extract author using multiple strategies"""
    # Strategy 1: Meta tags
    author_meta = soup.find('meta', attrs={'name': 'author'})
    if author_meta and author_meta.get('content'):
        return author_meta.get('content').strip()
    
    # Strategy 2: JSON-LD structured data
    try:
        for script in soup.find_all('script', type='application/ld+json'):
            import json
            data = json.loads(script.string)
            if isinstance(data, dict) and 'author' in data:
                author = data['author']
                if isinstance(author, dict):
                    return author.get('name', '')
                elif isinstance(author, str):
                    return author
    except:
        pass
    
    # Strategy 3: Common author selectors
    author_selectors = [
        '.author', '.byline', '.by-author', '.post-author',
        '[rel="author"]', '.author-name', '.writer'
    ]
    
    for selector in author_selectors:
        author_elem = soup.select_one(selector)
        if author_elem:
            author_text = author_elem.get_text().strip()
            # Clean up author text
            author_text = re.sub(r'^(by|author:?)\s*', '', author_text, flags=re.IGNORECASE)
            if len(author_text) > 0 and len(author_text) < 100:
                return author_text
    
    return ''

def scrape_content_source(source):
    """Scrape content from a ContentSource object"""
    try:
        if source.has_rss and source.rss_url:
            return scrape_rss_feed(source.rss_url, source.last_scraped_at)
        else:
            return scrape_website(source.url, source.scraping_selector, source.last_scraped_at)
    except Exception as e:
        logger.error(f"Error scraping content source {source.id}: {str(e)}")
        return []