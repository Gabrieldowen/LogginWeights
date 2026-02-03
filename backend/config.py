"""
Configuration management for Iron Track
Loads sensitive values from environment variables
"""
import os

class Config:
    """
    Configuration class that loads from environment variables.
    
    To use:
    1. Copy .env.template to .env
    2. Fill in your actual values in .env
    3. Never commit .env to git!
    """
    
    # Supabase Configuration
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')
    
    # Google Gemini API
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    
    # Webhook Security
    VITE_API_KEY = os.getenv('VITE_API_KEY')
    
    # Server Configuration (optional, has defaults)
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5678))
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    
    @classmethod
    def validate(cls):
        """
        Validate that all required configuration values are set.
        Raises ValueError if any required config is missing.
        """
        required = {
            'SUPABASE_URL': cls.SUPABASE_URL,
            'SUPABASE_KEY': cls.SUPABASE_KEY,
            'GEMINI_API_KEY': cls.GEMINI_API_KEY,
            'VITE_API_KEY': cls.VITE_API_KEY
        }
        
        missing = [key for key, value in required.items() if not value]
        
        if missing:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing)}\n"
                f"Please copy .env.template to .env and fill in your values."
            )
        
        return True
