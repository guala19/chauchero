#!/usr/bin/env python3
"""
Debug script to check Gmail emails and test parser
"""
import sys
import os
from pathlib import Path

backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.core.database import SessionLocal
from app.models import User
from app.services.gmail_service import GmailService
from app.parsers import parser_registry
from google.oauth2.credentials import Credentials


def debug_gmail():
    """Debug Gmail email fetching and parsing"""
    db = SessionLocal()
    
    try:
        # Get the first user (assuming you just logged in)
        user = db.query(User).first()
        
        if not user:
            print("❌ No user found. Please log in first.")
            return
        
        if not user.gmail_refresh_token:
            print("❌ User doesn't have Gmail refresh token")
            return
        
        print(f"✅ Found user: {user.email}")
        print(f"📧 Gmail token expires at: {user.gmail_token_expires_at}")
        print()
        
        # Create credentials
        credentials = Credentials(
            token=None,
            refresh_token=user.gmail_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET")
        )
        
        # Initialize Gmail service
        gmail_service = GmailService(credentials)
        
        print("🔍 Searching for bank emails...")
        print("Query being used:", gmail_service._build_search_query())
        print()
        
        # Fetch emails
        emails = gmail_service.fetch_bank_emails(max_results=20)
        
        print(f"📬 Found {len(emails)} emails")
        print()
        
        if not emails:
            print("⚠️  No emails found. Possible reasons:")
            print("   1. No bank notification emails in your Gmail")
            print("   2. The search query doesn't match your emails")
            print("   3. Gmail API permissions issue")
            print()
            print("💡 Try searching manually in Gmail for:")
            print("   from:serviciodetransferencias@bancochile.cl")
            return
        
        # Show each email and try to parse it
        for i, email in enumerate(emails[:10], 1):  # Show first 10
            print(f"{'='*70}")
            print(f"📧 Email #{i}")
            print(f"{'='*70}")
            print(f"From: {email.sender}")
            print(f"Subject: {email.subject}")
            print(f"Date: {email.date}")
            print()
            
            # Show first 500 chars of body
            if email.body:
                print("Body preview:")
                print(email.body[:500])
                print("..." if len(email.body) > 500 else "")
            print()
            
            # Try to parse
            parser = parser_registry.get_parser_for_email(email)
            
            if parser:
                print(f"✅ Parser found: {parser.bank_name}")
                result = parser.parse(email)
                
                if result:
                    print(f"✅ Parsed successfully!")
                    print(f"   Amount: ${result.amount}")
                    print(f"   Description: {result.description}")
                    print(f"   Date: {result.transaction_date}")
                    print(f"   Type: {result.transaction_type}")
                    print(f"   Confidence: {result.confidence}%")
                else:
                    print("❌ Parser returned None (couldn't extract data)")
            else:
                print("❌ No parser found for this email")
            
            print()
    
    finally:
        db.close()


if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv(backend_path / ".env")
    
    debug_gmail()
