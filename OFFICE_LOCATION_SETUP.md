# Office Location Setup Guide

## Overview

The employee attendance system now includes **location-based verification**. Employees can only mark attendance when they are at the office location.

## Setting Office Location

### Step 1: Get Your Office Coordinates

1. Open Google Maps in your browser
2. Search for your office address or navigate to it
3. Right-click on the exact location
4. Click on the coordinates (latitude, longitude) that appear
5. Copy the coordinates (e.g., `31.5204, 74.3587`)

### Step 2: Update Location in Code

#### Frontend (EmployeeAttendance.js)

Open `src/pages/EmployeeAttendance.js` and find:

```javascript
const OFFICE_LOCATION = {
  latitude: 31.5204, // Set your office latitude here
  longitude: 74.3587, // Set your office longitude here (example: Lahore)
  radius: 100 // Radius in meters (100m = ~328 feet)
};
```

Update with your office coordinates:
- `latitude`: Your office latitude
- `longitude`: Your office longitude  
- `radius`: Distance in meters (100m = ~328 feet, 50m = ~164 feet)

#### Backend (server.js)

Open `server.js` and find:

```javascript
const OFFICE_LOCATION = {
  latitude: 31.5204, // Set your office latitude (example: Lahore)
  longitude: 74.3587, // Set your office longitude
  radius: 100 // Radius in meters (100m = ~328 feet)
};
```

Update with the **same coordinates** as frontend.

### Step 3: Set Radius

The `radius` value determines how close employees need to be to mark attendance:

- **50 meters** (~164 feet) - Very strict, must be very close
- **100 meters** (~328 feet) - Standard, covers small office building
- **200 meters** (~656 feet) - Loose, covers larger office complex
- **500 meters** (~1640 feet) - Very loose, covers entire business park

**Recommendation**: Start with 100 meters and adjust based on your office size.

## How It Works

1. **Location Check**: When employee clicks "Start Camera", system checks their GPS location
2. **Distance Calculation**: Calculates distance from employee location to office location
3. **Verification**: If within radius, attendance can be marked. Otherwise, it's rejected.
4. **Double Check**: Location is verified again before final attendance submission

## Location Accuracy

- **GPS Accuracy**: Usually ±5-10 meters on mobile devices
- **Indoor GPS**: May be less accurate (up to ±50 meters)
- **WiFi/Network Location**: Can be more accurate indoors

The system accounts for GPS accuracy when checking location.

## Troubleshooting

### "Location verification failed"

**Possible causes:**
1. Employee is not at office location
2. GPS not enabled on device
3. Location permission not granted
4. Poor GPS signal (indoor location)

**Solutions:**
- Ensure GPS is enabled
- Grant location permissions to browser
- Move to area with better GPS signal
- Check if office coordinates are correct

### "You are X meters away from office"

**Solution:**
- Employee needs to be within the set radius
- Check office coordinates are correct
- Consider increasing radius if office is in a large building

## Future Enhancements

1. **Admin Panel**: Add office location settings in admin panel (instead of code)
2. **Multiple Locations**: Support multiple office locations
3. **Geofencing**: Use more advanced geofencing APIs
4. **Location History**: Store location data for audit purposes

## Security Notes

- Location data is verified on both frontend and backend
- Backend verification prevents location spoofing
- GPS coordinates are sent to server for verification
- Consider privacy implications of storing location data

## Testing

To test location verification:

1. Set office location to your current location
2. Set radius to 10 meters (for testing)
3. Try marking attendance - should work
4. Move 50+ meters away
5. Try marking attendance - should fail with distance message

