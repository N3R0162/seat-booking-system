# Quick Setup Guide for Google Sheets Integration

## Step-by-Step Instructions:

### 1. Create Google Spreadsheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Seat Booking System"
4. The script will automatically create the proper headers when first used

### 2. Set up Google Apps Script
1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete the default code
3. Copy and paste the code from `google-apps-script.js` file
4. Save the project (name it "Seat Booking System")

### 3. Deploy the Script
1. Click **Deploy → New deployment**
2. Choose type: **Web app**
3. Set **Execute as**: Me
4. Set **Who has access**: Anyone
5. Click **Deploy**
6. **IMPORTANT**: Copy the Web app URL

### 4. Update Your Configuration
1. Open `script.js`
2. Find this line:
   ```javascript
   const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
   ```
3. Replace `'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'` with your actual Web app URL

### 5. Test the Integration
1. Open your `index.html` in a browser
2. Fill out a test booking
3. Submit the booking
4. Check your Google Sheet to see if the data appears

## Expected Google Sheet Structure:
```
| Timestamp | Customer Name | Customer Email | Customer Phone | Event Date | Time Slot | Location | Location ID | Selected Seats | Total Seats | Booking ID | Status |
```

## Features Included:

✅ **Real-time sync** - Booked seats sync from Google Sheets to prevent conflicts
✅ **Email confirmations** - Automatic confirmation emails with booking details  
✅ **Unique booking IDs** - Each booking gets a unique reference number
✅ **Multi-location support** - Handles different venues/locations
✅ **Comprehensive logging** - Full booking details stored in structured format
✅ **Admin functions** - Built-in functions for statistics and management

## Optional Email Setup:
To enable email confirmations, the Google Apps Script will automatically send emails using the Gmail account that owns the script. No additional setup required!

## Security Notes:
- The Apps Script URL can be accessed by anyone, but only accepts properly formatted booking data
- All data validation happens on the server side
- Email addresses are validated before processing

## Troubleshooting:
1. **Data not appearing**: Check Apps Script execution logs
2. **Permission errors**: Re-deploy the script with correct permissions
3. **Email not sending**: Check Gmail sending limits (100 emails/day for personal accounts)

## Admin Functions (Available in Apps Script):
- `getBookingStats()` - Get booking statistics
- `clearAllBookings()` - Clear all bookings (use with caution)
- `testBooking()` - Test the integration with sample data