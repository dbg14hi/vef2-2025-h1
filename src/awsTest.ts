import "dotenv/config";
import { Hono } from "hono";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

const app = new Hono();

// Load environment variables
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME!;
const AWS_REGION = process.env.AWS_REGION!;
const IMGIX_BASE_URL = process.env.IMGIX_BASE_URL!;

// Initialize AWS S3 Client
const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Upload endpoint
app.post("/upload", async (c) => {
  const body = await c.req.parseBody();
  const image = body["image"] as File;

  if (!image) {
    return c.json({ error: "No image file provided" }, 400);
  }

  // Generate a unique filename
  const fileExtension = image.name.split(".").pop();
  const fileName = `${nanoid()}.${fileExtension}`;

  // Upload to S3
  const buffer = await image.arrayBuffer();
  const uploadParams = {
    Bucket: AWS_BUCKET_NAME,
    Key: fileName,
    Body: Buffer.from(buffer),
    ContentType: image.type,
 };

  try {
    await s3.send(new PutObjectCommand(uploadParams));

    // Construct Imgix URL
    const imgixUrl = `${IMGIX_BASE_URL}/${fileName}`;
    return c.json({ imgixUrl });
  } catch (error) {
    console.error("S3 Upload Error:", error);
    return c.json({ error: "Failed to upload image" }, 500);
  }
});

// === Hono-Native Test Case ===
const runTest = async () => {
  try {
    console.info("Running test...");

    // Create a test image blob
    const response = await fetch("https://upload.wikimedia.org/wikipedia/commons/b/b1/VAN_CAT.png");
    if (!response.ok) throw new Error("Failed to download test image");
    const buffer = await response.arrayBuffer();
    const fileBlob = new Blob([buffer], { type: "image/png" });

    // Send a test request to upload
    const formData = new FormData();
    formData.append("image", fileBlob, "van_cat.png");

    const uploadResponse = await app.request("/upload", {
      method: "POST",
      body: formData,
    });

    const jsonResponse = await uploadResponse.json();
    console.info("Imgix URL:", jsonResponse.imgixUrl);
  } catch (error) {
    console.error("Test Error:", error);
  }
};

// Start the test
runTest();
