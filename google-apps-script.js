// Google Apps Script Code for Google Sheets Integration
// Instructions:
// 1. Go to script.google.com
// 2. Create a new project
// 3. Replace the default code with this code
// 4. Save and name your project (e.g., "Seat Booking System")
// 5. Deploy as web app with execute permissions for "Anyone"
// 6. Copy the web app URL and paste it in script.js as GOOGLE_SCRIPT_URL

function doPost(e) {
  try {
    // Parse the JSON data from the request
    const data = JSON.parse(e.postData.contents);
    
    // Get or create the spreadsheet
    const spreadsheet = getOrCreateSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    // Ensure headers exist
    ensureHeaders(sheet);
    
    // Generate a unique booking ID
    const bookingId = 'BK' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    // Add the booking data with the new structure
    const row = [
      new Date(data.timestamp),    // Timestamp
      data.customerName,           // Customer Name
      data.customerEmail,          // Customer Email
      data.customerPhone,          // Customer Phone
      data.date,                   // Event Date
      data.timeSlot,              // Time Slot
      data.location,              // Location Name
      data.locationId,            // Location ID
      data.seats,                 // Selected Seats
      data.totalSeats,            // Total Seats
      bookingId,                  // Booking ID
      'CONFIRMED'                 // Status
    ];
    
    sheet.appendRow(row);
    
    // Send confirmation email (optional)
    sendConfirmationEmail(data, bookingId);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        bookingId: bookingId,
        message: 'Booking saved successfully' 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error processing booking:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'getBookings') {
      const spreadsheet = getOrCreateSpreadsheet();
      const sheet = spreadsheet.getActiveSheet();
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);
      
      const bookings = rows.map(row => {
        const booking = {};
        headers.forEach((header, index) => {
          booking[header.toLowerCase().replace(/\s+/g, '')] = row[index];
        });
        return booking;
      });
      
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, bookings: bookings }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getBookedSeats') {
      const date = e.parameter.date;
      const timeSlot = e.parameter.timeSlot;
      const locationId = e.parameter.locationId;
      
      const bookedSeats = getBookedSeats(date, timeSlot, locationId);
      
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: true, 
          bookedSeats: bookedSeats 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Invalid action' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error processing GET request:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSpreadsheet() {
  const spreadsheetName = 'Seat Booking System';
  
  // Try to find existing spreadsheet
  const files = DriveApp.getFilesByName(spreadsheetName);
  
  if (files.hasNext()) {
    const file = files.next();
    return SpreadsheetApp.openById(file.getId());
  } else {
    // Create new spreadsheet
    const spreadsheet = SpreadsheetApp.create(spreadsheetName);
    return spreadsheet;
  }
}

function ensureHeaders(sheet) {
  const headers = [
    'Timestamp',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Event Date',
    'Time Slot',
    'Location',
    'Location ID',
    'Selected Seats',
    'Total Seats',
    'Booking ID',
    'Status'
  ];
  
  // Check if headers exist
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = headers.every((header, index) => firstRow[index] === header);
  
  if (!hasHeaders) {
    // Add headers if they don't exist
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format headers
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#667eea');
    headerRange.setFontColor('white');
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, headers.length);
  }
}

function getBookedSeats(date, timeSlot, locationId) {
  try {
    const spreadsheet = getOrCreateSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1); // Exclude headers
    
    const bookedSeats = [];
    
    rows.forEach(row => {
      const rowDate = row[4]; // Event Date column
      const rowTimeSlot = row[5]; // Time Slot column
      const rowLocationId = row[7]; // Location ID column
      const rowSeats = row[8]; // Selected Seats column
      const rowStatus = row[11]; // Status column
      
      // Convert date to string format for comparison
      const dateStr = rowDate instanceof Date ? 
        rowDate.toISOString().split('T')[0] : 
        rowDate;
      
      if (dateStr === date && 
          rowTimeSlot === timeSlot && 
          rowLocationId === locationId && 
          rowStatus === 'CONFIRMED') {
        
        // Parse the seats string (e.g., "A1, A2, B3")
        if (rowSeats) {
          const seats = rowSeats.split(',').map(seat => seat.trim());
          bookedSeats.push(...seats);
        }
      }
    });
    
    return bookedSeats;
    
  } catch (error) {
    console.error('Error getting booked seats:', error);
    return [];
  }
}

function sendConfirmationEmail(data, bookingId) {
  try {
    const subject = `Booking Confirmation - ${data.location || 'Event'} (${bookingId})`;
    const body = `
Dear ${data.customerName},

Your booking has been confirmed! Here are the details:

📋 Booking ID: ${bookingId}
📅 Date: ${new Date(data.date).toLocaleDateString()}
⏰ Time: ${data.timeSlot}
📍 Location: ${data.location || 'Main Venue'}
💺 Seats: ${data.seats}
👤 Total Seats: ${data.totalSeats}

Contact Information:
📧 Email: ${data.customerEmail}
📱 Phone: ${data.customerPhone}

Booking Time: ${new Date(data.timestamp).toLocaleString()}

Please arrive 15 minutes before your session starts.
Keep this booking ID for your records: ${bookingId}

Thank you for your booking!

Best regards,
Event Management Team
    `;
    
    MailApp.sendEmail(data.customerEmail, subject, body);
    
    // Optional: Send a copy to admin
    // const adminEmail = 'admin@yourdomain.com';
    // MailApp.sendEmail(adminEmail, `New Booking: ${bookingId}`, body);
    
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
}

// Test function to verify the setup
function testBooking() {
  const testData = {
    date: '2025-10-01',
    timeSlot: '09:00-10:00',
    location: 'Main Concert Hall',
    locationId: 'main-hall',
    seats: 'A1, A2',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '+1234567890',
    timestamp: new Date().toISOString(),
    totalSeats: 2
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const result = doPost(mockEvent);
  console.log(result.getContent());
}

// Function to clear all bookings (use with caution)
function clearAllBookings() {
  const spreadsheet = getOrCreateSpreadsheet();
  const sheet = spreadsheet.getActiveSheet();
  
  // Clear all data except headers
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  
  console.log('All bookings cleared');
}

// Function to get booking statistics
function getBookingStats() {
  const spreadsheet = getOrCreateSpreadsheet();
  const sheet = spreadsheet.getActiveSheet();
  
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1); // Exclude headers
  
  const stats = {
    totalBookings: rows.length,
    totalSeats: rows.reduce((sum, row) => sum + (row[9] || 0), 0), // Total Seats column
    uniqueCustomers: new Set(rows.map(row => row[2])).size, // Customer Email column
    locationStats: {},
    timeSlotStats: {},
    dateStats: {}
  };
  
  rows.forEach(row => {
    const location = row[6];
    const timeSlot = row[5];
    const date = row[4];
    
    // Location statistics
    if (stats.locationStats[location]) {
      stats.locationStats[location]++;
    } else {
      stats.locationStats[location] = 1;
    }
    
    // Time slot statistics
    if (stats.timeSlotStats[timeSlot]) {
      stats.timeSlotStats[timeSlot]++;
    } else {
      stats.timeSlotStats[timeSlot] = 1;
    }
    
    // Date statistics
    const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
    if (stats.dateStats[dateStr]) {
      stats.dateStats[dateStr]++;
    } else {
      stats.dateStats[dateStr] = 1;
    }
  });
  
  console.log('Booking Statistics:', stats);
  return stats;
}