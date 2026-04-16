const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function uploadToR2(buffer, originalName, folder = 'uploads') {
  const ext = path.extname(originalName).toLowerCase();
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: getMimeType(ext),
  }));
  const baseUrl = process.env.R2_PUBLIC_URL || `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}`;
  return `${baseUrl}/${key}`;
}

// ── In-memory cache để tránh gọi R2 liên tục ──────────────────────────────
let _r2Cache = null;
let _r2CacheAt = 0;
const R2_CACHE_TTL = 60 * 1000; // 60 giây

async function listFilesFromR2({ bustCache = false } = {}) {
  const now = Date.now();
  if (!bustCache && _r2Cache && (now - _r2CacheAt) < R2_CACHE_TTL) {
    return _r2Cache;
  }

  const MEDIA_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.ogg', '.mov'];
  const SOFTWARE_EXT = ['.zip', '.rar', '.exe', '.msi', '.pkg', '.dmg'];
  const ALL_EXT = [...MEDIA_EXT, ...SOFTWARE_EXT];
  const baseUrl = process.env.R2_PUBLIC_URL || `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}`;

  // ── Pagination: lấy toàn bộ object, không giới hạn 1000 ──────────────────
  let allContents = [];
  let continuationToken = undefined;
  do {
    const result = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    }));
    if (result.Contents) allContents = allContents.concat(result.Contents);
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  const files = allContents
    .filter(obj => ALL_EXT.includes(path.extname(obj.Key).toLowerCase()))
    .map(obj => {
      const parts = obj.Key.split('/');
      const ext = path.extname(obj.Key).toLowerCase();
      const isVideo = ['.mp4', '.webm', '.ogg', '.mov'].includes(ext);
      const isSoftware = SOFTWARE_EXT.includes(ext);
      const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
      return {
        id: obj.Key,
        folder: parts[0],
        name: parts.slice(1).join('/'),
        url: `${baseUrl}/${obj.Key}`,
        size: obj.Size,
        mtime: new Date(obj.LastModified).getTime(),
        isVideo,
        isSoftware,
        isImage,
      };
    })
    .sort((a, b) => b.mtime - a.mtime);

  _r2Cache = files;
  _r2CacheAt = now;
  return files;
}

// Xoá cache sau khi upload/delete để danh sách luôn fresh
function invalidateR2Cache() {
  _r2Cache = null;
  _r2CacheAt = 0;
}

async function deleteFromR2(url) {
  try {
    const baseUrl = process.env.R2_PUBLIC_URL || `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}`;
    const key = url.replace(baseUrl + '/', '');
    await s3.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
  } catch (err) {
    console.error('R2 delete error:', err.message);
  }
}

function getMimeType(ext) {
  const map = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4',
    '.webm': 'video/webm', '.mov': 'video/quicktime', '.ogg': 'video/ogg',
  };
  return map[ext] || 'application/octet-stream';
}

async function getPresignedUploadUrl(filename) {
  const ext = path.extname(filename).toLowerCase() || '.zip';
  const key = `software/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    ContentType: 'application/octet-stream',
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 7200 });
  const baseUrl = process.env.R2_PUBLIC_URL || `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}`;
  const publicUrl = `${baseUrl}/${key}`;
  return { uploadUrl, publicUrl, key };
}

module.exports = { uploadToR2, deleteFromR2, listFilesFromR2, invalidateR2Cache, getPresignedUploadUrl };