<p align="center">
<img src="https://raw.githubusercontent.com/seguinleo/Notida/main/public/pwa/icon192.png" alt="Logo" width="72" height="72">
</p>
<h1 align="center">Notida</h1>

<p align="center">
A fast, private and secure web notebook.
</p>

<p align="center">
<img alt="License" src="https://img.shields.io/github/license/seguinleo/Notida?color=8ab4f8&style=for-the-badge">
</p>

## Table of contents

* [Features](#features)
* [Security](#security)
* [Community](#community)
* [Todo](#todo)
* [Self-hosting](#self-hosting)
* [Production](#production)

## Features

Users can create task lists, reminders, tables, links, math expressions or code blocks using Markdown and HTML. They can add images, audio or videos via URL. Notes can be searched, sorted by category or organized into folders.

Users can sync notes across devices in a secure database after signing in without needing an email address, only a username and strong password. Public notes can be shared via a random URL.

This website is a Progressive Web App (PWA) that can be installed as an application. Design is responsive and optimized for all mobile devices or macOS/Windows.

The site is accessible to users with disabilities through high-contrast colors, ARIA modules, and focusable elements.

## Security

The website follows [OWASP security recommendations](https://cheatsheetseries.owasp.org/).

All notes are sanitized and validated through the DOMPurify library. All notes are encrypted with AES-256-GCM. Each user has a cryptographically secure key generated after signing up and a rotated JWT token stored in Redis.

Protection against XSS and CSRF attacks is ensured through a robust CSP, secure cookies or tokens.

Users can lock the app using biometrics (fingerprints, face, etc.). These biometric data are never sent to the server, verification is local and UI/UX only.

User accounts are deleted 1 year after the last login.

## Todo

* 2FA protection

## Community

If you find [issues](https://github.com/seguinleo/Notida/issues), [vulnerabilities](https://github.com/seguinleo/Notida/security) or if you have any [suggestions](https://github.com/seguinleo/Notida/discussions) to improve this project, feel free to discuss!

## Self-hosting

**Recommended for long-term use.**

The project is configured to start with a single Docker command:

``docker-compose up --build`` to build the Docker container

## Production

* Change NODE_ENV to "production" in .env
* Edit all users, passwords and secret keys
* Edit **.env** and **docker-compose.yml** files
* To store user encryption keys, I recommend using a secure vault like AWS KMS, Azure Key Vault or a self-hosted solution like Hashicorp instead of the database

> [!IMPORTANT]
> Once built, the website is available at localhost:8787, but if you want to deploy it on a public server, you need to [install a SSL certificate](https://github.com/seguinleo/WebSecurityCheatSheet) to use note encryption (Web Crypto API requires HTTPs).

Special thanks to [DOMPurify](https://github.com/cure53/DOMPurify), [marked](https://github.com/markedjs/marked) and [Iro](https://github.com/jaames/iro.js)
