<p align="center">
<img src="https://raw.githubusercontent.com/seguinleo/Notida/main/public/pwa/apple-touch-icon.png" alt="Logo" width="72" height="72">
</p>
<h1 align="center">Notida</h1>

<p align="center">
A fast, private and secure web notebook.
</p>

## Features

* **Rich note editor**: Create notes using Markdown, HTML and mathematical expressions. Organize your content with task lists, reminders, tables or code blocks.
* **Multimedia support**: Embed images, audio files and videos directly into your notes using URLs.
* **Custom categories**: Create your own categories to organize and easily find your notes.
* **Cross-device sync**: Access your notes across all your devices by signing in with a username and password. No email address required.
* **Public sharing**: Share individual notes with anyone through randomly generated URLs.
* **Customization**: Personalize the application's color theme to suit your preferences.
* **Accessibility**: Designed with accessibility in mind, including high-contrast colors, ARIA attributes and keyboard-accessible interactive elements.

## Security

Privacy and security are fundamental principles of Notida. The application incorporates multiple security mechanisms and follows the recommendations of OWASP.

* **Data encryption**: Notes are encrypted in the database using AES-256-GCM.
* **Biometric app locking**: Lock the application using your device's biometric authentication (fingerprint, face recognition, etc.). Biometric data never leaves your device. Authentication is handled locally and is used as an additional application access-control mechanism.
* **RGPD**: Accounts are automatically deleted after one year of inactivity after the last login.

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

* Change NODE_ENV to "production" in ``.env``
* Edit all users, passwords and secret keys
* Edit nginx configuration to add SSL
* Store the MASTER_KEY in a secure vault like AWS KMS, Azure Key Vault or a self-hosted solution like Hashicorp

``.env`` template, at the root of the project

```ini
# SET YOUR SECRETS HERE BEFORE DEPLOYING !

NODE_ENV=production

DB_HOST=db
DB_DATABASE=notida
DB_USER=notida
DB_PASSWORD=a_strong_password
DB_PORT=3306
DB_CHARSET=utf8mb4

REDIS_URL=redis://redis:6379

# ALLOWED URL FOR CORS PRODUCTION
ORIGIN_URL=

MASTER_KEY=
SESSION_SECRET=
CSRF_SECRET=

MYSQL_ROOT_PASSWORD=a_strong_password
MYSQL_DATABASE=notida
MYSQL_USER=notida
MYSQL_PASSWORD=a_strong_password
```

> [!IMPORTANT]
> Once built, the website is available at localhost:8787, but if you want to deploy it on a public server, you need to [install a SSL certificate](https://github.com/seguinleo/WebSecurityCheatSheet) to use note encryption (Web Crypto API requires HTTPs).

Special thanks to [simple-code-editor](https://github.com/justcaliturner/simple-code-editor), [DOMPurify](https://github.com/cure53/DOMPurify), [marked](https://github.com/markedjs/marked) and [Iro](https://github.com/jaames/iro.js)
