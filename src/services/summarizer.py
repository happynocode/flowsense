import openai
import os
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)

# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

def summarize_content(content_text: str, max_length: int = 500, model: str = "gpt-3.5-turbo") -> Optional[str]:
    """
    Summarize content using OpenAI's API
    
    Args:
        content_text: The text content to summarize
        max_length: Maximum length of the summary in characters
        model: OpenAI model to use
    
    Returns:
        Summary text or None if failed
    """
    try:
        if not content_text or len(content_text.strip()) < 50:
            return "Content too short to summarize."
        
        # Calculate approximate token limit (rough estimate: 4 chars per token)
        max_tokens = min(max_length // 3, 500)  # Conservative estimate
        
        # Create a focused prompt for summarization
        prompt = f"""Please provide a concise, informative summary of the following content. 
Focus on the key points, main arguments, and important details. 
Keep the summary under {max_length} characters.

Content:
{content_text[:4000]}"""  # Limit input to avoid token limits
        
        start_time = time.time()
        
        response = openai.ChatCompletion.create(
            model=model,
            messages=[
                {
                    "role": "system", 
                    "content": "You are a helpful assistant that creates concise, informative summaries. Focus on extracting the most important information and key insights."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            max_tokens=max_tokens,
            temperature=0.3,  # Lower temperature for more consistent summaries
            top_p=1.0,
            frequency_penalty=0.0,
            presence_penalty=0.0
        )
        
        processing_time = time.time() - start_time
        
        if response.choices and response.choices[0].message:
            summary = response.choices[0].message.content.strip()
            
            # Ensure summary isn't too long
            if len(summary) > max_length:
                summary = summary[:max_length-3] + "..."
            
            logger.info(f"Successfully summarized content in {processing_time:.2f}s")
            return summary
        else:
            logger.error("No summary generated from OpenAI response")
            return "Summary generation failed."
            
    except openai.error.RateLimitError:
        logger.error("OpenAI rate limit exceeded")
        return "Summary temporarily unavailable due to high demand."
    
    except openai.error.InvalidRequestError as e:
        logger.error(f"Invalid OpenAI request: {str(e)}")
        return "Summary generation failed due to invalid request."
    
    except openai.error.AuthenticationError:
        logger.error("OpenAI authentication failed")
        return "Summary service temporarily unavailable."
    
    except Exception as e:
        logger.error(f"Error summarizing content: {str(e)}")
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