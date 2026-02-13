// Firebase Configuration (Replace with your own project config)
const firebaseConfig = {
    apiKey: "AIzaSyD4-vVRzlALQIZ6d5ZJ4fxSMFGQFTIT4oM",
    authDomain: "food-tracker-9d86f.firebaseapp.com",
    databaseURL: "https://food-tracker-9d86f-default-rtdb.firebaseio.com",
    projectId: "food-tracker-9d86f",
    storageBucket: "food-tracker-9d86f.firebasestorage.app",
    messagingSenderId: "289162148674",
    appId: "1:289162148674:web:ad49c87efd7cf7a601a6db",
    measurementId: "G-NP0T7SG57G"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM Elements
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const passwordInput = document.getElementById('password-input');
const errorMsg = document.getElementById('error-msg');
const datePicker = document.getElementById('date-picker');
const currentDateDisplay = document.getElementById('current-date-display');

// Constants
const MEALS = ['breakfast', 'lunch', 'dinner'];
const UNLOCK_TIMES = {
    'breakfast': { hour: 9, label: '9:00 AM' },
    'lunch': { hour: 14, label: '2:00 PM' },
    'dinner': { hour: 20, label: '8:00 PM' }
};

// State
let foodData = {}; // Now synced with Firebase
let currentDate = new Date().toISOString().split('T')[0];

// Initialize
function init() {
    // Set date picker to today
    datePicker.value = currentDate;
    updateDateDisplay(currentDate);

    // Add Event Listeners
    datePicker.addEventListener('change', (e) => {
        currentDate = e.target.value;
        updateDateDisplay(currentDate);
        renderDay(currentDate);
    });

    // Check locking every minute to update UI in real-time
    setInterval(checkTimeLocks, 60000);

    // Initial Render
    renderDay(currentDate);
}

// Authentication
function checkPassword() {
    const code = passwordInput.value;
    if (code === '1234') {
        loginContainer.classList.add('hidden');
        loginContainer.classList.remove('active');
        appContainer.classList.remove('hidden');
        appContainer.classList.add('active');
        init(); // Start the app
    } else {
        errorMsg.classList.remove('hidden');
        passwordInput.value = '';
    }
}

function logout() {
    appContainer.classList.add('hidden');
    appContainer.classList.remove('active');
    loginContainer.classList.remove('hidden');
    loginContainer.classList.add('active');
}

// Date Handling
function updateDateDisplay(dateStr) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateObj = new Date(dateStr);
    currentDateDisplay.textContent = dateObj.toLocaleDateString('en-US', options);
}

// Core Logic: Render Day
function renderDay(dateStr) {
    const dayRef = database.ref('foodData/' + dateStr);

    // Fetch data from Firebase
    dayRef.once('value').then((snapshot) => {
        const dayData = snapshot.val() || {};
        foodData[dateStr] = dayData; // Locally cache

        MEALS.forEach(meal => {
            const itemInput = document.getElementById(`${meal}-item`);

            // Load data or reset
            if (dayData[meal]) {
                itemInput.value = dayData[meal].item || '';
                updateStatusUI(meal, dayData[meal].status);
            } else {
                itemInput.value = '';
                resetStatusUI(meal);
            }

            // Attach input listeners to save on change
            itemInput.oninput = () => saveData(meal, 'item', itemInput.value);
        });
    }).catch((error) => {
        console.error("Firebase fetch error: ", error);
        // Fallback to empty if error (e.g. config not set)
        MEALS.forEach(meal => {
            document.getElementById(`${meal}-item`).value = '';
            resetStatusUI(meal);
        });
    });

    checkTimeLocks();
}

// Locking Logic
function checkTimeLocks() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHour = now.getHours();

    MEALS.forEach(meal => {
        const card = document.getElementById(`card-${meal}`);
        const inputs = card.querySelectorAll('input, button');
        const lockText = document.getElementById(`lock-text-${meal}`);

        let isLocked = true;
        let message = `Unlocks at ${UNLOCK_TIMES[meal].label}`;

        if (currentDate === todayStr) {
            // It's today. Check time.
            if (currentHour >= UNLOCK_TIMES[meal].hour) {
                isLocked = false;
            } else {
                isLocked = true;
                message = `Unlocks at ${UNLOCK_TIMES[meal].label}`;
            }
        } else if (currentDate < todayStr) {
            // Past dates
            isLocked = true;
            message = "Day Completed";
        } else {
            // Future dates
            isLocked = true;
            const formattedDate = new Date(currentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            message = `Unlocks on ${formattedDate}`;
        }

        // Apply Lock State
        if (isLocked) {
            card.classList.add('locked');
            inputs.forEach(el => el.disabled = true);
            lockText.textContent = message;
        } else {
            card.classList.remove('locked');
            inputs.forEach(el => el.disabled = false);
        }
    });
}

// Status Updates
function setStatus(meal, status) {
    saveData(meal, 'status', status);
    updateStatusUI(meal, status);
}

function updateStatusUI(meal, status) {
    const statusText = document.getElementById(`text-status-${meal}`);
    const ateBtn = document.querySelector(`#card-${meal} .ate`);
    const notAteBtn = document.querySelector(`#card-${meal} .not-ate`);

    // Reset classes
    ateBtn.classList.remove('active');
    notAteBtn.classList.remove('active');

    if (status === 'ate') {
        ateBtn.classList.add('active');
        statusText.textContent = "Ate";
        statusText.style.color = "var(--success)";
    } else if (status === 'not-ate') {
        notAteBtn.classList.add('active');
        statusText.textContent = "Skipped";
        statusText.style.color = "var(--danger)";
    } else {
        statusText.textContent = "Pending";
        statusText.style.color = "var(--text-muted)";
    }
}

function resetStatusUI(meal) {
    const statusText = document.getElementById(`text-status-${meal}`);
    const ateBtn = document.querySelector(`#card-${meal} .ate`);
    const notAteBtn = document.querySelector(`#card-${meal} .not-ate`);

    ateBtn.classList.remove('active');
    notAteBtn.classList.remove('active');
    statusText.textContent = "Pending";
    statusText.style.color = "var(--text-muted)";
}

// Data Persistence: Save to Firebase
function saveData(meal, key, value) {
    // Update local state first
    if (!foodData[currentDate]) foodData[currentDate] = {};
    if (!foodData[currentDate][meal]) foodData[currentDate][meal] = {};
    foodData[currentDate][meal][key] = value;

    // Push to Firebase
    const mealRef = database.ref('foodData/' + currentDate + '/' + meal);
    mealRef.update({
        [key]: value,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).catch((error) => {
        console.error("Firebase save error: ", error);
    });
}

// Print Handler
function printDay() {
    window.print();
}

// Allow Enter key for password
passwordInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        checkPassword();
    }
});
