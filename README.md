<p align="center">
<img src="https://raw.githubusercontent.com/seguinleo/Notida/main/public/pwa/icon192.png" alt="Logo" width="72" height="72">
</p>
<h1 align="center">Notida</h1>

<p align="center">
A fast, private and secure web notebook.
</p>

## Features

Users can create task lists, reminders, tables, math expressions or code blocks using Markdown, HTML and KaTeX. You can add images, audio or videos via URL and add custom categories to organize your notes.

You can sync your notes across all your devices after logging in (no email address is required, just a username and a strong password). Public notes can be shared with anyone via a random URL.

This website is a Progressive Web App (PWA) that can be installed as an application. You can fully customize the application's color theme.

This website is accessible to users with disabilities through high-contrast colors, ARIA modules, and focusable elements.

## Security

The website follows [OWASP security recommendations](https://cheatsheetseries.owasp.org/).

All notes are sanitized and validated through the DOMPurify library. Passwords are hashed using Argon2id. All notes are encrypted with AES-256-GCM.

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

The main security features are enabled by default, but for production use, I recommend to:

* Change NODE_ENV to "production" in .env
* Edit all users, passwords and secret keys
* Edit **.env** and **docker-compose.yml** files
* Edit nginx configuration to add SSL
* Store the MASTER_KEY in a secure vault like AWS KMS, Azure Key Vault or a self-hosted solution like Hashicorp

.env template

```ini
#NODE_ENV=production
NODE_ENV=development

DB_HOST=localhost
DB_DATABASE=notida
DB_USER=user
DB_PASSWORD=password
DB_PORT=3306
DB_CHARSET=utf8mb4

REDIS_URL=redis://redis:6379

# ALLOWED URL FOR CORS PRODUCTION
ORIGIN_URL=

# SET YOUR SECRETS HERE BEFORE DEPLOYING
MASTER_KEY=
SESSION_SECRET=
CSRF_SECRET=
```

> [!IMPORTANT]
> Once built, the website is available at localhost:8787, but if you want to deploy it on a public server, you need to [install a SSL certificate](https://github.com/seguinleo/WebSecurityCheatSheet) to use note encryption (Web Crypto API requires HTTPs).

Special thanks to [CodeMirror](https://code.haverbeke.berlin/codemirror/dev/), [DOMPurify](https://github.com/cure53/DOMPurify), [marked](https://github.com/markedjs/marked) and [Iro](https://github.com/jaames/iro.js)
