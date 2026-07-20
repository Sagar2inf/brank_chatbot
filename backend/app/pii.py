import re

EMAIL_PATTERN = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
PHONE_PATTERN = r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'
CREDIT_CARD_PATTERN = r'\b(?:\d[ -]*?){13,16}\b'
SSN_PATTERN = r'\b\d{3}-\d{2}-\d{4}\b'

def redact_pii(text: str) -> str:
    if not text:
        return ""
    
    text = re.sub(EMAIL_PATTERN, "[REDACTED_EMAIL]", text)
    text = re.sub(PHONE_PATTERN, "[REDACTED_PHONE]", text)
    text = re.sub(CREDIT_CARD_PATTERN, "[REDACTED_CARD]", text)
    text = re.sub(SSN_PATTERN, "[REDACTED_SSN]", text)
    return text