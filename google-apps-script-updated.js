// Google Apps Script Code for Google Sheets Integration - UPDATED VERSION
// Instructions:
// 1. Go to script.google.com
// 2. Create a new project or open your existing one
// 3. Replace ALL the existing code with this updated code
// 4. Save and name your project (e.g., "Seat Booking System")
// 5. Deploy as web app with execute permissions for "Anyone"
// 6. Copy the web app URL and paste it in script.js as GOOGLE_SCRIPT_URL

function doPost(e) {
  try {
    // Add CORS headers for cross-origin requests
    const output = ContentService.createTextOutput();
    
    // Parse the JSON data from the request
    const data = JSON.parse(e.postData.contents);
    
    // Log the incoming request for debugging
    console.log('Incoming booking data:', data);
    
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
      data.locationId || '',      // Location ID
      data.seats,                 // Selected Seats
      data.totalSeats,            // Total Seats
      bookingId,                  // Booking ID
      'CONFIRMED'                 // Status
    ];
    
    sheet.appendRow(row);
    
    // Flush to ensure data is written immediately
    SpreadsheetApp.flush();
    
    console.log('Booking saved successfully:', bookingId);
    
    // Send confirmation email (optional)
    try {
      sendConfirmationEmail(data, bookingId);
    } catch (emailError) {
      console.log('Email sending failed, but booking was saved:', emailError);
    }
    
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
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString(),
        details: 'Failed to save booking to Google Sheets'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    console.log('GET request action:', action);
    
    if (action === 'getAllBookings') {
      return getAllBookingsResponse();
    }
    
    if (action === 'getBookings') {
      return getAllBookingsResponse(); // Same as getAllBookings for compatibility
    }
    
    if (action === 'getBookedSeats') {
      const date = e.parameter.date;
      const timeSlot = e.parameter.timeSlot;
      const locationId = e.parameter.locationId;
      
      console.log('Getting booked seats for:', { date, timeSlot, locationId });
      
      const bookedSeats = getBookedSeats(date, timeSlot, locationId);
      
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: true, 
          bookedSeats: bookedSeats,
          count: bookedSeats.length
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: 'Invalid action. Supported actions: getAllBookings, getBookedSeats' 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error processing GET request:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString(),
        action: e.parameter.action || 'unknown'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getAllBookingsResponse() {
  try {
    const spreadsheet = getOrCreateSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      // No data rows, only headers or empty sheet
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: true, 
          bookings: [],
          count: 0
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    console.log('Retrieved', rows.length, 'bookings from sheet');
    
    const bookings = rows.map((row, index) => {
      const booking = {};
      headers.forEach((header, colIndex) => {
        const key = header.toLowerCase().replace(/\s+/g, '');
        let value = row[colIndex];
        
        // Handle date formatting
        if (key === 'timestamp' && value instanceof Date) {
          value = value.toISOString();
        } else if (key === 'eventdate') {
          // Ensure date is in YYYY-MM-DD format
          if (value instanceof Date) {
            value = value.toISOString().split('T')[0];
          }
        }
        
        booking[key] = value || '';
      });
      
      // Add row number for debugging
      booking._rowNumber = index + 2; // +2 because we skip header and arrays are 0-indexed
      
      return booking;
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        bookings: bookings,
        count: bookings.length,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting all bookings:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString(),
        details: 'Failed to retrieve bookings from Google Sheets'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSpreadsheet() {
  const spreadsheetName = 'Seat Booking System';
  
  try {
    // Try to find existing spreadsheet
    const files = DriveApp.getFilesByName(spreadsheetName);
    
    if (files.hasNext()) {
      const file = files.next();
      const spreadsheet = SpreadsheetApp.openById(file.getId());
      console.log('Using existing spreadsheet:', file.getId());
      return spreadsheet;
    } else {
      // Create new spreadsheet
      const spreadsheet = SpreadsheetApp.create(spreadsheetName);
      console.log('Created new spreadsheet:', spreadsheet.getId());
      return spreadsheet;
    }
  } catch (error) {
    console.error('Error accessing spreadsheet:', error);
    throw error;
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
  
  try {
    // Check if sheet has any data
    const lastRow = sheet.getLastRow();
    if (lastRow === 0) {
      // Empty sheet, add headers
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      formatHeaders(sheet, headers.length);
      console.log('Headers added to empty sheet');
      return;
    }
    
    // Check if headers match
    const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const hasCorrectHeaders = headers.every((header, index) => firstRow[index] === header);
    
    if (!hasCorrectHeaders) {
      // Update headers
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      formatHeaders(sheet, headers.length);
      console.log('Headers updated');
    }
  } catch (error) {
    console.error('Error ensuring headers:', error);
    throw error;
  }
}

function formatHeaders(sheet, headerCount) {
  try {
    const headerRange = sheet.getRange(1, 1, 1, headerCount);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#667eea');
    headerRange.setFontColor('white');
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, headerCount);
  } catch (error) {
    console.error('Error formatting headers:', error);
  }
}

function getBookedSeats(date, timeSlot, locationId) {
  try {
    const spreadsheet = getOrCreateSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      console.log('No booking data found');
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1); // Exclude headers
    
    const bookedSeats = [];
    let matchingBookings = 0;
    
    console.log('Searching for bookings matching:', { date, timeSlot, locationId });
    
    rows.forEach((row, index) => {
      const rowDate = row[4]; // Event Date column
      const rowTimeSlot = row[5]; // Time Slot column
      const rowLocationId = row[7]; // Location ID column
      const rowSeats = row[8]; // Selected Seats column
      const rowStatus = row[11]; // Status column
      
      // Convert date to string format for comparison
      let dateStr = '';
      if (rowDate instanceof Date) {
        dateStr = rowDate.toISOString().split('T')[0];
      } else if (typeof rowDate === 'string') {
        // Handle different date formats
        const parsedDate = new Date(rowDate);
        if (!isNaN(parsedDate.getTime())) {
          dateStr = parsedDate.toISOString().split('T')[0];
        } else {
          dateStr = rowDate;
        }
      }
      
      // Debug logging for each row
      console.log(`Row ${index + 2}:`, {
        dateStr,
        timeSlot: rowTimeSlot,
        locationId: rowLocationId,
        seats: rowSeats,
        status: rowStatus
      });
      
      // Check if this booking matches our criteria
      const dateMatch = dateStr === date;
      const timeMatch = rowTimeSlot === timeSlot;
      const locationMatch = !locationId || rowLocationId === locationId; // Allow empty locationId
      const statusMatch = rowStatus === 'CONFIRMED';
      
      if (dateMatch && timeMatch && locationMatch && statusMatch) {
        matchingBookings++;
        console.log(`Found matching booking in row ${index + 2}`);
        
        // Parse the seats string (e.g., "A1, A2, B3")
        if (rowSeats && typeof rowSeats === 'string') {
          const seats = rowSeats.split(',').map(seat => seat.trim()).filter(seat => seat);
          bookedSeats.push(...seats);
          console.log('Added seats:', seats);
        }
      }
    });
    
    console.log(`Found ${matchingBookings} matching bookings with ${bookedSeats.length} total seats`);
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
Kỳ Nguyên International Language School
    `;
    
    MailApp.sendEmail(data.customerEmail, subject, body);
    console.log('Confirmation email sent to:', data.customerEmail);
    
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    // Don't throw error - email failure shouldn't fail the booking
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

// Test function to verify getAllBookings
function testGetAllBookings() {
  const result = getAllBookingsResponse();
  console.log('getAllBookings result:', result.getContent());
}

// Test function to verify getBookedSeats
function testGetBookedSeats() {
  const bookedSeats = getBookedSeats('2025-10-01', '09:00-10:00', 'main-hall');
  console.log('Booked seats:', bookedSeats);
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
  try {
    const spreadsheet = getOrCreateSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { totalBookings: 0, message: 'No bookings found' };
    }
    
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
      const location = row[6] || 'Unknown';
      const timeSlot = row[5] || 'Unknown';
      const date = row[4];
      
      // Location statistics
      stats.locationStats[location] = (stats.locationStats[location] || 0) + 1;
      
      // Time slot statistics
      stats.timeSlotStats[timeSlot] = (stats.timeSlotStats[timeSlot] || 0) + 1;
      
      // Date statistics
      let dateStr = 'Unknown';
      if (date instanceof Date) {
        dateStr = date.toISOString().split('T')[0];
      } else if (typeof date === 'string') {
        dateStr = date;
      }
      stats.dateStats[dateStr] = (stats.dateStats[dateStr] || 0) + 1;
    });
    
    console.log('Booking Statistics:', stats);
    return stats;
  } catch (error) {
    console.error('Error getting booking stats:', error);
    return { error: error.toString() };
  }
}