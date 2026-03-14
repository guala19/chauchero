from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..parsers import parser_registry
from pydantic import BaseModel

router = APIRouter(prefix="/banks", tags=["banks"])


class BankInfo(BaseModel):
    name: str
    email_domains: List[str]
    supported: bool = True


@router.get("/supported", response_model=List[BankInfo])
async def list_supported_banks():
    """List all supported banks and their email domains"""
    banks = []
    
    for parser in parser_registry._parsers:
        banks.append(BankInfo(
            name=parser.bank_name,
            email_domains=parser.email_domains,
            supported=True
        ))
    
    return banks
