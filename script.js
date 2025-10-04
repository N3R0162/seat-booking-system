// UI-only configuration (no Google integration)
const ROWS = 10;
const SEATS_PER_ROW = 1;

// SheetDB configuration injected via build-time environment variables
const SHEETDB_API_URL = (window.__SEAT_BOOKING_CONFIG__ && window.__SEAT_BOOKING_CONFIG__.SHEETDB_API_URL) || '';
const SHEETDB_BEARER_TOKEN = (window.__SEAT_BOOKING_CONFIG__ && window.__SEAT_BOOKING_CONFIG__.SHEETDB_BEARER_TOKEN) || '';

// Event Configuration
// For single-day events:
// const PREDEFINED_EVENT_DATE = '2024-03-15'; // Single date
// const EVENT_NAME = 'Spring Musical Performance';

// For multi-day events:
const PREDEFINED_EVENT_DATES = ['2025-09-30', '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08', '2025-10-09']; // Multiple dates array
const EVENT_NAME = ''; // Name for multi-day event
const PREDEFINED_EVENT_DATE = ''; // Leave empty when using multi-day

// Location Configuration
const EVENT_LOCATIONS = [
    { id: '99', name: 'Phòng máy 99', capacity: 10 },
    { id: '245', name: 'Phòng máy 245', capacity: 10 },
]; // Leave empty array [] for no location selection

// Global variables
let selectedSeats = [];
let currentSession = '';
let currentDate = '';
let currentLocation = '';
let seatStatus = {}; // In-memory seat status map (rebuilt from remote API)
let isSyncing = false; // Track sync state
let pollInterval = null; // For periodic polling
let lastSyncTime = 0; // Track last sync timestamp

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    generateSeatGrid();
    setupLocationSelector();
    setMinDate();
    // Initial empty render
    setTimeout(updateSeatGrid, 50);
    // Fetch current bookings from API
    refreshSeatStatusFromAPI();
    // Start periodic polling every 45 seconds
    startPeriodicPolling();
    // Setup real-time validation
    setupInputValidation();
});

// Set minimum date to today or use predefined event date(s)
function setMinDate() {
    const bookingDateElement = document.getElementById('bookingDate');

    // Clear existing options first
    bookingDateElement.innerHTML = '<option value="">Choose a date...</option>';

    // Check for multi-day event first
    if (PREDEFINED_EVENT_DATES && PREDEFINED_EVENT_DATES.length > 0) {
        const sortedDates = [...PREDEFINED_EVENT_DATES].sort();

        // Populate dropdown with available dates
        sortedDates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;

            // Format date for display (e.g., "October 8, 2025")
            const dateObj = new Date(date + 'T00:00:00');
            const formattedDate = dateObj.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            option.textContent = formattedDate;
            bookingDateElement.appendChild(option);
        });

        if (!bookingDateElement.value) {
            bookingDateElement.value = sortedDates[0];
        }

        bookingDateElement.disabled = false;
        bookingDateElement.classList.add('event-enabled');

        const dateLabel = document.querySelector('label[for="bookingDate"]');
        if (dateLabel) {
            dateLabel.textContent = `Select Event Date:`;
            dateLabel.classList.add('event-label');
        }

        bookingDateElement.addEventListener('change', function() {
            if (this.value && this.value !== '') {
                validateEventDate();
                handleSelectionChange();
            }
        });

        bookingDateElement.addEventListener('focus', function() {
            if (!this.value || this.value === '') {
                this.value = sortedDates[0];
                this.dispatchEvent(new Event('change'));
            }
        });

        setTimeout(() => {
            updateSeatGrid();
        }, 100);

    } else if (PREDEFINED_EVENT_DATE) {
        const option = document.createElement('option');
        option.value = PREDEFINED_EVENT_DATE;

        const dateObj = new Date(PREDEFINED_EVENT_DATE + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        option.textContent = formattedDate;
        option.selected = true;
        bookingDateElement.appendChild(option);

        bookingDateElement.disabled = true;
        bookingDateElement.classList.remove('event-enabled');

        const dateLabel = document.querySelector('label[for="bookingDate"]');
        if (dateLabel) {
            if (EVENT_NAME) {
                dateLabel.textContent = `Event Date (${EVENT_NAME}):`;
            } else {
                dateLabel.textContent = 'Event Date (Fixed):';
            }
            dateLabel.classList.add('event-label');
        }

        setTimeout(() => {
            updateSeatGrid();
        }, 100);
    } else {
        // Normal date selection - populate with next 30 days
        const today = new Date();

        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);

            const option = document.createElement('option');
            const dateStr = date.toISOString().split('T')[0];
            option.value = dateStr;

            const formattedDate = date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            option.textContent = formattedDate;

            if (i === 0) {
                option.selected = true;
            }

            bookingDateElement.appendChild(option);
        }

        bookingDateElement.disabled = false;
        bookingDateElement.classList.remove('event-enabled');

        const dateLabel = document.querySelector('label[for="bookingDate"]');
        if (dateLabel) {
            dateLabel.textContent = 'Select Date:';
            dateLabel.classList.remove('event-label');
        }
    }
}

// Validate selected date for multi-day events
function validateEventDate() {
    const bookingDateElement = document.getElementById('bookingDate');
    const selectedDate = bookingDateElement.value;

    if (!selectedDate || selectedDate === '') {
        return false;
    }

    if (PREDEFINED_EVENT_DATES && PREDEFINED_EVENT_DATES.length > 0) {
        if (!PREDEFINED_EVENT_DATES.includes(selectedDate)) {
            const sortedDates = [...PREDEFINED_EVENT_DATES].sort();
            bookingDateElement.value = sortedDates[0];

            showStatusMessage(`Please select a valid event date. Available dates: ${formatEventDates()}`, 'error');
            return false;
        }
    }

    updateSeatGrid();
    return true;
}

// Format event dates for display
function formatEventDates() {
    if (PREDEFINED_EVENT_DATES && PREDEFINED_EVENT_DATES.length > 0) {
        const sortedDates = [...PREDEFINED_EVENT_DATES].sort();
        return sortedDates.map(date => {
            const dateObj = new Date(date);
            return dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        }).join(', ');
    }
    return '';
}

// Generate the seat grid
function generateSeatGrid() {
    const seatGrid = document.getElementById('seatGrid');
    seatGrid.innerHTML = '';

    for (let row = 1; row <= ROWS; row++) {
        for (let seat = 1; seat <= SEATS_PER_ROW; seat++) {
            const seatId = `${String.fromCharCode(64 + row)}${seat}`; // A1, A2, B1, B2, etc.
            const seatButton = document.createElement('button');
            seatButton.className = 'seat disabled';
            seatButton.id = seatId;
            seatButton.textContent = seatId;
            seatButton.onclick = () => toggleSeat(seatId);
            seatGrid.appendChild(seatButton);
        }
    }
}

// Setup location selector
function setupLocationSelector() {
    if (EVENT_LOCATIONS && EVENT_LOCATIONS.length > 0) {
        const locationContainer = document.querySelector('.location-selector');
        if (locationContainer) {
            locationContainer.style.display = 'flex';

            const locationSelect = document.getElementById('locationSelect');
            if (locationSelect) {
                locationSelect.innerHTML = '<option value="">Choose a location...</option>';

                EVENT_LOCATIONS.forEach(location => {
                    const option = document.createElement('option');
                    option.value = location.id;
                    option.textContent = `${location.name} (${location.capacity} seats)`;
                    locationSelect.appendChild(option);
                });

                if (EVENT_LOCATIONS.length === 1) {
                    locationSelect.value = EVENT_LOCATIONS[0].id;
                    currentLocation = EVENT_LOCATIONS[0].id;
                }
            }
        }
    } else {
        const locationContainer = document.querySelector('.location-selector');
        if (locationContainer) {
            locationContainer.style.display = 'none';
        }
    }
}

// Update seat grid based on selected time, date, and location (reflects in-memory map built from API data)
function updateSeatGrid() {
    const timeSlot = document.getElementById('timeSlot').value;
    const bookingDateElement = document.getElementById('bookingDate');
    const bookingDate = bookingDateElement.value;
    const locationSelect = document.getElementById('locationSelect');
    const selectedLocation = locationSelect ? locationSelect.value : '';

    if ((PREDEFINED_EVENT_DATE || (PREDEFINED_EVENT_DATES && PREDEFINED_EVENT_DATES.length > 0)) && !bookingDate) {
        return;
    }

    if (PREDEFINED_EVENT_DATES && PREDEFINED_EVENT_DATES.length > 0 && bookingDate) {
        if (!PREDEFINED_EVENT_DATES.includes(bookingDate)) {
            showStatusMessage(`Invalid date selected. Please choose from: ${formatEventDates()}`, 'error');
            return;
        }
    }

    if (EVENT_LOCATIONS && EVENT_LOCATIONS.length > 1 && !selectedLocation) {
        const seats = document.querySelectorAll('.seat');
        seats.forEach(seat => {
            seat.className = 'seat disabled';
        });
        hideBookingForm();
        return;
    }

    if (!timeSlot || !bookingDate) {
        const seats = document.querySelectorAll('.seat');
        seats.forEach(seat => {
            seat.className = 'seat disabled';
        });
        hideBookingForm();
        return;
    }

    currentSession = timeSlot;
    currentDate = bookingDate;
    currentLocation = selectedLocation;

    // Reset selected seats when changing session, date, or location
    selectedSeats = [];
    hideBookingForm();

    // Update seat status based on current session, date, and location
    const sessionKey = `${bookingDate}_${timeSlot}_${selectedLocation}`;
    const bookedSeats = seatStatus[sessionKey] || [];

    const seats = document.querySelectorAll('.seat');
    seats.forEach(seat => {
        const seatId = seat.id;
        if (bookedSeats.includes(seatId)) {
            seat.className = 'seat booked';
        } else {
            seat.className = 'seat available';
        }
    });

    // Status message
    let eventInfo = '';
    const locationInfo = getLocationInfo(selectedLocation);

    if (PREDEFINED_EVENT_DATES && PREDEFINED_EVENT_DATES.length > 0) {
        const dateObj = new Date(bookingDate);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
        eventInfo = ` for ${EVENT_NAME} (${formattedDate})`;
    } else if (PREDEFINED_EVENT_DATE) {
        eventInfo = ` for ${EVENT_NAME}`;
    }

    if (locationInfo) {
        eventInfo += ` at ${locationInfo.name}`;
    }

    showStatusMessage(`Seats updated for selected time and date${eventInfo}.`, 'info');
}

// Get location information by ID
function getLocationInfo(locationId) {
    if (!locationId || !EVENT_LOCATIONS || EVENT_LOCATIONS.length === 0) {
        return null;
    }
    return EVENT_LOCATIONS.find(location => location.id === locationId) || null;
}

// Toggle seat selection
function toggleSeat(seatId) {
    const seat = document.getElementById(seatId);

    // Block interaction during sync
    if (isSyncing) {
        showStatusMessage('Please wait while seat data is being updated...', 'info');
        return;
    }

    if (seat.classList.contains('booked') || seat.classList.contains('disabled')) {
        return;
    }

    if (!currentSession || !currentDate) {
        showStatusMessage('Please select a time slot and date first.', 'error');
        return;
    }

    if (EVENT_LOCATIONS && EVENT_LOCATIONS.length > 1 && !currentLocation) {
        showStatusMessage('Please select a location first.', 'error');
        return;
    }

    if (seat.classList.contains('selected')) {
        seat.className = 'seat available';
        selectedSeats = selectedSeats.filter(id => id !== seatId);
    } else {
        seat.className = 'seat selected';
        selectedSeats.push(seatId);
    }

    if (selectedSeats.length > 0) {
        showBookingForm();
    } else {
        hideBookingForm();
    }
}

// Show booking form
function showBookingForm() {
    const bookingForm = document.getElementById('bookingForm');
    const selectedDate = document.getElementById('selectedDate');
    const selectedTime = document.getElementById('selectedTime');
    const selectedSeatsSpan = document.getElementById('selectedSeats');
    const selectedLocationSpan = document.getElementById('selectedLocation');

    selectedDate.textContent = formatDate(currentDate);
    selectedTime.textContent = currentSession;
    selectedSeatsSpan.textContent = selectedSeats.join(', ');

    if (selectedLocationSpan) {
        const locationInfo = getLocationInfo(currentLocation);
        if (locationInfo) {
            selectedLocationSpan.textContent = locationInfo.name;
            selectedLocationSpan.parentElement.style.display = 'block';
        } else {
            selectedLocationSpan.parentElement.style.display = 'none';
        }
    }

    bookingForm.style.display = 'block';
}

// Hide booking form
function hideBookingForm() {
    const bookingForm = document.getElementById('bookingForm');
    bookingForm.style.display = 'none';

    // Clear form fields
    document.getElementById('customerName').value = '';
    document.getElementById('customerEmail').value = '';
    document.getElementById('customerPhone').value = '';
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Submit booking (API-driven)
async function submitBooking() {
    const customerName = document.getElementById('customerName').value.trim();
    const customerEmail = document.getElementById('customerEmail').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();

    // Validate all fields with visual feedback
    const validation = validateFormFields();
    
    if (!validation.isValid) {
        if (!validation.nameValid) {
            showStatusMessage('Please enter a valid name.', 'error');
        } else if (!validation.emailValid) {
            showStatusMessage('Please enter a valid email address.', 'error');
        } else if (!validation.phoneValid) {
            showStatusMessage('Please enter a valid 10-digit phone number.', 'error');
        }
        return;
    }
    
    if (selectedSeats.length === 0) {
        showStatusMessage('Please select at least one seat.', 'error');
        return;
    }

    // Prevent submission during sync
    if (isSyncing) {
        showStatusMessage('Please wait while seat data is being updated...', 'info');
        return;
    }

    // Store selected seats before any async operations
    const seatsToBook = [...selectedSeats]; // Create a copy

    showStatusMessage('Checking seat availability...', 'info');

    try {
        // First, refresh seat status to check for conflicts (preserve selection)
        await refreshSeatStatusFromAPI(true, true); // Silent refresh + preserve selection

        // Check if any selected seats are now booked (conflict detection)
        const sessionKey = `${currentDate}_${currentSession}_${currentLocation}`;
        const currentlyBookedSeats = seatStatus[sessionKey] || [];
        const conflictSeats = seatsToBook.filter(seat => currentlyBookedSeats.includes(seat));

        if (conflictSeats.length > 0) {
            // Clear conflicted selections
            selectedSeats = selectedSeats.filter(seat => !conflictSeats.includes(seat));
            hideBookingForm();
            updateSeatGrid();
            showStatusMessage(`Seats ${conflictSeats.join(', ')} were just booked by someone else. Please select different seats.`, 'error');
            return;
        }

        showStatusMessage('Processing your booking...', 'info');

        // Use the stored seats copy for booking data
        const bookingData = {
            timestamp: new Date().toISOString(),
            date: currentDate,
            timeSlot: currentSession,
            locationId: currentLocation || '',
            location: getLocationInfo(currentLocation)?.name || '',
            seats: seatsToBook.join(', '), // Use the copy
            customerName,
            customerEmail,
            customerPhone: String(customerPhone), // Ensure phone is sent as string
            totalSeats: seatsToBook.length // Use the copy
        };

        // Remote first approach
        const remoteOk = await sendBookingToSheet(bookingData);
        if (remoteOk) {
            selectedSeats = [];
            hideBookingForm();
            await refreshSeatStatusFromAPI();
            showStatusMessage(`Booking saved & synced. Seats: ${bookingData.seats}`, 'success');
        } else {
            showStatusMessage('Booking failed to sync. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Booking error:', error);
        showStatusMessage('Booking failed. Please try again.', 'error');
    }
}
async function sendBookingToSheet(booking) {
    if (!SHEETDB_API_URL) return false;

    const row = {
        timestamp: booking.timestamp,
        date: booking.date,
        timeSlot: booking.timeSlot,
        locationId: booking.locationId,
        location: booking.location,
        seats: booking.seats,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone
    };

    const headers = { 'Content-Type': 'application/json' };
    if (SHEETDB_BEARER_TOKEN) headers['Authorization'] = `Bearer ${SHEETDB_BEARER_TOKEN}`;

    try {
        const res = await fetch(SHEETDB_API_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify({ data: [row] })
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || 'SheetDB error');
        }
        return true;
    } catch (e) {
        console.error('SheetDB POST failed:', e);
        return false;
    }
}

async function fetchBookingsFromSheet() {
    if (!SHEETDB_API_URL) return [];

    const headers = {};
    if (SHEETDB_BEARER_TOKEN) headers['Authorization'] = `Bearer ${SHEETDB_BEARER_TOKEN}`;

    try {
        const res = await fetch(SHEETDB_API_URL, { headers });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || 'SheetDB fetch error');
        }
        const data = await res.json();
        return data;
    } catch (e) {
        console.error('SheetDB fetch failed:', e);
        return [];
    }
}

// Build seat status map from remote booking rows
function buildSeatStatusFromBookings(bookings) {
    seatStatus = {};
    bookings.forEach(row => {
        const date = row.date || row.Date || row.DATE;
        const timeSlot = row.timeSlot || row.TimeSlot || row.timeslot || row.session;
        const locationId = row.locationId || row.location_id || '';
        const seatsStr = row.seats || row.Seats || row.SEATS;
        if (!date || !timeSlot || !seatsStr) return;
        const key = `${date}_${timeSlot}_${locationId}`;
        const seatsArr = seatsStr.split(',').map(s => s.trim()).filter(Boolean);
        if (!seatStatus[key]) seatStatus[key] = [];
        seatStatus[key].push(...seatsArr);
        seatStatus[key] = [...new Set(seatStatus[key])];
    });
}

// Refresh seat status from API and update UI
async function refreshSeatStatusFromAPI(silent = false, preserveSelection = false) {
    if (isSyncing) return; // Prevent concurrent syncs
    
    isSyncing = true;
    updateSyncUI('syncing');
    
    try {
        const bookings = await fetchBookingsFromSheet();
        buildSeatStatusFromBookings(bookings);
        
        // Store current selection before updating grid
        const currentSelection = preserveSelection ? [...selectedSeats] : [];
        
        updateSeatGrid();
        
        // Restore selection if preserveSelection is true
        if (preserveSelection && currentSelection.length > 0) {
            selectedSeats = currentSelection;
            // Re-apply visual selection to seats
            currentSelection.forEach(seatId => {
                const seat = document.getElementById(seatId);
                if (seat && !seat.classList.contains('booked')) {
                    seat.className = 'seat selected';
                }
            });
            // Show booking form if seats are selected
            if (selectedSeats.length > 0) {
                showBookingForm();
            }
        }
        
        lastSyncTime = Date.now();
        
        if (!silent) {
            updateSyncUI('success');
            setTimeout(() => updateSyncUI(''), 3000);
        } else {
            updateSyncUI('');
        }
    } catch (e) {
        console.error('Refresh failed', e);
        updateSyncUI('error');
        if (!silent) {
            showStatusMessage('Could not refresh seat data from server.', 'error');
        }
        setTimeout(() => updateSyncUI(''), 5000);
    } finally {
        isSyncing = false;
    }
}

// Cancel booking
function cancelBooking() {
    selectedSeats.forEach(seatId => {
        const seat = document.getElementById(seatId);
        seat.className = 'seat available';
    });

    selectedSeats = [];
    hideBookingForm();

    showStatusMessage('Booking cancelled.', 'info');
}

// Validate email format
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate phone number (exactly 10 digits)
function validatePhone(phone) {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
}

// Validate name (not empty)
function validateName(name) {
    return name && name.trim().length > 0;
}

// Add visual validation feedback to input field
function setFieldValidation(fieldId, isValid) {
    const field = document.getElementById(fieldId);
    if (field) {
        if (isValid) {
            field.classList.remove('invalid');
        } else {
            field.classList.add('invalid');
        }
    }
}

// Validate all form fields and apply visual feedback
function validateFormFields() {
    const customerName = document.getElementById('customerName').value.trim();
    const customerEmail = document.getElementById('customerEmail').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();

    const nameValid = validateName(customerName);
    const emailValid = validateEmail(customerEmail);
    const phoneValid = validatePhone(customerPhone);

    setFieldValidation('customerName', nameValid);
    setFieldValidation('customerEmail', emailValid);
    setFieldValidation('customerPhone', phoneValid);

    return {
        isValid: nameValid && emailValid && phoneValid,
        nameValid,
        emailValid,
        phoneValid
    };
}

// Setup real-time input validation
function setupInputValidation() {
    const nameField = document.getElementById('customerName');
    const emailField = document.getElementById('customerEmail');
    const phoneField = document.getElementById('customerPhone');

    if (nameField) {
        nameField.addEventListener('blur', function() {
            const isValid = validateName(this.value.trim());
            setFieldValidation('customerName', isValid);
        });
        nameField.addEventListener('input', function() {
            if (this.classList.contains('invalid')) {
                const isValid = validateName(this.value.trim());
                if (isValid) {
                    setFieldValidation('customerName', true);
                }
            }
        });
    }

    if (emailField) {
        emailField.addEventListener('blur', function() {
            const isValid = validateEmail(this.value.trim());
            setFieldValidation('customerEmail', isValid);
        });
        emailField.addEventListener('input', function() {
            if (this.classList.contains('invalid')) {
                const isValid = validateEmail(this.value.trim());
                if (isValid) {
                    setFieldValidation('customerEmail', true);
                }
            }
        });
    }

    if (phoneField) {
        phoneField.addEventListener('blur', function() {
            const isValid = validatePhone(this.value.trim());
            setFieldValidation('customerPhone', isValid);
        });
        phoneField.addEventListener('input', function() {
            if (this.classList.contains('invalid')) {
                const isValid = validatePhone(this.value.trim());
                if (isValid) {
                    setFieldValidation('customerPhone', true);
                }
            }
        });
    }
}

// Show status message
function showStatusMessage(message, type) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;

    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            statusMessage.textContent = '';
            statusMessage.className = 'status-message';
        }, 5000);
    }
}

// Selection change handler
function handleSelectionChange() {
    updateSeatGrid();
}

function getEventTypeInfo() {
    if (PREDEFINED_EVENT_DATES && PREDEFINED_EVENT_DATES.length > 0) {
        return {
            type: 'multi-day',
            name: EVENT_NAME,
            dates: PREDEFINED_EVENT_DATES,
            totalDays: PREDEFINED_EVENT_DATES.length,
            locations: EVENT_LOCATIONS || [],
            hasLocations: EVENT_LOCATIONS && EVENT_LOCATIONS.length > 0
        };
    } else if (PREDEFINED_EVENT_DATE) {
        return {
            type: 'single-day',
            name: EVENT_NAME,
            date: PREDEFINED_EVENT_DATE,
            locations: EVENT_LOCATIONS || [],
            hasLocations: EVENT_LOCATIONS && EVENT_LOCATIONS.length > 0
        };
    }
    return {
        type: 'normal',
        name: null,
        locations: EVENT_LOCATIONS || [],
        hasLocations: EVENT_LOCATIONS && EVENT_LOCATIONS.length > 0
    };
}

// Get current booking session key
function getCurrentSessionKey() {
    return `${currentDate}_${currentSession}_${currentLocation}`;
}

// Get available locations
function getAvailableLocations() {
    return EVENT_LOCATIONS || [];
}

// Update sync UI elements
function updateSyncUI(state) {
    const refreshBtn = document.getElementById('refreshBtn');
    const syncStatus = document.getElementById('syncStatus');
    
    if (!refreshBtn || !syncStatus) return;
    
    switch (state) {
        case 'syncing':
            refreshBtn.disabled = true;
            refreshBtn.classList.add('syncing');
            refreshBtn.textContent = '🔄 Syncing...';
            syncStatus.textContent = 'Syncing...';
            syncStatus.className = 'sync-status syncing';
            break;
        case 'success':
            refreshBtn.disabled = false;
            refreshBtn.classList.remove('syncing');
            refreshBtn.textContent = 'Refresh';
            syncStatus.textContent = 'Up to date';
            syncStatus.className = 'sync-status success';
            break;
        case 'error':
            refreshBtn.disabled = false;
            refreshBtn.classList.remove('syncing');
            refreshBtn.textContent = 'Retry';
            syncStatus.textContent = 'Sync failed';
            syncStatus.className = 'sync-status error';
            break;
        default:
            refreshBtn.disabled = false;
            refreshBtn.classList.remove('syncing');
            refreshBtn.textContent = 'Refresh';
            syncStatus.textContent = '';
            syncStatus.className = 'sync-status';
    }
}

// Manual refresh function
async function manualRefresh() {
    if (isSyncing) return;
    await refreshSeatStatusFromAPI();
}

// Start periodic polling
function startPeriodicPolling() {
    // Clear existing interval if any
    if (pollInterval) {
        clearInterval(pollInterval);
    }
    
    // Poll every 45 seconds
    pollInterval = setInterval(async () => {
        // Only poll if not currently syncing and if the page is visible
        if (!isSyncing && !document.hidden) {
            await refreshSeatStatusFromAPI(true); // Silent refresh
        }
    }, 45000);
}

// Stop polling when page becomes hidden to save resources
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    } else {
        // Restart polling when page becomes visible again
        startPeriodicPolling();
        // Immediate refresh when coming back to the tab
        if (!isSyncing) {
            refreshSeatStatusFromAPI(true);
        }
    }
});

// Keyboard shortcuts: only ESC to cancel (removed refresh and Google sync)
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        if (document.getElementById('bookingForm').style.display === 'block') {
            cancelBooking();
        }
    }
});