# Chilean Bank Email Formats Reference

Documentation of email notification formats from Chilean banks to help with parser development.

## Banco de Chile

### Sender Addresses
- `notificaciones@bancochile.cl`
- `alertas.bancochile.cl`
- `alertasbancarias@bancochile.cl`

### Subject Lines
- "Compra en Tarjeta de Crédito"
- "Notificación de Transferencia"
- "Abono en su Cuenta"
- "Cargo en Tarjeta de Débito"

### Email Format - Compra
```
Estimado Cliente,

Se ha realizado una compra con su Tarjeta de Crédito:

Monto: $45.990
Fecha: 09/03/2026
Comercio: UBER EATS CHILE
Tarjeta: ****1234
```

**Patterns:**
- Amount: `Monto: $X.XXX`
- Date: `Fecha: DD/MM/YYYY`
- Merchant: `Comercio: NAME`
- Card: `Tarjeta: ****XXXX`

### Email Format - Transferencia
```
Se ha realizado una transferencia desde su Cuenta Corriente:

Monto: $150.000
Fecha: 08/03/2026
Descripción: Transferencia a Juan Pérez
Cuenta: ****5678
```

**Patterns:**
- Amount: `Monto: $XXX.XXX`
- Date: `Fecha: DD/MM/YYYY`
- Description: `Descripción: TEXT`
- Account: `Cuenta: ****XXXX`

---

## Santander

### Sender Addresses
- `alertas@santander.cl`
- `notificaciones@santander.cl`
- `aviso@santander.cl`

### Subject Lines
- "Compra con tu Tarjeta"
- "Transferencia realizada"
- "Abono en tu cuenta"

### Email Format - Compra
```
Hola,

Realizaste una compra con tu Tarjeta de Débito:

Por: $18.500
El: 09/03/2026 12:30
En: SUPERMERCADO JUMBO
Con tarjeta: ****5555
```

**Patterns:**
- Amount: `Por: $X.XXX`
- Date/Time: `El: DD/MM/YYYY HH:MM`
- Merchant: `En: NAME`
- Card: `Con tarjeta: ****XXXX`

---

## BCI (Banco de Crédito e Inversiones)

### Sender Addresses
- `notificaciones@bci.cl`
- `alertas@bci.cl`

### Subject Lines
- "Notificación de Compra BCI"
- "Transferencia BCI"
- "Abono en tu cuenta BCI"

### Email Format - Compra
```
Estimado Cliente BCI,

Compra realizada:

Total: $ 32.990
Fecha: 09-03-2026
Establecimiento: CINE HOYTS
Tarjeta terminada en: 7890
```

**Patterns:**
- Amount: `Total: $ X.XXX`
- Date: `Fecha: DD-MM-YYYY` (uses dash)
- Merchant: `Establecimiento: NAME`
- Card: `Tarjeta terminada en: XXXX`

---

## Banco Estado

### Sender Addresses
- `notificaciones@bancoestado.cl`
- `alertas@bancoestado.cl`

### Subject Lines
- "Compra con tu CuentaRUT"
- "Transferencia desde tu cuenta"

### Email Format (Common)
```
Hola,

Compra realizada:

Monto: $25.000
Fecha y hora: 09/03/2026 - 14:30
Comercio: FARMACIA CRUZ VERDE
Cuenta: CuentaRUT ****3456
```

**Patterns:**
- Amount: `Monto: $X.XXX`
- Date: `Fecha y hora: DD/MM/YYYY - HH:MM`
- Merchant: `Comercio: NAME`
- Account: `CuentaRUT ****XXXX`

---

## Itaú

### Sender Addresses
- `notificaciones@itau.cl`
- `alertas.tarjeta@itau.cl`

### Subject Lines
- "Compra con tu Tarjeta Itaú"
- "Transferencia realizada"
- "Abono recibido"

### Email Format - Compra
```
Hola,

Se realizó una compra:

Valor: $42.500
Fecha: 09/03/2026 15:45
Local: PARIS PROVIDENCIA
Tarjeta Visa: ****6789
```

**Patterns:**
- Amount: `Valor: $X.XXX`
- Date: `Fecha: DD/MM/YYYY HH:MM`
- Merchant: `Local: NAME`
- Card: `Tarjeta Visa: ****XXXX` or `Tarjeta Mastercard: ****XXXX`

---

## Scotiabank

### Sender Addresses
- `notificaciones@scotiabank.cl`
- `alertas@scotiabank.cl`

### Subject Lines
- "Compra con tu Tarjeta Scotiabank"
- "Notificación de Transferencia"

### Email Format
```
Estimado Cliente,

Compra realizada con su tarjeta:

Monto: CLP 38.900
Fecha: 09/03/2026
Comercio: RIPLEY SANTIAGO
Tarjeta: ****4321
```

**Patterns:**
- Amount: `Monto: CLP X.XXX`
- Date: `Fecha: DD/MM/YYYY`
- Merchant: `Comercio: NAME`
- Card: `Tarjeta: ****XXXX`

---

## Common Patterns Across Banks

### Amount Formats
- With currency symbol: `$X.XXX` or `$ X.XXX`
- With currency code: `CLP X.XXX`
- Thousands separator: `.` (dot)
- Decimal separator: `,` (comma) - but usually omitted for CLP

### Date Formats
- Most common: `DD/MM/YYYY`
- Alternative: `DD-MM-YYYY`
- With time: `DD/MM/YYYY HH:MM`

### Transaction Types (Keywords)
- **Debit**: compra, cargo, débito, pago
- **Credit**: abono, depósito, crédito, transferencia recibida
- **Transfer**: transferencia, envío

### Card/Account Identifiers
- Usually last 4 digits: `****XXXX`
- Sometimes with type: `Tarjeta terminada en XXXX`
- Account: `Cuenta: ****XXXX` or `CuentaRUT ****XXXX`

## Tips for Collecting Samples

1. **Check your Gmail** for existing notifications
2. **Make a test purchase** to get fresh email
3. **Look for variations**:
   - Credit card vs debit card
   - National vs international
   - Different merchants
4. **Sanitize personal data** before sharing:
   - Remove full card numbers
   - Remove personal names
   - Remove account balances
5. **Save multiple samples** (5-10 per bank)

## Adding Your Bank

If you have access to a bank not listed here:

1. Collect 5+ email samples
2. Document patterns (like above)
3. Create parser following `CONTRIBUTING.md`
4. Submit PR or share in discussions

## Notes

- Formats can change without notice
- Banks may use different formats for different products
- International transactions may have different format
- HTML vs plain text emails may differ
- Some banks send summary emails (monthly) vs transaction emails - we only want transaction emails
