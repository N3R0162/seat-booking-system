// Configuration
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwTcN1Qqjlo6o5XxBo_E_az7xnFVms4HCpPJt18sGW_3dyPKvQH1VyosB3O4ZcO9v_C/exec'; // Replace with your actual Google Apps Script URL
const ROWS = 10;
const SEATS_PER_ROW = 1;
const MAX_SEATS_PER_ROW = 10;

// Event Configuration
// For single-day events:
// const PREDEFINED_EVENT_DATE = '2024-03-15'; // Single date
// const EVENT_NAME = 'Spring Musical Performance';

// For multi-day events:
const PREDEFINED_EVENT_DATES = ['2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08', '2025-10-09', '']; // Multiple dates array
const EVENT_NAME = ''; // Name for multi-day event
const PREDEFINED_EVENT_DATE = ''; // Leave empty when using multi-day

// Location Configuration
const EVENT_LOCATIONS = [
    { id: '99', name: 'Phòng máy 99', capacity: 10 },
    { id: '245', name: 'Phòng máy 245', capacity: 10 },
]; // Leave empty array [] for no location selection

// Examples:
// Single day event:
// const PREDEFINED_EVENT_DATE = '2024-12-25';
// const PREDEFINED_EVENT_DATES = [];
// const EVENT_NAME = 'Christmas Concert';
// const EVENT_LOCATIONS = [{ id: 'main-hall', name: 'Main Concert Hall', capacity: 500 }];

// Multi-day event:
// const PREDEFINED_EVENT_DATE = '';
// const PREDEFINED_EVENT_DATES = ['2024-06-10', '2024-06-11', '2024-06-12'];
// const EVENT_NAME = 'Annual Conference 2024';
// const EVENT_LOCATIONS = [
//     { id: 'room-a', name: 'Conference Room A', capacity: 200 },
//     { id: 'room-b', name: 'Conference Room B', capacity: 150 },
//     { id: 'main-auditorium', name: 'Main Auditorium', capacity: 800 }
// ];
// Global variables
let selectedSeats = [];
let currentSession = '';
let currentDate = '';
let currentLocation = '';
let seatStatus = {}; // Store seat status for different sessions, dates, and locations

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    generateSeatGrid();
    setupLocationSelector();
    setMinDate();
    
    // Load local data first as fallback
    loadSeatData();
    
    // Then sync from Google Sheets to get latest data
    await syncAllBookingsFromGoogleSheets();
    
    // Initialize current values from form elements after everything is set up
    const bookingDateElement = document.getElementById('bookingDate');
    const sessionElement = document.getElementById('sessionSelect');
    const locationElement = document.getElementById('locationSelect');
    
    if (bookingDateElement && bookingDateElement.value) {
        currentDate = bookingDateElement.value;
    }
    if (sessionElement && sessionElement.value) {
        currentSession = sessionElement.value;
    }
    if (locationElement && locationElement.value) {
        currentLocation = locationElement.value;
    }
    
    console.log('Initialized values:', { currentDate, currentSession, currentLocation });
    
    // Add event listeners for form changes
    if (sessionElement) {
        sessionElement.addEventListener('change', function() {
            currentSession = this.value;
            selectedSeat = null; // Clear selected seat when session changes
            handleSelectionChange();
        });
    }
    
    if (locationElement) {
        locationElement.addEventListener('change', function() {
            currentLocation = this.value;
            selectedSeat = null; // Clear selected seat when location changes
            handleSelectionChange();
        });
    }
    
    // Update seat grid with initial values
    if (currentDate && currentSession) {
        updateSeatGridWithSync();
    }
});

// Set minimum date to today or use predefined event date(s)
function setMinDate() {
    const bookingDateElement = document.getElementById('bookingDate');
    
    // Check for multi-day event first
    if (PREDEFINED_EVENT_DATES && PREDEFINED_EVENT_DATES.length > 0) {
        // Multi-day event configuration
        const sortedDates = [...PREDEFINED_EVENT_DATES].sort();
        const firstDate = sortedDates[0];
        const lastDate = sortedDates[sortedDates.length - 1];
        
        bookingDateElement.value = firstDate;
        bookingDateElement.min = firstDate;
        bookingDateElement.max = lastDate;
        bookingDateElement.disabled = false; // Enable for multi-day selection
        bookingDateElement.classList.add('event-enabled');
        
        // Update the label to show event name and add styling
        const dateLabel = document.querySelector('label[for="bookingDate"]');
        if (dateLabel) {
            dateLabel.textContent = `Select Event Date:`;
            dateLabel.classList.add('event-label');
        }
        
        // Add change listener to validate selected date
        bookingDateElement.addEventListener('change', validateEventDate);
        
        // Auto-update seat grid
        setTimeout(() => {
            updateSeatGrid();
        }, 100);
        
    } else if (PREDEFINED_EVENT_DATE) {
        // Single-day event configuration
        bookingDateElement.value = PREDEFINED_EVENT_DATE;
        bookingDateElement.min = PREDEFINED_EVENT_DATE;
        bookingDateElement.max = PREDEFINED_EVENT_DATE;
        bookingDateElement.disabled = true;
        bookingDateElement.classList.remove('event-enabled');
        
        // Update the label to show event name and add styling
        const dateLabel = document.querySelector('label[for="bookingDate"]');
        if (dateLabel) {
            if (EVENT_NAME) {
                dateLabel.textContent = `Event Date (${EVENT_NAME}):`;
            } else {
                dateLabel.textContent = 'Event Date (Fixed):';
            }
            dateLabel.classList.add('event-label');
        }
        
        // Auto-update seat grid if predefined date is set
        setTimeout(() => {
            updateSeatGrid();
        }, 100);
    } else {
        // Normal date selection - set minimum to today
        const today = new Date().toISOString().split('T')[0];
        bookingDateElement.value = today;
        bookingDateElement.min = today;
        bookingDateElement.disabled = false;
        bookingDateElement.classList.remove('event-enabled');
        
        // Reset label styling
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
    
    if (PREDEFINED_EVENT_DATES && PREDEFINED_EVENT_DATES.length > 0) {
        if (!PREDEFINED_EVENT_DATES.includes(selectedDate)) {
            // Reset to first available date if invalid date selected
            const sortedDates = [...PREDEFINED_EVENT_DATES].sort();
            bookingDateElement.value = sortedDates[0];
            
            showStatusMessage(`Please select a valid event date. Available dates: ${formatEventDates()}`, 'error');
            return false;
        }
    }
    
    // Update current date and seat grid when date changes
    currentDate = selectedDate;
    selectedSeat = null; // Clear selected seat when date changes
    handleSelectionChange(); // Use the sync version
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
        // Show location selector if locations are configured
        const locationContainer = document.querySelector('.location-selector');
        if (locationContainer) {
            locationContainer.style.display = 'flex';
            
            const locationSelect = document.getElementById('locationSelect');
            if (locationSelect) {
                // Clear existing options
                locationSelect.innerHTML = '<option value="">Choose a location...</option>';
                
                // Add location options
                EVENT_LOCATIONS.forEach(location => {
                    const option = document.createElement('option');
                    option.value = location.id;
                    option.textContent = `${location.name} (${location.capacity} seats)`;
                    locationSelect.appendChild(option);
                });
                
                // Set first location as default if only one location
                if (EVENT_LOCATIONS.length === 1) {
                    locationSelect.value = EVENT_LOCATIONS[0].id;
                    currentLocation = EVENT_LOCATIONS[0].id;
                }
            }
        }
    } else {
        // Hide location selector if no locations configured
        const locationContainer = document.querySelector('.location-selector');
        if (locationContainer) {
            locationContainer.style.display = 'none';
        }
    }
}

// Update seat grid based on selected time, date, and location
function updateSeatGrid() {
    const timeSlot = document.getElementById('timeSlot').value;
    const bookingDateElement = document.getElementById('bookingDate');
    const bookingDate = bookingDateElement.value;
    const locationSelect = document.getElementById('locationSelect');
    const selectedLocation = locationSelect ? locationSelect.value : '';

    // If using predefined dates and no date is set yet, wait for initialization
    if ((PREDEFINED_EVENT_DATE || (PREDEFINED_EVENT_DATES && PREDEFINED_EVENT_DATES.length > 0)) && !bookingDate) {
        return;
    }

    // For multi-day events, validate the selected date
    if (PREDEFINED_EVENT_DATES && PREDEFINED_EVENT_DATES.length > 0 && bookingDate) {
        if (!PREDEFINED_EVENT_DATES.includes(bookingDate)) {
            showStatusMessage(`Invalid date selected. Please choose from: ${formatEventDates()}`, 'error');
            return;
        }
    }

    // Check if location is required but not selected
    if (EVENT_LOCATIONS && EVENT_LOCATIONS.length > 1 && !selectedLocation) {
        // Disable all seats if location is required but not selected
        const seats = document.querySelectorAll('.seat');
        seats.forEach(seat => {
            seat.className = 'seat disabled';
        });
        hideBookingForm();
        return;
    }

    if (!timeSlot || !bookingDate) {
        // Disable all seats if no time slot or date is selected
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

    // Create appropriate status message
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
        return; // Can't select booked or disabled seats
    }

    if (!currentSession || !currentDate) {
        showStatusMessage('Please select a time slot and date first.', 'error');
        return;
    }

    // Check if location is required but not selected
    if (EVENT_LOCATIONS && EVENT_LOCATIONS.length > 1 && !currentLocation) {
        showStatusMessage('Please select a location first.', 'error');
        return;
    }

    if (seat.classList.contains('selected')) {
        // Deselect seat
        seat.className = 'seat available';
        selectedSeats = selectedSeats.filter(id => id !== seatId);
    } else {
        // Select seat
        seat.className = 'seat selected';
        selectedSeats.push(seatId);
    }

    // Show booking form if seats are selected
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
    
    // Update location information if available
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

// Submit booking
async function submitBooking() {
    const customerName = document.getElementById('customerName').value.trim();
    const customerEmail = document.getElementById('customerEmail').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();

    // Validation
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

    // Show loading
    showStatusMessage('Processing your booking...', 'info');

    // Prepare booking data
    const locationInfo = getLocationInfo(currentLocation);
    const bookingData = {
        date: currentDate,
        timeSlot: currentSession,
        location: locationInfo ? locationInfo.name : '',
        locationId: currentLocation || '',
        seats: selectedSeats.join(', '),
        customerName: customerName,
        customerEmail: customerEmail,
        customerPhone: customerPhone,
        timestamp: new Date().toISOString(),
        totalSeats: selectedSeats.length
    };

    try {
        // Send to Google Sheets
        const success = await sendToGoogleSheets(bookingData);
        
        if (success) {
            // Update local seat status (include location in session key)
            const sessionKey = `${currentDate}_${currentSession}_${currentLocation}`;
            if (!seatStatus[sessionKey]) {
                seatStatus[sessionKey] = [];
            }
            seatStatus[sessionKey].push(...selectedSeats);
            
            // Save to local storage
            saveSeatData();
            
            // Update UI
            selectedSeats.forEach(seatId => {
                const seat = document.getElementById(seatId);
                seat.className = 'seat booked';
            });
            
            selectedSeats = [];
            hideBookingForm();
            
            showStatusMessage(
                `Booking successful! Confirmation details have been sent to ${customerEmail}. Your seats: ${bookingData.seats}`, 
                'success'
            );
        } else {
            throw new Error('Failed to save booking');
        }
    } catch (error) {
        console.error('Booking error:', error);
        showStatusMessage('Booking failed. Please try again or contact support.', 'error');
    }
}

// Send booking data to Google Sheets
async function sendToGoogleSheets(bookingData) {
    try {
        // If Google Apps Script URL is not configured, simulate success and log data
        if (GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
            console.log('Booking data (would be sent to Google Sheets):', bookingData);
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // For demo purposes, save to localStorage
            const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
            bookings.push(bookingData);
            localStorage.setItem('bookings', JSON.stringify(bookings));
            
            return true;
        }

        // For local testing, detect if we're on localhost and use alternative method
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' || 
                           window.location.protocol === 'file:';

        if (isLocalhost) {
            console.warn('Running on localhost - CORS may be blocked. Using fallback method.');
            
            // Try using a form submission approach for localhost
            const success = await submitViaForm(bookingData);
            if (success) {
                return true;
            }
            
            // If form method fails, fall back to localStorage
            console.log('Form submission failed, using localStorage fallback');
            const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
            bookings.push(bookingData);
            localStorage.setItem('bookings', JSON.stringify(bookings));
            
            showStatusMessage('Booking saved locally. Deploy to a web server for Google Sheets integration.', 'info');
            return true;
        }

        // For production, use normal fetch
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // This bypasses CORS but limits response access
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingData)
        });

        // With no-cors mode, we can't read the response, so assume success
        // You'll need to check your Google Sheet manually to verify
        console.log('Data sent to Google Sheets (no-cors mode)');
        return true;

    } catch (error) {
        console.error('Error sending to Google Sheets:', error);
        
        // Fallback to localStorage for any error
        const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
        bookings.push(bookingData);
        localStorage.setItem('bookings', JSON.stringify(bookings));
        
        showStatusMessage('Booking saved locally due to connection issue.', 'info');
        return true;
    }
}

// Alternative form submission method for localhost testing
async function submitViaForm(bookingData) {
    try {
        // Create a hidden form
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = GOOGLE_SCRIPT_URL;
        form.style.display = 'none';
        
        // Add form data
        Object.keys(bookingData).forEach(key => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = bookingData[key];
            form.appendChild(input);
        });
        
        // Create hidden iframe for form submission
        const iframe = document.createElement('iframe');
        iframe.name = 'hiddenFrame';
        iframe.style.display = 'none';
        form.target = 'hiddenFrame';
        
        document.body.appendChild(iframe);
        document.body.appendChild(form);
        
        // Submit form
        form.submit();
        
        // Clean up after 2 seconds
        setTimeout(() => {
            document.body.removeChild(form);
            document.body.removeChild(iframe);
        }, 2000);
        
        return true;
    } catch (error) {
        console.error('Form submission failed:', error);
        return false;
    }
}

// Cancel booking
function cancelBooking() {
    // Deselect all selected seats
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
    
    // Auto-hide success and info messages after 5 seconds
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

// Comprehensive sync function to load all bookings from Google Sheets
async function syncAllBookingsFromGoogleSheets() {
    try {
        if (GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
            console.log('Demo mode - using localStorage data');
            return;
        }

        console.log('Syncing all bookings from Google Sheets...');
        showStatusMessage('Loading latest booking data...', 'info');

        // Try getAllBookings first, then fall back to getBookings for compatibility
        let response;
        let result;
        
        try {
            console.log('Trying getAllBookings action...');
            response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAllBookings`, {
                method: 'GET',
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }

            result = await response.json();
            console.log('getAllBookings response:', result);
            
            // If getAllBookings fails, try the old getBookings action
            if (!result.success && result.error && result.error.includes('Invalid action')) {
                console.log('getAllBookings not supported, trying getBookings...');
                
                response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getBookings`, {
                    method: 'GET',
                    mode: 'cors'
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
                }

                result = await response.json();
                console.log('getBookings response:', result);
            }
        } catch (fetchError) {
            console.error('Fetch error:', fetchError);
            throw fetchError;
        }
        
        if (result.success && result.bookings) {
            // Clear existing seat status
            seatStatus = {};
            
            console.log(`Processing ${result.bookings.length} bookings from Google Sheets...`);
            
            // Process each booking to rebuild seat status
            result.bookings.forEach((booking, index) => {
                // Handle different property name formats from Google Sheets
                let eventDate = booking.eventdate || booking['Event Date'] || '';
                const timeSlot = booking.timeslot || booking['Time Slot'] || '';
                const locationId = booking.locationid || booking['Location ID'] || '';
                const selectedSeats = booking.selectedseats || booking['Selected Seats'] || '';
                const status = booking.status || booking['Status'] || '';
                
                // Fix date format - convert from ISO string to YYYY-MM-DD
                if (eventDate && typeof eventDate === 'string' && eventDate.includes('T')) {
                    eventDate = eventDate.split('T')[0];
                } else if (eventDate instanceof Date) {
                    eventDate = eventDate.toISOString().split('T')[0];
                }
                
                console.log(`Booking ${index + 1}:`, { eventDate, timeSlot, locationId, selectedSeats, status });
                
                // Only process confirmed bookings
                if (status === 'CONFIRMED' && eventDate && timeSlot && selectedSeats) {
                    const sessionKey = `${eventDate}_${timeSlot}_${locationId}`;
                    
                    if (!seatStatus[sessionKey]) {
                        seatStatus[sessionKey] = [];
                    }
                    
                    // Parse seats (e.g., "A1, A2, B3")
                    const seats = selectedSeats.split(',').map(seat => seat.trim()).filter(seat => seat);
                    seatStatus[sessionKey].push(...seats);
                    
                    console.log(`Added ${seats.length} seats to ${sessionKey}:`, seats);
                }
            });
            
            // Remove duplicates from each session
            Object.keys(seatStatus).forEach(key => {
                seatStatus[key] = [...new Set(seatStatus[key])];
            });
            
            // Save updated data to localStorage as backup
            saveSeatData();
            
            const totalSeats = Object.values(seatStatus).reduce((sum, seats) => sum + seats.length, 0);
            console.log(`Successfully synced ${result.bookings.length} bookings with ${totalSeats} total seats from Google Sheets`);
            console.log('Updated seat status:', seatStatus);
            
            // Update current view if date/time is selected
            if (currentDate && currentSession) {
                updateSeatGrid();
            }
            
            // Clear loading message
            setTimeout(() => {
                const statusEl = document.getElementById('statusMessage');
                if (statusEl && statusEl.textContent.includes('Loading latest booking data')) {
                    statusEl.textContent = '';
                    statusEl.className = 'status-message';
                }
            }, 2000);
            
        } else {
            console.warn('Google Sheets sync failed:', result);
            showStatusMessage('Could not load latest booking data. Using local data.', 'warning');
            
            // Clear loading message
            setTimeout(() => {
                const statusEl = document.getElementById('statusMessage');
                if (statusEl && statusEl.textContent.includes('Loading latest booking data')) {
                    statusEl.textContent = '';
                    statusEl.className = 'status-message';
                }
            }, 2000);
        }
        
    } catch (error) {
        console.error('Error syncing bookings from Google Sheets:', error);
        showStatusMessage('Connection error. Using local booking data.', 'warning');
        
        // Clear loading message
        setTimeout(() => {
            const statusEl = document.getElementById('statusMessage');
            if (statusEl && statusEl.textContent.includes('Loading latest booking data')) {
                statusEl.textContent = '';
                statusEl.className = 'status-message';
            }
        }, 2000);
    }
}

// Load booking data from Google Sheets (optional feature)
async function loadBookingsFromGoogleSheets() {
    try {
        if (GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
            // Load from localStorage for demo
            const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
            return bookings;
        }

        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getBookings`);
        if (response.ok) {
            const data = await response.json();
            return data.bookings || [];
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
    return [];
}

// Utility function to refresh seat data from server
// async function refreshSeatData() {
//     showStatusMessage('Refreshing seat data...', 'info');
    
//     try {
//         const bookings = await loadBookingsFromGoogleSheets();
        
//         // Reset seat status
//         seatStatus = {};
        
//         // Process bookings to update seat status
//         bookings.forEach(booking => {
//             const sessionKey = `${booking.date}_${booking.timeSlot}`;
//             if (!seatStatus[sessionKey]) {
//                 seatStatus[sessionKey] = [];
//             }
//             const seats = booking.seats.split(', ');
//             seatStatus[sessionKey].push(...seats);
//         });
        
//         // Save updated data
//         saveSeatData();
        
//         // Refresh current view
//         updateSeatGrid();
        
//         showStatusMessage('Seat data refreshed successfully!', 'success');
//     } catch (error) {
//         console.error('Error refreshing data:', error);
//         showStatusMessage('Failed to refresh seat data.', 'error');
//     }
// }

// Add keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // ESC key to cancel booking
    if (event.key === 'Escape') {
        if (document.getElementById('bookingForm').style.display === 'block') {
            cancelBooking();
        }
    }
    
    // Ctrl+R to refresh seat data
    if (event.ctrlKey && event.key === 'r') {
        event.preventDefault();
        refreshSeatData();
    }
});

// Add refresh button functionality
// function addRefreshButton() {
//     const container = document.querySelector('.container');
//     const refreshButton = document.createElement('button');
//     refreshButton.textContent = '🔄 Refresh Seat Data';
//     refreshButton.className = 'submit-btn';
//     refreshButton.style.marginBottom = '20px';
//     refreshButton.onclick = refreshSeatData;
    
//     container.insertBefore(refreshButton, container.firstChild.nextSibling.nextSibling);
// }

// Initialize refresh button
// document.addEventListener('DOMContentLoaded', function() {
//     setTimeout(addRefreshButton, 100);
// });

// Helper function to set predefined event date (for easy configuration)
function setPredefinedEventDate(dateString, eventName = 'Special Event') {
    // This function can be called from browser console to quickly set event date
    // Example: setPredefinedEventDate('2024-12-25', 'Christmas Concert')
    console.log(`Setting predefined event date to: ${dateString} (${eventName})`);
    console.log('Please update the PREDEFINED_EVENT_DATE and EVENT_NAME constants in the script and reload the page.');
}

// Helper function to set predefined multi-day event dates
function setPredefinedEventDates(datesArray, eventName = 'Multi-Day Event') {
    // This function can be called from browser console to quickly set multi-day event
    // Example: setPredefinedEventDates(['2024-12-25', '2024-12-26', '2024-12-27'], 'Christmas Festival')
    console.log(`Setting predefined event dates to: ${datesArray.join(', ')} (${eventName})`);
    console.log('Please update the PREDEFINED_EVENT_DATES and EVENT_NAME constants in the script and reload the page.');
    console.log('Also set PREDEFINED_EVENT_DATE to empty string when using multi-day events.');
}

// Helper function to set event locations
function setEventLocations(locationsArray) {
    // This function can be called from browser console to quickly set locations
    // Example: setEventLocations([
    //   { id: 'main-hall', name: 'Main Concert Hall', capacity: 500 },
    //   { id: 'studio-a', name: 'Studio A', capacity: 100 }
    // ])
    console.log('Setting event locations to:', locationsArray);
    console.log('Please update the EVENT_LOCATIONS constant in the script and reload the page.');
}

// Utility function to get formatted date for current selection
function getCurrentSelectionInfo() {
    if (PREDEFINED_EVENT_DATES && PREDEFINED_EVENT_DATES.length > 0) {
        return {
            date: document.getElementById('bookingDate').value,
            eventName: EVENT_NAME,
            isPredefined: true,
            isMultiDay: true,
            availableDates: PREDEFINED_EVENT_DATES
        };
    } else if (PREDEFINED_EVENT_DATE) {
        return {
            date: PREDEFINED_EVENT_DATE,
            eventName: EVENT_NAME,
            isPredefined: true,
            isMultiDay: false
        };
    }
    return {
        date: document.getElementById('bookingDate').value,
        eventName: null,
        isPredefined: false,
        isMultiDay: false
    };
}

// Get event type information
// Sync booked seats from Google Sheets
async function syncBookedSeatsFromGoogleSheets(date, timeSlot, locationId) {
    try {
        // Only sync if Google Apps Script URL is configured
        if (GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
            return [];
        }

        // For localhost, skip sync to avoid CORS issues
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' || 
                           window.location.protocol === 'file:';

        if (isLocalhost) {
            console.log('Localhost detected - skipping Google Sheets sync');
            return [];
        }

        const url = `${GOOGLE_SCRIPT_URL}?action=getBookedSeats&date=${encodeURIComponent(date)}&timeSlot=${encodeURIComponent(timeSlot)}&locationId=${encodeURIComponent(locationId)}`;
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors'
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                return result.bookedSeats || [];
            }
        }
        
        return [];
    } catch (error) {
        console.error('Error syncing booked seats from Google Sheets:', error);
        return [];
    }
}

// Enhanced updateSeatGrid with Google Sheets sync
async function updateSeatGridWithSync() {
    if (!currentDate || !currentSession) {
        return;
    }

    try {
        // Show loading indicator
        showStatusMessage('Checking latest seat availability...', 'info');

        // Always sync booked seats from Google Sheets for current selection
        const syncedBookedSeats = await syncBookedSeatsFromGoogleSheets(currentDate, currentSession, currentLocation);
        
        // Update local storage with synced data
        const sessionKey = `${currentDate}_${currentSession}_${currentLocation}`;
        
        if (syncedBookedSeats.length > 0) {
            // Use synced data as the source of truth
            seatStatus[sessionKey] = [...new Set(syncedBookedSeats)];
            console.log(`Synced ${syncedBookedSeats.length} booked seats from Google Sheets for ${sessionKey}`);
        } else {
            // If no synced data, keep existing local data but warn user
            const localBookedSeats = seatStatus[sessionKey] || [];
            console.log(`No synced data available, using local data: ${localBookedSeats.length} seats`);
        }
        
        // Save updated data
        saveSeatData();

        // Update seat grid display
        updateSeatGrid();
        
        // Clear loading message
        setTimeout(() => {
            const statusEl = document.getElementById('statusMessage');
            if (statusEl && statusEl.textContent.includes('Checking latest seat availability')) {
                statusEl.textContent = '';
                statusEl.className = 'status-message';
            }
        }, 1000);
        
    } catch (error) {
        console.error('Error updating seat grid with sync:', error);
        updateSeatGrid(); // Fallback to local data
        
        // Clear loading message
        setTimeout(() => {
            const statusEl = document.getElementById('statusMessage');
            if (statusEl && statusEl.textContent.includes('Checking latest seat availability')) {
                statusEl.textContent = '';
                statusEl.className = 'status-message';
            }
        }, 1000);
    }
}

// Debug function to test Google Apps Script endpoints
async function debugGoogleAppsScript() {
    if (GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        console.log('Google Apps Script URL not configured');
        return;
    }

    console.log('Testing Google Apps Script endpoints...');
    console.log('Using URL:', GOOGLE_SCRIPT_URL);

    const actions = ['getAllBookings', 'getBookings', 'test'];
    
    for (const action of actions) {
        try {
            console.log(`Testing action: ${action}`);
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=${action}`, {
                method: 'GET',
                mode: 'cors'
            });
            
            const result = await response.json();
            console.log(`${action} result:`, result);
        } catch (error) {
            console.error(`${action} error:`, error);
        }
    }
}

// Call this when date, time, or location changes
function handleSelectionChange() {
    updateSeatGridWithSync();
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