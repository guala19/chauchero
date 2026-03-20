"""Tests for the transaction categorization service."""

import pytest
from app.services.category_service import (
    categorize_transaction,
    categorize_if_uncategorized,
    CATEGORIES,
)


class TestCategorizeTransaction:
    """Test categorize_transaction function."""

    # ── Transfer types ──────────────────────────────────────────────────

    def test_transfer_debit_returns_transferencia(self):
        assert categorize_transaction("Juan Perez", "transfer_debit") == "Transferencia"

    def test_transfer_credit_returns_transferencia(self):
        assert categorize_transaction("Maria Lopez", "transfer_credit") == "Transferencia"

    def test_transfer_type_overrides_keyword_match(self):
        """Even if description matches a keyword, transfer type wins."""
        assert categorize_transaction("JUMBO BILBAO", "transfer_debit") == "Transferencia"

    # ── Supermercado ────────────────────────────────────────────────────

    @pytest.mark.parametrize("description", [
        "JUMBO BILBAO",
        "LIDER EXPRESS MAIPU",
        "LIDER",
        "UNIMARC LOS MILITARES",
        "TOTTUS PUENTE ALTO",
        "SANTA ISABEL PROVIDENCIA",
        "ACUENTA",
        "EKONO",
    ])
    def test_supermercado(self, description):
        assert categorize_transaction(description, "debit") == "Supermercado"

    # ── Alimentación ───────────────────────────────────────────────────

    @pytest.mark.parametrize("description", [
        "STARBUCKS RESERVE",
        "MCDONALD'S",
        "BURGER KING CHILE",
        "SUBWAY SANTIAGO",
        "DOGGIS",
        "JUAN MAESTRO",
    ])
    def test_alimentacion(self, description):
        assert categorize_transaction(description, "debit") == "Alimentación"

    # ── Delivery ───────────────────────────────────────────────────────

    @pytest.mark.parametrize("description", [
        "DL RAPPI CHILE RA",
        "UBER EATS CHILE",
        "UBER*EATS",
        "PEDIDOSYA",
        "CORNERSHOP",
        "DIDI FOOD",
    ])
    def test_delivery(self, description):
        assert categorize_transaction(description, "debit") == "Delivery"

    # ── Transporte ─────────────────────────────────────────────────────

    @pytest.mark.parametrize("description", [
        "PAYU *UBER TRIP",
        "DIDI CHILE",
        "CABIFY",
        "PASAJEBUS",
        "TURBUS SANTIAGO",
        "LATAM AIRLINES",
        "JETSMART",
    ])
    def test_transporte(self, description):
        assert categorize_transaction(description, "debit") == "Transporte"

    def test_uber_eats_is_delivery_not_transporte(self):
        """UBER EATS should match Delivery, not Transporte (UBER)."""
        assert categorize_transaction("UBER EATS CHILE", "debit") == "Delivery"
        assert categorize_transaction("UBER*EATS ORDER", "debit") == "Delivery"

    def test_uber_trip_is_transporte(self):
        """Plain UBER (ride) should be Transporte."""
        assert categorize_transaction("UBER TRIP", "debit") == "Transporte"

    def test_didi_food_is_delivery_not_transporte(self):
        """DIDI FOOD should match Delivery, not Transporte."""
        assert categorize_transaction("DIDI FOOD ORDER", "debit") == "Delivery"

    # ── Entretenimiento ────────────────────────────────────────────────

    @pytest.mark.parametrize("description", [
        "NETFLIX CHILE",
        "SPOTIFY",
        "DISNEY PLUS",
        "STEAM GAMES",
        "CINE HOYTS",
        "CINEMARK",
    ])
    def test_entretenimiento(self, description):
        assert categorize_transaction(description, "debit") == "Entretenimiento"

    # ── Salud ──────────────────────────────────────────────────────────

    @pytest.mark.parametrize("description", [
        "CRUZ VERDE",
        "FARMACIA AHUMADA",
        "SALCOBRAND",
        "CLINICA ALEMANA",
    ])
    def test_salud(self, description):
        assert categorize_transaction(description, "debit") == "Salud"

    # ── Servicios ──────────────────────────────────────────────────────

    @pytest.mark.parametrize("description", [
        "ENEL CHILE",
        "ENTEL PCS",
        "MOVISTAR",
        "VTR BANDA ANCHA",
        "WOM",
        "AGUAS ANDINAS",
        "METROGAS",
    ])
    def test_servicios(self, description):
        assert categorize_transaction(description, "debit") == "Servicios"

    # ── Combustible ────────────────────────────────────────────────────

    @pytest.mark.parametrize("description", [
        "COPEC PROVIDENCIA",
        "SHELL VITACURA",
        "PETROBRAS",
    ])
    def test_combustible(self, description):
        assert categorize_transaction(description, "debit") == "Combustible"

    # ── Educación ──────────────────────────────────────────────────────

    @pytest.mark.parametrize("description", [
        "UNIVERSIDAD DE CHILE",
        "DUOC UC",
        "UDEMY",
        "PLATZI",
    ])
    def test_educacion(self, description):
        assert categorize_transaction(description, "debit") == "Educación"

    # ── Compras ────────────────────────────────────────────────────────

    @pytest.mark.parametrize("description", [
        "FALABELLA COSTANERA",
        "RIPLEY PARQUE ARAUCO",
        "MERCADOLIBRE",
        "MERPAGO*DIEGOALEJANDRO",
        "SODIMAC HOMECENTER",
        "AMAZON.COM",
        "PCFACTORY",
        "ZARA CHILE",
    ])
    def test_compras(self, description):
        assert categorize_transaction(description, "debit") == "Compras"

    # ── Otros (no match) ───────────────────────────────────────────────

    @pytest.mark.parametrize("description", [
        "COMERCIO DESCONOCIDO XYZ",
        "PAGO EN TIENDA 12345",
        "ABCDEF",
    ])
    def test_otros_for_unknown(self, description):
        assert categorize_transaction(description, "debit") == "Otros"

    # ── Case insensitivity ─────────────────────────────────────────────

    def test_case_insensitive_lowercase(self):
        assert categorize_transaction("jumbo bilbao", "debit") == "Supermercado"

    def test_case_insensitive_mixed(self):
        assert categorize_transaction("Netflix Chile", "debit") == "Entretenimiento"

    def test_case_insensitive_upper(self):
        assert categorize_transaction("RAPPI", "debit") == "Delivery"

    # ── None transaction_type ──────────────────────────────────────────

    def test_none_transaction_type_still_matches_keywords(self):
        assert categorize_transaction("JUMBO", None) == "Supermercado"

    def test_none_transaction_type_unknown_returns_otros(self):
        assert categorize_transaction("UNKNOWN MERCHANT", None) == "Otros"

    # ── Regular debit/credit types use keywords ────────────────────────

    def test_debit_type_uses_keywords(self):
        assert categorize_transaction("NETFLIX", "debit") == "Entretenimiento"

    def test_credit_type_uses_keywords(self):
        assert categorize_transaction("NETFLIX", "credit") == "Entretenimiento"


class TestCategorizeIfUncategorized:
    """Test categorize_if_uncategorized preserves existing categories."""

    def test_preserves_existing_category(self):
        result = categorize_if_uncategorized(
            "JUMBO BILBAO", "debit", current_category="Alimentación"
        )
        assert result == "Alimentación"

    def test_categorizes_when_none(self):
        result = categorize_if_uncategorized(
            "JUMBO BILBAO", "debit", current_category=None
        )
        assert result == "Supermercado"

    def test_categorizes_when_empty_string(self):
        """Empty string is falsy, should re-categorize."""
        result = categorize_if_uncategorized(
            "JUMBO BILBAO", "debit", current_category=""
        )
        assert result == "Supermercado"


class TestCategories:
    """Test category list integrity."""

    def test_otros_is_last(self):
        assert CATEGORIES[-1] == "Otros"

    def test_transferencia_in_categories(self):
        assert "Transferencia" in CATEGORIES

    def test_no_duplicates(self):
        assert len(CATEGORIES) == len(set(CATEGORIES))

    def test_all_mapped_categories_are_valid(self):
        """Every category in the keyword map must be in CATEGORIES."""
        from app.services.category_service import _KEYWORD_MAP
        mapped_categories = set(_KEYWORD_MAP.values())
        valid = set(CATEGORIES)
        invalid = mapped_categories - valid
        assert not invalid, f"Keywords map to invalid categories: {invalid}"
