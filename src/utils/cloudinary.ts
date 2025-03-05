import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// ✅ Load environment variables
dotenv.config();

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

// ✅ Debugging Logs
console.log("🔍 Cloudinary Config:");
console.log("CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY);
console.log("CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET ? "Loaded ✅" : "❌ Missing");
console.log("CLOUDINARY_API_SECRET (first 5 chars):", process.env.CLOUDINARY_API_SECRET?.substring(0, 5));

export { cloudinary };
