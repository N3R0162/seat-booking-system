# Google Sheets Integration Setup Guide

## 1. Create Google Spreadsheet

Create a new Google Sheet with the following columns in Row 1 (header row):

| Column A | Column B | Column C | Column D | Column E | Column F | Column G | Column H | Column I | Column J | Column K |
|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|
| Timestamp | Customer Name | Customer Email | Customer Phone | Event Date | Time Slot | Location | Location ID | Selected Seats | Total Seats | Booking ID |

### Column Descriptions:
- **Timestamp**: When the booking was made (ISO format)
- **Customer Name**: Customer's full name
- **Customer Email**: Customer's email address  
- **Customer Phone**: Customer's phone number
- **Event Date**: Date of the event (YYYY-MM-DD)
- **Time Slot**: Selected time session (e.g., "09:00-10:00")
- **Location**: Location name (e.g., "Main Concert Hall")
- **Location ID**: Location identifier (e.g., "main-hall")
- **Selected Seats**: Comma-separated list of seat IDs (e.g., "A1, A2, B3")
- **Total Seats**: Number of seats booked
- **Booking ID**: Unique identifier for each booking

## 2. Create Google Apps Script

1. In your Google Sheet, go to **Extensions > Apps Script**
2. Delete the default `myFunction` code
3. Paste the following code:

```javascript
function doPost(e) {
  try {
    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);
    
    // Get the active spreadsheet
    const sheet = SpreadsheetApp.getActiveSheet();
    
    // Generate a unique booking ID
    const bookingId = 'BK' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    // Prepare the row data
    const rowData = [
      data.timestamp,           // Timestamp
      data.customerName,        // Customer Name
      data.customerEmail,       // Customer Email
      data.customerPhone,       // Customer Phone
      data.date,               // Event Date
      data.timeSlot,           // Time Slot
      data.location,           // Location
      data.locationId,         // Location ID
      data.seats,              // Selected Seats
      data.totalSeats,         // Total Seats
      bookingId                // Booking ID
    ];
    
    // Add the data to the sheet
    sheet.appendRow(rowData);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        bookingId: bookingId,
        message: 'Booking saved successfully'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString(),
        message: 'Failed to save booking'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    // Return the data as JSON (for reading bookings if needed)
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: data
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## 3. Deploy the Script

1. Click the **Deploy** button (top right)
2. Choose **New Deployment**
3. Set the type to **Web app**
4. Set **Execute as**: Me
5. Set **Who has access**: Anyone
6. Click **Deploy**
7. Copy the **Web app URL** - this is your `GOOGLE_SCRIPT_URL`

## 4. Update Your JavaScript Configuration

Replace the `GOOGLE_SCRIPT_URL` in your `script.js` file:

```javascript
const GOOGLE_SCRIPT_URL = 'YOUR_COPIED_WEB_APP_URL_HERE';
```

## 5. Test the Integration

1. Make a test booking through your application
2. Check your Google Sheet to see if the data appears
3. Monitor the Apps Script logs for any errors

## 6. Optional: Enhanced Features

### A. Email Notifications
Add email notifications when bookings are made:

```javascript
// Add this to your doPost function after sheet.appendRow(rowData):
MailApp.sendEmail({
  to: data.customerEmail,
  subject: 'Booking Confirmation - ' + data.date,
  body: `Dear ${data.customerName},\n\nYour booking has been confirmed!\n\nDetails:\nDate: ${data.date}\nTime: ${data.timeSlot}\nLocation: ${data.location}\nSeats: ${data.seats}\nBooking ID: ${bookingId}\n\nThank you!`
});
```

### B. Admin Notifications
Send notifications to admin email:

```javascript
// Add admin email notification
const ADMIN_EMAIL = 'admin@yourdomain.com';
MailApp.sendEmail({
  to: ADMIN_EMAIL,
  subject: 'New Booking Received',
  body: `New booking details:\n\nCustomer: ${data.customerName}\nEmail: ${data.customerEmail}\nPhone: ${data.customerPhone}\nDate: ${data.date}\nTime: ${data.timeSlot}\nLocation: ${data.location}\nSeats: ${data.seats}\nBooking ID: ${bookingId}`
});
```

## 7. Data Validation and Security

### A. Add validation in Apps Script:
```javascript
// Add validation before saving
if (!data.customerName || !data.customerEmail || !data.customerPhone) {
  throw new Error('Missing required customer information');
}

if (!data.date || !data.timeSlot) {
  throw new Error('Missing booking details');
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(data.customerEmail)) {
  throw new Error('Invalid email format');
}
```

## 8. Troubleshooting

### Common Issues:
1. **Permission Errors**: Make sure the script has permission to access your sheet
2. **CORS Errors**: Apps Script handles CORS automatically
3. **Data Not Appearing**: Check Apps Script execution logs
4. **Timeout Errors**: Large sheets may cause timeouts

### Debugging:
- Use `console.log()` in Apps Script
- Check execution transcript in Apps Script dashboard
- Test with simple data first

## 9. Data Management

### Useful Google Sheets Formulas:
- **Count bookings by date**: `=COUNTIF(E:E, "2025-10-01")`
- **Total seats booked**: `=SUM(J:J)`
- **Revenue calculation**: `=J2*SEAT_PRICE` (if you add pricing)

This setup will give you a robust, scalable booking system with real-time data synchronization to Google Sheets!