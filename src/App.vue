<template>
  <div v-if="!onLine" id="offline">
    <p>You are offline</p>
  </div>
  <header v-if="(!isLocked && isLockedResponse)">
    <button type="button" id="sidebar-indicator" aria-label="Open sidebar" @click="openSidebar()">
      <svg width="18px" height="18px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none"
        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
        class="feather feather-sidebar">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="9" y1="3" x2="9" y2="21"></line>
      </svg>
    </button>
    <div id="div-search" role="search">
      <i class="fa-solid fa-magnifying-glass" role="none"></i>
      <input v-model="searchValue" type="search" id="search-input" maxlength="30" aria-label="Search" autocomplete="off"
        @input="searchNotes()">
      <kbd>CTRL</kbd><kbd>K</kbd>
    </div>
  </header>
  <div v-if="(!isLocked && isLockedResponse)" id="sidebar">
    <nav>
      <div v-if="new Date().getMonth() === 11" class="row">
        <img src="./assets/img/christmas.png" alt="christmas" class="christmas" loading="lazy">
      </div>
      <div v-else-if="new Date().getMonth() === 9 && new Date().getDate() > 24 && new Date().getDate() <= 31"
        class="row">
        <img src="./assets/img/halloween.png" alt="halloween" class="halloween" loading="lazy">
      </div>
      <div class="row nav-buttons">
        <button v-if="isAuthenticated && !isLocked" id="manage-account" type="button" aria-label="Manage account"
          @click="openManageAccountDialog()">
          <i class="fa-solid fa-circle-user"></i>
          <span>Manage account</span>
        </button>
        <button v-if="!isAuthenticated && !isLocked" id="log-in" type="button" aria-label="Log in"
          @click="openLoginDialog()">
          <i class="fa-solid fa-circle-user"></i>
          <span>Log in</span>
        </button>
        <button type="button" id="btn-colorpicker" aria-label="Change app color" @click="openColorPickerDialog()">
          <i class="fa-solid fa-palette"></i>
          <span>Palette</span>
        </button>
        <button v-if="!isLocked" type="button" id="btn-settings" aria-label="Settings" @click="openSettingsDialog()">
          <i class="fa-solid fa-gear"></i>
          <span>Settings</span>
        </button>
      </div>
      <div class="d-flex justify-content-between align-items-center">
        <p class="bold">
          Notes
          ({{ notesJSON.length }})
        </p>
        <div v-if="notesJSON.length" id="manage-notes">
          <button v-if="!isLocked" type="button" id="btn-sort" aria-label="Sort notes" @click="openSortDialog()">
            <i class="fa-solid fa-arrow-up-wide-short"></i>
          </button>
          <button v-if="!isLocked" type="button" id="btn-filter" aria-label="Filter notes" @click="openFilterDialog()">
            <i class="fa-solid fa-filter"></i>
          </button>
          <button v-if="!isLocked" type="button" id="btn-download-all" aria-label="Download all notes"
            @click="downloadAllNotes()">
            <i class="fa-solid fa-download"></i>
          </button>
        </div>
      </div>
      <div id="list-notes"></div>
    </nav>
  </div>
  <main>
    <button v-if="isLocked && isLockedResponse" id="btn-unlock-float" type="button" aria-label="Unlock app"
      @click="unlockApp()">
      <i class="fa-solid fa-lock"></i>
    </button>
    <button v-else-if="isLockedResponse" type="button" id="btn-add-note" aria-label="Add a note"
      @click="openAddNoteDialog()">
      <i class="fa-solid fa-plus"></i>
    </button>
    <div id="success-notification" class="d-none"></div>
    <dialog id="sort-dialog">
      <div class="popup">
        <div class="content">
          <div class="close">
            <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          </div>
          <fieldset>
            <legend>Sort notes</legend>
            <div class="row">
              <label class="custom-check">
                <input type="radio" name="sort-notes" value="1" id="sort-notes1" @change="selectSortOption($event)"
                  checked>
                <span id="sort-notes1-span" tabindex="0" role="button">Modification date</span>
              </label>
              <label class="custom-check">
                <input type="radio" name="sort-notes" value="2" id="sort-notes2" @change="selectSortOption($event)">
                <span id="sort-notes2-span" tabindex="0" role="button">Modification date (Z-A)</span>
              </label>
              <label class="custom-check">
                <input type="radio" name="sort-notes" value="3" id="sort-notes3" @change="selectSortOption($event)">
                <span id="sort-notes3-span" tabindex="0" role="button">Title</span>
              </label>
              <label class="custom-check">
                <input type="radio" name="sort-notes" value="4" id="sort-notes4" @change="selectSortOption($event)">
                <span id="sort-notes4-span" tabindex="0" role="button">Title (Z-A)</span>
              </label>
            </div>
          </fieldset>
        </div>
      </div>
    </dialog>
    <dialog id="filter-dialog">
      <div class="popup">
        <div class="content">
          <div class="close">
            <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          </div>
          <fieldset>
            <legend>Filter notes by category</legend>
            <div id="filter-categories" class="row"></div>
          </fieldset>
        </div>
      </div>
    </dialog>
    <dialog id="delete-note-dialog">
      <div class="popup">
        <div class="content">
          <div class="close">
            <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          </div>
          <form :id="isAuthenticated ? 'delete-cloud-note' : 'delete-local-note'"
            @submit.prevent="isAuthenticated ? deleteCloudNote() : deleteLocalNote()">
            <div class="error-notification d-none"></div>
            <div class="row">
              <span>Deletion is permanent.</span>
            </div>
            <input id="id-note-delete" type="hidden">
            <div class="row">
              <button type="submit" class="btn-cancel">Delete note</button>
            </div>
          </form>
        </div>
      </div>
    </dialog>
    <dialog id="download-dialog">
      <div class="popup">
        <div class="content">
          <div class="close">
            <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          </div>
          <fieldset>
            <legend>Export type</legend>
            <input id="id-note-download" type="hidden">
            <div class="row">
              <label class="custom-check">
                <input type="radio" name="download-notes" value="txt" id="txt-download"
                  @change="downloadNotes($event.target.value)" checked>
                <span tabindex="0" role="button">.TXT</span>
              </label>
              <label class="custom-check">
                <input type="radio" name="download-notes" value="md" id="md-download"
                  @change="downloadNotes($event.target.value)">
                <span tabindex="0" role="button">.MD</span>
              </label>
            </div>
          </fieldset>
        </div>
      </div>
    </dialog>
    <dialog id="folder-dialog">
      <div class="popup">
        <div class="content">
          <div class="close">
            <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          </div>
          <div id="folders">
            <label class="custom-check">
              <input type="radio" name="add-folder" value="" id="none-folder-add-span" checked>
              <span tabindex="0" role="button">
                <i class="fa-solid fa-xmark"></i>
              </span>
            </label>
            <span class="list"></span>
          </div>
          <form id="add-folder" autocomplete="off" @submit.prevent="createFolder()">
            <div class="error-notification d-none"></div>
            <div class="row">
              <input type="text" id="name-folder" placeholder="Folder name" maxlength="18" aria-label="Name" required>
            </div>
            <button type="submit">Create folder</button>
          </form>
        </div>
      </div>
    </dialog>
    <dialog id="category-dialog">
      <div class="popup">
        <div class="content">
          <div class="close">
            <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          </div>
          <div id="categories">
            <label class="custom-check">
              <input type="radio" name="add-cat" value="" id="none-cat-add-span" checked>
              <span tabindex="0" role="button">
                <i class="fa-solid fa-xmark"></i>
              </span>
            </label>
            <span class="list"></span>
          </div>
          <form id="add-category" autocomplete="off" @submit.prevent="createCategory()">
            <div class="error-notification d-none"></div>
            <div class="row">
              <input type="text" id="name-category" placeholder="Category name" maxlength="18" aria-label="Name"
                required>
            </div>
            <button type="submit">Create category</button>
          </form>
        </div>
      </div>
    </dialog>
    <dialog id="reminder-dialog">
      <div class="popup">
        <div class="content">
          <div class="close">
            <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          </div>
          <div class="row bold">
            Reminder date
          </div>
          <div class="row">
            <input type="datetime-local" id="date-reminder-input" aria-label="Date">
          </div>
        </div>
      </div>
    </dialog>
    <dialog id="note-dialog">
      <div class="popup">
        <div class="content">
          <div class="popup-header">
            <div class="close">
              <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
            </div>
            <div class="done">
              <button type="submit" id="submit-note-btn" :form="isAuthenticated ? 'add-cloud-note' : 'add-local-note'"
                aria-label="Save note">
                <i class="fa-solid fa-check"></i>
              </button>
            </div>
          </div>
          <form autocomplete="off" :id="isAuthenticated ? 'add-cloud-note' : 'add-local-note'"
            @submit.prevent="isAuthenticated ? addCloudNote() : addLocalNote()">
            <input id="id-note" type="hidden">
            <div class="error-notification d-none"></div>
            <input type="text" id="title" maxlength="30" aria-label="Title" placeholder="Title" autofocus required>
            <textarea id="content" :maxlength="maxNoteContentLength" spellcheck="true"
              placeholder="Content (Raw text, Markdown or HTML)" aria-label="Content"
              @input="updateNoteContentLength()"></textarea>
            <div class="row">
              <span id="textarea-length">
                {{ noteContentLength }}/{{ maxNoteContentLength }}
              </span>
              <span class="editor-control">
                <i class="fa-solid fa-broom" tabindex="0" role="button" aria-label="Clear content"
                  @click="clearNoteContent()"></i>
              </span>
            </div>
            <div class="row">
              <button type="button" id="btn-add-folder" aria-label="Add a folder" @click="openFolderDialog()">
                <i class="fa-solid fa-folder"></i>
              </button>
              <button type="button" id="btn-add-category" aria-label="Add a category" @click="openCatDialog()">
                <i class="fa-solid fa-tags"></i>
              </button>
              <button type="button" id="btn-add-reminder" aria-label="Add a reminder" @click="openReminderDialog()">
                <i class="fa-solid fa-bell"></i>
              </button>
            </div>
            <div class="row">
              <div id="colors">
                <span class="bg-default" tabindex="0" role="button" aria-label="Default"
                  @click="selectColor($event)"></span>
                <span class="bg-red" tabindex="0" role="button" aria-label="Red" @click="selectColor($event)"
                  @keydown.enter="selectColor($event)"></span>
                <span class="bg-orange" tabindex="0" role="button" aria-label="Orange" @click="selectColor($event)"
                  @keydown.enter="selectColor($event)"></span>
                <span class="bg-yellow" tabindex="0" role="button" aria-label="Yellow" @click="selectColor($event)"
                  @keydown.enter="selectColor($event)"></span>
                <span class="bg-lime" tabindex="0" role="button" aria-label="Lime" @click="selectColor($event)"
                  @keydown.enter="selectColor($event)"></span>
                <span class="bg-green" tabindex="0" role="button" aria-label="Green" @click="selectColor($event)"
                  @keydown.enter="selectColor($event)"></span>
                <span class="bg-cyan" tabindex="0" role="button" aria-label="Cyan" @click="selectColor($event)"
                  @keydown.enter="selectColor($event)"></span>
                <span class="bg-light-blue" tabindex="0" role="button" aria-label="Light blue"
                  @click="selectColor($event)" @keydown.enter="selectColor($event)"></span>
                <span class="bg-blue" tabindex="0" role="button" aria-label="Blue" @click="selectColor($event)"
                  @keydown.enter="selectColor($event)"></span>
                <span class="bg-purple" tabindex="0" role="button" aria-label="Purple" @click="selectColor($event)"
                  @keydown.enter="selectColor($event)"></span>
                <span class="bg-pink" tabindex="0" role="button" aria-label="Pink" @click="selectColor($event)"
                  @keydown.enter="selectColor($event)"></span>
              </div>
            </div>
            <div class="row d-flex align-items-center">
              <span>Hide content</span>
              <label class="switch">
                <input type="checkbox" class="checkbox" id="check-hidden">
                <span class="toggle-thumb">
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
    <dialog id="colorpicker-dialog">
      <div class="popup popup-small">
        <div class="content">
          <div class="close">
            <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          </div>
          <IroJs />
        </div>
      </div>
    </dialog>
    <dialog id="settings-dialog">
      <div class="popup popup-small">
        <div class="content">
          <div class="close">
            <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          </div>
          <div class="error-notification d-none"></div>
          <div id="legal" class="row">
            <a href="https://leoseguin.fr/mentionslegales/">Legal notice / privacy</a>
          </div>
          <div class="row">
            <a href="https://github.com/seguinleo/Notida/wiki/Markdown" id="link-markdown"
              rel="noopener noreferrer">Markdown guide</a>
          </div>
          <div class="row">
            <a href="https://github.com/seguinleo/Notida/wiki/Shortcuts" rel="noopener noreferrer">Shortcuts</a>
          </div>
          <div class="row">
            <a href="https://github.com/seguinleo/Notida/discussions" id="link-help" rel="noopener noreferrer">Help and
              discussions</a>
          </div>
          <div class="row d-flex align-items-center justify-content-between">
            <span>Spell check</span>
            <label id="spellcheck-slider" class="switch">
              <input v-model="spellcheck" type="checkbox" id="check-spellcheck" class="checkbox" checked
                @change="toggleSpellcheck()">
              <span class="toggle-thumb">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" class="off">
                  <rect x="12" y="6" width="1" height="12" />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" class="on">
                  <circle cx="12" cy="12" r="5" stroke-width="1" fill="none" />
                </svg>
              </span>
            </label>
          </div>
          <div class="row d-flex align-items-center justify-content-between">
            <span>Lock app</span>
            <label class="switch">
              <input type="checkbox" id="toggle-lock-app" class="checkbox" checked @click="toggleLockApp()">
              <span class="toggle-thumb">
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
              <a href="https://github.com/seguinleo/Notida/" rel="noopener noreferrer">v25.10.1</a>
            </p>
          </div>
        </div>
      </div>
    </dialog>
    <template v-if="(isAuthenticated && isAuthenticatedResponse) && !isLocked">
      <dialog id="manage-dialog">
        <div class="popup">
          <div class="content">
            <div class="close">
              <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
            </div>
            <div id="user-name" class="row bold">
              {{ name }}
            </div>
            <div class="row last-login">
              <span>Last login: </span>
              <span id="last-login-date"></span>
            </div>
            <div class="row">
              <button type="button" id="log-out" @click="fetchLogout()">Log out</button>
            </div>
            <div class="row">
              <span id="storage-usage">{{ (dataByteSize / 1000).toFixed(2) }} kB / {{ maxDataByteSize / 1000000 }}
                MB</span>
              <progress id="storage" :max="maxDataByteSize" :value="dataByteSize"></progress>
            </div>
            <details id="gen-psswd">
              <summary>
                Change password
                <i class="fa-solid fa-chevron-up"></i>
              </summary>
              <form id="change-psswd" @submit.prevent="changePassword()">
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
                <div class="row d-flex">
                  <p id="psswd-gen"></p>
                  <button type="button" id="copy-password-btn" aria-label="Copy password" @click="copyPassword()">
                    <i class="fa-solid fa-clipboard"></i>
                  </button>
                  <button type="button" id="submit-gen-psswd" aria-label="Generate password" @click="getPassword(20)">
                    <i class="fa-solid fa-arrow-rotate-right"></i>
                  </button>
                </div>
                <button type="submit">Change password</button>
              </form>
            </details>
            <details id="delete-user">
              <summary>
                Delete account
                <i class="fa-solid fa-chevron-up"></i>
              </summary>
              <form id="delete-account" @submit.prevent="deleteAccount()">
                <div class="error-notification d-none"></div>
                <div class="row">
                  <input id="delete-psswd" type="password" minlength="10" maxlength="64" placeholder="Password"
                    aria-label="Password" required>
                </div>
                <button type="submit" class="btn-cancel">Delete account</button>
              </form>
            </details>
          </div>
        </div>
      </dialog>
      <dialog id="private-note-dialog">
        <div class="popup">
          <div class="content">
            <div class="close">
              <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
            </div>
            <form id="public-note" @submit.prevent="publicNote()">
              <div class="error-notification d-none"></div>
              <div class="row">
                <span>Do you want to make your note public? A link will be available to share it.</span>
              </div>
              <input id="id-note-public" type="hidden">
              <div class="row">
                <button type="submit">Make private</button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
      <dialog id="public-note-dialog">
        <div class="popup">
          <div class="content">
            <div class="close">
              <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
            </div>
            <div class="d-flex">
              <p id="copy-note-link"></p>
              <button type="button" id="copy-note-link-btn" aria-label="Copy link" @click="copyNoteLink()">
                <i class="fa-solid fa-clipboard"></i>
              </button>
            </div>
            <form id="private-note" @submit.prevent="privateNote()">
              <div class="error-notification d-none"></div>
              <div class="row">
                <span>Do you want to make your note private? The link will no longer be available.</span>
              </div>
              <input id="id-note-private" type="hidden">
              <input id="link-note-private" type="hidden">
              <div class="row">
                <button type="submit" class="btn-cancel">Make private</button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </template>
    <template v-else-if="isAuthenticatedResponse && !isLocked">
      <dialog id="login-dialog">
        <div class="popup">
          <div class="content">
            <div class="close">
              <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
            </div>
            <form id="connect-user" autocomplete="off" @submit.prevent="connectUser()">
              <div class="error-notification d-none"></div>
              <div class="row">
                <input id="name-connect" type="text" minlength="3" maxlength="30" spellcheck="false" placeholder="Name"
                  autocapitalize="off" aria-label="Name" required>
              </div>
              <div class="row">
                <input id="psswd-connect" type="password" minlength="10" maxlength="64" placeholder="Password"
                  aria-label="Password" required>
              </div>
              <div class="row">
                <button type="submit">Log in</button>
              </div>
              <div class="row align-center">
                <button type="button" id="create-account" @click="openCreateUserDialog()">Don't have an account
                  yet?</button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
      <dialog id="create-box">
        <div class="popup">
          <div class="content">
            <div class="close">
              <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
            </div>
            <form autocomplete="off" id="create-user" @submit.prevent="createUser()">
              <div class="error-notification d-none"></div>
              <div class="row">
                <input id="name-create" type="text" minlength="3" maxlength="30" spellcheck="false" autocapitalize="off"
                  placeholder="Name" aria-label="Name" required>
              </div>
              <div class="row">
                <input id="psswd-create" type="password" minlength="10" maxlength="64" placeholder="Password"
                  aria-label="Password" required>
              </div>
              <div class="row">
                <input id="psswd-create-valid" type="password" minlength="10" maxlength="64"
                  placeholder="Confirm password" aria-label="Confirm password" required>
              </div>
              <div class="row d-flex">
                <p id="psswd-gen"></p>
                <button type="button" id="copy-password-btn" aria-label="Copy password" @click="copyPassword()">
                  <i class="fa-solid fa-clipboard"></i>
                </button>
                <button type="button" id="submit-gen-psswd" aria-label="Generate password" @click="getPassword(20)">
                  <i class="fa-solid fa-arrow-rotate-right"></i>
                </button>
              </div>
              <div class="row">
                <i class="fa-solid fa-circle-info" role="none"></i>
                <span>Your password is stored securely and your notes are encrypted. You will not be able to recover
                  your password if you forget it.</span>
              </div>
              <button type="submit">Create my account</button>
            </form>
          </div>
        </div>
      </dialog>
      <div v-if="notesJSON.length === 0" data-note-id="welcome" class="note bg-default"
        @click="toggleFullscreen('welcome')">
        <div class="details">
          <h1 class="title">Notida</h1>
          <div class="details-content">
            <div>
              <p class="align-center">
                A fast, private and secure web notebook.
              </p>
              <p class="align-center">
                <img alt="License"
                  src="https://img.shields.io/github/license/seguinleo/Notida?color=8ab4f8&style=for-the-badge">
              </p>
              <h2 id="features">Features</h2>
              <p>Users can create task lists, reminders, tables, links, math expressions or code blocks using Markdown
                and HTML. They can add online images, audio or videos via URL. Notes can be searched, sorted by category
                or organized into folders.</p>
              <p>Users can sync notes across devices in a secure database after signing in without needing an email
                address, only a username and strong password. Public notes can be shared via random URLs.</p>
              <p>This website is a Progressive Web App (PWA) that can be installed as an application. Design is
                responsive and optimized for all mobile devices or macOS/Windows.</p>
              <p>The site is accessible to users with disabilities.</p>
              <h2 id="security">Security</h2>
              <p>The website follows <a href="https://cheatsheetseries.owasp.org/">OWASP security recommendations</a>.
              </p>
              <p>All notes are sanitized, validated and encrypted with AES-256-GCM. Each user has a cryptographically
                secure key generated after signing up.</p>
              <p>Users can lock the app using biometrics (fingerprints, face, etc.). These biometric data are never sent
                to the server.</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </main>
</template>

<script>
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import IroJs from './components/IroJs.vue'
import markedKatex from 'marked-katex-extension'
import 'katex/dist/katex.min.css'

export default {
  data() {
    return {
      name: '',
      spellcheck: true,
      touchstartX: 0,
      touchendX: 0,
      timeoutNotification: null,
      fingerprintEnabled: true,
      onLine: navigator.onLine,
      isLocked: true,
      isLockedResponse: false,
      isAuthenticated: false,
      isAuthenticatedResponse: false,
      isUpdate: false,
      dataByteSize: 0,
      noteContentLength: 0,
      maxNoteContentLength: 20000,
      maxDataByteSize: 0,
      searchValue: '',
      notesJSON: [],
      localDbName: 'notes_db',
      localDbKeyName: 'key',
      localDbKey: null,
      noteLink: '',
      urlParams: '',
      markedConfig: {
        breaks: true,
        renderer: {
          link({ href, text }) {
            return `<a rel="noreferrer noopener" href="${href}">${text}</a>`
          },
          image({ href, title, text }) {
            return `<img src="${encodeURI(href)}" alt="${text}" title="${title}" crossorigin>`
          },
          checkbox({ checked }) {
            if (checked) return '<label><input type="checkbox" disabled checked>'
            else return '<label><input type="checkbox" disabled>'
          }
        }
      },
      purifyConfig: {
        SANITIZE_NAMED_PROPS: true,
        ALLOW_DATA_ATTR: false,
        FORBID_TAGS: ['dialog', 'footer', 'form', 'header', 'main', 'nav', 'style'],
        FORBID_ATTR: ['style', 'class']
      },
      katexConfig: {
        throwOnError: false,
        nonStandard: true
      }
    }
  },
  components: {
    IroJs
  },
  watch: {
    async onLine(v) {
      if (v) {
        document.querySelector('#offline').classList.add('d-none')
        if (this.urlParams.get('link')) {
          await this.showSharedNote()
          return
        }
        if (document.querySelector('dialog').open) return
        await this.getLockApp()
        if (this.isLocked) return
        await this.fetchAccount()
        if (this.isAuthenticated) await this.getCloudNotes()
        else await this.getLocalNotes()
      } else {
        document.querySelector('#offline').classList.remove('d-none')
      }
    }
  },
  async mounted() {
    if ('serviceWorker' in navigator) await navigator.serviceWorker.register('./sw.js')

    this.urlParams = new URLSearchParams(window.location.search)
    if (this.urlParams.get('link')) {
      await this.showSharedNote()
      return
    }

    if (localStorage.getItem('spellcheck') === 'false') {
      document.querySelector('#check-spellcheck').checked = false
      document.querySelector('#content').setAttribute('spellcheck', 'false')
    }

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key.toUpperCase() === 'K') {
        e.preventDefault()
        document.querySelector('#search-input').focus()
      } else if (e.altKey && e.shiftKey && e.key.toUpperCase() === 'N') {
        e.preventDefault()
        document.querySelector('#btn-add-note').click()
      } else if (e.altKey && e.shiftKey && e.key.toUpperCase() === 'S') {
        e.preventDefault()
        document.querySelector('#btn-settings').click()
      }
    })

    document.addEventListener('touchstart', (e) => {
      this.touchstartX = e.changedTouches[0].screenX
    }, { passive: true })

    document.addEventListener('touchend', (e) => {
      if (this.isLocked) return
      this.touchendX = e.changedTouches[0].screenX
      if (this.touchendX - this.touchstartX > 75) {
        document.querySelector('#sidebar').classList.add('show')
      } else if (this.touchstartX - this.touchendX > 75) {
        document.querySelector('#sidebar').classList.remove('show')
      }
    }, { passive: true })

    window.addEventListener('online', () => this.onLine = true)
    window.addEventListener('offline', () => this.onLine = false)

    await this.getLockApp()
    if (this.isLocked) return
    await this.fetchAccount()
    if (this.isAuthenticated) await this.getCloudNotes()
    else await this.getLocalNotes()
  },
  methods: {
    arrayBufferToBase64(buffer) {
      const binary = []
      const bytes = new Uint8Array(buffer)
      for (let i = 0; i < bytes.byteLength; i += 1) binary.push(String.fromCharCode(bytes[i]))
      return window.btoa(binary.join(''))
    },
    base64ToArrayBuffer(base64) {
      const binaryString = window.atob(base64)
      const byteArray = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i += 1) byteArray[i] = binaryString.charCodeAt(i)
      return byteArray.buffer
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
    async decryptLocalNotes(key, data) {
      const deData = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(12) },
        key,
        this.base64ToArrayBuffer(data),
      )
      return JSON.parse(new TextDecoder().decode(deData))
    },
    generateRandomBytes(length) {
      const array = new Uint8Array(length)
      window.crypto.getRandomValues(array)
      return array
    },
    closeDialog(e) {
      const dialog = e.target.closest('dialog')
      dialog.close()
      if (dialog.id === 'folder-dialog') return
      if (dialog.id === 'category-dialog') return
      if (dialog.id === 'reminder-dialog') return
      document.querySelectorAll('form').forEach((form) => form.reset())
      document.querySelectorAll('input[type="hidden"]').forEach((input) => input.value = '')
    },
    getPassword(length) {
      const lowercase = 'abcdefghijklmnopqrstuvwxyz'
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const digits = '0123456789'
      const specialChars = '&~"#\'(-_)=^$€*!?,.:/|\\@%+{}[]<>`'
      const allChars = lowercase + uppercase + digits + specialChars
      let password = ''
      const array = new Uint32Array(length)
      window.crypto.getRandomValues(array)
      for (let i = 0; i < length; i += 1) {
        const randomIndex = parseInt(array[i] % allChars.length, 10)
        password += allChars[randomIndex]
      }
      document.querySelector('#psswd-gen').textContent = password
    },
    copyPassword() {
      const psswd = document.querySelector('#psswd-gen').textContent
      navigator.clipboard.writeText(psswd)
    },
    getCsrfToken() {
      return localStorage.getItem('csrfToken')
    },
    async getLockApp() {
      try {
        const res = await fetch('api/get-lock-app/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        const response = await res.json()
        this.isLockedResponse = true
        if (!response.lockApp) {
          this.fingerprintEnabled = false
          this.isLocked = false
          document.querySelector('#toggle-lock-app').checked = false
        }
      } catch (error) {
        this.showError(`An error occurred - ${error}`)
      }
    },
    async toggleLockApp() {
      if (this.isLocked) return
      if (this.fingerprintEnabled) {
        const res = await this.verifyFingerprint()
        if (!res) {
          document.querySelector('#toggle-lock-app').checked = true
          return
        }
        this.fingerprintEnabled = false
      } else {
        const res = await this.createFingerprint()
        if (!res) {
          document.querySelector('#toggle-lock-app').checked = false
          return
        }
      }
      try {
        const res = await fetch('api/lock-app/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
        }
      } catch (error) {
        this.showError(`An error occurred - ${error}`)
      }
    },
    async unlockApp() {
      await this.verifyFingerprint().then(async (res) => {
        if (!res) return
        this.isLocked = false
        await this.fetchAccount()
        if (this.isAuthenticated) await this.getCloudNotes()
        else await this.getLocalNotes()
      })
    },
    async verifyFingerprint() {
      try {
        const challenge = this.generateRandomBytes(32)
        const publicKeyOptions = {
          challenge,
          rp: {
            name: 'Notida',
          },
          allowCredentials: [],
          userVerification: "preferred",
          timeout: 60000,
        }
        const credential = await navigator.credentials.get({ publicKey: publicKeyOptions })
        if (credential) return 1
        else {
          this.showError('An error occurred - No credential')
          return 0
        }
      } catch (error) {
        this.showError(`An error occurred - ${error}`)
        return 0
      }
    },
    async createFingerprint() {
      try {
        const challenge = this.generateRandomBytes(32)
        const username = document.querySelector('#user-name') ? document.querySelector('#user-name').textContent : 'local'
        const userId = new TextEncoder().encode(username)
        await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: {
              name: 'Notida',
            },
            user: {
              id: userId,
              name: 'Notida',
              displayName: 'Notida',
            },
            pubKeyCredParams: [
              {
                type: 'public-key',
                alg: -7,
              },
              {
                type: 'public-key',
                alg: -257,
              }
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'preferred',
            },
            excludeCredentials: [{
              type: 'public-key',
              id: userId
            }],
            timeout: 60000,
            attestation: 'none',
          },
        })
        this.fingerprintEnabled = true
        this.isLocked = false
        return 1
      } catch (error) {
        document.querySelector('#toggle-lock-app').checked = false
        this.showError(`An error occurred - ${error}`)
        return 0
      }
    },
    async createUser() {
      if (this.isLocked) return
      const e = document.querySelector('#name-create').value.trim()
      const t = document.querySelector('#psswd-create').value
      const o = document.querySelector('#psswd-create-valid').value
      if (!e || !t || !o || e.length < 3 || e.length > 30 || t.length < 10 || t.length > 64) return
      if (!/^[a-zA-ZÀ-ÿ -]+$/.test(e)) {
        this.showError('Name can only contain letters, spaces and accents...')
        return
      }
      if (/^[0-9]+$/.test(t)) {
        this.showError('Password too weak (only numbers)...')
        return
      }
      if (/^[a-z]+$/.test(t)) {
        this.showError('Password too weak (only lowercase letters)...')
        return
      }
      if (/^[A-Z]+$/.test(t)) {
        this.showError('Password too weak (only uppercase letters)...')
        return
      }
      if (/^[a-zA-Z]+$/.test(t)) {
        this.showError('Password too weak (only letters)...')
        return
      }
      if (/^[a-zA-Z0-9]+$/.test(t)) {
        this.showError('Password should contain one special character...')
        return
      }
      if (t !== o) {
        this.showError('Passwords do not match...')
        return
      }
      if (e === t) {
        this.showError('Username and password cannot be the same...')
        return
      }
      const nameCreate = e
      const psswdCreate = t
      try {
        const data = new URLSearchParams({ nameCreate, psswdCreate })
        const res = await fetch('api/create-user/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: data,
        })
        if (!res.ok) {
          this.showError('Username already taken...')
          document.querySelectorAll('form').forEach((form) => form.reset())
          return
        }
        document.querySelector('#create-box').close()
        document.querySelectorAll('form').forEach((form) => form.reset())
        this.showSuccess('Account successfully created! You can now log in.')
      } catch (error) {
        this.showError(`An error occurred - ${error}`)
        document.querySelectorAll('form').forEach((form) => form.reset())
      }
    },
    async connectUser() {
      if (this.isLocked) return
      const e = document.querySelector('#name-connect').value.trim()
      const t = document.querySelector('#psswd-connect').value
      if (!e || !t || e.length > 30 || t.length > 64) return
      if (!/^[a-zA-ZÀ-ÿ -]+$/.test(e)) {
        this.showError('Name can only contain letters, spaces and accents...')
        return
      }
      const nameConnect = e
      const psswdConnect = t
      try {
        const data = new URLSearchParams({ nameConnect, psswdConnect })
        const res = await fetch('api/login/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: data,
        })
        if (!res.ok) {
          document.querySelectorAll('form').forEach((form) => form.reset())
          let time = 10
          const btn = document.querySelector('#connect-user button[type="submit"]')
          const btnText = btn.textContent
          btn.disabled = true
          const errorMessage = await res.text()
          this.showError(errorMessage)
          const interval = setInterval(() => {
            time -= 1
            btn.textContent = time
          }, 1000)
          setTimeout(() => {
            clearInterval(interval)
            btn.disabled = false
            btn.textContent = btnText
          }, 10000)
          return
        }
        const response = await res.json()
        localStorage.setItem('csrfToken', response.csrfToken)
        window.location.reload()
      } catch (error) {
        this.showError(`An error occurred - ${error}`)
        document.querySelectorAll('form').forEach((form) => form.reset())
      }
    },
    async changePassword() {
      if (this.isLocked) return
      const a = document.querySelector('#old-psswd').value
      const e = document.querySelector('#new-psswd').value
      const t = document.querySelector('#new-psswd-valid').value
      if (!a || !e || !t || e.length < 10 || e.length > 64) return
      if (/^[0-9]+$/.test(t)) {
        this.showError('Password too weak (only numbers)...')
        return
      }
      if (/^[a-z]+$/.test(t)) {
        this.showError('Password too weak (only lowercase letters)...')
        return
      }
      if (/^[A-Z]+$/.test(t)) {
        this.showError('Password too weak (only uppercase letters)...')
        return
      }
      if (/^[a-zA-Z]+$/.test(t)) {
        this.showError('Password too weak (only letters)...')
        return
      }
      if (/^[a-zA-Z0-9]+$/.test(t)) {
        this.showError('Password should contain one special character...')
        return
      }
      if (e !== t) {
        this.showError('Passwords do not match...')
        return
      }
      const psswdOld = a
      const psswdNew = e
      try {
        const data = new URLSearchParams({ psswdOld, psswdNew, csrfToken: this.getCsrfToken() })
        const res = await fetch('api/update-password/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: data,
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          document.querySelectorAll('form').forEach((form) => form.reset())
          return
        }
        document.querySelector('#manage-dialog').close()
        this.showSuccess('Successfully changed password!')
        document.querySelectorAll('form').forEach((form) => form.reset())
      } catch (error) {
        this.showError(`An error occurred - ${error}`)
        document.querySelectorAll('form').forEach((form) => form.reset())
      }
    },
    async deleteAccount() {
      if (this.isLocked) return
      const psswd = document.querySelector('#delete-psswd').value
      if (!psswd || psswd.length < 10 || psswd.length > 64) return
      try {
        const data = new URLSearchParams({ psswd, csrfToken: this.getCsrfToken() })
        const res = await fetch('api/delete-user/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: data,
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          document.querySelectorAll('form').forEach((form) => form.reset())
          return
        }
        window.location.reload()
      } catch (error) {
        this.showError(`An error occurred - ${error}`)
        document.querySelectorAll('form').forEach((form) => form.reset())
      }
    },
    async privateNote() {
      const noteId = document.querySelector('#id-note-private').value
      const noteLink = document.querySelector('#link-note-private').value
      if (!noteId || !/^[a-zA-Z0-9]+$/.test(noteId)) return
      if (!noteLink || !/^[a-zA-Z0-9]{32}$/.test(noteLink)) return
      try {
        const data = new URLSearchParams({ noteId, noteLink, csrfToken: this.getCsrfToken() })
        const res = await fetch('api/private-note/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: data,
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        document.querySelector('#public-note-dialog').close()
        await this.getCloudNotes()
      } catch (error) {
        this.showError(`An error occurred - ${error}`)
      }
    },
    async publicNote() {
      const noteId = document.querySelector('#id-note-public').value
      if (!noteId || !/^[a-zA-Z0-9]+$/.test(noteId)) return
      try {
        const data = new URLSearchParams({ noteId, csrfToken: this.getCsrfToken() })
        const res = await fetch('api/public-note/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: data,
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        document.querySelector('#private-note-dialog').close()
        await this.getCloudNotes()
      } catch (error) {
        this.showError(`An error occurred - ${error}`)
      }
    },
    openSidebar() {
      if (this.isLocked) return
      document.querySelector('#sidebar').classList.add('show')
    },
    openCreateUserDialog() {
      document.querySelector('#login-dialog').close()
      document.querySelector('#create-box').showModal()
    },
    openDeleteCloudNoteDialog(noteId) {
      document.querySelector('#delete-note-dialog').showModal()
      document.querySelector('#id-note-delete').value = noteId
    },
    openDeleteLocalNoteDialog(noteId) {
      document.querySelector('#delete-note-dialog').showModal()
      document.querySelector('#id-note-delete').value = noteId
    },
    openManageAccountDialog() {
      document.querySelector('#manage-dialog').showModal()
    },
    openLoginDialog() {
      document.querySelector('#login-dialog').showModal()
    },
    openSettingsDialog() {
      document.querySelector('#settings-dialog').showModal()
    },
    openSortDialog() {
      document.querySelector('#sort-dialog').showModal()
    },
    openFilterDialog() {
      document.querySelector('#filter-dialog').showModal()
    },
    openColorPickerDialog() {
      document.querySelector('#settings-dialog').close()
      document.querySelector('#colorpicker-dialog').showModal()
    },
    openAddNoteDialog() {
      this.isUpdate = false
      document.querySelector('#note-dialog').showModal()
      document.querySelectorAll('#colors span').forEach((e) => {
        e.classList.remove('selected')
      })
      document.querySelector('#colors span').classList.add('selected')
      document.querySelector('#check-hidden').disabled = false
      document.querySelector('#folders input[name="add-folder"][value=""').checked = true
      document.querySelector('#categories input[name="add-cat"][value=""').checked = true
    },
    openFolderDialog() {
      document.querySelector('#folder-dialog').showModal()
    },
    openCatDialog() {
      document.querySelector('#category-dialog').showModal()
    },
    openDownloadNoteDialog(noteId) {
      if (!noteId) return
      document.querySelector('#id-note-download').value = noteId
      document.querySelectorAll('#download-dialog input[name="download-notes"]').forEach((e) => {
        e.checked = false
      })
      document.querySelector('#download-dialog').showModal()
    },
    openReminderDialog() {
      document.querySelector('#reminder-dialog').showModal()
    },
    searchNotes() {
      const searchValue = this.searchValue.trim().toLowerCase()
      if (!this.notesJSON.length) return
      document.querySelectorAll('.note').forEach(async (note) => {
        const noteId = note.getAttribute('data-note-id')
        const noteTitle = this.isAuthenticated
          ? this.notesJSON.find((note) => note.id === noteId).title
          : await this.decryptLocalNotes(this.localDbKey, this.notesJSON.find((note) => note.id === noteId).title)
        const noteContent = this.isAuthenticated
          ? this.notesJSON.find((note) => note.id === noteId).content
          : await this.decryptLocalNotes(this.localDbKey, this.notesJSON.find((note) => note.id === noteId).content)
        if (noteTitle.toLowerCase().includes(searchValue) || noteContent.toLowerCase().includes(searchValue)) {
          note.classList.remove('d-none')
        } else note.classList.add('d-none')
      })
    },
    createFolder() {
      const folderName = document.querySelector('#name-folder').value.trim()
      const folders = document.querySelector('#folders .list')
      if (!folderName || folderName.length > 18) return
      if (Array.from(folders.children).some((e) => e.querySelector('span').textContent === folderName)) return
      const input = document.createElement('input')
      input.type = 'radio'
      input.name = 'add-folder'
      input.value = folderName
      input.id = `${folderName}-folder-add-span`
      input.checked = true
      const label = document.createElement('label')
      label.classList.add('custom-check')
      const span = document.createElement('span')
      span.textContent = folderName
      span.tabIndex = 0
      span.role = 'button'
      label.appendChild(input)
      label.appendChild(span)
      folders.appendChild(label)
      document.querySelector('#name-folder').value = ''
      document.querySelector('#folder-dialog').close()
    },
    createCategory() {
      const categoryName = document.querySelector('#name-category').value.trim()
      const categories = document.querySelector('#categories .list')
      if (!categoryName || categoryName.length > 18) return
      if (Array.from(categories.children).some((e) => e.querySelector('span').textContent === categoryName)) return
      const input = document.createElement('input')
      input.type = 'radio'
      input.name = 'add-cat'
      input.value = categoryName
      input.id = `${categoryName}-cat-add-span`
      input.checked = true
      const label = document.createElement('label')
      label.classList.add('custom-check')
      const span = document.createElement('span')
      span.textContent = categoryName
      span.tabIndex = 0
      span.role = 'button'
      label.appendChild(input)
      label.appendChild(span)
      categories.appendChild(label)
      document.querySelector('#name-category').value = ''
      document.querySelector('#category-dialog').close()
    },
    downloadAllNotes() {
      document.querySelectorAll('#download-dialog input[name="download-notes"]').forEach((e) => {
        e.checked = false
      })
      document.querySelector('#download-dialog').showModal()
    },
    toggleSpellcheck() {
      if (this.spellcheck) {
        localStorage.removeItem('spellcheck')
        document.querySelector('#note-dialog #content').setAttribute('spellcheck', 'true')
      } else {
        localStorage.setItem('spellcheck', 'false')
        document.querySelector('#note-dialog #content').setAttribute('spellcheck', 'false')
      }
    },
    clearNoteContent() {
      document.querySelector('#note-dialog #content').value = ''
      this.noteContentLength = 0
    },
    updateNoteContentLength() {
      const content = document.querySelector('#note-dialog #content').value
      this.noteContentLength = content.length
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
    noteActions() {
      document.querySelectorAll('.bottom-content i').forEach((e) => {
        e.addEventListener('click', async (event) => {
          const { target } = event
          const noteId = target.closest('.note').getAttribute('data-note-id')
          if (!noteId) return
          const noteTitle = this.isAuthenticated
            ? this.notesJSON.find((note) => note.id === noteId).title
            : await this.decryptLocalNotes(this.localDbKey, this.notesJSON.find((note) => note.id === noteId).title)
          const noteContent = this.isAuthenticated
            ? this.notesJSON.find((note) => note.id === noteId).content
            : await this.decryptLocalNotes(this.localDbKey, this.notesJSON.find((note) => note.id === noteId).content)
          const noteColor = this.notesJSON.find((note) => note.id === noteId).color
          const noteHidden = this.notesJSON.find((note) => note.id === noteId).hidden
          const noteFolder = this.notesJSON.find((note) => note.id === noteId).folder || ''
          const noteCategory = this.notesJSON.find((note) => note.id === noteId).category || ''
          const noteLink = this.notesJSON.find((note) => note.id === noteId).link
          const noteReminder = this.notesJSON.find((note) => note.id === noteId).reminder
          if (target.classList.contains('edit-note')) this.isAuthenticated ? this.updateCloudNote(
            noteId,
            noteTitle,
            noteContent,
            noteColor,
            noteHidden,
            noteFolder,
            noteCategory,
            noteLink,
            noteReminder
          ) : this.updateLocalNote(
            noteId,
            noteTitle,
            noteContent,
            noteColor,
            noteHidden,
            noteFolder,
            noteCategory,
            noteLink,
            noteReminder
          )
          else if (target.classList.contains('pin-note')) this.isAuthenticated ? this.pinCloudNote(noteId) : this.pinLocalNote(noteId)
          else if (target.classList.contains('copy-note')) this.copy(noteContent)
          else if (target.classList.contains('delete-note')) this.isAuthenticated ? this.openDeleteCloudNoteDialog(noteId) : this.openDeleteLocalNoteDialog(noteId)
          else if (target.classList.contains('download-note')) this.openDownloadNoteDialog(noteId)
          else if (target.classList.contains('share-note')) this.shareNote(noteId, noteLink, noteTitle, noteContent)
        })
        e.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') e.click()
        })
      })
      document.querySelectorAll('.note').forEach((e) => {
        e.addEventListener('click', (event) => {
          if (event.target.parentElement.classList.contains('bottom-content') || event.target.classList.contains('bottom-content')) return
          if (event.target.tabIndex > -1) return
          if (document.getSelection().toString()) return
          this.toggleFullscreen(event.currentTarget.getAttribute('data-note-id'))
        })
      })
      document.querySelectorAll('#filter-dialog input[name="filter-notes"]').forEach((e) => {
        e.addEventListener('change', () => {
          const selectedCategories = []
          const checkedCategories = document.querySelectorAll('#filter-dialog input[name="filter-notes"]:checked')
          if (checkedCategories.length === 0) {
            document.querySelectorAll('.note').forEach((note) => note.classList.remove('d-none'))
            return
          }
          checkedCategories.forEach((category) => selectedCategories.push(category.value))
          document.querySelectorAll('.note').forEach((note) => {
            const noteId = note.getAttribute('data-note-id')
            const noteCategory = this.notesJSON.find((note) => note.id === noteId).category || ''
            if (selectedCategories.includes(noteCategory)) note.classList.remove('d-none')
            else note.classList.add('d-none')
          })
        })
      })
      document.querySelectorAll('.p-note-list').forEach((e) => {
        e.addEventListener('click', (event) => {
          this.toggleFullscreen(event.currentTarget.getAttribute('data-note-id'))
        })
        e.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') e.click()
        })
      })
    },
    noteFolderOrCategories(allFolders, allCategories) {
      for (const folder of allFolders) {
        const folders = document.querySelector('#folders .list')
        const input = document.createElement('input')
        input.type = 'radio'
        input.name = 'add-folder'
        input.value = folder
        input.id = `${folder}-folder-add-span`
        const label = document.createElement('label')
        label.classList.add('custom-check')
        const span = document.createElement('span')
        span.textContent = folder
        span.tabIndex = 0
        span.role = 'button'
        label.appendChild(input)
        label.appendChild(span)
        folders.appendChild(label)
      }
      for (const category of allCategories) {
        const categories = document.querySelector('#categories .list')
        const input = document.createElement('input')
        input.type = 'radio'
        input.name = 'add-cat'
        input.value = category
        input.id = `${category}-cat-add-span`
        const label = document.createElement('label')
        label.classList.add('custom-check')
        const span = document.createElement('span')
        span.textContent = category
        span.tabIndex = 0
        span.role = 'button'
        label.appendChild(input)
        label.appendChild(span)
        categories.appendChild(label)

        const sortCategories = document.querySelector('#filter-categories')
        const sortInput = document.createElement('input')
        sortInput.type = 'checkbox'
        sortInput.name = 'filter-notes'
        sortInput.value = category
        sortInput.id = `${category}-filter-span`
        const sortLabel = document.createElement('label')
        sortLabel.classList.add('custom-check')
        const sortSpan = document.createElement('span')
        sortSpan.textContent = category
        sortSpan.tabIndex = 0
        sortSpan.role = 'button'
        sortLabel.appendChild(sortInput)
        sortLabel.appendChild(sortSpan)
        sortCategories.appendChild(sortLabel)
      }
    },
    selectColor(element) {
      document.querySelectorAll('#colors span').forEach((e) => e.classList.remove('selected'));
      element.target.classList.add('selected')
    },
    async selectSortOption(e) {
      const option = e.target.value
      if (!['1', '2', '3', '4'].includes(option)) return
      if (option === '1') localStorage.removeItem('sort_notes')
      else localStorage.setItem('sort_notes', option)
      if (this.isAuthenticated) await this.getCloudNotes()
      else await this.getLocalNotes()
    },
    async downloadNotes(type) {
      if (this.fingerprintEnabled) {
        const res = await this.verifyFingerprint()
        if (!res) return
      }
      if (this.notesJSON.length === 0) return
      const a = document.createElement('a')
      let filename = ''
      let allNotesContent = []
      const allNotes = document.querySelectorAll('.note')
      if (document.querySelector('#id-note-download').value === '') {
        const notesPromises = Array.from(allNotes).map(async (note) => {
          const noteId = note.getAttribute('data-note-id')
          const noteData = this.notesJSON.find((note) => note.id === noteId)
          const title = this.isAuthenticated
            ? noteData.title
            : await this.decryptLocalNotes(this.localDbKey, noteData.title)
          const content = this.isAuthenticated
            ? noteData.content
            : await this.decryptLocalNotes(this.localDbKey, noteData.content)
          return `# ${title}\n${content}`
        })
        allNotesContent = await Promise.all(notesPromises)
        filename = type === 'txt' ? 'notes.txt' : 'notes.md'
      } else {
        const note = document.querySelector(`.note[data-note-id="${document.querySelector('#id-note-download').value}"]`)
        const noteId = note.getAttribute('data-note-id')
        const title = this.isAuthenticated
          ? this.notesJSON.find((note) => note.id === noteId).title
          : await this.decryptLocalNotes(this.localDbKey, this.notesJSON.find((note) => note.id === noteId).title)
        const content = this.isAuthenticated
          ? this.notesJSON.find((note) => note.id === noteId).content
          : await this.decryptLocalNotes(this.localDbKey, this.notesJSON.find((note) => note.id === noteId).content)
        allNotesContent = [`# ${title}\n${content}`]
        filename = type === 'txt' ? `${title}.txt` : `${title}.md`
      }
      const blob = new Blob([allNotesContent.join('\n\n')], { type: 'text/plaincharset=utf-8' })
      const url = URL.createObjectURL(blob)
      a.href = url
      a.download = filename
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      document.querySelector('#download-dialog').close()
    },
    async getLocalNotes() {
      if (this.isLocked) return

      this.notesJSON = JSON.parse(localStorage.getItem('local_notes')) || []

      if (this.notesJSON.length === 0) return

      const sort = localStorage.getItem('sort_notes') || '1'
      document.querySelector(`#sort-dialog input[name="sort-notes"][value="${encodeURIComponent(sort)}"]`).checked = true
      document.querySelector('#list-notes').textContent = ''
      document.querySelector('#filter-categories').textContent = ''
      document.querySelector('#folders .list').textContent = ''
      document.querySelector('#categories .list').textContent = ''
      document.querySelectorAll('.local-note').forEach((e) => e.remove())

      marked.use(this.markedConfig)
      marked.use(markedKatex(this.katexConfig))

      try {
        const db = await this.openIndexedDB(this.localDbName, this.localDbKeyName)
        this.localDbKey = await this.getKeyFromDB(db, this.localDbKeyName)

        this.notesJSON.sort((a, b) => {
          if (a.pinned === 1 && b.pinned === 0) return -1
          if (a.pinned === 0 && b.pinned === 1) return 1

          switch (sort) {
            case '1':
              return b.date.localeCompare(a.date)
            case '2':
              return a.date.localeCompare(b.date)
            case '3':
              return a.title.localeCompare(b.title)
            case '4':
              return b.title.localeCompare(a.title)
            default:
              break
          }
        })

        const fragment = document.createDocumentFragment()
        const allFolders = new Set()
        const allCategories = new Set()

        const promises = this.notesJSON.map(async (row) => {
          const {
            id, title, content, color, date, hidden, pinned, folder, category, reminder
          } = row
          if (!title || !color || !date) return
          const deTitleString = await this.decryptLocalNotes(this.localDbKey, title)
          const deContentString = await this.decryptLocalNotes(this.localDbKey, content)
          const bottomContentElement = document.createElement('div')
          bottomContentElement.classList.add('bottom-content')

          const paragraph = document.createElement('p')
          paragraph.classList.add('p-note-list')
          paragraph.tabIndex = 0
          paragraph.setAttribute('role', 'button')
          paragraph.setAttribute('data-note-id', id)

          const noteElement = document.createElement('div')
          noteElement.classList.add('note', color, 'local-note')
          noteElement.setAttribute('data-note-id', id)

          const titleElement = document.createElement('h2')
          titleElement.classList.add('title')
          titleElement.textContent = deTitleString

          const contentElement = document.createElement('div')
          contentElement.classList.add('details-content')

          const detailsElement = document.createElement('div')
          detailsElement.classList.add('details')
          detailsElement.appendChild(titleElement)
          detailsElement.appendChild(contentElement)

          const dateElement = document.createElement('div')
          dateElement.classList.add('date')
          dateElement.textContent += new Date(date).toLocaleDateString()

          const editIconElement = document.createElement('i')
          editIconElement.classList.add('fa-solid', 'fa-pen', 'note-action', 'edit-note')
          editIconElement.tabIndex = 0
          editIconElement.setAttribute('role', 'button')
          editIconElement.setAttribute('aria-label', 'Edit note')
          bottomContentElement.appendChild(editIconElement)

          const pinElement = document.createElement('i')
          pinElement.classList.add('fa-solid', 'note-action', 'pin-note')
          pinElement.tabIndex = 0
          pinElement.setAttribute('role', 'button')
          pinElement.setAttribute('aria-label', 'Pin note')
          bottomContentElement.appendChild(pinElement)

          const trashIconElement = document.createElement('i')
          trashIconElement.classList.add('fa-solid', 'fa-trash-can', 'note-action', 'delete-note')
          trashIconElement.tabIndex = 0
          trashIconElement.setAttribute('role', 'button')
          trashIconElement.setAttribute('aria-label', 'Delete note')
          bottomContentElement.appendChild(trashIconElement)

          if (pinned) {
            noteElement.classList.add('pinned')
            const pinnedElement = document.createElement('span')
            pinnedElement.classList.add('custom-check')
            const iconPin = document.createElement('i')
            iconPin.classList.add('fa-solid', 'fa-thumbtack')
            pinnedElement.appendChild(iconPin)
            paragraph.appendChild(pinnedElement)
            pinElement.classList.add('fa-thumbtack-slash')
          } else pinElement.classList.add('fa-thumbtack')

          if (reminder) {
            const reminderElement = document.createElement('span')
            reminderElement.classList.add('custom-check')
            const iconReminder = document.createElement('i')
            iconReminder.classList.add('fa-solid', 'fa-bell')
            reminderElement.appendChild(iconReminder)
            paragraph.appendChild(reminderElement)

            const reminderElementTitle = document.createElement('span')
            reminderElementTitle.classList.add('reminder-date')
            const reminderIcon = document.createElement('i')
            reminderIcon.classList.add('fa-solid', 'fa-bell')
            reminderElementTitle.appendChild(reminderIcon)
            const reminderSpan = document.createElement('span')
            reminderSpan.textContent = new Date(reminder).toLocaleDateString(undefined, {
              weekday: 'short',
              year: '2-digit',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
            reminderElementTitle.appendChild(reminderSpan)
            titleElement.appendChild(reminderElementTitle)
          }

          if (hidden) {
            const hiddenElement = document.createElement('span')
            hiddenElement.classList.add('custom-check')
            const eyeIconElement = document.createElement('i')
            eyeIconElement.classList.add('fa-solid', 'fa-eye-slash')
            const iconEye = document.createElement('i')
            iconEye.classList.add('fa-solid', 'fa-eye-slash')
            hiddenElement.appendChild(iconEye)
            paragraph.appendChild(hiddenElement)
            contentElement.appendChild(eyeIconElement)
          } else {
            if (deContentString) {
              const clipboardIconElement = document.createElement('i')
              clipboardIconElement.classList.add('fa-solid', 'fa-clipboard', 'note-action', 'copy-note')
              clipboardIconElement.tabIndex = 0
              clipboardIconElement.setAttribute('role', 'button')
              clipboardIconElement.setAttribute('aria-label', 'Copy note content')
              bottomContentElement.appendChild(clipboardIconElement)

              const downloadIconElement = document.createElement('i')
              downloadIconElement.classList.add('fa-solid', 'fa-download', 'note-action', 'download-note')
              downloadIconElement.tabIndex = 0
              downloadIconElement.setAttribute('role', 'button')
              downloadIconElement.setAttribute('aria-label', 'Download note')
              bottomContentElement.appendChild(downloadIconElement)

              const parsedContent = marked.parse(deContentString)
              contentElement.innerHTML = parsedContent
            }
          }

          if (folder) {
            allFolders.add(folder)
            paragraph.setAttribute('data-folder', folder)
          }

          if (category) {
            allCategories.add(category)
            paragraph.setAttribute('data-category', category)
            const categoryElement = document.createElement('span')
            categoryElement.classList.add('custom-check')
            categoryElement.textContent = category
            paragraph.appendChild(categoryElement)
          }

          noteElement.appendChild(detailsElement)
          noteElement.appendChild(dateElement)
          noteElement.appendChild(bottomContentElement)

          const titleSpan = document.createElement('span')
          titleSpan.classList.add('title-list')
          titleSpan.textContent = deTitleString

          const dateSpan = document.createElement('span')
          dateSpan.classList.add('date-list')
          dateSpan.textContent = new Date(date).toLocaleDateString(undefined, {
            weekday: 'short',
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })

          fragment.appendChild(noteElement)
          paragraph.appendChild(titleSpan)
          paragraph.appendChild(dateSpan)
          if (!folder) document.querySelector('#list-notes').appendChild(paragraph)
          else {
            const folderDetails = document.querySelector(`details[data-folder="${encodeURIComponent(folder)}"]`)
            if (!folderDetails) {
              const newFolderDetails = document.createElement('details')
              newFolderDetails.setAttribute('open', 'open')
              newFolderDetails.setAttribute('data-folder', encodeURIComponent(folder))
              const summary = document.createElement('summary')
              const folderIcon = document.createElement('i')
              folderIcon.classList.add('fa-solid', 'fa-folder')
              summary.appendChild(folderIcon)
              const folderSpan = document.createElement('span')
              folderSpan.textContent = folder
              summary.appendChild(folderSpan)
              newFolderDetails.appendChild(summary)
              newFolderDetails.appendChild(paragraph)
              document.querySelector('#list-notes').appendChild(newFolderDetails)
            } else {
              folderDetails.appendChild(paragraph)
            }
          }
        })
        await Promise.all(promises)

        this.noteFolderOrCategories(allFolders, allCategories)

        document.querySelector('main').appendChild(fragment)
        this.noteActions()
      } catch (error) {
        this.showError(`An error occurred - ${error}`)
      }
    },
    async addLocalNote() {
      try {
        if (this.isLocked) return
        const noteId = window.crypto.getRandomValues(new Uint32Array(1))[0].toString(16)
        const title = document.querySelector('#note-dialog #title').value.trim()
        const content = document.querySelector('#note-dialog #content').value.trim()
        const color = document.querySelector('#colors .selected').classList[0]
        const date = new Date().toISOString().slice(0, 19).replace('T', ' ')
        const hidden = document.querySelector('#check-hidden').checked ? 1 : 0
        const folder = document.querySelector('#folders input[name="add-folder"]:checked').value
        const category = document.querySelector('#categories input[name="add-cat"]:checked').value
        const reminder = document.querySelector('#date-reminder-input').value

        if (!title || title.length > 30 || content.length > this.maxNoteContentLength || !color) return

        const mdContent = DOMPurify.sanitize(content, this.purifyConfig)

        const dbName = 'notes_db'
        const objectStoreName = 'key'
        const db = await this.openIndexedDB(dbName, objectStoreName)
        let key = await this.getKeyFromDB(db, objectStoreName)

        if (!key) {
          key = await window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt'],
          )
          await this.storeKeyInDB(db, objectStoreName, key)
        }

        const enTitle = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: new Uint8Array(12) },
          key,
          new TextEncoder().encode(JSON.stringify(title)),
        )

        const enContent = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: new Uint8Array(12) },
          key,
          new TextEncoder().encode(JSON.stringify(mdContent)),
        )

        const note = {
          id: noteId,
          title: this.arrayBufferToBase64(enTitle),
          content: this.arrayBufferToBase64(enContent),
          color,
          date,
          hidden,
          folder,
          category,
          reminder,
          pinned: 0,
        }

        if (this.isUpdate) {
          const noteIdToUpdate = document.querySelector('#id-note').value
          const noteToUpdate = this.notesJSON.find((note) => note.id === noteIdToUpdate)

          if (!noteToUpdate) return
          noteToUpdate.title = note.title
          noteToUpdate.content = note.content
          noteToUpdate.color = note.color
          noteToUpdate.date = note.date
          noteToUpdate.hidden = note.hidden
          noteToUpdate.folder = note.folder
          noteToUpdate.category = note.category
          noteToUpdate.reminder = note.reminder
          noteToUpdate.pinned = note.pinned
        } else this.notesJSON.push(note)

        localStorage.setItem('local_notes', JSON.stringify(this.notesJSON))
        document.querySelector('#note-dialog').close()
        document.querySelector('#note-dialog form').reset()
        this.noteContentLength = 0
        await this.getLocalNotes()
      } catch (error) {
        this.showError(`An error occurred - ${error}`)
      }
    },
    async updateLocalNote(noteId, title, content, color, hidden, folder, category, reminder) {
      if (hidden && this.fingerprintEnabled) {
        const res = await this.verifyFingerprint()
        if (!res) return
      }
      this.isUpdate = true
      this.noteContentLength = content.length
      document.querySelector('#note-dialog').showModal()
      document.querySelector('#id-note').value = noteId
      document.querySelector('#note-dialog #title').value = title
      document.querySelector('#note-dialog #content').value = content
      document.querySelector(`#folders input[name="add-folder"][value="${folder}"]`).checked = true
      document.querySelector(`#categories input[name="add-cat"][value="${category}"]`).checked = true
      document.querySelector('#date-reminder-input').value = reminder
      document.querySelectorAll('#colors span').forEach((e) => {
        if (e.classList.contains(color)) e.classList.add('selected')
        else e.classList.remove('selected')
      })
      document.querySelector('#check-hidden').checked = hidden
      document.querySelector('#note-dialog #content').focus()
    },
    async pinLocalNote(noteId) {
      if (!noteId) return
      const note = document.querySelector(`.note[data-note-id="${noteId}"]`)
      const pinned = note.classList.contains('pinned')
      if (pinned) note.classList.add('pinned')
      else note.classList.remove('pinned')
      this.notesJSON.find((note) => note.id === noteId).pinned = pinned ? 0 : 1
      localStorage.setItem('local_notes', JSON.stringify(this.notesJSON))
      await this.getLocalNotes()
    },
    async deleteLocalNote() {
      const noteId = document.querySelector('#id-note-delete').value
      if (!noteId) return
      this.notesJSON.splice(noteId, 1)
      localStorage.setItem('local_notes', JSON.stringify(this.notesJSON))
      document.querySelector(`.note[data-note-id="${noteId}"]`).remove()
      await this.getLocalNotes()
      document.querySelector('#delete-note-dialog').close()
    },
    async getCloudNotes() {
      if (this.isLocked) return

      const sort = localStorage.getItem('sort_notes') || '1'
      document.querySelector(`#sort-dialog input[name="sort-notes"][value="${encodeURIComponent(sort)}"]`).checked = true
      document.querySelector('#list-notes').textContent = ''
      document.querySelector('#filter-categories').textContent = ''
      document.querySelector('#folders .list').textContent = ''
      document.querySelector('#categories .list').textContent = ''
      document.querySelectorAll('.note').forEach((e) => e.remove())

      marked.use(this.markedConfig)
      marked.use(markedKatex(this.katexConfig))

      try {
        const data = new URLSearchParams({ csrfToken: this.getCsrfToken() })
        const res = await fetch('api/get-notes/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: data,
        })

        if (!res.ok) throw new Error(`An error occurred - ${res.status}`)

        const response = await res.json()

        this.name = response.name
        this.dataByteSize = response.dataByteSize
        this.maxDataByteSize = response.maxDataByteSize
        this.maxNoteContentLength = response.maxNoteContentLength
        this.notesJSON = response.notes

        document.querySelector('#last-login-date').textContent = `${response.lastLogin}GMT`

        if (this.notesJSON.length === 0) return

        this.notesJSON.sort((a, b) => {
          if (a.pinned === 1 && b.pinned === 0) return -1
          if (a.pinned === 0 && b.pinned === 1) return 1

          switch (sort) {
            case '1':
              return b.date.localeCompare(a.date)
            case '2':
              return a.date.localeCompare(b.date)
            case '3':
              return a.title.localeCompare(b.title)
            case '4':
              return b.title.localeCompare(a.title)
            default:
              break
          }
        })

        const fragment = document.createDocumentFragment()
        const allFolders = new Set()
        const allCategories = new Set()

        this.notesJSON.forEach((row) => {
          const {
            id, title, content, color, date, hidden, folder, category, pinned, link, reminder
          } = row

          if (!id || !title || !color || !date) return

          const bottomContentElement = document.createElement('div')
          bottomContentElement.classList.add('bottom-content')

          const paragraph = document.createElement('p')
          paragraph.classList.add('p-note-list')
          paragraph.tabIndex = 0
          paragraph.setAttribute('role', 'button')
          paragraph.setAttribute('data-note-id', id)

          const noteElement = document.createElement('div')
          noteElement.classList.add('note', color)
          noteElement.setAttribute('data-note-id', id)

          const titleElement = document.createElement('h2')
          titleElement.classList.add('title')
          titleElement.textContent = title

          const contentElement = document.createElement('div')
          contentElement.classList.add('details-content')

          const detailsElement = document.createElement('div')
          detailsElement.classList.add('details')
          detailsElement.appendChild(titleElement)
          detailsElement.appendChild(contentElement)

          const dateElement = document.createElement('div')
          dateElement.classList.add('date')
          dateElement.textContent += new Date(date).toLocaleDateString()

          const editIconElement = document.createElement('i')
          editIconElement.classList.add('fa-solid', 'fa-pen', 'note-action', 'edit-note')
          editIconElement.tabIndex = 0
          editIconElement.setAttribute('role', 'button')
          editIconElement.setAttribute('aria-label', 'Edit note')
          bottomContentElement.appendChild(editIconElement)

          const pinElement = document.createElement('i')
          pinElement.classList.add('fa-solid', 'note-action', 'pin-note')
          pinElement.tabIndex = 0
          pinElement.setAttribute('role', 'button')
          pinElement.setAttribute('aria-label', 'Pin note')
          bottomContentElement.appendChild(pinElement)

          if (pinned) {
            noteElement.classList.add('pinned')
            const pinnedElement = document.createElement('span')
            pinnedElement.classList.add('custom-check')
            const iconPin = document.createElement('i')
            iconPin.classList.add('fa-solid', 'fa-thumbtack')
            pinnedElement.appendChild(iconPin)
            paragraph.appendChild(pinnedElement)
            pinElement.classList.add('fa-thumbtack-slash')
          } else pinElement.classList.add('fa-thumbtack')

          if (link) {
            const linkElement = document.createElement('span')
            linkElement.classList.add('custom-check')
            const iconLink = document.createElement('i')
            iconLink.classList.add('fa-solid', 'fa-link')
            linkElement.appendChild(iconLink)
            paragraph.appendChild(linkElement)
          } else {
            const trashIconElement = document.createElement('i')
            trashIconElement.classList.add('fa-solid', 'fa-trash-can', 'note-action', 'delete-note')
            trashIconElement.tabIndex = 0
            trashIconElement.setAttribute('role', 'button')
            trashIconElement.setAttribute('aria-label', 'Delete note')
            bottomContentElement.appendChild(trashIconElement)
          }

          if (reminder) {
            const reminderElement = document.createElement('span')
            reminderElement.classList.add('custom-check')
            const iconReminder = document.createElement('i')
            iconReminder.classList.add('fa-solid', 'fa-bell')
            reminderElement.appendChild(iconReminder)
            paragraph.appendChild(reminderElement)

            const reminderElementTitle = document.createElement('span')
            reminderElementTitle.classList.add('reminder-date')
            const reminderIcon = document.createElement('i')
            reminderIcon.classList.add('fa-solid', 'fa-bell')
            reminderElementTitle.appendChild(reminderIcon)
            const reminderSpan = document.createElement('span')
            reminderSpan.textContent = new Date(reminder).toLocaleDateString(undefined, {
              weekday: 'short',
              year: '2-digit',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
            reminderElementTitle.appendChild(reminderSpan)
            titleElement.appendChild(reminderElementTitle)
          }

          if (hidden) {
            const hiddenElement = document.createElement('span')
            hiddenElement.classList.add('custom-check')
            const eyeIconElement = document.createElement('i')
            eyeIconElement.classList.add('fa-solid', 'fa-eye-slash')
            const iconEye = document.createElement('i')
            iconEye.classList.add('fa-solid', 'fa-eye-slash')
            hiddenElement.appendChild(iconEye)
            paragraph.appendChild(hiddenElement)
            contentElement.appendChild(eyeIconElement)
          } else {
            if (content) {
              const clipboardIconElement = document.createElement('i')
              clipboardIconElement.classList.add('fa-solid', 'fa-clipboard', 'note-action', 'copy-note')
              clipboardIconElement.tabIndex = 0
              clipboardIconElement.setAttribute('role', 'button')
              clipboardIconElement.setAttribute('aria-label', 'Copy note content')
              bottomContentElement.appendChild(clipboardIconElement)

              const downloadIconElement = document.createElement('i')
              downloadIconElement.classList.add('fa-solid', 'fa-download', 'note-action', 'download-note')
              downloadIconElement.tabIndex = 0
              downloadIconElement.setAttribute('role', 'button')
              downloadIconElement.setAttribute('aria-label', 'Download note')
              bottomContentElement.appendChild(downloadIconElement)

              const linkIconElement = document.createElement('i')
              linkIconElement.classList.add('fa-solid', 'fa-link', 'note-action', 'share-note')
              linkIconElement.tabIndex = 0
              linkIconElement.setAttribute('role', 'button')
              linkIconElement.setAttribute('aria-label', 'Share note')
              bottomContentElement.appendChild(linkIconElement)

              const cleanContent = DOMPurify.sanitize(content, this.purifyConfig)
              const parsedContent = marked.parse(cleanContent)
              contentElement.innerHTML = parsedContent
            }
          }

          if (folder) {
            allFolders.add(folder)
            paragraph.setAttribute('data-folder', folder)
          }

          if (category) {
            allCategories.add(category)
            paragraph.setAttribute('data-category', category)
            const categoryElement = document.createElement('span')
            categoryElement.classList.add('custom-check')
            categoryElement.textContent = category
            paragraph.appendChild(categoryElement)
          }

          const titleSpan = document.createElement('span')
          titleSpan.classList.add('title-list')
          titleSpan.textContent = title

          const dateSpan = document.createElement('span')
          dateSpan.classList.add('date-list')
          dateSpan.textContent = new Date(date).toLocaleDateString(undefined, {
            weekday: 'short',
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })

          noteElement.appendChild(detailsElement)
          noteElement.appendChild(dateElement)
          noteElement.appendChild(bottomContentElement)
          fragment.appendChild(noteElement)
          paragraph.appendChild(titleSpan)
          paragraph.appendChild(dateSpan)

          if (!folder) document.querySelector('#list-notes').appendChild(paragraph)
          else {
            const folderDetails = document.querySelector(`details[data-folder="${encodeURIComponent(folder)}"]`)
            if (!folderDetails) {
              const newFolderDetails = document.createElement('details')
              newFolderDetails.setAttribute('open', 'open')
              newFolderDetails.setAttribute('data-folder', encodeURIComponent(folder))
              const summary = document.createElement('summary')
              const folderSpan = document.createElement('span')
              folderSpan.textContent = folder
              summary.appendChild(folderSpan)
              const folderIcon = document.createElement('i')
              folderIcon.classList.add('fa-solid', 'fa-chevron-up')
              summary.appendChild(folderIcon)
              newFolderDetails.appendChild(summary)
              newFolderDetails.appendChild(paragraph)
              document.querySelector('#list-notes').appendChild(newFolderDetails)
            } else folderDetails.appendChild(paragraph)
          }
        })

        this.noteFolderOrCategories(allFolders, allCategories)

        document.querySelector('main').appendChild(fragment)
        this.noteActions()
      } catch (error) {
        this.showError(`An error occurred - ${error}`)
      }
    },
    async addCloudNote() {
      try {
        if (this.dataByteSize > this.maxDataByteSize) {
          this.showError('You have reached the maximum storage capacity...')
          return
        }
        if (this.isLocked) return
        document.querySelector('#submit-note-btn').disabled = true
        const noteId = document.querySelector('#id-note').value
        const title = document.querySelector('#note-dialog #title').value.trim()
        const content = document.querySelector('#note-dialog #content').value.trim()
        const color = document.querySelector('#colors .selected').classList[0]
        const hidden = document.querySelector('#check-hidden').checked ? 1 : 0
        const folder = document.querySelector('#folders input[name="add-folder"]:checked').value
        const category = document.querySelector('#categories input[name="add-cat"]:checked').value
        const reminder = document.querySelector('#date-reminder-input').value
        const allColors = [
          'bg-default',
          'bg-red',
          'bg-orange',
          'bg-yellow',
          'bg-lime',
          'bg-green',
          'bg-cyan',
          'bg-light-blue',
          'bg-blue',
          'bg-purple',
          'bg-pink',
        ]

        if (this.isUpdate && !noteId) return
        if (noteId && !/^[a-zA-Z0-9]+$/.test(noteId)) return
        if (!title || title.length > 30 || content.length > this.maxNoteContentLength) return
        if (!allColors.includes(color)) return
        if (reminder && !new Date(reminder).getTime()) return
        const cleanContent = DOMPurify.sanitize(content, this.purifyConfig)

        const data = new URLSearchParams({
          title,
          content: cleanContent,
          color,
          hidden,
          folder,
          category,
          reminder,
          csrfToken: this.getCsrfToken()
        })

        if (this.isUpdate) data.set('noteId', noteId)

        const url = this.isUpdate ? 'api/update-note/' : 'api/add-note/'
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: data,
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        document.querySelector('#note-dialog').close()
        document.querySelector('#note-dialog form').reset()
        this.noteContentLength = 0
        await this.getCloudNotes()
      } catch (error) {
        this.showError(`An error occurred - ${error}`)
      } finally {
        document.querySelector('#submit-note-btn').disabled = false
      }
    },
    async updateCloudNote(noteId, title, content, color, hidden, folder, category, link, reminder) {
      if (hidden && this.fingerprintEnabled) {
        const res = await this.verifyFingerprint()
        if (!res) return
      }
      this.isUpdate = true
      this.noteContentLength = content.length
      document.querySelector('#note-dialog').showModal()
      document.querySelector('#id-note').value = noteId
      document.querySelector('#note-dialog #title').value = title
      document.querySelector('#note-dialog #content').value = content
      document.querySelector(`#folders input[name="add-folder"][value="${folder}"]`).checked = true
      document.querySelector(`#categories input[name="add-cat"][value="${category}"]`).checked = true
      document.querySelector('#date-reminder-input').value = reminder
      document.querySelectorAll('#colors span').forEach((e) => {
        if (e.classList.contains(color)) e.classList.add('selected')
        else e.classList.remove('selected')
      })
      document.querySelector('#check-hidden').checked = hidden
      if (!link) document.querySelector('#check-hidden').disabled = false
      else document.querySelector('#check-hidden').disabled = true
      document.querySelector('#note-dialog #content').focus()
    },
    async pinCloudNote(noteId) {
      if (!noteId) return
      try {
        const data = new URLSearchParams({ noteId, csrfToken: this.getCsrfToken() })
        const res = await fetch('api/pin-note/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: data,
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        await this.getCloudNotes()
      } catch (error) {
        this.showError(`An error occurred - ${error}`)
      }
    },
    async deleteCloudNote() {
      const noteId = document.querySelector('#id-note-delete').value
      if (!noteId) return
      await this.fetchDeleteNote(noteId)
      document.querySelector('#delete-note-dialog').close()
    },
    async fetchAccount() {
      try {
        const res = await fetch('api/get-user/', {
          method: 'POST',
        })
        const response = await res.json()
        this.isAuthenticatedResponse = true
        this.isAuthenticated = response.isAuthenticated
      } catch (error) {
        this.showError(`An error occurred - ${error}`)
      }
    },
    async fetchDeleteNote(noteId) {
      if (!noteId) return
      try {
        const data = new URLSearchParams({ noteId, csrfToken: this.getCsrfToken() })
        const res = await fetch('api/delete-note/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: data,
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        await this.getCloudNotes()
      } catch (error) {
        this.showError(`An error occurred - ${error}`)
      }
    },
    async fetchLogout() {
      try {
        const res = await fetch('api/logout/', {
          method: 'POST',
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        window.location.reload()
      } catch (error) {
        this.showError(`An error occurred - ${error}`)
      }
    },
    async showSharedNote() {
      const urlParams = new URLSearchParams(window.location.search)
      this.noteLink = urlParams.get('link')
      document.querySelector('main').textContent = ''
      document.querySelector('main').classList.add('shared')
      if (!this.noteLink || !/^[a-zA-Z0-9]{32}$/.test(this.noteLink)) {
        const notFoundElement = document.createElement('h1')
        notFoundElement.classList.add('align-center')
        notFoundElement.textContent = 'Note not found or expired.'
        document.querySelector('main').appendChild(notFoundElement)
        return
      }

      const data = new URLSearchParams({ noteLink: this.noteLink })
      const res = await fetch('api/get-shared-note/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data,
      })

      if (!res.ok) {
        const notFoundElement = document.createElement('h1')
        notFoundElement.classList.add('align-center')
        notFoundElement.textContent = 'Note not found or expired.'
        document.querySelector('main').appendChild(notFoundElement)
        return
      }

      const note = await res.json()

      marked.use(this.markedConfig)
      marked.use(markedKatex(this.katexConfig))

      const {
        title, content, date,
      } = note

      document.title = title

      const cleanContent = DOMPurify.sanitize(content, this.purifyConfig)

      const contentHtml = marked.parse(cleanContent)
      const noteElement = document.createElement('div')
      noteElement.classList.add('shared-note')
      noteElement.tabIndex = 0

      const detailsElement = document.createElement('div')
      detailsElement.classList.add('details')

      const titleElement = document.createElement('h2')
      titleElement.classList.add('title')
      titleElement.textContent = title

      const contentElement = document.createElement('span')
      contentElement.innerHTML = contentHtml

      detailsElement.appendChild(titleElement)
      detailsElement.appendChild(contentElement)

      const bottomContentElement = document.createElement('div')
      bottomContentElement.classList.add('bottom-content')

      const dateElement = document.createElement('span')
      dateElement.classList.add('date')
      dateElement.textContent = new Date(date).toLocaleDateString(undefined, {
        weekday: 'short',
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
      bottomContentElement.appendChild(dateElement)
      noteElement.appendChild(detailsElement)
      noteElement.appendChild(bottomContentElement)
      document.querySelector('main').appendChild(noteElement)
    },
    shareNote(noteId, link) {
      if (!noteId) return
      if (link) {
        document.querySelector('#public-note-dialog').showModal()
        document.querySelector('#id-note-private').value = noteId
        document.querySelector('#link-note-private').value = link
        document.querySelector('#copy-note-link').textContent = link
      } else {
        document.querySelector('#private-note-dialog').showModal()
        document.querySelector('#id-note-public').value = noteId
      }
    },
    toggleFullscreen(noteId) {
      if (!noteId) return
      document.querySelectorAll('.note').forEach((note) => {
        if (note.getAttribute('data-note-id') !== noteId) note.classList.remove('fullscreen')
      })
      document.querySelector('#sidebar').classList.remove('show')
      const note = document.querySelector(`.note[data-note-id="${noteId}"]`)
      note.querySelector('.details').scrollTop = 0
      note.classList.toggle('fullscreen')
    },
    copy(content) {
      navigator.clipboard.writeText(content)
    },
    copyNoteLink() {
      const link = document.querySelector('#copy-note-link').textContent
      const url = new URL(`./?link=${encodeURIComponent(link)}`, window.location.href)
      navigator.clipboard.writeText(url.href)
    }
  }
}
</script>
