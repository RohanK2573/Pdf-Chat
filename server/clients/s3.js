import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import "dotenv/config";

const getBucketName = () => process.env.S3_BUCKET_NAME;
const getRegion = () => process.env.AWS_REGION;
const getClient = () => {
  const region = getRegion();
  if (!region) {
    throw new Error("AWS_REGION is not configured");
  }
  const keyId = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;
  const token = process.env.AWS_SESSION_TOKEN;

  // Prefer explicit env credentials in local/dev when provided; otherwise SDK
  // falls back to the default provider chain (profiles, EC2/ECS role, etc.).
  if (keyId && secret) {
    return new S3Client({
      region,
      credentials: {
        accessKeyId: keyId,
        secretAccessKey: secret,
        ...(token ? { sessionToken: token } : {}),
      },
    });
  }

  return new S3Client({ region });
};

export const s3Client = getClient();

const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export const uploadPdfToS3 = async (
  buffer,
  key,
  contentType = "application/pdf"
) => {
  const bucketName = getBucketName();
  if (!bucketName) {
    throw new Error(
      "S3_BUCKET_NAME is not configured"
    );
  }
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Invalid file buffer");
  }
  if (!key) {
    throw new Error("S3 object key is required");
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  const response = await s3Client.send(command);
  return {
    bucket: bucketName,
    key,
    etag: response.ETag,
  };
};

export const getObjectBuffer = async (key) => {
  const bucketName = getBucketName();
  if (!bucketName) {
    throw new Error("S3_BUCKET_NAME is not configured");
  }
  if (!key) {
    throw new Error("S3 object key is required");
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const response = await s3Client.send(command);
  if (!response.Body) {
    throw new Error(`Empty object body for key: ${key}`);
  }

  const buffer = await streamToBuffer(response.Body);
  return {
    buffer,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    etag: response.ETag,
  };
};
