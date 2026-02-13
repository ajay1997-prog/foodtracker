document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration & State ---
    const CONFIG = {
        password: '1234567890', // Simple password
        startDate: new Date('2026-01-20'),
        endDate: new Date('2026-06-30'),
        storageKey: 'dayTrackerData'
    };

    let state = {
        isAuthenticated: sessionStorage.getItem('isAuthenticated') === 'true',
        entries: JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}'),
        currentView: 'dashboard',
        calendarDate: new Date() // Tracks the month currently being viewed in calendar
    };

    // --- DOM Elements ---
    const els = {
        // Login
        loginOverlay: document.getElementById('login-overlay'),
        passwordInput: document.getElementById('password-input'),
        loginBtn: document.getElementById('login-btn'),
        loginError: document.getElementById('login-error'),
        appContainer: document.getElementById('app-container'),

        // Navigation
        navItems: document.querySelectorAll('nav li'),
        viewSections: document.querySelectorAll('.view-section'),
        pageTitle: document.getElementById('page-title'),

        // Dashboard
        currentDateDisplay: document.getElementById('current-date-display'),
        daysRemaining: document.getElementById('days-remaining'),
        daysCompleted: document.getElementById('days-completed'),
        totalEntries: document.getElementById('total-entries'),
        overallProgress: document.getElementById('overall-progress'),
        progressPercentage: document.getElementById('progress-percentage'),
        recentEntriesList: document.getElementById('recent-entries-list'),

        // Calendar
        calendarGrid: document.getElementById('calendar-grid'),
        currentMonthDisplay: document.getElementById('current-month-display'),
        prevMonthBtn: document.getElementById('prev-month'),
        nextMonthBtn: document.getElementById('next-month'),

        // Modal
        entryModal: document.getElementById('entry-modal'),
        closeModalBtn: document.querySelector('.close-modal'),
        modalDateTitle: document.getElementById('modal-date-title'),
        dailyLogInput: document.getElementById('daily-log'),
        saveEntryBtn: document.getElementById('save-entry-btn'),
        imageInput: document.getElementById('image-input'),
        addPhotoBtn: document.getElementById('add-photo-btn'),
        imagePreviewContainer: document.getElementById('image-preview-container'),
        imagePreview: document.getElementById('image-preview'),
        removePhotoBtn: document.getElementById('remove-photo-btn'),
        zoomPhotoBtn: document.getElementById('zoom-photo-btn'),

        // Lightbox
        lightbox: document.getElementById('lightbox'),
        lightboxImg: document.getElementById('lightbox-img'),
        closeLightboxBtn: document.querySelector('.close-lightbox'),

        // Logout
        logoutBtn: document.getElementById('logout-btn')
    };

    let selectedDateKey = null; // Stores currently selected date in YYYY-MM-DD format

    // --- Holidays (India 2026 context - simplified set) ---
    const HOLIDAYS = {
        '2026-01-26': 'Republic Day',
        '2026-03-04': 'Holi', // Approximate
        '2026-03-29': 'Good Friday',
        '2026-04-14': 'Ambedkar Jayanti',
        '2026-05-01': 'Labor Day',
        '2026-06-30': 'Training End'
        // Add more as needed
    };

    // --- Initialization ---
    init();

    function init() {
        if (state.isAuthenticated) {
            showApp();
        } else {
            showLogin();
        }

        setupEventListeners();
        updateDashboardInfo();
        updateDashboardInfo();
    }

    function setupEventListeners() {
        // Login
        els.loginBtn.addEventListener('click', handleLogin);
        els.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });

        // Navigation
        els.navItems.forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                switchView(view);
            });
        });

        // Calendar Nav
        els.prevMonthBtn.addEventListener('click', () => changeMonth(-1));
        els.nextMonthBtn.addEventListener('click', () => changeMonth(1));

        // Modal
        els.closeModalBtn.addEventListener('click', closeModal);
        els.saveEntryBtn.addEventListener('click', saveEntry);
        window.addEventListener('click', (e) => {
            if (e.target === els.entryModal) closeModal();
        });

        // Dog Animation Focus Logic
        const dog = document.querySelector('.dog');
        if (dog) {
            els.passwordInput.addEventListener('focus', () => {
                dog.classList.add('eyes-closed');
            });
            els.passwordInput.addEventListener('blur', () => {
                dog.classList.remove('eyes-closed');
            });
            els.passwordInput.addEventListener('blur', () => {
                dog.classList.remove('eyes-closed');
            });
        }

        // Logout
        if (els.logoutBtn) {
            els.logoutBtn.addEventListener('click', handleLogout);
        }

        // Image Attachment Events
        els.addPhotoBtn.addEventListener('click', () => els.imageInput.click());
        els.imageInput.addEventListener('change', handleImageUpload);
        els.removePhotoBtn.addEventListener('click', removePhoto);
        els.zoomPhotoBtn.addEventListener('click', openLightbox);

        // Lightbox Events
        els.closeLightboxBtn.addEventListener('click', closeLightbox);
        els.lightbox.addEventListener('click', (e) => {
            if (e.target === els.lightbox) closeLightbox();
        });
    }

    // --- Authentication ---
    function handleLogout() {
        state.isAuthenticated = false;
        sessionStorage.removeItem('isAuthenticated');
        showLogin();
    }

    function handleLogin() {
        const input = els.passwordInput.value;
        if (input === CONFIG.password) {
            state.isAuthenticated = true;
            sessionStorage.setItem('isAuthenticated', 'true');
            els.loginError.textContent = '';
            showApp();
        } else {
            els.loginError.textContent = 'Incorrect password. Try again.';
            els.passwordInput.value = '';
        }
    }

    function showLogin() {
        els.loginOverlay.classList.remove('hidden');
        els.appContainer.classList.add('hidden');
    }

    function showApp() {
        els.loginOverlay.classList.add('hidden');
        els.appContainer.classList.remove('hidden');
        renderDashboard();
    }

    // --- Navigation & Views ---
    function switchView(viewName) {
        // Update Nav UI
        els.navItems.forEach(item => {
            if (item.dataset.view === viewName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update Content
        els.viewSections.forEach(section => {
            section.classList.add('hidden');
        });

        if (viewName === 'dashboard') {
            document.getElementById('dashboard-view').classList.remove('hidden');
            els.pageTitle.textContent = 'Dashboard';
            renderDashboard();
        } else if (viewName === 'calendar') {
            document.getElementById('calendar-view').classList.remove('hidden');
            els.pageTitle.textContent = 'Calendar';
            renderCalendar();
        } else if (viewName === 'settings') {
            document.getElementById('settings-view').classList.remove('hidden');
            els.pageTitle.textContent = 'Settings';
        }
    }

    // --- Theme Logic ---
    function initTheme() {
        const savedTheme = localStorage.getItem('dayTrackerTheme') || 'default';
        applyTheme(savedTheme);
    }

    function applyTheme(themeName) {
        // Remove existing theme
        document.documentElement.removeAttribute('data-theme');

        // Apply new theme (if not default)
        if (themeName !== 'default') {
            document.documentElement.setAttribute('data-theme', themeName);
        }

        // Update UI state
        document.querySelectorAll('.theme-card').forEach(card => {
            if (card.dataset.themeValue === themeName) {
                card.classList.add('active-theme');
            } else {
                card.classList.remove('active-theme');
            }
        });

        // Save preference
        localStorage.setItem('dayTrackerTheme', themeName);
    }

    // Add Theme Listeners
    document.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', () => {
            const theme = card.dataset.themeValue;
            applyTheme(theme);
        });
    });

    // Call initTheme at start
    initTheme();

    // --- Dashboard Logic ---
    function updateDashboardInfo() {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        els.currentDateDisplay.textContent = today.toLocaleDateString('en-US', options);

        // Date Calculations
        const now = new Date();
        const start = CONFIG.startDate;
        const end = CONFIG.endDate;

        // Days Remaining
        const diffTimeRemaining = end - now;
        const daysRemaining = Math.ceil(diffTimeRemaining / (1000 * 60 * 60 * 24));
        els.daysRemaining.textContent = daysRemaining > 0 ? daysRemaining : 0;

        // Days Completed
        const diffTimeCompleted = now - start;
        const daysCompleted = Math.floor(diffTimeCompleted / (1000 * 60 * 60 * 24));
        els.daysCompleted.textContent = daysCompleted > 0 ? daysCompleted : 0;

        // Progress
        const totalDuration = end - start;
        const progressRaw = (now - start) / totalDuration;
        let progressPercent = Math.round(progressRaw * 100);

        // Clamp 0-100
        if (progressPercent < 0) progressPercent = 0;
        if (progressPercent > 100) progressPercent = 100;

        els.overallProgress.style.width = `${progressPercent}%`;
        els.progressPercentage.textContent = `${progressPercent}%`;

        // Total Entries
        const entryCount = Object.keys(state.entries).length;
        els.totalEntries.textContent = entryCount;
    }

    function renderDashboard() {
        updateDashboardInfo();
        renderRecentEntries();
    }

    function renderRecentEntries() {
        const list = els.recentEntriesList;
        list.innerHTML = '';

        const entryKeys = Object.keys(state.entries).sort().reverse();
        const recentKeys = entryKeys.slice(0, 5); // Show last 5

        if (recentKeys.length === 0) {
            list.innerHTML = '<li class="empty-state">No entries yet. Go to Calendar to add one!</li>';
            return;
        }

        recentKeys.forEach(dateKey => {
            const entry = state.entries[dateKey];
            // Support both old string format and new object format
            const entryText = typeof entry === 'object' ? entry.text : entry;
            const entryImage = typeof entry === 'object' ? entry.image : null;

            const li = document.createElement('li');
            li.classList.add('entry-item');

            // Format date for display (YYYY-MM-DD -> Month Day)
            const dateObj = new Date(dateKey);
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            let html = `
                <div class="entry-item-content">
                    <div class="entry-date">${dateStr}</div>
                    <div class="entry-preview">${entryText}</div>
                </div>
            `;

            if (entryImage) {
                html += `<img src="${entryImage}" class="entry-thumbnail" alt="Thumbnail">`;
            }

            li.innerHTML = html;
            list.appendChild(li);
        });
    }

    // --- Calendar Logic ---
    function renderCalendar() {
        const year = state.calendarDate.getFullYear();
        const month = state.calendarDate.getMonth(); // 0-indexed

        els.currentMonthDisplay.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        els.calendarGrid.innerHTML = '';

        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.classList.add('calendar-day', 'empty');
            els.calendarGrid.appendChild(emptyDiv);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEl = document.createElement('div');
            dayEl.classList.add('calendar-day');
            dayEl.textContent = day;
            dayEl.dataset.date = dateStr;

            // Highlight Today
            const todayStr = new Date().toISOString().split('T')[0];
            if (dateStr === todayStr) {
                dayEl.classList.add('today');
            }

            // Check if entry exists
            if (state.entries[dateStr]) {
                dayEl.classList.add('has-entry');
            }

            // Check Holidays
            if (HOLIDAYS[dateStr]) {
                dayEl.classList.add('holiday');
                dayEl.title = HOLIDAYS[dateStr]; // Tooltip
            }

            dayEl.addEventListener('click', () => openEntryModal(dateStr));
            els.calendarGrid.appendChild(dayEl);
        }
    }

    function changeMonth(delta) {
        state.calendarDate.setMonth(state.calendarDate.getMonth() + delta);
        renderCalendar();
    }

    // --- Entry Modal Logic ---
    function openEntryModal(dateStr) {
        selectedDateKey = dateStr;
        const dateObj = new Date(dateStr);

        // Modal Titles
        const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        els.modalDateTitle.textContent = formattedDate;

        // Load existing data if any
        const entry = state.entries[dateStr];
        if (entry) {
            if (typeof entry === 'object') {
                els.dailyLogInput.value = entry.text || '';
                if (entry.image) {
                    els.imagePreview.src = entry.image;
                    els.imagePreviewContainer.classList.remove('hidden');
                    els.addPhotoBtn.classList.add('hidden');
                } else {
                    resetImagePreview();
                }
            } else {
                els.dailyLogInput.value = entry;
                resetImagePreview();
            }
        } else {
            els.dailyLogInput.value = '';
            resetImagePreview();
        }

        els.entryModal.classList.remove('hidden');
        els.dailyLogInput.focus();
    }

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Check file size (suggested < 1MB for localStorage)
        if (file.size > 1024 * 1024) {
            alert('Image is too large. Please select a photo smaller than 1MB to save space.');
            els.imageInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            els.imagePreview.src = event.target.result;
            els.imagePreviewContainer.classList.remove('hidden');
            els.addPhotoBtn.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }

    function removePhoto() {
        resetImagePreview();
        els.imageInput.value = '';
    }

    function resetImagePreview() {
        els.imagePreview.src = '';
        els.imagePreviewContainer.classList.add('hidden');
        els.addPhotoBtn.classList.remove('hidden');
    }

    // --- Lightbox Logic ---
    function openLightbox() {
        const src = els.imagePreview.src;
        if (!src) return;

        els.lightboxImg.src = src;
        els.lightbox.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    function closeLightbox() {
        els.lightbox.classList.add('hidden');
        els.lightboxImg.src = '';
        document.body.style.overflow = ''; // Restore scrolling
    }

    function closeModal() {
        els.entryModal.classList.add('hidden');
        selectedDateKey = null;
    }

    function saveEntry() {
        if (!selectedDateKey) return;

        const text = els.dailyLogInput.value.trim();
        const image = els.imagePreviewContainer.classList.contains('hidden') ? null : els.imagePreview.src;

        if (text || image) {
            state.entries[selectedDateKey] = {
                text: text,
                image: image
            };
        } else {
            // If empty, delete the entry
            delete state.entries[selectedDateKey];
        }

        // Persist
        try {
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(state.entries));
        } catch (e) {
            alert('Storage limit reached! Please remove some photos to save new logs.');
            console.error('Storage full', e);
        }

        closeModal();

        // Refresh views to show new data
        if (!document.getElementById('dashboard-view').classList.contains('hidden')) {
            renderDashboard();
        } else {
            renderCalendar(); // To update dots
        }
    }

    // --- 3D Tilt Effect ---

});
