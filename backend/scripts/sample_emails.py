"""
Sample email data for testing parsers.
Use this to test parsers without connecting to Gmail.
"""

from datetime import datetime

BANCO_CHILE_SAMPLES = {
    "compra_tarjeta_credito": {
        "sender": "notificaciones@bancochile.cl",
        "subject": "Compra en Tarjeta de Crédito",
        "body": """
Estimado Cliente,

Se ha realizado una compra con su Tarjeta de Crédito Banco de Chile:

Monto: $45.990
Fecha: 09/03/2026
Comercio: UBER EATS CHILE
Tarjeta: ****1234

Si no reconoce esta transacción, comuníquese con nosotros.

Saludos,
Banco de Chile
        """,
        "expected": {
            "amount": 45990,
            "date": "09/03/2026",
            "description": "UBER EATS CHILE",
            "type": "debit",
            "digits": "1234"
        }
    },
    
    "transferencia_saliente": {
        "sender": "alertas.bancochile.cl",
        "subject": "Notificación de Transferencia",
        "body": """
Estimado Cliente,

Se ha realizado una transferencia desde su Cuenta Corriente:

Monto: $150.000
Fecha: 08/03/2026
Descripción: Transferencia a Juan Pérez
Cuenta: ****5678

Saludos,
Banco de Chile
        """,
        "expected": {
            "amount": 150000,
            "date": "08/03/2026",
            "description": "Transferencia a Juan Pérez",
            "type": "transfer_debit",
            "digits": "5678"
        }
    },
    
    "abono_cuenta": {
        "sender": "notificaciones@bancochile.cl",
        "subject": "Abono en su Cuenta",
        "body": """
Estimado Cliente,

Se registró un abono en su cuenta:

Monto: $500.000
Fecha: 07/03/2026
Concepto: Depósito desde Cuenta Rut
Cuenta: ****2345

Saludos,
Banco de Chile
        """,
        "expected": {
            "amount": 500000,
            "date": "07/03/2026",
            "description": "Depósito desde Cuenta Rut",
            "type": "credit",
            "digits": "2345"
        }
    },
    
    "compra_internacional": {
        "sender": "notificaciones@bancochile.cl",
        "subject": "Compra Internacional",
        "body": """
Estimado Cliente,

Compra internacional realizada:

Monto: $125.500
Fecha: 06/03/2026 18:45
Comercio: AMAZON.COM
Tarjeta de Crédito: ****9876

Esta compra puede estar sujeta a cargos adicionales.

Banco de Chile
        """,
        "expected": {
            "amount": 125500,
            "date": "06/03/2026",
            "description": "AMAZON.COM",
            "type": "debit",
            "digits": "9876"
        }
    }
}


SANTANDER_SAMPLES = {
    "compra_debito": {
        "sender": "alertas@santander.cl",
        "subject": "Compra con tu Tarjeta de Débito",
        "body": """
Hola,

Realizaste una compra con tu Tarjeta de Débito:

Por: $18.500
El: 09/03/2026 12:30
En: SUPERMERCADO JUMBO
Con tarjeta: ****5555

Santander Chile
        """,
        "expected": {
            "amount": 18500,
            "date": "09/03/2026",
            "description": "SUPERMERCADO JUMBO",
            "type": "debit",
            "digits": "5555"
        }
    }
}


BCI_SAMPLES = {
    "notificacion_compra": {
        "sender": "notificaciones@bci.cl",
        "subject": "Notificación de Compra BCI",
        "body": """
Estimado Cliente BCI,

Compra realizada:

Total: $ 32.990
Fecha: 09-03-2026
Establecimiento: CINE HOYTS
Tarjeta terminada en: 7890

BCI - Banco de Crédito e Inversiones
        """,
        "expected": {
            "amount": 32990,
            "date": "09-03-2026",
            "description": "CINE HOYTS",
            "type": "debit",
            "digits": "7890"
        }
    }
}


def get_all_samples():
    """Get all sample emails for testing"""
    return {
        "Banco de Chile": BANCO_CHILE_SAMPLES,
        "Santander": SANTANDER_SAMPLES,
        "BCI": BCI_SAMPLES
    }
