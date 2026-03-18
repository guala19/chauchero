from pydantic import BaseModel
from typing import List


class BankInfo(BaseModel):
    name: str
    email_domains: List[str]
    supported: bool = True
