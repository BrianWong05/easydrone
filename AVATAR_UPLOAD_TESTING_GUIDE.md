# 🧪 Avatar Upload Testing Guide

## 🔧 **Authentication Issue Fixed**

The avatar upload was failing because the component wasn't using the proper authentication token from the auth store. This has been resolved by:

1. ✅ **Imported auth store** into AvatarUpload component
2. ✅ **Used token from auth store** instead of localStorage directly  
3. ✅ **Added authentication checks** before making requests
4. ✅ **Added proper error messages** for authentication failures

## 🧪 **How to Test Avatar Upload:**

### **Step 1: Login**
1. Navigate to `http://localhost:8888` or `http://localhost:3000`
2. Login with admin credentials
3. Ensure you're authenticated (check if you can access athlete management)

### **Step 2: Test Avatar Upload**
1. Go to **Athletes** → **Athlete List**
2. Click **Edit** on any existing athlete
3. Look for the **Avatar Upload** section (blue box)
4. Try uploading an image:
   - Click the camera icon or "Upload Avatar" button
   - Or drag & drop an image file
   - Supported formats: JPEG, PNG, GIF, WebP (max 5MB)

### **Step 3: Verify Upload**
1. Check if the image appears in the avatar preview
2. Verify the upload was successful (green success message)
3. Check if the image persists after page refresh

### **Step 4: Test Delete**
1. Click "Delete Avatar" button
2. Confirm the deletion
3. Verify the avatar is removed

## 🔍 **Troubleshooting:**

### **If Upload Still Fails:**
1. **Check Browser Console** for JavaScript errors
2. **Check Network Tab** to see if requests are being made with proper headers
3. **Check Backend Logs** for authentication errors:
   ```bash
   docker-compose -f docker-compose-react.yml logs backend --tail=20
   ```

### **Expected Backend Logs:**
- ✅ **Success**: `🔐 Auth check - Headers: Bearer [token]`
- ❌ **Failure**: `🔐 Auth check - Headers: Bearer null`

### **Common Issues:**
- **"Please login to continue"**: User not authenticated
- **"文件上傳服務暫時不可用"**: Multer not available
- **"只允許上傳圖片文件"**: Wrong file type
- **"文件大小不能超過 5MB"**: File too large

## 📁 **File Storage Verification:**

Check if uploaded files are stored correctly:
```bash
# List uploaded avatars
docker-compose -f docker-compose-react.yml exec backend ls -la /app/uploads/avatars/

# Check if static serving works
curl -I http://localhost:8001/api/uploads/avatars/
```

## 🎯 **Expected Behavior:**

1. **Upload**: File uploads successfully, avatar appears immediately
2. **Preview**: Click avatar to see full-size preview in modal
3. **Delete**: Avatar removes successfully, reverts to default icon
4. **Persistence**: Avatar persists after page refresh
5. **Security**: Only authenticated users can upload/delete

## 🔄 **Test Different Scenarios:**

1. **Valid Image Files**: JPEG, PNG, GIF, WebP
2. **Invalid Files**: PDF, TXT, etc. (should be rejected)
3. **Large Files**: >5MB (should be rejected)
4. **Multiple Uploads**: Replace existing avatar
5. **Network Issues**: Test with slow connection

## 📊 **Success Indicators:**

- ✅ No authentication errors in backend logs
- ✅ Files appear in `/app/uploads/avatars/` directory
- ✅ Avatar displays in athlete forms
- ✅ Success messages appear for upload/delete
- ✅ Proper error handling for invalid files

---

**The avatar upload feature should now work correctly with proper authentication!** 🎉