import feedparser
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import validators
import logging
from datetime import datetime
from dateutil import parser as date_parser
import time

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
    """Scrape content from a website"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # If specific selector provided, use it
        if selector:
            content_elements = soup.select(selector)
        else:
            # Try common content selectors
            content_selectors = [
                'article', '.post', '.entry', '.content',
                '.post-content', '.entry-content', '.article-content',
                'main', '.main-content', '#content'
            ]
            
            content_elements = []
            for sel in content_selectors:
                elements = soup.select(sel)
                if elements:
                    content_elements = elements
                    break
        
        if not content_elements:
            # Fallback to body content
            content_elements = [soup.body] if soup.body else [soup]
        
        # Extract content
        content = ''
        for element in content_elements:
            # Remove script and style elements
            for script in element(["script", "style"]):
                script.decompose()
            
            text = element.get_text()
            content += text + '\n'
        
        # Clean up content
        content = ' '.join(content.split())
        
        # Extract title
        title = ''
        if soup.title:
            title = soup.title.string.strip()
        else:
            # Try to find h1
            h1 = soup.find('h1')
            if h1:
                title = h1.get_text().strip()
        
        # Try to extract publication date
        published_date = None
        date_selectors = [
            'time[datetime]', '.date', '.published', '.post-date',
            '[class*="date"]', '[id*="date"]'
        ]
        
        for sel in date_selectors:
            date_element = soup.select_one(sel)
            if date_element:
                date_text = date_element.get('datetime') or date_element.get_text()
                try:
                    published_date = date_parser.parse(date_text)
                    break
                except:
                    continue
        
        # If no date found, use current time
        if not published_date:
            published_date = datetime.utcnow()
        
        # Skip if older than last scraped
        if last_scraped and published_date <= last_scraped:
            return []
        
        if len(content.strip()) < 100:  # Too short to be useful
            return []
        
        return [{
            'title': title,
            'content': content,
            'url': url,
            'published_date': published_date,
            'author': ''
        }]
        
    except Exception as e:
        logger.error(f"Error scraping website {url}: {str(e)}")
        return []

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