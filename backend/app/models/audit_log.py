from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime, timezone
import uuid
from ..core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_rut = Column(String(12), nullable=True, index=True)
    action = Column(String(50), nullable=False, index=True)
    detail = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    metadata_json = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    def __repr__(self):
        return f"<AuditLog {self.action} {self.user_rut} {self.created_at}>"
