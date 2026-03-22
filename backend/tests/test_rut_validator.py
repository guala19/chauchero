"""Tests for Chilean RUT algorithmic validation."""

import pytest
from app.utils.rut_validator import validate_rut_checksum


class TestRutChecksum:
    # Valid RUTs (real algorithm)
    def test_valid_rut_1(self):
        assert validate_rut_checksum("12.345.678-5") is True

    def test_valid_rut_2(self):
        assert validate_rut_checksum("11.111.111-1") is True

    def test_valid_rut_with_k(self):
        assert validate_rut_checksum("10.000.013-K") is True

    def test_valid_rut_with_lowercase_k(self):
        assert validate_rut_checksum("10.000.013-k") is True

    def test_valid_rut_short(self):
        assert validate_rut_checksum("1.234.567-4") is True

    # Invalid RUTs (wrong check digit)
    def test_invalid_check_digit(self):
        assert validate_rut_checksum("12.345.678-9") is False

    def test_invalid_check_digit_2(self):
        assert validate_rut_checksum("11.111.111-2") is False

    def test_invalid_k_when_not_expected(self):
        assert validate_rut_checksum("12.345.678-K") is False

    # Edge cases
    def test_too_short(self):
        assert validate_rut_checksum("5") is False

    def test_non_numeric_body(self):
        assert validate_rut_checksum("ab.cde.fgh-1") is False
