# Seat Booking System

A simple, static seat booking system with a configurable seat layout, session/date selectors, and optional SheetDB-backed persistence.

## Features

- **Interactive Seat Grid**: Seat layout rendered dynamically from configuration
- **Event Scheduling**: Support for single or multi-day events with time slots and locations
- **Real-time Availability**: Visual feedback for available, selected, and booked seats
- **Customer Information**: Captures name, email, and phone number with validation
- **SheetDB Integration**: Optional cloud persistence via SheetDB REST API
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Files Structure

```
seat-booking-system/
├── build.sh                # Build helper to inject environment variables
├── config.template.js      # Template used to generate config.js at build time
├── index.html              # Main HTML file
├── script.js               # Main JavaScript (loads values from config.js)
├── styles.css              # CSS styling
└── static/…                # Static assets
```
## Environment configuration

Sensitive values (such as SheetDB credentials) are injected at build time using environment variables.  The runtime code looks for a `config.js` file that defines `window.__SEAT_BOOKING_CONFIG__`.

### Local development

1. Copy `config.template.js` to `config.js` and fill in your values manually:
	```bash
	cp config.template.js config.js
	# edit config.js and add your SheetDB credentials
	```
2. Open `index.html` in a browser or start a local web server (for example `python3 -m http.server 8000`).

> `config.js` is ignored by git so you will not accidentally commit secrets.

### MyKinsta deployment

```
1. In MyKinsta, open your static site → **Settings** → **Environment variables**.
2. Add the following keys (uppercase alphanumerics and underscores only):
	- `SHEETDB_API_URL` – e.g. `https://sheetdb.io/api/v1/XXXXXXXX`
	- `SHEETDB_BEARER_TOKEN` – optional bearer token value
3. Set the build command to run the helper script before the default build (for plain static hosting the command can simply be `bash build.sh`).
4. Ensure the publish directory remains the site root (since the project is already static).
5. Redeploy the site whenever you change environment variables—MyKinsta only applies new values on the next build.

During the build, `build.sh` generates `config.js` from `config.template.js`, replacing the placeholders with the environment variable values supplied by MyKinsta.`config.js` is then served to the browser and consumed by `script.js`.
```
