# Seat Booking System

A simple, static seat booking system with a 10×10 grid of seats, time slot selection, and Google Sheets integration for data storage.

## Features

- **Interactive Seat Grid**: 10×10 seat layout (100 seats total)
- **Time Slot Selection**: 7 predefined time slots throughout the day
- **Date Selection**: Book for current and future dates
- **Real-time Availability**: Visual feedback for available, selected, and booked seats
- **Customer Information**: Collect name, email, and phone number
- **Google Sheets Integration**: Store all booking data in Google Sheets
- **Email Confirmation**: Automatic booking confirmation emails
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Local Storage Backup**: Maintains state even without internet connection

## Files Structure

```
seat-booking-system/
├── index.html              # Main HTML file
├── styles.css              # CSS styling
├── script.js               # JavaScript functionality
├── google-apps-script.js   # Google Apps Script code
└── README.md              # This file
```

## Quick Start

### 1. Basic Setup (No Google Sheets)

1. Open `index.html` in any modern web browser
2. The system will work with local storage for demo purposes
3. Select a date and time slot
4. Click on seats to select them
5. Fill in customer details and submit

### 2. Full Setup with Google Sheets Integration

#### Step 1: Create Google Apps Script

1. Go to [script.google.com](https://script.google.com)
2. Click "New project"
3. Delete the default code and paste the content from `google-apps-script.js`
4. Save the project with a name like "Seat Booking System"

#### Step 2: Deploy the Script

1. In the Apps Script editor, click "Deploy" → "New deployment"
2. Choose type: "Web app"
3. Execute as: "Me"
4. Who has access: "Anyone" (or "Anyone with Google account" for more security)
5. Click "Deploy"
6. Copy the web app URL (it will look like: `https://script.google.com/macros/s/...../exec`)

#### Step 3: Connect to Your HTML

1. Open `script.js`
2. Replace `'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'` with your actual web app URL
3. Save the file

#### Step 4: Test the Integration

1. Open `index.html` in a browser
2. Make a test booking
3. Check your Google Drive for a new spreadsheet called "Seat Booking System"

## Usage Instructions

### For Customers

1. **Select Date**: Choose your preferred date (today or future dates only)
2. **Choose Time Slot**: Pick from available time slots
3. **Select Seats**: Click on green (available) seats to select them
   - Green seats: Available
   - Blue seats: Currently selected
   - Red seats: Already booked
   - Gray seats: Disabled (no time slot selected)
4. **Fill Details**: Enter your name, email, and phone number
5. **Submit**: Click "Submit Booking" to confirm
6. **Confirmation**: You'll receive a confirmation email with booking details

### For Administrators

#### View Bookings
- Open the Google Sheets file in your Google Drive
- All bookings are automatically recorded with timestamps

#### Booking Data Includes:
- Timestamp
- Date and Time Slot
- Selected Seats
- Total Number of Seats
- Customer Information
- Booking Status

#### Admin Functions (Google Apps Script Console)
```javascript
// Get booking statistics
getBookingStats()

// Clear all bookings (use with caution)
clearAllBookings()

// Test the system
testBooking()
```

## Customization

### Modify Seat Layout

In `script.js`, change these constants:
```javascript
const ROWS = 10;           // Number of rows
const SEATS_PER_ROW = 10;  // Number of seats per row
```

### Add/Modify Time Slots

In `index.html`, edit the time slot options:
```html
<option value="09:00-10:00">09:00 - 10:00 AM</option>
<option value="10:30-11:30">10:30 - 11:30 AM</option>
<!-- Add more options as needed -->
```

### Customize Colors and Styling

Edit `styles.css` to change:
- Colors for different seat states
- Font sizes and families
- Layout and spacing
- Responsive breakpoints

### Email Template

In `google-apps-script.js`, modify the `sendConfirmationEmail` function to customize the email template.

## Browser Support

- **Recommended**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile**: iOS Safari, Android Chrome
- **Requirements**: JavaScript enabled, modern browser with CSS Grid support

## Security Notes

1. **Google Apps Script**: The web app URL should be kept secure if you're using authentication
2. **Data Validation**: All input is validated on the client side, but consider adding server-side validation
3. **Email Addresses**: Customer emails are stored in Google Sheets - ensure compliance with privacy laws
4. **Rate Limiting**: Consider implementing rate limiting for high-traffic scenarios

## Troubleshooting

### Common Issues

1. **Seats Not Loading**: Check browser console for JavaScript errors
2. **Google Sheets Not Working**: Verify the web app URL and deployment permissions
3. **Email Not Sending**: Check Google Apps Script execution log
4. **Mobile Display Issues**: Ensure viewport meta tag is present in HTML

### Debug Mode

To enable debug mode, open browser console and run:
```javascript
localStorage.setItem('debug', 'true');
```

### Reset Local Data

To clear all local storage data:
```javascript
localStorage.clear();
location.reload();
```

## Advanced Features

### Adding User Authentication

To add simple password protection, modify the HTML to include a login form before the booking system.

### Multiple Venues

To support multiple venues, modify the data structure to include venue information in bookings.

### Payment Integration

For payment processing, integrate with services like Stripe or PayPal by modifying the booking submission process.

### Booking Management

Create an admin panel by building additional HTML pages that interact with the Google Sheets data.

## License

This project is open source and available under the MIT License.

## Support

For issues and questions:
1. Check the browser console for error messages
2. Verify all setup steps have been completed
3. Test with a simple booking to isolate issues
4. Check Google Apps Script execution logs for server-side issues

## Updates and Maintenance

- **Regular Testing**: Test the booking system regularly to ensure Google Apps Script integration remains functional
- **Google Sheets**: Periodically clean up old booking data or archive to new sheets
- **Backup**: Consider backing up your Google Apps Script code and spreadsheet data

---

**Note**: This is a basic implementation suitable for small to medium venues. For high-traffic or commercial use, consider implementing additional security measures, database storage, and server-side processing.