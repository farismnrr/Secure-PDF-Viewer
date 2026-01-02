# Security Policy

## Supported Versions

We actively maintain the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a Vulnerability

We take the security of this project seriously. If you believe you have found a security vulnerability, please report it to us by opening a public issue in this repository. 

While public disclosure is preferred for this project, please provide as much detail as possible, including steps to reproduce the issue, to help us address it quickly.

## Security Hardening Efforts

This project implements several security layers to protect documents and user data:

- **SSO Integration**: Delegated authentication to a hardened Multi-tenant User Management Service.
- **Nonce-based Verification**: Prevention of replay attacks during the authentication callback.
- **Rate Limiting**: Protection against brute-force and DoS attacks on critical endpoints.
- **Crypto Hardening**: Secure PDF decryption using AES-256-GCM.
- **Secure Handling of Secrets**: All sensitive configuration is managed via environment variables.
- **Automated Security Scanning**: Regular CodeQL and Dependabot scans of both the viewer and its dependencies.
