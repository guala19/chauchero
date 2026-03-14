#!/usr/bin/env python3
"""
Script to manually test email parsers with sample data.
Usage: python scripts/test_parser.py
"""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app.parsers import parser_registry, EmailData
from datetime import datetime


def test_banco_chile_samples():
    """Test Banco de Chile parser with various sample emails"""
    
    print("=" * 80)
    print("Testing Banco de Chile Parser")
    print("=" * 80)
    
    samples = [
        {
            "name": "Compra con tarjeta de crédito",
            "email": EmailData(
                message_id="sample_001",
                sender="notificaciones@bancochile.cl",
                subject="Compra en Tarjeta de Crédito",
                body="""
Estimado Cliente,

Se ha realizado una compra con su Tarjeta de Crédito:

Monto: $25.990
Fecha: 09/03/2026
Comercio: STARBUCKS PROVIDENCIA
Tarjeta: ****4567

Gracias,
Banco de Chile
                """,
                date=datetime(2026, 3, 9, 10, 30)
            )
        },
        {
            "name": "Transferencia saliente",
            "email": EmailData(
                message_id="sample_002",
                sender="alertas.bancochile.cl",
                subject="Notificación de Transferencia",
                body="""
Se realizó una transferencia desde su cuenta:

Monto: $100.000
Fecha: 08/03/2026 14:25
Descripción: Transferencia a María González
Cuenta Corriente: ****8901

Banco de Chile
                """,
                date=datetime(2026, 3, 8, 14, 25)
            )
        },
        {
            "name": "Abono/Depósito",
            "email": EmailData(
                message_id="sample_003",
                sender="notificaciones@bancochile.cl",
                subject="Abono en su Cuenta",
                body="""
Estimado Cliente,

Se registró un abono en su cuenta:

Monto: $500.000
Fecha: 07/03/2026
Concepto: Depósito desde Cuenta Rut
Cuenta: ****2345

Saludos,
Banco de Chile
                """,
                date=datetime(2026, 3, 7, 9, 0)
            )
        }
    ]
    
    for sample in samples:
        print(f"\n{'─' * 80}")
        print(f"Test: {sample['name']}")
        print(f"{'─' * 80}")
        
        email = sample["email"]
        parser = parser_registry.get_parser_for_email(email)
        
        if not parser:
            print("❌ No parser found for this email")
            continue
        
        print(f"✓ Parser identified: {parser.bank_name}")
        
        result = parser.parse(email)
        
        if not result:
            print("❌ Parsing failed")
            continue
        
        print(f"\n📊 Parsed Transaction:")
        print(f"  Amount:           ${result.amount:,.0f}")
        print(f"  Date:             {result.transaction_date.strftime('%d/%m/%Y %H:%M')}")
        print(f"  Description:      {result.description}")
        print(f"  Type:             {result.transaction_type}")
        print(f"  Card/Account:     {'****' + result.last_4_digits if result.last_4_digits else 'N/A'}")
        print(f"  Confidence:       {result.confidence}%")
        
        confidence_emoji = "✅" if result.confidence >= 90 else "⚠️" if result.confidence >= 70 else "❌"
        print(f"\n{confidence_emoji} Confidence Level: {result.confidence}%")


def test_unsupported_email():
    """Test with email from unsupported bank"""
    print("\n" + "=" * 80)
    print("Testing Unsupported Bank")
    print("=" * 80)
    
    email = EmailData(
        message_id="sample_004",
        sender="notificaciones@santander.cl",
        subject="Compra con tu tarjeta",
        body="Compra por $30.000",
        date=datetime.now()
    )
    
    parser = parser_registry.get_parser_for_email(email)
    
    if parser:
        print(f"✓ Parser found: {parser.bank_name}")
    else:
        print("❌ No parser available for this bank (expected for now)")
        print("   Bank: Santander (not yet implemented)")


def main():
    print("\n" + "🚀 CHAUCHERO - Parser Testing Tool" + "\n")
    
    print(f"Registered parsers: {len(parser_registry._parsers)}")
    for parser in parser_registry._parsers:
        print(f"  • {parser.bank_name} - {', '.join(parser.email_domains)}")
    
    test_banco_chile_samples()
    test_unsupported_email()
    
    print("\n" + "=" * 80)
    print("✅ Testing Complete")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
