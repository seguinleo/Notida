<template>
  <div v-if="!onLine" id="offline">
    <p>You are offline</p>
  </div>
  <header v-if="!isLocked && isLockedResponse">
    <button type="button" id="sidebar-indicator" aria-label="Open sidebar" @click="openSidebar()">
      <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none"
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
  <div v-if="!isLocked && isLockedResponse" id="sidebar">
    <nav>
      <div v-if="new Date().getMonth() === 11" class="row">
        <img src="./assets/img/christmas.png" role="presentation" alt="" class="eventImage" loading="lazy">
      </div>
      <div v-else-if="new Date().getMonth() === 9 && new Date().getDate() > 24 && new Date().getDate() <= 31"
        class="row">
        <img src="./assets/img/halloween.png" role="presentation" alt="" class="eventImage" loading="lazy">
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
      <span>Add note</span>
    </button>
    <div id="success-notification" aria-live="polite" class="d-none"></div>
    <dialog id="sort-dialog" aria-modal="true">
      <div class="popup">
        <div class="content">
          <div class="close">
            <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          </div>
          <fieldset>
            <legend>Sort notes</legend>
            <div class="row" role="radiogroup" aria-label="Sort notes" id="sortNotesGroup">
              <label class="custom-check">
                <input type="radio" name="sort-notes" value="1" id="sort-notes1" @change="selectSortOption($event)">
                <span tabindex="0">Modification date</span>
              </label>
              <label class="custom-check">
                <input type="radio" name="sort-notes" value="2" id="sort-notes2" @change="selectSortOption($event)">
                <span tabindex="0">Modification date (Z-A)</span>
              </label>
              <label class="custom-check">
                <input type="radio" name="sort-notes" value="3" id="sort-notes3" @change="selectSortOption($event)">
                <span tabindex="0">Title</span>
              </label>
              <label class="custom-check">
                <input type="radio" name="sort-notes" value="4" id="sort-notes4" @change="selectSortOption($event)">
                <span tabindex="0">Title (Z-A)</span>
              </label>
            </div>
          </fieldset>
        </div>
      </div>
    </dialog>
    <dialog id="filter-dialog" aria-modal="true">
      <div class="popup">
        <div class="content">
          <div class="close">
            <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          </div>
          <fieldset>
            <legend>Filter notes by category</legend>
            <div class="row" role="radiogroup" aria-label="Filter notes" id="filterNotesGroup"></div>
          </fieldset>
        </div>
      </div>
    </dialog>
    <dialog id="delete-note-dialog" aria-modal="true">
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
            <div class="row bold">
              Deletion is permanent!
            </div>
            <input id="id-note-delete" type="hidden">
            <div class="row">
              <button type="submit" class="btn-cancel">Delete note</button>
            </div>
          </form>
        </div>
      </div>
    </dialog>
    <dialog id="download-dialog" aria-modal="true">
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
            <div class="row" role="radiogroup" aria-label="Download notes" id="downloadNotesGroup">
              <label class="custom-check">
                <input type="radio" name="download-notes" value="txt" id="txt-download"
                  @change="downloadNotes($event.target.value)">
                <span tabindex="0">.TXT</span>
              </label>
              <label class="custom-check">
                <input type="radio" name="download-notes" value="md" id="md-download"
                  @change="downloadNotes($event.target.value)">
                <span tabindex="0">.MD</span>
              </label>
            </div>
          </fieldset>
        </div>
      </div>
    </dialog>
    <dialog id="folder-dialog" aria-modal="true">
      <div class="popup">
        <div class="content">
          <div class="close">
            <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          </div>
          <div id="folders">
            <label class="custom-check">
              <input type="radio" name="add-folder" value="" id="none-folder-add-span">
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
    <dialog id="category-dialog" aria-modal="true">
      <div class="popup">
        <div class="content">
          <div class="close">
            <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          </div>
          <div id="categories">
            <label class="custom-check">
              <input type="radio" name="add-cat" value="" id="none-cat-add-span">
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
    <dialog id="reminder-dialog" aria-modal="true">
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
    <dialog id="note-dialog" aria-modal="true">
      <div class="popup">
        <div class="content">
          <div class="popup-note-header">
            <div class="close">
              <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
            </div>
            <div class="done">
              <button type="submit" id="submit-note-btn" :form="isAuthenticated ? 'add-cloud-note' : 'add-local-note'"
                aria-label="Save note">
                <i class="fa-solid fa-check"></i>
                Done
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
              <label for="check-hidden" class="switch-label">
                Hide content
              </label>
              <label class="switch">
                <input type="checkbox" class="checkbox" id="check-hidden" role="switch" aria-label="Hide content">
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
          <div class="close">
            <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          </div>
          <div class="row bold">
            Change overall app color
          </div>
          <IroJs />
        </div>
      </div>
    </dialog>
    <dialog id="settings-dialog" aria-modal="true">
      <div class="popup popup-small">
        <div class="content">
          <div class="close">
            <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          </div>
          <div class="error-notification d-none"></div>
          <div id="legal" class="row">
            <a href="https://leoseguin.fr/mentionslegales/" rel="noopener noreferrer">Legal notice / privacy</a>
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
            <label for="check-spellcheck" class="switch-label">
              Spell check
            </label>
            <label class="switch">
              <input v-model="spellcheck" type="checkbox" id="check-spellcheck" class="checkbox"
                @change="toggleSpellcheck()" role="switch" aria-label="Spell check">
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
          <div class="row d-flex align-items-center justify-content-between">
            <label for="toggle-lock-app" class="switch-label">
              Lock app
            </label>
            <label class="switch">
              <input v-model="isToggleLockApp" type="checkbox" id="toggle-lock-app" class="checkbox"
                @click="toggleLockApp()" role="switch" aria-label="Lock app">
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
              <a href="https://github.com/seguinleo/Notida/" rel="noopener noreferrer">v26.2.2</a>
            </p>
          </div>
        </div>
      </div>
    </dialog>
    <template v-if="(isAuthenticated && isAuthenticatedResponse) && !isLocked">
      <dialog id="manage-dialog" aria-modal="true">
        <div class="popup">
          <div class="content">
            <div class="close">
              <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
            </div>
            <div id="user-name" class="row bold">
              {{ username }}
            </div>
            <div class="row last-login">
              <span>Last login: </span>
              <span id="last-login-date"></span>
            </div>
            <div class="row">
              <button type="button" id="log-out" @click="fetchLogout()">Log out</button>
            </div>
            <div class="row">
              <button type="button" id="log-out" @click="fetchLogoutAll()">
                Log out from all devices
                ({{ allUserSessions }})
              </button>
            </div>
            <div class="row">
              <span id="storage-usage">{{ (dataByteSize / 1000).toFixed(2) }} kB / {{ maxDataByteSize / 1000000 }}
                MB</span>
              <progress id="storage" :max="maxDataByteSize" :value="dataByteSize"></progress>
            </div>
            <details id="gen-psswd">
              <summary>
                Update password
                <i class="fa-solid fa-chevron-up"></i>
              </summary>
              <form id="update-psswd" @submit.prevent="updatePassword()">
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
                <button type="submit">Update password</button>
              </form>
            </details>
            <details id="delete-account">
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
                <div class="row">
                  <i class="fa-solid fa-circle-info" role="none"></i>
                  <span>Deletion is permanent! All notes will be deleted.</span>
                </div>
                <button type="submit" class="btn-cancel">Delete account</button>
              </form>
            </details>
          </div>
        </div>
      </dialog>
      <dialog id="private-note-dialog" aria-modal="true">
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
                <button type="submit">Make public</button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
      <dialog id="public-note-dialog" aria-modal="true">
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
      <dialog id="note-historic-dialog" aria-modal="true">
        <div class="popup">
          <div class="content">
            <div class="close">
              <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
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
            <div class="close">
              <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
            </div>
            <form id="login-user" autocomplete="off" @submit.prevent="loginUser()">
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
                <button type="submit">Log in</button>
              </div>
              <div class="row align-center">
                <button type="button" id="create-account" @click="openCreateAccountDialog()">Don't have an account
                  yet?</button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
      <dialog id="create-account-dialog" aria-modal="true">
        <div class="popup">
          <div class="content">
            <div class="close">
              <button type="button" aria-label="Close dialog" @click="closeDialog($event)">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
            </div>
            <form autocomplete="off" id="create-account" @submit.prevent="createAccount()">
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
              <div class="row">
                <i class="fa-solid fa-circle-info" role="none"></i>
                <span>Your password is stored securely and your notes are encrypted. You will not be able to recover
                  your password if you forget it. Save your local notes before log in!</span>
              </div>
              <button type="submit">Create my account</button>
            </form>
          </div>
        </div>
      </dialog>
      <div v-if="notesJSON.length === 0" class="welcome">
        <div class="details">
          <h1 class="title">
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
                <img alt="License" src="https://img.shields.io/github/license/seguinleo/Notida?color=8ab4f8">
                <img alt="Open source" src="https://img.shields.io/badge/project-open_source-blue">
              </p>
              <h2 id="features">📝Features</h2>
              <p>Users can create task lists, reminders, tables, links, math expressions or code blocks using Markdown
                and HTML. They can add images, audio or videos via URL. Notes can be searched, sorted by category or
                organized into folders.</p>
              <p>Users can sync notes across devices in a secure database after signing in without needing an email
                address, only a username and strong password. Public notes can be shared via a random URL.</p>
              <p>This website is a Progressive Web App (PWA) that can be installed as an application. Design is
                responsive and optimized for all mobile devices or macOS/Windows.</p>
              <p>The site is accessible to users with disabilities through high-contrast colors, ARIA modules, and
                focusable elements.</p>
              <h2 id="security">🔒Security</h2>
              <p>The website follows <a href="https://cheatsheetseries.owasp.org/" rel="noopener noreferrer">OWASP
                  security recommendations</a>.
              </p>
              <p>All notes are sanitized and validated through the DOMPurify library. All notes are encrypted with
                AES-256-GCM. Each user has a cryptographically secure key generated after signing up and a rotated JWT
                token stored in Redis.</p>
              <p>Protection against XSS and CSRF attacks is ensured through a robust CSP, secure cookies or tokens.</p>
              <p>Users can lock the app using biometrics (fingerprints, face, etc.). These biometric data are never sent
                to the server, verification is local and UI/UX only.</p>
              <h2 id="security">🌐Community</h2>
              <p>If you find issues, vulnerabilities or if you have any suggestions to improve this project, feel free
                to discuss on <a href="https://github.com/seguinleo/Notida/" rel="noopener noreferrer">GitHub</a>!</p>
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

const MARKED_CONFIG = {
  breaks: true,
  renderer: {
    link({ href, text }) {
      return `<a rel="noreferrer noopener" href="${href}">${text}</a>`
    },
    image({ href, title, text }) {
      try {
        const url = new URL(href, window.location.origin)
        if (!['http:', 'https:'].includes(url.protocol)) return ''
        return `<img crossorigin src="${url.href}" alt="${text}" title="${title || ''}" loading="lazy">`
      } catch {
        return ''
      }
    },
    checkbox({ checked }) {
      return `<label><input type="checkbox" disabled ${checked ? 'checked' : ''}>`
    }
  }
}

const PURIFY_CONFIG = {
  SANITIZE_NAMED_PROPS: true,
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(https?|mailto|tel):/i,
  FORBID_TAGS: ['dialog', 'footer', 'form', 'header', 'iframe', 'main', 'nav', 'script', 'style'],
  FORBID_ATTR: ['style', 'class', 'onclick', 'onload', 'onerror']
}

const KATEX_CONFIG = {
  throwOnError: false,
  nonStandard: true
}

const COLORS = [
  'bg-default', 'bg-red', 'bg-orange', 'bg-yellow', 'bg-lime', 'bg-green',
  'bg-cyan', 'bg-light-blue', 'bg-blue', 'bg-purple', 'bg-pink'
]

const DATE_OPTIONS = {
  weekday: 'short',
  year: '2-digit',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
}

export default {
  data() {
    return {
      username: '',
      spellcheck: true,
      touchstartX: 0,
      touchendX: 0,
      touchstartY: 0,
      touchendY: 0,
      timeoutNotification: null,
      fingerprintEnabled: true,
      onLine: true,
      isToggleLockApp: true,
      isLocked: true,
      isLockedResponse: false,
      isAuthenticated: false,
      isAuthenticatedResponse: false,
      isUpdate: false,
      dataByteSize: 0,
      noteContentLength: 0,
      allUserSessions: 0,
      maxNoteContentLength: 20000,
      maxDataByteSize: 0,
      searchValue: '',
      notesJSON: [],
      localDbName: 'notes_db',
      localDbKeyName: 'key',
      localDbKey: null,
      noteLink: '',
      urlParams: ''
    }
  },
  components: { IroJs },
  async mounted() {
    this.urlParams = new URLSearchParams(window.location.search)
    if (this.urlParams && this.urlParams.get('link')) {
      await this.showSharedNote()
      return
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .catch(err => console.warn('PWA registration failed:', err))
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
      this.touchstartY = e.changedTouches[0].screenY
    }, { passive: true })

    document.addEventListener('touchend', (e) => {
      if (this.isLocked) return
      this.touchendX = e.changedTouches[0].screenX
      this.touchendY = e.changedTouches[0].screenY
      if (this.touchstartY - this.touchendY > 50 || this.touchendY - this.touchstartY > 50) return
      if (this.touchendX - this.touchstartX > 35) {
        this.openSidebar()
      } else if (this.touchstartX - this.touchendX > 35) {
        this.closeSidebar()
      }
    }, { passive: true })

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
    async handleOnline() {
      if (this.urlParams?.get('link')) {
        await this.showSharedNote()
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
      const iv = this.base64ToArrayBuffer(payload.iv)
      const data = this.base64ToArrayBuffer(payload.data)
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        data
      )
      return JSON.parse(new TextDecoder().decode(decrypted))
    },
    getCookie(name) {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop().split(';').shift()
      return null
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
    getLockApp() {
      try {
        const lockApp = localStorage.getItem('lockApp') === 'true'

        this.isLockedResponse = true
        this.isToggleLockApp = lockApp
        this.fingerprintEnabled = lockApp
        this.isLocked = lockApp
      } catch {
        this.showError('An error occurred')
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
      } catch {
        this.showError('An error occurred')
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
      } catch {
        this.showError('An error occurred')
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
      if (!/^[\p{L} -]+$/u.test(name.normalize('NFC'))) {
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
          document.querySelectorAll('form').forEach((form) => form.reset())
          return
        }
        document.querySelector('#create-account-dialog').close()
        document.querySelectorAll('form').forEach((form) => form.reset())
        this.showSuccess('Account successfully created! You can now log in.')
      } catch {
        this.showError('An error occurred')
        document.querySelectorAll('form').forEach((form) => form.reset())
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
      if (!/^[\p{L} -]+$/u.test(nameLogin.normalize('NFC'))) {
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
          document.querySelectorAll('form').forEach((form) => form.reset())
          let time = 10
          const btn = document.querySelector('#login-user button[type="submit"]')
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
        window.location.reload()
      } catch {
        this.showError('An error occurred')
        document.querySelectorAll('form').forEach((form) => form.reset())
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
        const csrfToken = this.getCookie('csrfToken')
        const res = await fetch('api/update-password/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: data
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          document.querySelectorAll('form').forEach((form) => form.reset())
          return
        }
        window.location.reload()
      } catch {
        this.showError('An error occurred')
        document.querySelectorAll('form').forEach((form) => form.reset())
      }
    },
    async deleteAccount() {
      if (this.isLocked) return
      const psswd = document.querySelector('#delete-psswd').value
      if (!psswd || psswd.length < 10 || psswd.length > 64) return
      try {
        const data = JSON.stringify({ psswd })
        const csrfToken = this.getCookie('csrfToken')
        const res = await fetch('api/delete-account/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: data
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          document.querySelectorAll('form').forEach((form) => form.reset())
          return
        }
        window.location.reload()
      } catch {
        this.showError('An error occurred')
        document.querySelectorAll('form').forEach((form) => form.reset())
      }
    },
    async privateNote() {
      const noteId = document.querySelector('#id-note-private').value
      const noteLink = document.querySelector('#link-note-private').value
      if (!noteId || !/^[a-f0-9]{24}$/i.test(noteId)) return
      if (!noteLink || !/^[a-f0-9]{32}$/i.test(noteLink)) return
      try {
        const data = JSON.stringify({ noteId, noteLink })
        const csrfToken = this.getCookie('csrfToken')
        const res = await fetch('api/private-note/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: data
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        document.querySelector('#public-note-dialog').close()
        await this.getCloudNotes()
      } catch {
        this.showError('An error occurred')
      }
    },
    async publicNote() {
      const noteId = document.querySelector('#id-note-public').value
      if (!noteId || !/^[a-f0-9]{24}$/i.test(noteId)) return
      try {
        const data = JSON.stringify({ noteId })
        const csrfToken = this.getCookie('csrfToken')
        const res = await fetch('api/public-note/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: data
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        document.querySelector('#private-note-dialog').close()
        await this.getCloudNotes()
      } catch {
        this.showError('An error occurred')
      }
    },
    openSidebar() {
      if (this.isLocked) return
      document.querySelector('#sidebar').classList.add('show')
    },
    closeSidebar() {
      document.querySelector('#sidebar').classList.remove('show')
    },
    openCreateAccountDialog() {
      document.querySelector('#login-dialog').close()
      document.querySelector('#create-account-dialog').showModal()
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
      document.querySelector('#date-reminder-input').value = ''
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
          const noteHistoric = this.notesJSON.find((note) => note.id === noteId).historic || ''
          const noteReminder = this.notesJSON.find((note) => note.id === noteId).reminder || ''
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
            noteReminder
          )
          else if (target.classList.contains('pin-note')) this.isAuthenticated ? this.pinCloudNote(noteId) : this.pinLocalNote(noteId)
          else if (target.classList.contains('copy-note')) this.copy(noteContent)
          else if (target.classList.contains('delete-note')) this.isAuthenticated ? this.openDeleteCloudNoteDialog(noteId) : this.openDeleteLocalNoteDialog(noteId)
          else if (target.classList.contains('download-note')) this.openDownloadNoteDialog(noteId)
          else if (target.classList.contains('share-note')) this.shareNote(noteId, noteLink, noteTitle, noteContent)
          else if (target.classList.contains('historic-note')) this.showNoteHistoric(noteId, noteHistoric)
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
        e.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') this.toggleFullscreen(event.currentTarget.getAttribute('data-note-id'))
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
        label.appendChild(input)
        label.appendChild(span)
        categories.appendChild(label)

        const sortCategories = document.querySelector('#filterNotesGroup')
        const sortInput = document.createElement('input')
        sortInput.type = 'checkbox'
        sortInput.name = 'filter-notes'
        sortInput.value = category
        sortInput.id = `${category}-filter-span`
        const sortLabel = document.createElement('label')
        sortLabel.classList.add('custom-check')
        const sortSpan = document.createElement('span')
        sortSpan.textContent = category
        sortLabel.appendChild(sortInput)
        sortLabel.appendChild(sortSpan)
        sortCategories.appendChild(sortLabel)
      }
    },
    selectColor(element) {
      document.querySelectorAll('#colors span').forEach((e) => e.classList.remove('selected'))
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
      let filename
      let allNotesContent
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

      const sort = localStorage.getItem('sort_notes') || '1'
      document.querySelector(`#sort-dialog input[name="sort-notes"][value="${encodeURIComponent(sort)}"]`).checked = true
      document.querySelector('#list-notes').textContent = ''
      document.querySelector('#filterNotesGroup').textContent = ''
      document.querySelector('#folders .list').textContent = ''
      document.querySelector('#categories .list').textContent = ''
      document.querySelectorAll('.local-note').forEach((e) => e.remove())

      this.notesJSON = JSON.parse(localStorage.getItem('local_notes')) || []

      if (this.notesJSON.length === 0) return

      try {
        const db = await this.openIndexedDB(this.localDbName, this.localDbKeyName)
        this.localDbKey = await this.getKeyFromDB(db, this.localDbKeyName)

        this.notesJSON.sort((a, b) => {
          if (a.pinned === 1 && b.pinned === 0) return -1
          if (a.pinned === 0 && b.pinned === 1) return 1

          switch (sort) {
            case '1': return b.date.localeCompare(a.date)
            case '2': return a.date.localeCompare(b.date)
            case '3': return a.title.localeCompare(b.title)
            case '4': return b.title.localeCompare(a.title)
            default: break
          }
        })

        await this.renderNoteList(this.notesJSON, true)
      } catch {
        this.showError('An error occurred')
      }
    },
    async addLocalNote() {
      try {
        if (this.isLocked) return
        const noteId = crypto.getRandomValues(new Uint32Array(1))[0].toString(16)
        const title = document.querySelector('#note-dialog #title').value.trim()
        const content = document.querySelector('#note-dialog #content').value.trim()
        const color = document.querySelector('#colors .selected').classList[0]
        const date = new Date().toISOString().slice(0, 19).replace('T', ' ')
        const hidden = document.querySelector('#check-hidden').checked ? 1 : 0
        const folder = document.querySelector('#folders input[name="add-folder"]:checked').value
        const category = document.querySelector('#categories input[name="add-cat"]:checked').value
        const reminder = document.querySelector('#date-reminder-input').value

        if (!title || title.length > 30 || content.length > this.maxNoteContentLength || !color) return

        const cleanContent = DOMPurify.sanitize(content, PURIFY_CONFIG)

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
        const encryptedContent = await this.encryptLocalNotes(key, cleanContent)

        const note = {
          id: noteId,
          title: encryptedTitle,
          content: encryptedContent,
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
      } catch {
        this.showError('An error occurred')
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
      const noteIndex = this.notesJSON.findIndex(note => note.id === noteId)
      if (noteIndex === -1) return
      this.notesJSON.splice(noteIndex, 1)
      localStorage.setItem('local_notes', JSON.stringify(this.notesJSON))
      const noteElement = document.querySelector(`.note[data-note-id="${noteId}"]`)
      if (noteElement) noteElement.remove()
      await this.getLocalNotes()
      document.querySelector('#delete-note-dialog').close()
    },
    async renderNoteList(notes, isLocal = false) {
      marked.use(MARKED_CONFIG, markedKatex(KATEX_CONFIG))

      const fragment = document.createDocumentFragment()
      const allFolders = new Set()
      const allCategories = new Set()
      const paragraphs = []

      for (const row of notes) {
        const { noteElement, paragraph, folder, category } = await this.renderNote(row, isLocal)
        if (!noteElement) continue

        fragment.appendChild(noteElement)
        paragraphs.push({ paragraph, folder, category })

        if (folder) allFolders.add(folder)
        if (category) allCategories.add(category)
      }

      for (const { paragraph, folder } of paragraphs) {
        if (!folder) {
          document.querySelector('#list-notes').appendChild(paragraph)
        } else {
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
          } else {
            folderDetails.appendChild(paragraph)
          }
        }
      }

      this.noteFolderOrCategories(allFolders, allCategories)
      document.querySelector('main').appendChild(fragment)
      this.noteActions()
    },
    async renderNote(row, isLocal = false) {
      const {
        id, title, content, historic, color, date, hidden, folder, category, pinned, link, reminder
      } = row

      if (!id || !title || !color || !date) return null

      let deTitleString = title
      let deContentString = content
      if (isLocal) {
        deTitleString = await this.decryptLocalNotes(this.localDbKey, title)
        deContentString = content ? await this.decryptLocalNotes(this.localDbKey, content) : null
      }

      const bottomContentElement = document.createElement('div')
      bottomContentElement.classList.add('bottom-content')

      const paragraph = document.createElement('p')
      paragraph.classList.add('p-note-list')
      paragraph.tabIndex = 0
      paragraph.setAttribute('role', 'button')
      paragraph.setAttribute('data-note-id', id)

      const noteElement = document.createElement('div')
      noteElement.classList.add('note', color)
      noteElement.tabIndex = 0
      paragraph.setAttribute('role', 'note')
      if (isLocal) noteElement.classList.add('local-note')
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
      dateElement.textContent = new Date(date).toLocaleDateString()

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
      } else {
        pinElement.classList.add('fa-thumbtack')
      }

      if (link && !isLocal) {
        const linkElement = document.createElement('span')
        linkElement.classList.add('custom-check')
        const iconLink = document.createElement('i')
        iconLink.classList.add('fa-solid', 'fa-link')
        linkElement.appendChild(iconLink)
        paragraph.appendChild(linkElement)
      }

      if (isLocal || (!isLocal && !link)) {
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
        reminderSpan.textContent = new Date(reminder).toLocaleDateString(undefined, DATE_OPTIONS)
        reminderElementTitle.appendChild(reminderSpan)
        titleElement.appendChild(reminderElementTitle)
      }

      if (hidden) {
        const hiddenElement = document.createElement('span')
        hiddenElement.classList.add('custom-check')
        noteElement.classList.add('hidden-note')
        contentElement.textContent = 'Hidden note'
      } else {
        if (historic && !isLocal) {
          const historicIconElement = document.createElement('i')
          historicIconElement.classList.add('fa-solid', 'fa-clock-rotate-left', 'note-action', 'historic-note')
          historicIconElement.tabIndex = 0
          historicIconElement.setAttribute('role', 'button')
          historicIconElement.setAttribute('aria-label', 'View last note historic')
          bottomContentElement.appendChild(historicIconElement)
        }

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

          if (!isLocal) {
            const linkIconElement = document.createElement('i')
            linkIconElement.classList.add('fa-solid', 'fa-link', 'note-action', 'share-note')
            linkIconElement.tabIndex = 0
            linkIconElement.setAttribute('role', 'button')
            linkIconElement.setAttribute('aria-label', 'Share note')
            bottomContentElement.appendChild(linkIconElement)
          }

          const cleanContent = DOMPurify.sanitize(deContentString, PURIFY_CONFIG)
          const parsedContent = marked.parse(cleanContent)
          contentElement.innerHTML = parsedContent
        }
      }

      if (folder) {
        paragraph.setAttribute('data-folder', folder)
      }

      if (category) {
        paragraph.setAttribute('data-category', category)
        const categoryElement = document.createElement('span')
        categoryElement.classList.add('custom-check')
        categoryElement.textContent = category
        paragraph.appendChild(categoryElement)
      }

      const titleSpan = document.createElement('span')
      titleSpan.classList.add('title-list')
      titleSpan.textContent = deTitleString
      paragraph.appendChild(titleSpan)

      const dateSpan = document.createElement('span')
      dateSpan.classList.add('date-list')
      dateSpan.textContent = new Date(date).toLocaleDateString(undefined, DATE_OPTIONS)
      paragraph.appendChild(dateSpan)

      noteElement.appendChild(detailsElement)
      noteElement.appendChild(dateElement)
      noteElement.appendChild(bottomContentElement)

      return { noteElement, paragraph, folder, category }
    },
    async getCloudNotes() {
      if (this.isLocked) return

      const sort = localStorage.getItem('sort_notes') || '1'
      document.querySelector(`#sort-dialog input[name="sort-notes"][value="${encodeURIComponent(sort)}"]`).checked = true
      document.querySelector('#list-notes').textContent = ''
      document.querySelector('#filterNotesGroup').textContent = ''
      document.querySelector('#folders .list').textContent = ''
      document.querySelector('#categories .list').textContent = ''
      document.querySelectorAll('.note').forEach((e) => e.remove())

      try {
        const csrfToken = this.getCookie('csrfToken')
        const res = await fetch('api/get-notes/', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': csrfToken
          }
        })

        if (!res.ok) throw new Error(`An error occurred - ${res.status}`)

        const response = await res.json()

        this.username = response.name
        this.dataByteSize = response.dataByteSize
        this.maxDataByteSize = response.maxDataByteSize
        this.maxNoteContentLength = response.maxNoteContentLength
        this.allUserSessions = response.allUserSessions
        this.notesJSON = response.notes

        document.querySelector('#last-login-date').textContent = new Date(response.lastLogin).toLocaleDateString(undefined, DATE_OPTIONS)

        if (this.notesJSON.length === 0) return

        this.notesJSON.sort((a, b) => {
          if (a.pinned === 1 && b.pinned === 0) return -1
          if (a.pinned === 0 && b.pinned === 1) return 1

          switch (sort) {
            case '1': return b.date.localeCompare(a.date)
            case '2': return a.date.localeCompare(b.date)
            case '3': return a.title.localeCompare(b.title)
            case '4': return b.title.localeCompare(a.title)
            default: break
          }
        })

        await this.renderNoteList(this.notesJSON, false)
      } catch {
        this.showError('An error occurred')
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

        if (this.isUpdate && !noteId) return
        if (noteId && !/^[a-f0-9]{24}$/i.test(noteId)) return
        if (!title || title.length > 30 || content.length > this.maxNoteContentLength) return
        if (!COLORS.includes(color)) return
        if (reminder && !new Date(reminder).getTime()) return
        const cleanContent = DOMPurify.sanitize(content, PURIFY_CONFIG)

        let data = {}

        if (this.isUpdate) {
          data = JSON.stringify({
            noteId,
            title,
            content: cleanContent,
            color,
            hidden,
            folder,
            category,
            reminder
          })
        } else {
          data = JSON.stringify({
            title,
            content: cleanContent,
            color,
            hidden,
            folder,
            category,
            reminder
          })
        }

        const url = this.isUpdate ? 'api/update-note/' : 'api/add-note/'
        const csrfToken = this.getCookie('csrfToken')
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: data
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        document.querySelector('#note-dialog').close()
        document.querySelector('#note-dialog form').reset()
        this.noteContentLength = 0
        await this.getCloudNotes()
      } catch {
        this.showError('An error occurred')
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
      const hiddenCheckbox = document.querySelector('#check-hidden')
      if (!hiddenCheckbox) return
      hiddenCheckbox.checked = hidden
      if (!link) hiddenCheckbox.disabled = false
      else hiddenCheckbox.disabled = true
      document.querySelector('#note-dialog #content').focus()
    },
    async pinCloudNote(noteId) {
      if (!noteId) return
      try {
        const data = JSON.stringify({ noteId })
        const csrfToken = this.getCookie('csrfToken')
        const res = await fetch('api/pin-note/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: data
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        await this.getCloudNotes()
      } catch {
        this.showError('An error occurred')
      }
    },
    async deleteCloudNote() {
      const noteId = document.querySelector('#id-note-delete').value
      if (!noteId) return
      await this.fetchDeleteNote(noteId)
      document.querySelector('#delete-note-dialog').close()
    },
    async isUserAuthenticated() {
      try {
        const res = await fetch('api/whoami', { method: 'POST' })
        const data = await res.json()
        this.isAuthenticated = data.isAuthenticated
        this.isAuthenticatedResponse = true
      } catch {
        this.showError('An error occurred')
      }
    },
    async fetchDeleteNote(noteId) {
      if (!noteId) return
      try {
        const data = JSON.stringify({ noteId })
        const csrfToken = this.getCookie('csrfToken')
        const res = await fetch('api/delete-note/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: data
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        await this.getCloudNotes()
      } catch {
        this.showError('An error occurred')
      }
    },
    async fetchLogout() {
      try {
        const res = await fetch('api/logout/', {
          method: 'POST'
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        window.location.reload()
      } catch {
        this.showError('An error occurred')
      }
    },
    async fetchLogoutAll() {
      try {
        const csrfToken = this.getCookie('csrfToken')
        const res = await fetch('api/logout-all/', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': csrfToken
          }
        })
        if (!res.ok) {
          this.showError(`An error occurred - ${res.status}`)
          return
        }
        window.location.reload()
      } catch {
        this.showError('An error occurred')
      }
    },
    async showSharedNote() {
      this.noteLink = this.urlParams.get('link')
      document.querySelector('main').textContent = ''
      document.querySelector('main').classList.add('shared')
      if (!this.noteLink || !/^[a-f0-9]{32}$/i.test(this.noteLink)) {
        const notFoundElement = document.createElement('h1')
        notFoundElement.classList.add('align-center')
        notFoundElement.textContent = 'Note not found or expired.'
        document.querySelector('main').appendChild(notFoundElement)
        return
      }

      const data = JSON.stringify({ noteLink: this.noteLink })
      const res = await fetch('api/get-shared-note/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: data
      })

      if (!res.ok) {
        const notFoundElement = document.createElement('h1')
        notFoundElement.classList.add('align-center')
        notFoundElement.textContent = 'Note not found or expired.'
        document.querySelector('main').appendChild(notFoundElement)
        return
      }

      const note = await res.json()

      marked.use(MARKED_CONFIG, markedKatex(KATEX_CONFIG))

      const {
        title, content, date,
      } = note

      document.title = title

      const cleanContent = DOMPurify.sanitize(content, PURIFY_CONFIG)

      const contentHtml = marked.parse(cleanContent)
      const noteElement = document.createElement('div')
      noteElement.classList.add('shared-note')

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
      dateElement.textContent = new Date(date).toLocaleDateString(undefined, DATE_OPTIONS)
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
    showNoteHistoric(noteId, historic) {
      if (!noteId || !historic) return
      document.querySelector('#note-historic-dialog').showModal()
      document.querySelector('#note-historic-content').textContent = historic
    },
    toggleFullscreen(noteId) {
      if (!noteId) return
      document.querySelectorAll('.note').forEach((note) => {
        if (note.getAttribute('data-note-id') !== noteId) note.classList.remove('fullscreen')
      })
      this.closeSidebar()
      const note = document.querySelector(`.note[data-note-id="${noteId}"]`)
      note.querySelector('.details').scrollTop = 0
      note.classList.toggle('fullscreen')
    },
    copy(content) {
      navigator.clipboard.writeText(content)
      this.showSuccess('Content copied to clipboard!')
    },
    copyNoteLink() {
      const link = document.querySelector('#copy-note-link').textContent
      const url = new URL(`./?link=${encodeURIComponent(link)}`, window.location.href)
      navigator.clipboard.writeText(url.href)
    }
  }
}
</script>
