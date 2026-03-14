from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
import re
import html as _html


@dataclass
class ParsedTransaction:
    """Standardized transaction data from email parsing"""
    amount: Decimal
    transaction_date: datetime
    description: str
    transaction_type: str
    last_4_digits: Optional[str] = None
    account_type: Optional[str] = None
    category: Optional[str] = None
    confidence: int = 100
    raw_data: Optional[Dict[str, Any]] = None


@dataclass
class EmailData:
    """Email data structure for parsing"""
    message_id: str
    sender: str
    subject: str
    body: str
    date: datetime
    html_body: Optional[str] = None
    

class BankParser(ABC):
    """Abstract base class for bank email parsers"""
    
    bank_name: str = "Unknown Bank"
    email_domains: List[str] = []
    subject_keywords: List[str] = []
    
    @abstractmethod
    def parse(self, email: EmailData) -> Optional[ParsedTransaction]:
        """
        Parse email and extract transaction data.
        
        Returns:
            ParsedTransaction if successful, None if email doesn't contain transaction
        """
        pass
    
    def matches_email(self, email: EmailData) -> bool:
        """Check if this parser can handle the email"""
        sender_lower = email.sender.lower()
        
        domain_match = any(domain in sender_lower for domain in self.email_domains)
        
        if self.subject_keywords:
            subject_lower = email.subject.lower()
            keyword_match = any(keyword in subject_lower for keyword in self.subject_keywords)
            return domain_match and keyword_match
        
        return domain_match
    
    def _extract_clean_text(self, content: str) -> str:
        """Strip HTML tags and decode entities from email body."""
        if not content:
            return ""
        text = _html.unescape(content)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def clean_amount(self, amount_str: str) -> Decimal:
        """Clean and parse amount string to Decimal"""
        cleaned = re.sub(r'[^\d,.-]', '', amount_str)
        cleaned = cleaned.replace('.', '').replace(',', '.')
        
        return Decimal(cleaned)
    
    def parse_date(self, date_str: str, format_str: str = "%d/%m/%Y") -> datetime:
        """Parse date string to datetime"""
        return datetime.strptime(date_str.strip(), format_str)


class ParserRegistry:
    """Registry for all bank parsers"""
    
    def __init__(self):
        self._parsers: List[BankParser] = []
    
    def register(self, parser_class: type[BankParser]):
        """Register a parser class"""
        parser_instance = parser_class()
        self._parsers.append(parser_instance)
        print(f"Registered parser: {parser_instance.bank_name}")
    
    def get_parser_for_email(self, email: EmailData) -> Optional[BankParser]:
        """Find the appropriate parser for an email"""
        for parser in self._parsers:
            if parser.matches_email(email):
                return parser
        return None
    
    def list_supported_banks(self) -> List[str]:
        """Get list of all supported banks"""
        return [parser.bank_name for parser in self._parsers]


parser_registry = ParserRegistry()
