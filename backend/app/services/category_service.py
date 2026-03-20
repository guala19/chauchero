"""
Transaction categorization service.

Categorizes transactions by matching merchant descriptions against known
Chilean merchant keywords. Matches are case-insensitive substrings,
evaluated longest-keyword-first to avoid ambiguous partial matches.
"""

from typing import Optional


# ── Categories ──────────────────────────────────────────────────────────────

CATEGORIES = [
    "Supermercado",
    "Alimentación",
    "Delivery",
    "Transporte",
    "Entretenimiento",
    "Salud",
    "Servicios",
    "Combustible",
    "Educación",
    "Compras",
    "Transferencia",
    "Otros",
]

# Transfer transaction types that auto-categorize as "Transferencia"
TRANSFER_TYPES = {"transfer_debit", "transfer_credit"}


# ── Keyword → Category mapping ─────────────────────────────────────────────
# Keys are UPPERCASE for case-insensitive matching.
# More specific keywords first doesn't matter — we sort by length at init.

_KEYWORD_MAP: dict[str, str] = {
    # ── Supermercado ────────────────────────────────────────────────────
    "LIDER EXPRESS": "Supermercado",
    "LIDER": "Supermercado",
    "JUMBO": "Supermercado",
    "UNIMARC": "Supermercado",
    "TOTTUS": "Supermercado",
    "SANTA ISABEL": "Supermercado",
    "ACUENTA": "Supermercado",
    "MAYORISTA 10": "Supermercado",
    "MAYORISTA10": "Supermercado",
    "EKONO": "Supermercado",
    "SUPERMERCADO": "Supermercado",
    "SUPER": "Supermercado",
    "ALVI": "Supermercado",
    "CENTRAL MAYORISTA": "Supermercado",
    "MINIMARKET": "Supermercado",

    # ── Alimentación ───────────────────────────────────────────────────
    "STARBUCKS": "Alimentación",
    "MCDONALD": "Alimentación",
    "BURGER KING": "Alimentación",
    "SUBWAY": "Alimentación",
    "DOGGIS": "Alimentación",
    "JUAN MAESTRO": "Alimentación",
    "DOMINO": "Alimentación",
    "PAPA JOHN": "Alimentación",
    "PIZZA HUT": "Alimentación",
    "KFC": "Alimentación",
    "DUNKIN": "Alimentación",
    "MOSTAZA": "Alimentación",
    "TELEPIZZA": "Alimentación",
    "EMPORIO": "Alimentación",
    "PANADERIA": "Alimentación",
    "PASTELERIA": "Alimentación",
    "CAFETERIA": "Alimentación",
    "RESTAURANT": "Alimentación",
    "SUSHI": "Alimentación",
    "BRAVISSIMO": "Alimentación",
    "TARRAGONA": "Alimentación",

    # ── Delivery ───────────────────────────────────────────────────────
    "RAPPI": "Delivery",
    "UBER EATS": "Delivery",
    "UBER*EATS": "Delivery",
    "PEDIDOSYA": "Delivery",
    "PEDIDOS YA": "Delivery",
    "CORNERSHOP": "Delivery",
    "DIDI FOOD": "Delivery",

    # ── Transporte ─────────────────────────────────────────────────────
    "UBER": "Transporte",
    "DIDI": "Transporte",
    "CABIFY": "Transporte",
    "BEAT": "Transporte",
    "INDRIVER": "Transporte",
    "METRO": "Transporte",
    "BIP": "Transporte",
    "PASAJEBUS": "Transporte",
    "TURBUS": "Transporte",
    "PULLMAN": "Transporte",
    "RECORRIDO": "Transporte",
    "BUSBUD": "Transporte",
    "LATAM": "Transporte",
    "SKY AIRLINE": "Transporte",
    "JETSMART": "Transporte",
    "ESTACIONAMIENTO": "Transporte",
    "PARKING": "Transporte",
    "PEAJE": "Transporte",
    "AUTOPISTA": "Transporte",
    "COSTANERA NORTE": "Transporte",
    "VESPUCIO": "Transporte",
    "TAG": "Transporte",

    # ── Entretenimiento ────────────────────────────────────────────────
    "NETFLIX": "Entretenimiento",
    "SPOTIFY": "Entretenimiento",
    "DISNEY": "Entretenimiento",
    "HBO": "Entretenimiento",
    "YOUTUBE": "Entretenimiento",
    "AMAZON PRIME": "Entretenimiento",
    "APPLE TV": "Entretenimiento",
    "PARAMOUNT": "Entretenimiento",
    "CRUNCHYROLL": "Entretenimiento",
    "STEAM": "Entretenimiento",
    "PLAYSTATION": "Entretenimiento",
    "XBOX": "Entretenimiento",
    "NINTENDO": "Entretenimiento",
    "CINE HOYTS": "Entretenimiento",
    "CINEMARK": "Entretenimiento",
    "CINEPLANET": "Entretenimiento",
    "CINEPOLIS": "Entretenimiento",
    "TICKETMASTER": "Entretenimiento",
    "PUNTO TICKET": "Entretenimiento",
    "PUNTOTICKET": "Entretenimiento",

    # ── Salud ──────────────────────────────────────────────────────────
    "CRUZ VERDE": "Salud",
    "AHUMADA": "Salud",
    "SALCOBRAND": "Salud",
    "FARMACIA": "Salud",
    "FARMA": "Salud",
    "CLINICA": "Salud",
    "HOSPITAL": "Salud",
    "FONASA": "Salud",
    "ISAPRE": "Salud",
    "COLMENA": "Salud",
    "BANMEDICA": "Salud",
    "OPTICA": "Salud",
    "DENTAL": "Salud",
    "LABORATORIO": "Salud",

    # ── Servicios ──────────────────────────────────────────────────────
    "ENEL": "Servicios",
    "CHILQUINTA": "Servicios",
    "CGE": "Servicios",
    "AGUAS ANDINAS": "Servicios",
    "ESSBIO": "Servicios",
    "ESVAL": "Servicios",
    "ENTEL": "Servicios",
    "MOVISTAR": "Servicios",
    "VTR": "Servicios",
    "CLARO": "Servicios",
    "WOM": "Servicios",
    "MUNDO PACIFICO": "Servicios",
    "GTD": "Servicios",
    "METROGAS": "Servicios",
    "ABASTIBLE": "Servicios",
    "LIPIGAS": "Servicios",
    "GASCO": "Servicios",

    # ── Combustible ────────────────────────────────────────────────────
    "COPEC": "Combustible",
    "SHELL": "Combustible",
    "PETROBRAS": "Combustible",
    "TERPEL": "Combustible",
    "BIOMAX": "Combustible",
    "GASOLINERA": "Combustible",
    "BENCINA": "Combustible",

    # ── Educación ──────────────────────────────────────────────────────
    "UNIVERSIDAD": "Educación",
    "INSTITUTO": "Educación",
    "DUOC": "Educación",
    "INACAP": "Educación",
    "UDEMY": "Educación",
    "COURSERA": "Educación",
    "PLATZI": "Educación",
    "COLEGIO": "Educación",
    "ESCUELA": "Educación",

    # ── Compras ────────────────────────────────────────────────────────
    "FALABELLA": "Compras",
    "RIPLEY": "Compras",
    "PARIS": "Compras",
    "HITES": "Compras",
    "LA POLAR": "Compras",
    "ABCDIN": "Compras",
    "MERCADOLIBRE": "Compras",
    "MERCADO LIBRE": "Compras",
    "MERPAGO": "Compras",
    "AMAZON": "Compras",
    "ALIEXPRESS": "Compras",
    "SHEIN": "Compras",
    "TEMU": "Compras",
    "IKEA": "Compras",
    "SODIMAC": "Compras",
    "HOMECENTER": "Compras",
    "EASY": "Compras",
    "CONSTRUMART": "Compras",
    "FERRETER": "Compras",
    "APPLE": "Compras",
    "SAMSUNG": "Compras",
    "PCFACTORY": "Compras",
    "PC FACTORY": "Compras",
    "SPDIGITAL": "Compras",
    "ZARA": "Compras",
    "H&M": "Compras",
    "FOREVER 21": "Compras",
    "NIKE": "Compras",
    "ADIDAS": "Compras",
    "DECATHLON": "Compras",
    "TRICOT": "Compras",
    "CORONA": "Compras",
    "ROSS": "Compras",
}


# ── Sorted keywords (longest first) ────────────────────────────────────────
# Sorting by length descending ensures "UBER EATS" matches before "UBER",
# "LIDER EXPRESS" before "LIDER", etc.
_SORTED_KEYWORDS: list[tuple[str, str]] = sorted(
    _KEYWORD_MAP.items(),
    key=lambda kv: len(kv[0]),
    reverse=True,
)


def categorize_transaction(
    description: str,
    transaction_type: Optional[str] = None,
) -> str:
    """
    Categorize a transaction based on its description and type.

    Returns the category name (one of CATEGORIES).

    Priority:
    1. Transfer types → "Transferencia"
    2. Keyword match on description (longest match wins)
    3. Fallback → "Otros"
    """
    if transaction_type in TRANSFER_TYPES:
        return "Transferencia"

    desc_upper = description.upper()

    for keyword, category in _SORTED_KEYWORDS:
        if keyword in desc_upper:
            return category

    return "Otros"


def categorize_if_uncategorized(
    description: str,
    transaction_type: Optional[str] = None,
    current_category: Optional[str] = None,
) -> str:
    """
    Categorize only if the transaction has no category set.
    Preserves user-set categories.
    """
    if current_category:
        return current_category
    return categorize_transaction(description, transaction_type)
