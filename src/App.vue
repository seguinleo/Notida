<template>
  <div v-if="!onLine" id="offline">
    <p>You are offline</p>
  </div>
  <div v-if="!isLocked" id="bottom-bar">
    <button type="button" id="sidebar-indicator" class="btn-small bg-default" aria-label="Open sidebar"
      @click="openSidebar()">
      <i class="fa-solid fa-bars"></i>
    </button>
    <div id="search-section" class="bg-default" role="search">
      <i class="fa-solid fa-magnifying-glass" role="none"></i>
      <input v-model="searchValue" type="search" id="search-input" maxlength="30" aria-label="Search notes"
        autocomplete="off">
      <kbd>CTRL</kbd><kbd>K</kbd>
    </div>
    <button type="button" id="btn-add-note" class="btn-small bg-default" aria-label="Add a note"
      @click="openAddNoteDialog()">
      <i class="fa-solid fa-plus"></i>
    </button>
  </div>
  <div id="layout">
    <div v-if="!isLocked" id="sidebar" class="bg-default" ref="sidebar">
      <nav>
        <div v-if="new Date().getMonth() === 11" class="row">
          <img src="./assets/img/christmas.png" role="presentation" alt="" class="event-image" loading="lazy">
        </div>
        <div v-else-if="new Date().getMonth() === 9 && new Date().getDate() > 24 && new Date().getDate() <= 31"
          class="row">
          <img src="./assets/img/halloween.png" role="presentation" alt="" class="event-image" loading="lazy">
        </div>
        <div class="row nav-buttons">
          <button v-if="isAuthenticated && !isLocked" type="button" aria-label="Manage account"
            @click="openManageAccountDialog()">
            <i class="fa-solid fa-circle-user"></i>
            <span>Manage account</span>
          </button>
          <button v-if="(!isAuthenticated && isAuthenticatedResponse) && !isLocked" type="button" aria-label="Log in"
            @click="openLoginDialog()">
            <i class="fa-solid fa-circle-user"></i>
            <span>Log in</span>
          </button>
          <button type="button" aria-label="Change app color" @click="openColorPickerDialog()">
            <i class="fa-solid fa-palette"></i>
            <span>Palette</span>
          </button>
          <button v-if="!isLocked" type="button" aria-label="Settings" @click="openSettingsDialog()">
            <i class="fa-solid fa-gear"></i>
            <span>Settings</span>
          </button>
        </div>
        <div class="d-flex justify-content-between align-items-center">
          <p class="bold">
            Notes
            ({{ filteredNotes.length }})
          </p>
          <button v-if="!isLocked" type="button" class="btn-small" aria-label="Sort notes" @click="openSortDialog()">
            <i class="fa-solid fa-arrow-up-wide-short"></i>
          </button>
        </div>
        <div id="list-notes" ref="listNotes">
          <button v-for="note in filteredNotes" :key="note.id" type="button" @click="toggleFullscreen(note.id, $event)">
            <div class="d-flex flex-column align-items-start">
              <span v-if="note.pinned" class="title">
                <i class="fa-solid fa-thumbtack"></i>
              </span>
              <span v-if="note.link" class="title">
                <i class="fa-solid fa-link"></i>
              </span>
              <span class="title">{{ note.title }}</span>
            </div>
            <div class="d-flex flex-column align-items-start">
              <span v-if="note.category" class="badge bg-default">
                #{{ note.category }}
              </span>
              <span class="sub-title">{{ formatDate(note.date) }}</span>
            </div>
          </button>
        </div>
      </nav>
    </div>
    <main :class="noteLinkInUrl ? 'shared-main' : ''">
      <div class="error-notification d-none"></div>
      <div id="success-notification" aria-live="polite" class="d-none"></div>
      <dialog id="sort-dialog" aria-modal="true">
        <div class="popup">
          <div class="content">
            <div class="popup-header">
              <div class="close">
                <button type="button" aria-label="Close dialog" class="bg-default" @click="closeDialog($event)">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
              </div>
            </div>
            <fieldset>
              <legend>Sort notes</legend>
              <label class="custom-check">
                <input type="radio" name="sort-notes" value="1" v-model="sortOption">
                <span class="bg-default">Modification date</span>
              </label>
              <label class="custom-check">
                <input type="radio" name="sort-notes" value="2" v-model="sortOption">
                <span class="bg-default">Modification date (Z-A)</span>
              </label>
              <label class="custom-check">
                <input type="radio" name="sort-notes" value="3" v-model="sortOption">
                <span class="bg-default">Title (A-Z)</span>
              </label>
              <label class="custom-check">
                <input type="radio" name="sort-notes" value="4" v-model="sortOption">
                <span class="bg-default">Title (Z-A)</span>
              </label>
            </fieldset>
          </div>
        </div>
      </dialog>
      <dialog id="delete-note-dialog" aria-modal="true">
        <div class="popup">
          <div class="content">
            <div class="popup-header">
              <div class="close">
                <button type="button" aria-label="Close dialog" class="bg-default" @click="closeDialog($event)">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
              </div>
            </div>
            <form @submit.prevent="isAuthenticated ? deleteCloudNote() : deleteLocalNote()">
              <div class="error-notification d-none"></div>
              <div class="row txt-small">
                <i class="fa-solid fa-circle-info" role="none"></i>
                <span>Deletion is permanent!</span>
              </div>
              <div class="row">
                <button type="submit" class="btn-cancel w-100">Delete note</button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
      <dialog id="category-dialog" aria-modal="true">
        <div class="popup">
          <div class="content">
            <div class="popup-header">
              <div class="close">
                <button type="button" aria-label="Close dialog" class="bg-default" @click="closeDialog($event)">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
              </div>
            </div>
            <div class="row">
              <label class="custom-check">
                <input type="radio" name="add-cat" value="" v-model="selectedCategory">
                <span class="bg-default">
                  <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                </span>
              </label>
              <label v-for="category in allCategories" :key="category" class="custom-check">
                <input type="radio" name="add-cat" :value="category" v-model="selectedCategory">
                <span class="bg-default">{{ category }}</span>
              </label>
            </div>
            <div class="row">
              <form @submit.prevent="createCategory()">
                <div class="error-notification d-none"></div>
                <div class="row">
                  <input type="text" v-model="newCategory" placeholder="Category name" id="category-name" maxlength="30"
                    aria-label="Name" required>
                </div>
                <button type="submit" class="w-100 bg-default">Create category</button>
              </form>
            </div>
          </div>
        </div>
      </dialog>
      <dialog id="reminder-dialog" aria-modal="true">
        <div class="popup">
          <div class="content">
            <div class="popup-header">
              <div class="close">
                <button type="button" aria-label="Close dialog" class="bg-default" @click="closeDialog($event)">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
              </div>
            </div>
            <div class="row bold">
              Reminder date
            </div>
            <div class="row">
              <input type="datetime-local" v-model="reminderNote" aria-label="Date">
            </div>
          </div>
        </div>
      </dialog>
      <dialog id="add-note-dialog" aria-modal="true" ref="addNoteDialog">
        <div class="popup">
          <div class="content">
            <form @submit.prevent="isAuthenticated ? addCloudNote() : addLocalNote()">
              <div class="popup-header">
                <div class="close">
                  <button type="button" aria-label="Close dialog" class="bg-default" @click="closeDialog($event)">
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                </div>
                <div class="done">
                  <button type="submit" id="submit-note-btn" aria-label="Save note" :disabled="isBtnDisabled">
                    <i class="fa-solid fa-check"></i>
                    Done
                  </button>
                </div>
              </div>
              <div class="error-notification d-none"></div>
              <input type="text" v-model="titleNote" maxlength="30" aria-label="Title" id="note-title"
                placeholder="Title" autofocus required>
              <div ref="editor" class="editor"></div>
              <div class="row d-flex justify-content-between">
                <div>
                  <button type="button" class="btn-small bg-default" aria-label="Add a category"
                    @click="openCatDialog()">
                    <i class="fa-solid fa-tags"></i>
                  </button>
                  <button type="button" class="btn-small bg-default" aria-label="Add a reminder"
                    @click="openReminderDialog()">
                    <i class="fa-solid fa-bell"></i>
                  </button>
                </div>
                <div>
                  <span id="textarea-length">
                    {{ noteContentLength }}/{{ maxNoteContentLength }}
                  </span>
                  <button type="button" @click="clearNoteContent()" aria-label="Clear all content" class="btn-clear">
                    <i class="fa-solid fa-broom"></i>
                  </button>
                </div>
              </div>
              <div class="row">
                <div id="colors-section">
                  <button v-for="color in allColors" :key="color" type="button" class="btn-color"
                    :class="[color, { selected: selectedColor === color }]" :aria-label="color"
                    @click="selectColor(color)"></button>
                </div>
              </div>
              <div class="row d-flex align-items-center">
                <span>
                  Hide content
                </span>
                <label class="switch">
                  <input type="checkbox" v-model="hiddenNote" class="checkbox" role="switch" aria-label="Hide content">
                  <span class="toggle-thumb" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" class="off">
                      <rect x="12" y="6" width="1" height="12" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" class="on">
                      <circle cx="12" cy="12" r="5" stroke-width="1" fill="none" />
                    </svg>
                  </span>
                </label>
              </div>
            </form>
          </div>
        </div>
      </dialog>
      <dialog id="colorpicker-dialog" aria-modal="true">
        <div class="popup popup-small">
          <div class="content">
            <div class="popup-header">
              <div class="close">
                <button type="button" aria-label="Close dialog" class="bg-default" @click="closeDialog($event)">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
              </div>
            </div>
            <div class="row bold">
              Change theme
            </div>
            <IroJs />
          </div>
        </div>
      </dialog>
      <dialog id="settings-dialog" aria-modal="true">
        <div class="popup popup-small">
          <div class="content">
            <div class="popup-header">
              <div class="close">
                <button type="button" aria-label="Close dialog" class="bg-default" @click="closeDialog($event)">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
              </div>
            </div>
            <div class="error-notification d-none"></div>
            <div class="row">
              <a href="https://leoseguin.fr/mentionslegales/" rel="noopener noreferrer">Legal notice / privacy</a>
            </div>
            <div class="row">
              <a href="https://github.com/seguinleo/Notida/wiki/Markdown" rel="noopener noreferrer">Markdown guide</a>
            </div>
            <div class="row">
              <a href="https://github.com/seguinleo/Notida/wiki/Shortcuts" rel="noopener noreferrer">Shortcuts</a>
            </div>
            <div class="row">
              <a href="https://github.com/seguinleo/Notida/discussions" rel="noopener noreferrer">Help and
                discussions</a>
            </div>
            <div class="row d-flex align-items-center justify-content-between">
              <span>
                Lock app
              </span>
              <label class="switch">
                <input v-model="isToggleLockApp" type="checkbox" class="checkbox" @click="toggleLockApp()" role="switch"
                  aria-label="Lock app">
                <span class="toggle-thumb" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" class="off">
                    <rect x="12" y="6" width="1" height="12" />
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" class="on">
                    <circle cx="12" cy="12" r="5" stroke-width="1" fill="none" />
                  </svg>
                </span>
              </label>
            </div>
            <div class="row">
              <p class="version">
                GPL-3.0 &copy;
                <a href="https://github.com/seguinleo/Notida/" rel="noopener noreferrer">v26.6.2</a>
              </p>
            </div>
          </div>
        </div>
      </dialog>
      <template v-if="(isAuthenticated && isAuthenticatedResponse) && !isLocked">
        <dialog id="manage-dialog" aria-modal="true">
          <div class="popup">
            <div class="content">
              <div class="popup-header">
                <div class="close">
                  <button type="button" aria-label="Close dialog" class="bg-default" @click="closeDialog($event)">
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                </div>
              </div>
              <div class="row bold">
                {{ username }}
              </div>
              <div class="row txt-small">
                <span>Last login: </span>
                <span>{{ lastLoginDate }}</span>
              </div>
              <div class="row">
                <button type="button" class="w-100 bg-default" @click="fetchLogout()">Log out</button>
              </div>
              <div class="row">
                <button type="button" class="w-100 bg-default" @click="fetchLogoutAll()">
                  Log out from all devices
                  ({{ allUserSessions }})
                </button>
              </div>
              <div class="row">
                <span>{{ allUserNotes.length }} / {{ maxNotesPerUser }} notes</span>
                <progress :max="maxNotesPerUser" :value="allUserNotes.length"></progress>
              </div>
              <div class="row bold">
                Update password
              </div>
              <div class="row">
                <form @submit.prevent="updatePassword()">
                  <div class="error-notification d-none"></div>
                  <div class="row">
                    <input id="old-psswd" type="password" minlength="10" maxlength="64" aria-label="Old password"
                      placeholder="Old password" required>
                  </div>
                  <div class="row">
                    <input id="new-psswd" type="password" minlength="10" maxlength="64" aria-label="New password"
                      placeholder="New password" required>
                  </div>
                  <div class="row">
                    <input id="new-psswd-valid" type="password" minlength="10" maxlength="64"
                      placeholder="Confirm new password" aria-label="Confirm new password" required>
                  </div>
                  <button type="submit" class="w-100 bg-default">Update password</button>
                </form>
              </div>
              <div class="row bold">
                Delete account
              </div>
              <div class="row">
                <form @submit.prevent="deleteAccount()">
                  <div class="error-notification d-none"></div>
                  <div class="row">
                    <input id="delete-psswd" type="password" minlength="10" maxlength="64" placeholder="Password"
                      aria-label="Password" required>
                  </div>
                  <div class="row txt-small">
                    <i class="fa-solid fa-circle-info" role="none"></i>
                    <span>Deletion is permanent! All notes will be deleted.</span>
                  </div>
                  <button type="submit" class="btn-cancel w-100">Delete account</button>
                </form>
              </div>
            </div>
          </div>
        </dialog>
        <dialog id="private-note-dialog" aria-modal="true">
          <div class="popup">
            <div class="content">
              <div class="popup-header">
                <div class="close">
                  <button type="button" aria-label="Close dialog" class="bg-default" @click="closeDialog($event)">
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                </div>
              </div>
              <form @submit.prevent="publicNote()">
                <div class="error-notification d-none"></div>
                <div class="row txt-small">
                  <i class="fa-solid fa-circle-info" role="none"></i>
                  <span>Making your note public generates a random link to share it.</span>
                </div>
                <div class="row">
                  <button type="submit" class="w-100 bg-default">Make public</button>
                </div>
              </form>
            </div>
          </div>
        </dialog>
        <dialog id="public-note-dialog" aria-modal="true">
          <div class="popup">
            <div class="content">
              <div class="popup-header">
                <div class="close">
                  <button type="button" aria-label="Close dialog" class="bg-default" @click="closeDialog($event)">
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                </div>
              </div>
              <div class="row d-flex">
                <p id="public-note-link" class="bg-default">{{ noteLink }}</p>
                <button type="button" class="btn-small bg-default" aria-label="Copy link" @click="copySharedNoteLink()">
                  <i class="fa-solid fa-clipboard"></i>
                </button>
              </div>
              <form @submit.prevent="privateNote()">
                <div class="error-notification d-none"></div>
                <div class="row txt-small">
                  <i class="fa-solid fa-circle-info" role="none"></i>
                  <span>Making your note private removes the link.</span>
                </div>
                <div class="row">
                  <button type="submit" class="btn-cancel w-100">Make private</button>
                </div>
              </form>
            </div>
          </div>
        </dialog>
        <dialog id="note-historic-dialog" aria-modal="true">
          <div class="popup">
            <div class="content">
              <div class="popup-header">
                <div class="close">
                  <button type="button" aria-label="Close dialog" class="bg-default" @click="closeDialog($event)">
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                </div>
              </div>
              <div class="row bold">
                Last note version
              </div>
              <div class="row">
                <p id="note-historic-content"></p>
              </div>
            </div>
          </div>
        </dialog>
      </template>
      <template v-else-if="isAuthenticatedResponse && !isLocked">
        <dialog id="login-dialog" aria-modal="true">
          <div class="popup">
            <div class="content">
              <div class="popup-header">
                <div class="close">
                  <button type="button" aria-label="Close dialog" class="bg-default" @click="closeDialog($event)">
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                </div>
              </div>
              <form autocomplete="off" @submit.prevent="loginUser()">
                <div class="error-notification d-none"></div>
                <div class="row">
                  <input id="name-login" type="text" minlength="3" maxlength="30" spellcheck="false" placeholder="Name"
                    autocapitalize="off" aria-label="Name" required>
                </div>
                <div class="row">
                  <input id="psswd-login" type="password" minlength="10" maxlength="64" placeholder="Password"
                    aria-label="Password" required>
                </div>
                <div class="row">
                  <button type="submit" class="w-100 bg-default" :disabled="isBtnDisabled">Log in</button>
                </div>
                <div class="row align-center">
                  <button type="button" class="w-100 bg-default" @click="openCreateAccountDialog()">Don't have an
                    account yet?</button>
                </div>
              </form>
            </div>
          </div>
        </dialog>
        <dialog id="create-account-dialog" aria-modal="true">
          <div class="popup">
            <div class="content">
              <div class="popup-header">
                <div class="close">
                  <button type="button" aria-label="Close dialog" class="bg-default" @click="closeDialog($event)">
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                </div>
              </div>
              <form autocomplete="off" @submit.prevent="createAccount()">
                <div class="error-notification d-none"></div>
                <div class="row">
                  <input id="name-create" type="text" minlength="3" maxlength="30" spellcheck="false"
                    autocapitalize="off" placeholder="Name" aria-label="Name" required>
                </div>
                <div class="row">
                  <input id="psswd-create" type="password" minlength="10" maxlength="64" placeholder="Password"
                    aria-label="Password" required>
                </div>
                <div class="row">
                  <input id="psswd-create-valid" type="password" minlength="10" maxlength="64"
                    placeholder="Confirm password" aria-label="Confirm password" required>
                </div>
                <div class="row">
                  <i class="fa-solid fa-circle-info" role="none"></i>
                  <span>Your password is stored securely and your notes are encrypted. You will not be able to recover
                    your password if you forget it. Save your local notes before log in!</span>
                </div>
                <div class="row">
                  <button type="submit" class="w-100 bg-default">Create my account</button>
                </div>
              </form>
            </div>
          </div>
        </dialog>
        <div v-if="allUserNotes.length === 0" class="welcome">
          <div class="details">
            <h1 class="align-center">
              <span>Welcome to Notida!</span>
            </h1>
            <div class="details-content">
              <div>
                <p class="align-center">
                  <img alt="App icon" src="/pwa/apple-touch-icon.png" width="64" height="64">
                </p>
                <p class="align-center italic">
                  A fast, private and secure web notebook.
                </p>
                <p class="align-center">
                  <img alt="License" height="20"
                    src="https://img.shields.io/github/license/seguinleo/Notida?color=8ab4f8">
                  <img alt="Open source" height="20" src="https://img.shields.io/badge/project-open_source-blue">
                </p>
                <h2>📝Features</h2>
                <p>Users can create task lists, reminders, tables, math expressions or code blocks using Markdown, HTML
                  and KaTeX. You can add images, audio or videos via URL and add custom categories to organize your
                  notes.
                </p>
                <p>You can sync your notes across all your devices after logging in (no email address is required, just
                  a
                  username and a strong password). Public notes can be shared with anyone via a random URL.</p>
                <p>This website is a Progressive Web App (PWA) that can be installed as an application. You can fully
                  customize the application's color theme.</p>
                <p>This website is accessible to users with disabilities through high-contrast colors, ARIA modules, and
                  focusable elements.</p>
                <h2>🔒Security</h2>
                <p>The website follows <a href="https://cheatsheetseries.owasp.org/" rel="noopener noreferrer">OWASP
                    security recommendations</a>.
                </p>
                <p>All notes are sanitized and validated through the DOMPurify library. Passwords are hashed using
                  Argon2id. All notes are encrypted with AES-256-GCM.</p>
                <p>Users can lock the app using biometrics (fingerprints, face, etc.). These biometric data are never
                  sent
                  to the server, verification is local and UI/UX only.</p>
                <p>User accounts are deleted 1 year after the last login.</p>
                <h2>🌐Community</h2>
                <p>If you find issues, vulnerabilities or if you have any suggestions to improve this project, feel free
                  to discuss on <a href="https://github.com/seguinleo/Notida/" rel="noopener noreferrer">GitHub</a>!</p>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template v-if="noteLinkInUrl">
        <h1 v-if="sharedNote === null">Note not found or expired.</h1>
        <div v-else class="shared-note">
          <div class="details">
            <h2 class="title">
              {{ sharedNote.title }}
            </h2>
            <div v-if="sharedNote.reminder" class="row align-center">
              <span class="reminder-date bg-default">
                <i class="fa-solid fa-bell"></i>
                {{ formatDate(sharedNote.reminder) }}
              </span>
            </div>
            <div class="details-content">
              <div v-html="sharedNote.contentHtml"></div>
            </div>
          </div>
          <div class="date">
            {{ formatDate(sharedNote.date) }}
          </div>
        </div>
      </template>
      <template v-else>
        <button v-if="isLocked" id="btn-unlock-float" type="button" class="bg-default" aria-label="Unlock app"
          @click="unlockApp()">
          <i class="fa-solid fa-lock"></i>
        </button>
        <template v-else>
          <div v-for="note in filteredNotes" :key="note.id" class="note" :class="[
            note.color,
            { 'hidden-note': note.hidden },
            { 'fullscreen-note': fullscreenNoteId === note.id }
          ]" @click="toggleFullscreen(note.id, $event)">
            <div class="details">
              <h2 class="title">
                {{ note.title }}
              </h2>
              <div v-if="note.reminder" class="row align-center">
                <span class="reminder-date bg-default">
                  <i class="fa-solid fa-bell"></i>
                  {{ formatDate(note.reminder) }}
                </span>
              </div>
              <div class="details-content">
                <div v-if="note.hidden">Hidden note</div>
                <div v-else v-html="note.contentHtml"></div>
              </div>
            </div>
            <div class="date">
              {{ formatDate(note.date) }}
            </div>
            <div class="bottom-content">
              <button type="button" @click.stop="noteActions(note, 'edit-note')" aria-label="Edit note">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button v-if="note.pinned" type="button" @click.stop="noteActions(note, 'pin-note')"
                aria-label="Unpin note">
                <i class="fa-solid fa-thumbtack-slash"></i>
              </button>
              <button v-else type="button" @click.stop="noteActions(note, 'pin-note')" aria-label="Pin note">
                <i class="fa-solid fa-thumbtack"></i>
              </button>
              <button v-if="note.content" type="button" @click.stop="noteActions(note, 'copy-note')"
                aria-label="Copy note">
                <i class="fa-solid fa-clipboard"></i>
              </button>
              <button v-if="!note.link" type="button" @click.stop="noteActions(note, 'delete-note')"
                aria-label="Delete note">
                <i class="fa-solid fa-trash-can"></i>
              </button>
              <button v-if="isAuthenticated && note.content" type="button" @click.stop="noteActions(note, 'share-note')"
                aria-label="Share note">
                <i class="fa-solid fa-link"></i>
              </button>
              <button v-if="isAuthenticated && note.historic" type="button"
                @click.stop="noteActions(note, 'historic-note')" aria-label="Show note historic">
                <i class="fa-solid fa-clock-rotate-left"></i>
              </button>
            </div>
          </div>
        </template>
      </template>
    </main>
  </div>
</template>

<script>
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import IroJs from './components/IroJs.vue'
import markedKatex from 'marked-katex-extension'
import 'katex/dist/katex.min.css'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { gfmHeadingId } from 'marked-gfm-heading-id'
import { diffWords } from 'diff'
import '@fortawesome/fontawesome-free/css/fontawesome.min.css'
import '@fortawesome/fontawesome-free/css/solid.min.css'

const MARKED_CONFIG = {
  breaks: true,
  renderer: {
    checkbox({ checked }) {
      if (checked) return '<span class="task-list task-checked">✅ '
      else return '<span class="task-list">⬜ '
    }
  }
}

const PURIFY_CONFIG = {
  SANITIZE_NAMED_PROPS: true,
  FORBID_TAGS: ['button', 'dialog', 'footer', 'form', 'header', 'iframe', 'input', 'main', 'nav', 'script', 'style'],
}

const KATEX_CONFIG = {
  throwOnError: false
}

const DATE_OPTIONS = {
  weekday: 'short',
  year: '2-digit',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
}

marked.use(MARKED_CONFIG, markedKatex(KATEX_CONFIG), gfmHeadingId())

export default {
  data() {
    return {
      username: '',
      touchstartX: 0,
      touchendX: 0,
      touchstartY: 0,
      touchendY: 0,
      timeoutNotification: null,
      fingerprintEnabled: true,
      onLine: true,
      isToggleLockApp: true,
      isLocked: true,
      isAuthenticated: false,
      isAuthenticatedResponse: false,
      isNoteUpdate: false,
      maxNotesPerUser: 0,
      maxNoteContentLength: 50000,
      noteContentLength: 0,
      allUserNotes: [],
      allUserSessions: 0,
      allCategories: new Set(),
      newCategory: '',
      allColors: [
        'bg-default', 'bg-red', 'bg-orange', 'bg-yellow', 'bg-lime', 'bg-green',
        'bg-cyan', 'bg-light-blue', 'bg-blue', 'bg-purple', 'bg-pink'
      ],
      isBtnDisabled: false,
      sortOption: '1',
      lastLoginDate: '',
      titleNote: '',
      currentNoteId: null,
      fullscreenNoteId: null,
      selectedCategory: '',
      selectedColor: 'bg-default',
      hiddenNote: false,
      reminderNote: '',
      searchValue: '',
      localDbName: 'notes_db',
      localDbKeyName: 'key',
      localDbKey: null,
      csrfToken: null,
      urlParams: '',
      noteLink: '',
      noteLinkInUrl: '',
      sharedNote: null
    }
  },
  components: { IroJs },
  watch: {
    async sortOption() {
      if (!['1', '2', '3', '4'].includes(this.sortOption)) return
      if (this.sortOption === '1') localStorage.removeItem('sort_notes')
      else localStorage.setItem('sort_notes', this.sortOption)
      if (this.isAuthenticated) await this.getCloudNotes()
      else await this.getLocalNotes()
    },
  },
  computed: {
    filteredNotes() {
      const search = this.searchValue.trim().toLowerCase()

      if (!search) return this.allUserNotes

      return this.allUserNotes.filter(note => {
        const title = (note.title || '').toLowerCase()
        const content = (note.content || '').toLowerCase()

        return (
          title.includes(search) ||
          content.includes(search)
        )
      })
    }
  },
  async mounted() {
    this.urlParams = new URLSearchParams(window.location.search)
    if (this.urlParams && this.urlParams.get('link')) {
      await this.renderSharedNote()
      return
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .catch(err => console.warn('PWA registration failed:', err))
    }

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key.toUpperCase() === 'K') {
        e.preventDefault()
        document.querySelector('#search-input').focus()
      } else if (e.altKey && e.shiftKey && e.key.toUpperCase() === 'N') {
        e.preventDefault()
        document.querySelector('#btn-add-note').click()
      }
    })

    document.addEventListener('touchstart', (e) => {
      this.touchstartX = e.changedTouches[0].screenX
      this.touchstartY = e.changedTouches[0].screenY
    }, { passive: true })

    document.addEventListener('touchend', (e) => {
      if (this.isLocked) return
      if (window.getSelection().toString()) return
      this.touchendX = e.changedTouches[0].screenX
      this.touchendY = e.changedTouches[0].screenY
      if (this.touchstartY - this.touchendY > 50 || this.touchendY - this.touchstartY > 50) return
      if (this.touchendX - this.touchstartX > 35) {
        this.openSidebar()
      } else if (this.touchstartX - this.touchendX > 35) {
        this.closeSidebar()
      }
    }, { passive: true })

    this.initEditor()

    this.onLine = navigator.onLine

    this._onlineHandler = () => {
      this.onLine = true
      this.handleOnline()
    }

    this._offlineHandler = () => {
      this.onLine = false
    }

    window.addEventListener('online', this._onlineHandler)
    window.addEventListener('offline', this._offlineHandler)

    if (this.onLine) {
      await this.handleOnline()
    }
  },
  beforeUnmount() {
    window.removeEventListener('online', this._onlineHandler)
    window.removeEventListener('offline', this._offlineHandler)
  },
  methods: {
    initEditor() {
      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const value = update.state.doc.toString()
          this.noteContentLength = value.length
          this.editor.dom.style.transform = 'translateZ(0)'
          this.editor.dom.offsetHeight
          this.editor.dom.style.transform = ''
        }
      })
      const state = EditorState.create({
        doc: '',
        extensions: [
          placeholder('Content (Markdown, KaTeX or HTML)'),
          history(),
          markdown(),
          oneDark,
          EditorView.lineWrapping,
          highlightSelectionMatches(),
          keymap.of([
            indentWithTab,
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap
          ]),
          updateListener
        ]
      })
      this.editor = new EditorView({
        state,
        parent: this.$refs.editor
      })
    },
    async handleOnline() {
      if (this.urlParams?.get('link')) {
        await this.renderSharedNote()
        return
      }

      await this.getLockApp()
      if (this.isLocked) return

      await this.isUserAuthenticated()

      if (this.isAuthenticated) {
        await this.getCloudNotes()
      } else {
        await this.getLocalNotes()
      }
    },
    arrayBufferToBase64(buffer) {
      return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    },
    base64ToArrayBuffer(base64) {
      const binaryString = atob(base64)
      return Uint8Array.from(binaryString, c => c.charCodeAt(0)).buffer
    },
    openIndexedDB(dbName, objectStoreName) {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1)
        request.onupgradeneeded = (event) => {
          const db = event.target.result
          if (!db.objectStoreNames.contains(objectStoreName)) db.createObjectStore(objectStoreName)
        }
        request.onsuccess = (event) => resolve(event.target.result)
        request.onerror = (event) => reject(event.target.error)
      })
    },
    async getKeyFromDB(db, objectStoreName) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(objectStoreName, 'readonly')
        const objectStore = transaction.objectStore(objectStoreName)
        const request = objectStore.get('encryptionKey')
        request.onsuccess = (event) => resolve(event.target.result)
        request.onerror = (event) => reject(event.target.error)
      })
    },
    async storeKeyInDB(db, objectStoreName, key) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(objectStoreName, 'readwrite')
        const objectStore = transaction.objectStore(objectStoreName)
        objectStore.put(key, 'encryptionKey')
        transaction.oncomplete = () => resolve()
        transaction.onerror = (event) => reject(event.target.error)
      })
    },
    generateIv() {
      return crypto.getRandomValues(new Uint8Array(12))
    },
    async encryptLocalNotes(key, data) {
      const iv = this.generateIv()
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(JSON.stringify(data))
      )
      return {
        iv: this.arrayBufferToBase64(iv),
        data: this.arrayBufferToBase64(encrypted),
      }
    },
    async decryptLocalNotes(key, payload) {
      try {
        const iv = this.base64ToArrayBuffer(payload.iv)
        const data = this.base64ToArrayBuffer(payload.data)
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: new Uint8Array(iv) },
          key,
          data
        )
        return JSON.parse(new TextDecoder().decode(decrypted))
      } catch (err) {
        this.showError(`An error occurred while decrypting the notes - ${err}`)
        return null
      }
    },
    getNoteById(id) {
      return this.allUserNotes.find(n => n.id === id)
    },
    formatDate(date) {
      return new Date(date).toLocaleString(undefined, DATE_OPTIONS)
    },
    closeDialog(e) {
      const dialog = e.target.closest('dialog')
      if (['category-dialog', 'reminder-dialog'].includes(dialog.id)) {
        dialog.close()
        return
      }
      this.editor.dispatch({
        changes: {
          from: 0,
          to: this.editor.state.doc.length,
          insert: ''
        },
        selection: { anchor: 0 }
      })
      this.isNoteUpdate = false
      this.currentNoteId = null
      this.titleNote = ''
      this.hiddenNote = false
      this.selectedColor = 'bg-default'
      this.selectedCategory = ''
      this.reminderNote = ''
      dialog.close()
    },
    async getLockApp() {
      try {
        const lockApp = localStorage.getItem('lockApp') === 'true'
        this.isToggleLockApp = lockApp
        this.fingerprintEnabled = lockApp
        this.isLocked = lockApp
      } catch (err) {
        this.showError(`An error occurred - ${err}`)
      }
    },
    async toggleLockApp() {
      if (this.isLocked) return

      let success

      if (this.fingerprintEnabled) {
        success = await this.verifyFingerprint()
        if (!success) {
          this.isToggleLockApp = true
          return
        }

        this.fingerprintEnabled = false
        this.isToggleLockApp = false
        localStorage.setItem('lockApp', 'false')

      } else {
        success = await this.createFingerprint()
        if (!success) {
          this.isToggleLockApp = false
          return
        }

        this.fingerprintEnabled = true
        this.isToggleLockApp = true
        localStorage.setItem('lockApp', 'true')
      }
    },
    async unlockApp() {
      const success = await this.verifyFingerprint()
      if (!success) return

      this.isLocked = false

      const lockApp = localStorage.getItem('lockApp') === 'true'
      this.fingerprintEnabled = lockApp
      this.isToggleLockApp = lockApp

      await this.isUserAuthenticated()

      if (this.isAuthenticated) {
        await this.getCloudNotes()
      } else {
        await this.getLocalNotes()
      }
    },
    async verifyFingerprint() {
      const credId = localStorage.getItem('webauth_cred_id')
      if (!credId) return false

      try {
        await navigator.credentials.get({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            allowCredentials: [{
              id: this.base64ToArrayBuffer(credId),
              type: 'public-key',
            }],
            userVerification: 'required',
            timeout: 60000,
          },
        })
        return true
      } catch (err) {
        this.showError(`An error occurred - ${err}`)
        return false
      }
    },
    async createFingerprint() {
      try {
        const challenge = crypto.getRandomValues(new Uint8Array(32))
        const userId = crypto.getRandomValues(new Uint8Array(16))

        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: 'Notida' },
            user: {
              id: userId,
              name: this.username || 'local-user',
              displayName: this.username || 'Local User',
            },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
            },
            timeout: 60000,
            attestation: 'none',
          },
        })

        localStorage.setItem(
          'webauth_cred_id',
          this.arrayBufferToBase64(credential.rawId)
        )

        this.fingerprintEnabled = true
        this.isLocked = false
        return true
      } catch (err) {
        this.showError(`An error occurred - ${err}`)
        this.isToggleLockApp = false
        return false
      }
    },
    async createAccount() {
      if (this.isLocked) return
      const name = document.querySelector('#name-create').value.trim()
      const psswd = document.querySelector('#psswd-create').value
      const psswdV = document.querySelector('#psswd-create-valid').value
      if (!name || !psswd || !psswdV || name.length < 3 || name.length > 30 || psswd.length < 10 || psswd.length > 64) return
      if (!/^[\p{L} -]+$/u.test(name.normalize('NFKC'))) {
        this.showError('Name can only contain letters, spaces and accents...')
        return
      }
      if (psswd !== psswdV) {
        this.showError('Passwords do not match...')
        return
      }
      if (name === psswd) {
        this.showError('Username and password cannot be the same...')
        return
      }
      const nameCreate = name
      const psswdCreate = psswd
      try {
        const data = JSON.stringify({ nameCreate, psswdCreate })
        const res = await fetch('api/create-account/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: data
        })
        if (!res.ok) {
          this.showError('Username already taken...')
          return
        }
        document.querySelector('#create-account-dialog').close()
        this.showSuccess('Account successfully created! You can now log in.')
      } catch (err) {
        this.showError(`An error occurred - ${err}`)
      } finally {
        document.querySelector('#psswd-create').value = ''
        document.querySelector('#psswd-create-valid').value = ''
      }
    },
    async loginUser() {
      if (this.isLocked) return
      const nameLogin = document.querySelector('#name-login').value.trim()
      const psswdLogin = document.querySelector('#psswd-login').value
      if (
        nameLogin.length < 3 ||
        nameLogin.length > 30 ||
        psswdLogin.length < 10 ||
        psswdLogin.length > 64
      ) return
      if (!/^[\p{L} -]+$/u.test(nameLogin.normalize('NFKC'))) {
        this.showError('Name can only contain letters, spaces and accents...')
        return
      }
      try {
        const data = JSON.stringify({ nameLogin, psswdLogin })
        const res = await fetch('api/login/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: data
        })
        if (!res.ok) {
          this.isBtnDisabled = true
          document.querySelector('#psswd-login').value = ''
          const errorMessage = await res.text()
          this.showError(errorMessage)
          setTimeout(() => {
            this.isBtnDisabled = false
          }, 7000)
          return
        }
        window.location.reload()
      } catch (err) {
        this.showError(`An error occurred - ${err}`)
      }
    },
    async fetchLogout() {
      try {
        const res = await fetch('api/logout/', {
          method: 'POST',
          headers: {
            'x-csrf-token': this.csrfToken
          }
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        window.location.reload()
      } catch (err) {
        this.showError(`An error occurred - ${err}`)
      }
    },
    async fetchLogoutAll() {
      try {
        const res = await fetch('api/logout-all/', {
          method: 'POST',
          headers: {
            'x-csrf-token': this.csrfToken
          }
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        window.location.reload()
      } catch (err) {
        this.showError(`An error occurred - ${err}`)
      }
    },
    async updatePassword() {
      if (this.isLocked) return
      const a = document.querySelector('#old-psswd').value
      const e = document.querySelector('#new-psswd').value
      const t = document.querySelector('#new-psswd-valid').value
      if (!a || !e || !t || e.length < 10 || e.length > 64) return
      if (e !== t) {
        this.showError('Passwords do not match...')
        return
      }
      const psswdOld = a
      const psswdNew = e
      try {
        const data = JSON.stringify({ psswdOld, psswdNew })
        const res = await fetch('api/update-password/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': this.csrfToken
          },
          body: data
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        window.location.reload()
      } catch (err) {
        this.showError(`An error occurred - ${err}`)
      } finally {
        document.querySelector('#old-psswd').value = ''
        document.querySelector('#new-psswd').value = ''
        document.querySelector('#new-psswd-valid').value = ''
      }
    },
    async deleteAccount() {
      if (this.isLocked) return
      const psswd = document.querySelector('#delete-psswd').value
      if (!psswd || psswd.length < 10 || psswd.length > 64) return
      try {
        const data = JSON.stringify({ psswd })
        const res = await fetch('api/delete-account/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': this.csrfToken
          },
          body: data
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        window.location.reload()
      } catch (err) {
        this.showError(`An error occurred - ${err}`)
      } finally {
        document.querySelector('#delete-psswd').value = ''
      }
    },
    async isUserAuthenticated() {
      try {
        const res = await fetch('api/whoami', {
          method: 'GET'
        })
        if (res.status === 404) {
          this.showError('Internal server error')
          return
        }
        if (!res.ok) {
          const error = await res.json()
          this.showError(error.message)
          return
        }
        const data = await res.json()
        this.isAuthenticated = data.isAuthenticated
        this.csrfToken = data.csrfToken
        this.isAuthenticatedResponse = true
      } catch (err) {
        this.showError(`An error occurred - ${err}`)
      }
    },
    async noteActions(note, action) {
      if (action === 'edit-note') {
        return this.openUpdateNoteDialog(
          note.id,
          note.title,
          note.content,
          note.color,
          note.hidden,
          note.category ?? '',
          note.reminder ?? ''
        )
      }

      if (action === 'pin-note') {
        return this.isAuthenticated
          ? this.pinCloudNote(note.id)
          : this.pinLocalNote(note.id)
      }

      if (action === 'copy-note') return this.copy(note.content)

      if (action === 'delete-note') return this.openDeleteNoteDialog(note.id)

      if (action === 'share-note') return this.shareNote(note.id, note.link)

      if (action === 'historic-note') return this.openNoteHistoricDialog(note.id, note.content, note.historic)
    },
    async normalizeNote(row) {
      const {
        id, title, content, color, date,
        hidden, category, pinned, link, reminder, historic
      } = row

      if (!id || !title || !color || !date) return null

      let deTitle = title
      let deContent = content

      if (!this.isAuthenticated && title?.iv) {
        deTitle = await this.decryptLocalNotes(this.localDbKey, title)
      }

      if (content && !this.isAuthenticated && content?.iv) {
        deContent = await this.decryptLocalNotes(this.localDbKey, content)
      }

      const contentHtml = !hidden && deContent
        ? DOMPurify.sanitize(marked.parse(deContent), PURIFY_CONFIG)
        : null

      return {
        id,
        title: deTitle,
        contentHtml,
        content: deContent,
        color,
        date,
        hidden,
        category,
        pinned,
        link,
        reminder,
        historic
      }
    },
    async getLocalNotes() {
      if (this.isLocked) return

      this.currentNoteId = null
      this.sortOption = localStorage.getItem('sort_notes') || '1'

      const localNotes = JSON.parse(localStorage.getItem('local_notes')) || []

      if (localNotes.length === 0) return

      this.allCategories = new Set(localNotes.map(n => n.category).filter(Boolean))

      try {
        const db = await this.openIndexedDB(this.localDbName, this.localDbKeyName)
        this.localDbKey = await this.getKeyFromDB(db, this.localDbKeyName)

        const normalized = await Promise.all(
          localNotes.map(n => this.normalizeNote(n))
        )

        this.allUserNotes = normalized.filter(Boolean)

        this.allUserNotes.sort((a, b) => {
          if (a.pinned === 1 && b.pinned === 0) return -1
          if (a.pinned === 0 && b.pinned === 1) return 1

          switch (this.sortOption) {
            case '1': return b.date.localeCompare(a.date)
            case '2': return a.date.localeCompare(b.date)
            case '3':
              return (a.title).localeCompare(b.title)
            case '4':
              return (b.title).localeCompare(a.title)
            default: break
          }
        })
      } catch (err) {
        this.showError(`An error occurred - ${err}`)
      }
    },
    async addLocalNote() {
      try {
        if (this.isLocked) return
        const noteId = this.currentNoteId
        const title = this.titleNote.trim()
        const content = this.editor.state.doc.toString().trim()
        const color = this.selectedColor || 'bg-default'
        const date = new Date().toISOString().slice(0, 19).replace('T', ' ')
        const hidden = this.hiddenNote ? 1 : 0
        const category = this.selectedCategory || null
        const reminder = this.reminderNote || null

        if (this.isNoteUpdate && !noteId) return
        else if (!this.isNoteUpdate && noteId) return

        if (!title || title.length > 30 || content.length > this.maxNoteContentLength) {
          this.showError(`Content max length is ${this.maxNoteContentLength} characters.`)
          return
        }
        if (!this.allColors.includes(color)) return
        if (reminder && !new Date(reminder).getTime()) return

        const dbName = 'notes_db'
        const objectStoreName = 'key'
        const db = await this.openIndexedDB(dbName, objectStoreName)
        let key = await this.getKeyFromDB(db, objectStoreName)

        if (!key) {
          key = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt'],
          )
          await this.storeKeyInDB(db, objectStoreName, key)
        }

        const encryptedTitle = await this.encryptLocalNotes(key, title)
        const encryptedContent = await this.encryptLocalNotes(key, content)

        const note = {
          id: crypto.randomUUID(),
          title: encryptedTitle,
          content: encryptedContent,
          color,
          date,
          hidden,
          category,
          reminder,
          pinned: 0,
        }

        if (this.isNoteUpdate) {
          const noteIdToUpdate = this.currentNoteId
          const noteToUpdate = this.getNoteById(noteIdToUpdate)

          if (!noteToUpdate) return
          Object.assign(noteToUpdate, {
            title: note.title,
            content: note.content,
            color: note.color,
            date: note.date,
            hidden: note.hidden,
            category: note.category,
            reminder: note.reminder,
            pinned: note.pinned
          })
        } else this.allUserNotes.push(note)

        localStorage.setItem('local_notes', JSON.stringify(this.allUserNotes))
        this.$refs.addNoteDialog.close()
        await this.getLocalNotes()
      } catch (err) {
        this.showError(`An error occurred - ${err}`)
      }
    },
    async pinLocalNote(noteId) {
      if (!noteId) return
      const pinned = this.getNoteById(noteId).pinned
      const noteIndex = this.allUserNotes.findIndex(note => note.id === noteId)
      if (noteIndex === -1) return
      this.allUserNotes[noteIndex].pinned = pinned ? 0 : 1
      localStorage.setItem('local_notes', JSON.stringify(this.allUserNotes))
      await this.getLocalNotes()
    },
    async deleteLocalNote() {
      const noteId = this.currentNoteId
      if (!noteId) return
      const noteIndex = this.allUserNotes.findIndex(note => note.id === noteId)
      if (noteIndex === -1) return
      this.allUserNotes.splice(noteIndex, 1)
      localStorage.setItem('local_notes', JSON.stringify(this.allUserNotes))
      await this.getLocalNotes()
      document.querySelector('#delete-note-dialog').close()
    },
    async getCloudNotes() {
      if (this.isLocked) return

      this.currentNoteId = null
      this.sortOption = localStorage.getItem('sort_notes') || '1'

      try {
        const res = await fetch('api/get-notes/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': this.csrfToken
          },
        })

        if (!res.ok) throw new Error(`An error occurred - ${res.status}`)

        const response = await res.json()

        this.username = response.name
        this.maxNotesPerUser = response.maxNotesPerUser
        this.maxNoteContentLength = response.maxNoteContentLength
        this.allUserSessions = response.allUserSessions
        this.allUserNotes = response.notes
        this.lastLoginDate = this.formatDate(response.lastLogin)

        if (this.allUserNotes.length === 0) return

        this.allCategories = new Set(this.allUserNotes.map(n => n.category).filter(Boolean))

        const normalized = await Promise.all(
          this.allUserNotes.map(n => this.normalizeNote(n))
        )

        this.allUserNotes = normalized.filter(Boolean)

        this.allUserNotes.sort((a, b) => {
          if (a.pinned === 1 && b.pinned === 0) return -1
          if (a.pinned === 0 && b.pinned === 1) return 1

          switch (this.sortOption) {
            case '1': return b.date.localeCompare(a.date)
            case '2': return a.date.localeCompare(b.date)
            case '3':
              return (a.title).localeCompare(b.title)
            case '4':
              return (b.title).localeCompare(a.title)
            default: break
          }
        })
      } catch (err) {
        this.showError(`An error occurred - ${err}`)
      }
    },
    async addCloudNote() {
      try {
        if (this.allUserNotes.length > this.maxNotesPerUser) {
          this.showError('You have reached the maximum storage capacity...')
          return
        }
        if (this.isLocked) return
        this.isBtnDisabled = true
        const noteId = this.currentNoteId
        const title = this.titleNote.trim()
        const content = this.editor.state.doc.toString().trim()
        const date = new Date().toISOString().slice(0, 19).replace('T', ' ')
        const color = this.selectedColor || 'bg-default'
        const hidden = this.hiddenNote ? 1 : 0
        const category = this.selectedCategory || null
        const reminder = this.reminderNote || null

        if (this.isNoteUpdate && !noteId) return
        else if (!this.isNoteUpdate && noteId) return

        if (!title || title.length > 30 || content.length > this.maxNoteContentLength) {
          this.showError(`Content max length is ${this.maxNoteContentLength} characters.`)
          return
        }
        if (!this.allColors.includes(color)) return
        if (reminder && !new Date(reminder).getTime()) return

        let data = {}

        if (this.isNoteUpdate) {
          data = JSON.stringify({
            noteId,
            title,
            content,
            date,
            color,
            hidden,
            category,
            reminder
          })
        } else {
          data = JSON.stringify({
            title,
            content,
            date,
            color,
            hidden,
            category,
            reminder
          })
        }

        const url = this.isNoteUpdate ? 'api/update-note/' : 'api/add-note/'
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': this.csrfToken
          },
          body: data
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        this.$refs.addNoteDialog.close()
        await this.getCloudNotes()
      } catch (err) {
        this.showError(`An error occurred - ${err}`)
      } finally {
        this.isBtnDisabled = false
      }
    },
    async pinCloudNote(noteId) {
      if (!noteId) return
      try {
        const data = JSON.stringify({ noteId })
        const res = await fetch('api/pin-note/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': this.csrfToken
          },
          body: data
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        await this.getCloudNotes()
      } catch (err) {
        this.showError(`An error occurred - ${err}`)
      }
    },
    async deleteCloudNote() {
      const noteId = this.currentNoteId
      if (!noteId) return
      await this.fetchDeleteNote(noteId)
      document.querySelector('#delete-note-dialog').close()
    },
    async privateNote() {
      const noteId = this.currentNoteId
      if (!noteId) return
      try {
        const data = JSON.stringify({ noteId })
        const res = await fetch('api/private-note/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': this.csrfToken
          },
          body: data
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        document.querySelector('#public-note-dialog').close()
        await this.getCloudNotes()
      } catch (err) {
        this.showError(`An error occurred - ${err}`)
      }
    },
    async publicNote() {
      const noteId = this.currentNoteId
      if (!noteId) return
      try {
        const data = JSON.stringify({ noteId })
        const res = await fetch('api/public-note/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': this.csrfToken
          },
          body: data
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        document.querySelector('#private-note-dialog').close()
        await this.getCloudNotes()
      } catch (err) {
        this.showError(`An error occurred - ${err}`)
      }
    },
    async fetchDeleteNote(noteId) {
      if (!noteId) return
      try {
        const data = JSON.stringify({ noteId })
        const res = await fetch('api/delete-note/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': this.csrfToken
          },
          body: data
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        await this.getCloudNotes()
      } catch (err) {
        this.showError(`An error occurred - ${err}`)
      }
    },
    async renderSharedNote() {
      this.noteLinkInUrl = this.urlParams.get('link')

      if (!this.noteLinkInUrl || !/^[a-f0-9]{32}$/i.test(this.noteLinkInUrl)) {
        return
      }

      const data = JSON.stringify({ noteLink: this.noteLinkInUrl })
      const res = await fetch('api/get-shared-note/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: data
      })

      if (!res.ok) {
        return
      }

      const response = await res.json()

      const { title, date, reminder } = response
      const contentHtml = DOMPurify.sanitize(marked.parse(response.content), PURIFY_CONFIG)

      this.sharedNote = {
        title,
        contentHtml,
        date,
        reminder
      }

      document.title = this.sharedNote.title
    },
    shareNote(noteId, link) {
      if (!noteId) return
      if (link) {
        document.querySelector('#public-note-dialog').showModal()
        this.currentNoteId = noteId
        this.noteLink = link
      } else {
        document.querySelector('#private-note-dialog').showModal()
        this.currentNoteId = noteId
      }
    },
    openSidebar() {
      if (this.isLocked) return
      this.$refs.sidebar.classList.add('show')
    },
    closeSidebar() {
      this.$refs.sidebar.classList.remove('show')
    },
    openCreateAccountDialog() {
      document.querySelector('#login-dialog').close()
      document.querySelector('#create-account-dialog').showModal()
    },
    openDeleteNoteDialog(noteId) {
      document.querySelector('#delete-note-dialog').showModal()
      this.currentNoteId = noteId
    },
    openManageAccountDialog() {
      document.querySelector('#manage-dialog').showModal()
    },
    openLoginDialog() {
      if (!document.querySelector('#login-dialog')) return
      document.querySelector('#login-dialog').showModal()
    },
    openSettingsDialog() {
      document.querySelector('#settings-dialog').showModal()
    },
    openSortDialog() {
      document.querySelector('#sort-dialog').showModal()
    },
    openColorPickerDialog() {
      document.querySelector('#settings-dialog').close()
      document.querySelector('#colorpicker-dialog').showModal()
    },
    openAddNoteDialog() {
      const dialog = this.$refs.addNoteDialog
      dialog.showModal()
      this.isNoteUpdate = false
      this.editor.dispatch({
        changes: {
          from: 0,
          to: this.editor.state.doc.length,
          insert: ''
        },
        selection: { anchor: 0 }
      })
      this.titleNote = ''
      this.selectedColor = 'bg-default'
      this.hiddenNote = false
      this.selectedCategory = ''
      this.reminderNote = ''
    },
    openCatDialog() {
      document.querySelector('#category-dialog').showModal()
    },
    openReminderDialog() {
      document.querySelector('#reminder-dialog').showModal()
    },
    openNoteHistoricDialog(noteId, currentContent, historicContent) {
      if (!noteId || !historicContent) return

      const diff = diffWords(historicContent, currentContent)

      const container = document.querySelector('#note-historic-content')
      container.replaceChildren()

      diff.forEach(part => {
        const node = document.createElement('span')
        node.textContent = part.value

        if (part.added) {
          node.classList.add('diff-added')
        } else if (part.removed) {
          node.classList.add('diff-removed')
        }
        container.appendChild(node)
      })
      document.querySelector('#note-historic-dialog').showModal()
    },
    async openUpdateNoteDialog(noteId, title, content, color, hidden, category, reminder) {
      if (hidden && this.fingerprintEnabled) {
        const res = await this.verifyFingerprint()
        if (!res) return
      }

      if (this.isAuthenticated) {
        const noteLastUpdate = await fetch(`api/get-note-date/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': this.csrfToken
          },
          body: JSON.stringify({ noteId })
        })

        if (!noteLastUpdate.ok) {
          this.showError(`An error occurred - ${noteLastUpdate.status}`)
          return
        }

        const data = await noteLastUpdate.json()

        if (new Date(await data.date) > new Date(this.getNoteById(noteId)?.date)) {
          this.showError('This note has been updated from another session and is not up to date!')
        }
      }

      this.isNoteUpdate = true

      const dialog = this.$refs.addNoteDialog
      dialog.showModal()

      if (!this.editor) return
      this.editor.dispatch({
        changes: {
          from: 0,
          to: this.editor.state.doc.length,
          insert: content ?? ''
        },
        selection: { anchor: 0 },
        scrollIntoView: true
      })
      requestAnimationFrame(() => {
        this.editor.focus()
      })

      this.currentNoteId = noteId
      this.titleNote = title
      this.hiddenNote = Boolean(Number(hidden))
      this.selectedColor = color || 'bg-default'
      this.selectedCategory = category || ''
      this.reminderNote = reminder
    },
    createCategory() {
      const categoryName = this.newCategory.trim()
      this.allCategories.add(categoryName)
      this.newCategory = ''
    },
    clearNoteContent() {
      this.editor.dispatch({
        changes: {
          from: 0,
          to: this.editor.state.doc.length,
          insert: ''
        },
        selection: { anchor: 0 }
      })
    },
    showSuccess(message) {
      if (this.timeoutNotification) clearTimeout(this.timeoutNotification)
      const notification = document.querySelector('#success-notification')
      notification.textContent = message
      notification.classList.remove('d-none')
      this.timeoutNotification = setTimeout(() => {
        notification.classList.add('d-none')
      }, 5000)
    },
    showError(message) {
      if (this.timeoutNotification) clearTimeout(this.timeoutNotification)
      const notification = document.querySelectorAll('.error-notification')
      notification.forEach((e) => {
        e.textContent = message
        e.classList.remove('d-none')
        this.timeoutNotification = setTimeout(() => {
          e.classList.add('d-none')
        }, 5000)
      })
    },
    selectColor(color) {
      this.selectedColor = color
    },
    toggleFullscreen(noteId, event) {
      if (!noteId) return

      if (
        event.target.closest('a, details') ||
        window.getSelection().toString()
      ) return

      if (this.fullscreenNoteId === noteId) {
        this.fullscreenNoteId = null
      } else {
        this.fullscreenNoteId = noteId
      }

      this.closeSidebar()
    },
    copy(content) {
      navigator.clipboard.writeText(content)
      this.showSuccess('Content copied to clipboard')
    },
    copySharedNoteLink() {
      const link = this.noteLink
      const url = new URL(`./?link=${encodeURIComponent(link)}`, window.location.href)
      navigator.clipboard.writeText(url.href)
    }
  }
}
</script>
