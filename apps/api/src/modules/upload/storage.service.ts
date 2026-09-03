import { Injectable, InternalServerErrorException } from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StorageUploadResult {
  key: string;
  url: string;
}

export interface StorageDownloadResult {
  body: Buffer;
  contentType: string;
}

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor() {
    this.region = process.env.AWS_REGION ?? "ap-south-1";
    this.bucket = process.env.AWS_S3_BUCKET ?? "";

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    this.client = new S3Client({
      region: this.region,
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }

  async upload(
    key: string,
    body: Buffer,
    mimeType: string,
  ): Promise<StorageUploadResult> {
    if (!this.bucket) {
      throw new InternalServerErrorException("Storage is not configured");
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
      }),
    );

    return {
      key,
      url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
    };
  }

  async delete(key: string): Promise<void> {
    if (!this.bucket) return;
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async getPresignedUrl(key: string, ttlSeconds: number): Promise<string> {
    if (!this.bucket) {
      throw new InternalServerErrorException("Storage is not configured");
    }

    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: ttlSeconds },
    );
  }

  async download(key: string): Promise<StorageDownloadResult> {
    if (!this.bucket) {
      throw new InternalServerErrorException("Storage is not configured");
    }
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!result.Body)
      throw new InternalServerErrorException("Stored media is unavailable");
    return {
      body: Buffer.from(await result.Body.transformToByteArray()),
      contentType: result.ContentType ?? "application/octet-stream",
    };
  }
}
