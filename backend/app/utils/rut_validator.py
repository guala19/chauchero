"""
Chilean RUT (Rol Único Tributario) validation.

The check digit is calculated using the modulo 11 algorithm:
1. Strip dots and dash: "12.345.678-5" → "12345678", check_digit = "5"
2. Multiply each digit by weights [2,3,4,5,6,7] cycling right-to-left
3. Sum products, mod 11, subtract from 11
4. Result: 11→"0", 10→"K", else str(result)
"""


def validate_rut_checksum(rut: str) -> bool:
    """
    Validate Chilean RUT check digit.
    Expects format "XX.XXX.XXX-X" (already format-validated).
    Returns True if the check digit is correct.
    """
    clean = rut.replace(".", "").replace("-", "")
    if len(clean) < 2:
        return False

    body = clean[:-1]
    given_check = clean[-1].upper()

    if not body.isdigit():
        return False

    # Modulo 11 algorithm
    total = 0
    weight = 2
    for digit in reversed(body):
        total += int(digit) * weight
        weight = weight + 1 if weight < 7 else 2

    remainder = 11 - (total % 11)

    if remainder == 11:
        expected = "0"
    elif remainder == 10:
        expected = "K"
    else:
        expected = str(remainder)

    return given_check == expected
