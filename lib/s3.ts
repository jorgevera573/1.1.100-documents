import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3Client) {
    return s3Client;
  }

  const S3_ENDPOINT = process.env.S3_ENDPOINT;
  const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
  const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
  const S3_BUCKET = process.env.S3_BUCKET;
  const S3_REGION = process.env.S3_REGION;

  if (!S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_BUCKET || !S3_REGION) {
    throw new Error('S3 configuration environment variables are required');
  }

  s3Client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });

  return s3Client;
}

export function generateS3Key(originalFilename: string): string {
  const timestamp = Date.now();
  const uuid = randomUUID().substring(0, 8);
  const sanitizedName = originalFilename
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .substring(0, 50);

  return `documents/${timestamp}-${uuid}-${sanitizedName}`;
}

export async function uploadToS3(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  try {
    const client = getS3Client();
    const S3_BUCKET = process.env.S3_BUCKET;

    if (!S3_BUCKET) {
      throw new Error('S3_BUCKET environment variable is required');
    }

    await client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload file to S3');
  }
}

export async function deleteFromS3(key: string): Promise<void> {
  try {
    const client = getS3Client();
    const S3_BUCKET = process.env.S3_BUCKET;

    if (!S3_BUCKET) {
      throw new Error('S3_BUCKET environment variable is required');
    }

    await client.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error('Failed to delete file from S3');
  }
}

export async function getS3DownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const client = getS3Client();
    const S3_BUCKET = process.env.S3_BUCKET;

    if (!S3_BUCKET) {
      throw new Error('S3_BUCKET environment variable is required');
    }

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('S3 presigned URL error:', error);
    throw new Error('Failed to generate download URL');
  }
}

export async function downloadFromS3(key: string): Promise<Buffer> {
  try {
    const client = getS3Client();
    const S3_BUCKET = process.env.S3_BUCKET;

    if (!S3_BUCKET) {
      throw new Error('S3_BUCKET environment variable is required');
    }

    const response = await client.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new Error('Empty response body');
    }

    const chunks: Uint8Array[] = [];

    if (response.Body instanceof Uint8Array) {
      chunks.push(response.Body);
    } else if (response.Body instanceof Buffer) {
      chunks.push(response.Body);
    } else if (typeof response.Body === 'string') {
      chunks.push(new TextEncoder().encode(response.Body));
    } else {
      const readable = response.Body as any;
      if (readable.on && typeof readable.on === 'function') {
        await new Promise<void>((resolve, reject) => {
          readable.on('data', (chunk: Uint8Array) => {
            chunks.push(chunk);
          });
          readable.on('end', () => {
            resolve();
          });
          readable.on('error', reject);
        });
      }
    }

    return Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
  } catch (error) {
    console.error('S3 download error:', error);
    throw new Error('Failed to download file from S3');
  }
}
