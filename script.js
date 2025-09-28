// Configuration
const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'; // Replace with your actual Google Apps Script URL
const ROWS = 10;
const SEATS_PER_ROW = 10;
const MAX_SEATS_PER_ROW = 10;
// Global variables
let selectedSeats = [];
let currentSession = '';
let currentDate = '';
let seatStatus = {}; // Store seat status for different sessions and dates

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    generateSeatGrid();
    setMinDate();
    loadSeatData();
});

// Set minimum date to today
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bookingDate').value = today;
    document.getElementById('bookingDate').min = today;
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

// Update seat grid based on selected time and date
function updateSeatGrid() {
    const timeSlot = document.getElementById('timeSlot').value;
    const bookingDate = document.getElementById('bookingDate').value;

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
    
    // Reset selected seats when changing session or date
    selectedSeats = [];
    hideBookingForm();

    // Update seat status based on current session and date
    const sessionKey = `${bookingDate}_${timeSlot}`;
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

    showStatusMessage('Seats updated for selected time and date.', 'info');
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

    selectedDate.textContent = formatDate(currentDate);
    selectedTime.textContent = currentSession;
    selectedSeatsSpan.textContent = selectedSeats.join(', ');

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
    const bookingData = {
        date: currentDate,
        timeSlot: currentSession,
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
            // Update local seat status
            const sessionKey = `${currentDate}_${currentSession}`;
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

        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingData)
        });

        if (response.ok) {
            const result = await response.json();
            return result.success;
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error sending to Google Sheets:', error);
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