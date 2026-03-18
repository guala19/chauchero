from fastapi import APIRouter
from typing import List
from ..parsers import parser_registry
from ..schemas import BankInfo

router = APIRouter(prefix="/banks", tags=["banks"])


@router.get("/supported", response_model=List[BankInfo])
async def list_supported_banks():
    return [
        BankInfo(
            name=parser.bank_name,
            email_domains=parser.email_domains,
        )
        for parser in parser_registry._parsers
    ]
