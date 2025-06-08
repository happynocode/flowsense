import requests
import json
import os
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)

# DeepSeek API Configuration
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')
DEEPSEEK_API_BASE = os.getenv('DEEPSEEK_API_BASE', 'https://api.deepseek.com')

def summarize_content(content_text: str, max_length: int = 500, model: str = "deepseek-chat") -> Optional[str]:
    """
    Summarize content using DeepSeek's API
    
    Args:
        content_text: The text content to summarize
        max_length: Maximum length of the summary in characters
        model: DeepSeek model to use
    
    Returns:
        Summary text or None if failed
    """
    try:
        if not content_text or len(content_text.strip()) < 50:
            return "Content too short to summarize."
        
        if not DEEPSEEK_API_KEY:
            logger.error("DEEPSEEK_API_KEY not configured")
            return "DeepSeek API key not configured."
        
        # Calculate approximate token limit (rough estimate: 4 chars per token)
        max_tokens = min(max_length // 3, 1000)  # Conservative estimate
        
        # Create a focused prompt for summarization in Chinese and English
        prompt = f"""请对以下内容提供简洁、信息丰富的摘要。专注于关键点、主要论点和重要细节。
请保持摘要在{max_length}个字符以内，并用中文回答。

内容:
{content_text[:4000]}"""  # Limit input to avoid token limits
        
        start_time = time.time()
        
        # DeepSeek API request
        headers = {
            'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system", 
                    "content": "你是一个专业的内容摘要专家，能够提取文本中最重要的信息和关键见解，生成简洁有用的摘要。"
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            "max_tokens": max_tokens,
            "temperature": 0.3,
            "top_p": 1.0,
            "frequency_penalty": 0.0,
            "presence_penalty": 0.0,
            "stream": False
        }
        
        response = requests.post(
            f"{DEEPSEEK_API_BASE}/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        processing_time = time.time() - start_time
        
        if response.status_code == 200:
            response_data = response.json()
            
            if response_data.get('choices') and response_data['choices'][0].get('message'):
                summary = response_data['choices'][0]['message']['content'].strip()
                
                # Ensure summary isn't too long
                if len(summary) > max_length:
                    summary = summary[:max_length-3] + "..."
                
                logger.info(f"Successfully summarized content with DeepSeek in {processing_time:.2f}s")
                return summary
            else:
                logger.error("No summary generated from DeepSeek response")
                return "Summary generation failed."
        
        elif response.status_code == 429:
            logger.error("DeepSeek rate limit exceeded")
            return "Summary temporarily unavailable due to high demand."
        
        elif response.status_code == 401:
            logger.error("DeepSeek authentication failed")
            return "Summary service temporarily unavailable."
        
        else:
            logger.error(f"DeepSeek API error: {response.status_code} - {response.text}")
            return "Summary generation failed due to API error."
            
    except requests.exceptions.Timeout:
        logger.error("DeepSeek API request timeout")
        return "Summary generation timed out. Please try again later."
    
    except requests.exceptions.RequestException as e:
        logger.error(f"DeepSeek API request error: {str(e)}")
        return "Summary generation failed due to network error."
    
    except Exception as e:
        logger.error(f"Error summarizing content with DeepSeek: {str(e)}")
        return "Summary generation failed. Please try again later."

def estimate_reading_time(text: str) -> int:
    """
    Estimate reading time in minutes based on average reading speed
    
    Args:
        text: The text to estimate reading time for
    
    Returns:
        Estimated reading time in minutes
    """
    if not text:
        return 0
    
    # Average reading speed is about 200-250 words per minute
    # We'll use 225 words per minute as average
    words = len(text.split())
    reading_time = max(1, round(words / 225))  # Minimum 1 minute
    
    return reading_time

def get_summary_stats(summary_text: str) -> dict:
    """
    Get statistics about a summary
    
    Args:
        summary_text: The summary text
    
    Returns:
        Dictionary with summary statistics
    """
    if not summary_text:
        return {
            'character_count': 0,
            'word_count': 0,
            'reading_time': 0
        }
    
    character_count = len(summary_text)
    word_count = len(summary_text.split())
    reading_time = estimate_reading_time(summary_text)
    
    return {
        'character_count': character_count,
        'word_count': word_count,
        'reading_time': reading_time
    }

def batch_summarize_content(content_items: list, max_length: int = 500) -> list:
    """
    Summarize multiple content items with rate limiting
    
    Args:
        content_items: List of content items to summarize
        max_length: Maximum length for each summary
    
    Returns:
        List of summaries in the same order as input
    """
    summaries = []
    
    for i, content in enumerate(content_items):
        try:
            summary = summarize_content(content, max_length)
            summaries.append(summary)
            
            # Add delay between requests to respect rate limits
            if i < len(content_items) - 1:  # Don't delay after the last item
                time.sleep(1)  # 1 second delay between requests
                
        except Exception as e:
            logger.error(f"Error in batch summarization for item {i}: {str(e)}")
            summaries.append("Summary generation failed.")
    
    return summaries

def generate_structured_summary(content_text: str, original_url: str = "") -> str:
    """
    Generate a structured summary with key themes using DeepSeek
    
    Args:
        content_text: The text content to summarize
        original_url: Original URL of the content
    
    Returns:
        Structured summary with themes and quotes
    """
    try:
        if not content_text or len(content_text.strip()) < 100:
            return "Content too short for structured summary."
        
        if not DEEPSEEK_API_KEY:
            logger.error("DEEPSEEK_API_KEY not configured")
            return "DeepSeek API key not configured."
        
        # Enhanced prompt for structured summary
        prompt = f"""请分析以下文章并创建一个结构化摘要，重点关注关键主题。对于每个主题，请提供3-5句话的描述，然后引用文章中的相关内容。

请以以下格式回答：

## 关键主题

1. **[主题名称]**: [3-5句话描述这个主题及其重要性。解释关键见解、影响以及为什么这个主题很重要。提供有助于读者理解这个话题重要性的背景和分析。]

   引用: "[从文章中选择一个最能代表这个主题的引人注目的引用]"

2. **[主题名称]**: [3-5句话描述这个主题及其重要性。专注于实际影响、未来展望或文章中提到的专家观点。]

   引用: "[另一个支持这个主题的相关引用]"

[继续3-5个主题]

原文链接: {original_url}

文章内容:
{content_text}"""
        
        headers = {
            'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {
                    "role": "system", 
                    "content": "你是一个专业的内容分析师，能够识别文章中的关键主题并创建结构化的摘要。你擅长提取重要信息并用清晰的方式组织内容。"
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            "max_tokens": 2000,
            "temperature": 0.4,
            "stream": False
        }
        
        response = requests.post(
            f"{DEEPSEEK_API_BASE}/chat/completions",
            headers=headers,
            json=payload,
            timeout=45
        )
        
        if response.status_code == 200:
            response_data = response.json()
            
            if response_data.get('choices') and response_data['choices'][0].get('message'):
                structured_summary = response_data['choices'][0]['message']['content'].strip()
                logger.info("Successfully generated structured summary with DeepSeek")
                return structured_summary
            else:
                logger.error("No structured summary generated from DeepSeek response")
                return "Structured summary generation failed."
        else:
            logger.error(f"DeepSeek API error for structured summary: {response.status_code} - {response.text}")
            return "Structured summary generation failed due to API error."
            
    except Exception as e:
        logger.error(f"Error generating structured summary with DeepSeek: {str(e)}")
        return "Structured summary generation failed. Please try again later."