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
    
    // Add the booking data
    const row = [
      new Date(data.timestamp),
      data.date,
      data.timeSlot,
      data.seats,
      data.totalSeats,
      data.customerName,
      data.customerEmail,
      data.customerPhone,
      'CONFIRMED'
    ];
    
    sheet.appendRow(row);
    
    // Send confirmation email (optional)
    sendConfirmationEmail(data);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Booking saved successfully' }))
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
    'Date',
    'Time Slot',
    'Seats',
    'Total Seats',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
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
    headerRange.setBackground('#4CAF50');
    headerRange.setFontColor('white');
  }
}

function sendConfirmationEmail(data) {
  try {
    const subject = 'Booking Confirmation - Seat Booking System';
    const body = `
Dear ${data.customerName},

Your booking has been confirmed! Here are the details:

📅 Date: ${new Date(data.date).toLocaleDateString()}
⏰ Time: ${data.timeSlot}
💺 Seats: ${data.seats}
📧 Email: ${data.customerEmail}
📱 Phone: ${data.customerPhone}

Booking ID: ${Utilities.getUuid().substring(0, 8).toUpperCase()}
Booking Time: ${new Date(data.timestamp).toLocaleString()}

Please arrive 15 minutes before your session starts.

Thank you for your booking!

Best regards,
Seat Booking System Team
    `;
    
    MailApp.sendEmail(data.customerEmail, subject, body);
    
    // Also send a copy to admin (optional)
    // MailApp.sendEmail('admin@example.com', subject, body);
    
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
}

// Test function to verify the setup
function testBooking() {
  const testData = {
    date: '2024-01-15',
    timeSlot: '09:00-10:00',
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
    totalSeats: rows.reduce((sum, row) => sum + (row[4] || 0), 0),
    uniqueCustomers: new Set(rows.map(row => row[6])).size,
    timeSlots: {}
  };
  
  rows.forEach(row => {
    const timeSlot = row[2];
    if (stats.timeSlots[timeSlot]) {
      stats.timeSlots[timeSlot]++;
    } else {
      stats.timeSlots[timeSlot] = 1;
    }
  });
  
  console.log('Booking Statistics:', stats);
  return stats;
}