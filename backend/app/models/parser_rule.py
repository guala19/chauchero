from sqlalchemy import Column, String, DateTime, Boolean, Text, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
from ..core.database import Base


class ParserRule(Base):
    __tablename__ = "parser_rules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bank_name = Column(String(100), nullable=False, index=True)
    email_from_pattern = Column(String(255), nullable=False)
    subject_pattern = Column(String(255), nullable=True)
    
    regex_rules = Column(JSONB, nullable=False)
    
    priority = Column(Integer, default=10)
    active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    notes = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<ParserRule {self.bank_name} - {self.email_from_pattern}>"
