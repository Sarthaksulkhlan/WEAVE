# 05 — Security and Privacy

## Core Principles

1. Least privilege and role-based authorization.
2. Institution-level data isolation in all query paths.
3. Data minimization: no Aadhaar, no unnecessary PII.
4. Protected identifiers: no full APAAR in API responses/QR URLs.
5. Tamper-evident auditability.

## Identifier Handling

- Raw APAAR-like inputs are normalized in backend processing only.
- Store masked display value and irreversible hash.
- Logs and audit payloads must use masked forms.

## Attestation Security

- Platform-issued attestations are signed with Ed25519.
- Include issuance timestamp, expiry timestamp and revocation status.
- Verification endpoint validates signature, expiry and revocation.
- Public verification must never reveal full internal identifiers.

## Privacy and Compliance Guardrails

- Synthetic data only in development/demo/test.
- No claim of official government verification unless authorized.
- Mark all synthetic connectors as `SYNTHETIC` in UI/docs.

## Operational Controls (planned)

- Secrets from environment/secret store only.
- Mandatory request IDs for traceability.
- Audit event hashing chain to detect tampering.
- Security tests for authz, tenant isolation and identifier leakage.
