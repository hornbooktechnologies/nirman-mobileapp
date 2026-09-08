import { randomUUID } from "node:crypto";
import * as dotenv from "dotenv";
import * as path from "node:path";
import {
  DeleteObjectCommand,
  GetPublicAccessBlockCommand,
  ListObjectVersionsCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { StorageService } from "../src/modules/upload/storage.service";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const bucket = process.env.AWS_S3_BUCKET?.trim();
const region = process.env.AWS_REGION?.trim() || "ap-south-1";

if (!bucket) throw new Error("AWS_S3_BUCKET is not set");
if (process.env.GALLERY_STORAGE_VERIFY_CONFIRM !== bucket) {
  throw new Error(
    "Set GALLERY_STORAGE_VERIFY_CONFIRM to the exact AWS_S3_BUCKET value",
  );
}

const organizationId = `verification-org-${randomUUID()}`;
const projectId = `verification-project-${randomUUID()}`;
const entryId = randomUUID();
const fileAssetId = randomUUID();
const storageKey = [
  "organizations",
  organizationId,
  "projects",
  projectId,
  "assets",
  "gallery",
  entryId,
  `${fileAssetId}.png`,
].join("/");
const image = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function purgeVerificationVersions(client: S3Client) {
  const versions = await client.send(
    new ListObjectVersionsCommand({ Bucket: bucket, Prefix: storageKey }),
  );
  const objects = [
    ...(versions.Versions ?? []),
    ...(versions.DeleteMarkers ?? []),
  ].filter((item) => item.Key === storageKey && item.VersionId);
  await Promise.all(
    objects.map((item) =>
      client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: storageKey,
          VersionId: item.VersionId,
        }),
      ),
    ),
  );
  return objects.length;
}

async function main() {
  const client = new S3Client({ region });
  const storage = new StorageService();
  let uploaded = false;
  try {
    const publicAccess = await client.send(
      new GetPublicAccessBlockCommand({ Bucket: bucket }),
    );
    const block = publicAccess.PublicAccessBlockConfiguration;
    const allPublicAccessBlocked = Boolean(
      block?.BlockPublicAcls &&
      block.IgnorePublicAcls &&
      block.BlockPublicPolicy &&
      block.RestrictPublicBuckets,
    );
    if (!allPublicAccessBlocked) {
      throw new Error("The Gallery bucket does not block all public access");
    }

    await storage.upload(storageKey, image, "image/png");
    uploaded = true;
    const downloaded = await storage.download(storageKey);
    if (!downloaded.body.equals(image)) {
      throw new Error("Downloaded Gallery bytes do not match the upload");
    }
    if (downloaded.contentType !== "image/png") {
      throw new Error(`Unexpected content type: ${downloaded.contentType}`);
    }

    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${storageKey}`;
    const publicResponse = await fetch(publicUrl, { redirect: "manual" });
    if (![401, 403].includes(publicResponse.status)) {
      throw new Error(
        `Gallery object was publicly readable (HTTP ${publicResponse.status})`,
      );
    }

    await storage.delete(storageKey);
    uploaded = false;
    const purgedVersions = await purgeVerificationVersions(client);
    console.log(
      JSON.stringify(
        {
          bucketConfigured: true,
          region,
          hierarchy:
            "organizations/{organizationId}/projects/{projectId}/assets/gallery/{entryId}/{fileAssetId}.{extension}",
          upload: "passed",
          authenticatedRead: "passed",
          byteIntegrity: "passed",
          contentType: "passed",
          publicReadBlocked: "passed",
          delete: "passed",
          verificationVersionsPurged: purgedVersions,
        },
        null,
        2,
      ),
    );
  } finally {
    if (uploaded) await storage.delete(storageKey).catch(() => undefined);
    await purgeVerificationVersions(client).catch(() => undefined);
  }
}

void main();
