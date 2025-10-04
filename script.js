// UI-only configuration (no Google integration)
const ROWS = 10;
const SEATS_PER_ROW = 1;

// SheetDB:
const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/ze263dpdfnt73'; 
const SHEETDB_BEARER_TOKEN = 'uv0mwwkgqtjvcxbes8xg355iogkvxiqoqki6luri'; 

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
let seatStatus = {}; // Store seat status for different sessions, dates, and locations (local only)

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    generateSeatGrid();
    setupLocationSelector();
    setMinDate();

    // Load local data first as source of truth
    loadSeatData();
    // Update grid for initial selection (if any)
    setTimeout(updateSeatGrid, 100);
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

// Update seat grid based on selected time, date, and location (local only)
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

// Submit booking (local only)
async function submitBooking() {
    const customerName = document.getElementById('customerName').value.trim();
    const customerEmail = document.getElementById('customerEmail').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();

    if (!customerName || !customerEmail || !customerPhone) {
        showStatusMessage('Please fill in all fields.', 'error');
        return;
    }
    if (!validateEmail(customerEmail)) {
        showStatusMessage('Please enter a valid email address.', 'error');
        return;
    }
    if (selectedSeats.length === 0) {
        showStatusMessage('Please select at least one seat.', 'error');
        return;
    }

    showStatusMessage('Processing your booking...', 'info');

    const bookingData = {
        timestamp: new Date().toISOString(),
        date: currentDate,
        timeSlot: currentSession,
        locationId: currentLocation || '',
        location: getLocationInfo(currentLocation)?.name || '',
        seats: selectedSeats.join(', '),
        customerName,
        customerEmail,
        customerPhone,
        totalSeats: selectedSeats.length
    };

    try {
        const sessionKey = `${currentDate}_${currentSession}_${currentLocation}`;
        if (!seatStatus[sessionKey]) seatStatus[sessionKey] = [];
        seatStatus[sessionKey].push(...selectedSeats);
        seatStatus[sessionKey] = [...new Set(seatStatus[sessionKey])];
        saveSeatData();

        // Try remote sync (non-blocking for local success)
        const remoteOk = await sendBookingToSheet(bookingData);

        selectedSeats.forEach(seatId => {
            const seat = document.getElementById(seatId);
            seat.className = 'seat booked';
        });
        selectedSeats = [];
        hideBookingForm();

        if (remoteOk) {
            showStatusMessage(`Booking saved & synced. Seats: ${bookingData.seats}`, 'success');
        } else {
            showStatusMessage(`Booking saved locally (sync failed). Seats: ${bookingData.seats}`, 'error');
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

// Save seat data to localStorage
function saveSeatData() {
    localStorage.setItem('seatStatus', JSON.stringify(seatStatus));
}

// Load seat data from localStorage
function loadSeatData() {
    const savedData = localStorage.getItem('seatStatus');
    if (savedData) {
        seatStatus = JSON.parse(savedData);
    }
}

// Selection change handler (local only)
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

// Keyboard shortcuts: only ESC to cancel (removed refresh and Google sync)
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        if (document.getElementById('bookingForm').style.display === 'block') {
            cancelBooking();
        }
    }
});