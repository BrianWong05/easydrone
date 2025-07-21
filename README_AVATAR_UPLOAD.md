# 🖼️ Athlete Avatar Upload Feature

## Overview
This feature allows uploading and managing avatar images for athletes in the drone soccer tournament management system.

## Implementation Details

### Backend Changes
1. **Database Migration**: Added `avatar_url` column to `athletes` table
   ```sql
   ALTER TABLE athletes ADD COLUMN avatar_url VARCHAR(500) NULL COMMENT '運動員頭像URL';
   ```

2. **File Upload Middleware**: Created `server/middleware/upload.js`
   - Uses multer for handling multipart/form-data
   - Stores files in `server/uploads/avatars/`
   - Validates file types (JPEG, PNG, GIF, WebP)
   - Limits file size to 5MB

3. **API Endpoints**: Added to `server/routes/athletes.js`
   - `POST /api/athletes/:id/avatar` - Upload avatar
   - `DELETE /api/athletes/:id/avatar` - Delete avatar
   - Static file serving at `/api/uploads/avatars/`

### Frontend Changes
1. **AvatarUpload Component**: Created `client/src/components/AvatarUpload.js`
   - Drag & drop or click to upload
   - Image preview with modal
   - Delete functionality
   - Progress indicators

2. **Integration**: Added to athlete forms
   - `TournamentAthleteCreate.js` - Shows after athlete creation
   - `TournamentAthleteEdit.js` - Shows in edit form

3. **Translations**: Added avatar-related translations to `athlete.json`

## Usage

### For Administrators
1. **Create Athlete**: After creating an athlete, an avatar upload section appears
2. **Edit Athlete**: Avatar upload is available in the edit form
3. **Supported Formats**: JPEG, PNG, GIF, WebP (max 5MB)

### API Usage
```javascript
// Upload avatar
const formData = new FormData();
formData.append('avatar', file);

fetch(`/api/athletes/${athleteId}/avatar`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

// Delete avatar
fetch(`/api/athletes/${athleteId}/avatar`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## File Structure
```
server/
├── middleware/upload.js          # Multer configuration
├── routes/athletes.js           # Avatar endpoints
└── uploads/avatars/             # Uploaded files

client/
├── src/components/AvatarUpload.js    # Upload component
├── src/pages/Athletes/
│   ├── TournamentAthleteCreate.js    # Create with avatar
│   └── TournamentAthleteEdit.js      # Edit with avatar
└── public/locales/*/athlete.json    # Translations
```

## Security Features
- File type validation
- File size limits
- Authentication required
- Automatic cleanup of old files
- Secure file naming

## Docker Integration
- Uploads directory is created automatically
- Files persist in container volumes
- Static file serving configured

## Testing
1. Create a new athlete
2. Upload an avatar image
3. Verify image appears in athlete details
4. Test edit functionality
5. Test delete functionality

## Troubleshooting
- Ensure uploads directory exists: `mkdir -p server/uploads/avatars`
- Check file permissions
- Verify multer dependency is installed
- Check backend logs for upload errors