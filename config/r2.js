const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
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

async function listFilesFromR2() {
  const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.ogg', '.mov'];
  const baseUrl = process.env.R2_PUBLIC_URL || `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}`;
  const result = await s3.send(new ListObjectsV2Command({
    Bucket: process.env.R2_BUCKET,
    MaxKeys: 1000,
  }));
  const files = (result.Contents || [])
    .filter(obj => ALLOWED_EXT.includes(path.extname(obj.Key).toLowerCase()))
    .map(obj => {
      const parts = obj.Key.split('/');
      return {
        id: obj.Key,
        folder: parts[0],
        name: parts.slice(1).join('/'),
        url: `${baseUrl}/${obj.Key}`,
        size: obj.Size,
        mtime: new Date(obj.LastModified).getTime(),
      };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return files;
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

module.exports = { uploadToR2, deleteFromR2, listFilesFromR2 };