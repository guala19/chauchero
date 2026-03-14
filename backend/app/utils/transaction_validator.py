"""
Transaction Validator - Sanitization and validation utilities

Inspired by Fardito's robust validation system.
"""
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from ..parsers.base import ParsedTransaction


class TransactionValidator:
    """
    Utilities for validating and sanitizing transactions.
    Ensures data quality and consistency.
    """
    
    @staticmethod
    def is_valid(transaction: ParsedTransaction) -> bool:
        """
        Validate that a transaction has minimum required data.
        
        Args:
            transaction: ParsedTransaction object to validate
            
        Returns:
            True if transaction is valid, False otherwise
        """
        return all([
            transaction.amount is not None,
            transaction.amount > 0,
            transaction.description,
            transaction.transaction_date
        ])
    
    @staticmethod
    def sanitize_description(description: str) -> str:
        """
        Sanitize and normalize merchant/description name.
        
        - Removes extra whitespace
        - Capitalizes properly (Chilean style)
        - Limits length
        
        Args:
            description: Raw description string
            
        Returns:
            Sanitized description
        """
        if not description:
            return "Comercio no identificado"
        
        # Remove extra whitespace
        description = ' '.join(description.split())
        
        # Capitalize each word (Chilean naming convention)
        words = description.split()
        capitalized = []
        
        for word in words:
            if len(word) > 0:
                # Keep all-caps acronyms as-is (like BCI, ATM, etc.)
                if word.isupper() and len(word) <= 4:
                    capitalized.append(word)
                else:
                    capitalized.append(word[0].upper() + word[1:].lower())
        
        result = ' '.join(capitalized)
        
        # Limit length
        return result[:200]
    
    @staticmethod
    def sanitize_amount(amount: Decimal) -> Decimal:
        """
        Ensure amount is positive and properly formatted.
        
        Args:
            amount: Raw amount value
            
        Returns:
            Sanitized amount (absolute value, 2 decimals)
        """
        # Always use absolute value
        amount = abs(amount)
        
        # Round to 2 decimal places for currency
        return Decimal(str(round(float(amount), 2)))
    
    @staticmethod
    def normalize_transaction_type(transaction_type: str) -> str:
        """
        Normalize transaction type to standard values.
        
        Args:
            transaction_type: Raw transaction type
            
        Returns:
            Normalized type (debit, credit, transfer_debit, transfer_credit)
        """
        type_lower = transaction_type.lower()
        
        # Map common variations to standard types
        debit_keywords = ['debit', 'debito', 'cargo', 'compra', 'purchase']
        credit_keywords = ['credit', 'credito', 'abono', 'deposito', 'deposit']
        transfer_keywords = ['transfer', 'transferencia']
        
        if any(kw in type_lower for kw in transfer_keywords):
            if 'debit' in type_lower or 'cargo' in type_lower:
                return 'transfer_debit'
            else:
                return 'transfer_credit'
        elif any(kw in type_lower for kw in debit_keywords):
            return 'debit'
        elif any(kw in type_lower for kw in credit_keywords):
            return 'credit'
        else:
            return 'debit'  # Default assumption
    
    @staticmethod
    def is_duplicate(
        db_session,
        email_id: str
    ) -> bool:
        """
        Check if transaction already exists by email ID.
        
        Args:
            db_session: SQLAlchemy session
            email_id: Gmail message ID
            
        Returns:
            True if duplicate exists, False otherwise
        """
        from ..models import Transaction
        
        existing = db_session.query(Transaction).filter(
            Transaction.email_id == email_id
        ).first()
        
        return existing is not None
    
    @staticmethod
    def filter_valid_transactions(
        transactions: List[ParsedTransaction]
    ) -> List[ParsedTransaction]:
        """
        Filter a list of transactions to only include valid ones.
        
        Args:
            transactions: List of ParsedTransaction objects
            
        Returns:
            List of valid transactions only
        """
        return [
            t for t in transactions 
            if TransactionValidator.is_valid(t)
        ]
    
    @staticmethod
    def calculate_statistics(transactions: List[ParsedTransaction]) -> dict:
        """
        Calculate statistics for a set of transactions.
        
        Args:
            transactions: List of ParsedTransaction objects
            
        Returns:
            Dict with statistics
        """
        if not transactions:
            return {
                "total": 0,
                "valid": 0,
                "total_amount": 0,
                "average_confidence": 0,
                "high_confidence_count": 0,  # >= 80%
                "medium_confidence_count": 0,  # 50-79%
                "low_confidence_count": 0     # < 50%
            }
        
        valid_transactions = TransactionValidator.filter_valid_transactions(transactions)
        
        total_amount = sum(t.amount for t in valid_transactions)
        avg_confidence = (
            sum(t.confidence for t in valid_transactions) / len(valid_transactions)
            if valid_transactions else 0
        )
        
        high_conf = sum(1 for t in valid_transactions if t.confidence >= 80)
        medium_conf = sum(1 for t in valid_transactions if 50 <= t.confidence < 80)
        low_conf = sum(1 for t in valid_transactions if t.confidence < 50)
        
        return {
            "total": len(transactions),
            "valid": len(valid_transactions),
            "total_amount": float(total_amount),
            "average_confidence": round(avg_confidence, 1),
            "high_confidence_count": high_conf,
            "medium_confidence_count": medium_conf,
            "low_confidence_count": low_conf
        }
    
    @staticmethod
    def get_confidence_level(confidence: int) -> str:
        """
        Get confidence level label.
        
        Args:
            confidence: Confidence score (0-100)
            
        Returns:
            Level label: "high", "medium", or "low"
        """
        if confidence >= 80:
            return "high"
        elif confidence >= 50:
            return "medium"
        else:
            return "low"
    
    @staticmethod
    def get_confidence_color(confidence: int) -> str:
        """
        Get color for confidence level (for UI).
        
        Args:
            confidence: Confidence score (0-100)
            
        Returns:
            Color name: "green", "yellow", or "red"
        """
        if confidence >= 80:
            return "green"
        elif confidence >= 50:
            return "yellow"
        else:
            return "red"
