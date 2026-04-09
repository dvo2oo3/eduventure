/**
 * sse.js — Server-Sent Events broadcaster cho EduVenture
 *
 * Dùng in-memory client list (phù hợp single-process).
 * Nếu sau này scale multi-process thì cần chuyển sang Redis pub/sub.
 *
 * Channels:
 *  - 'messages'         : tin nhắn liên hệ mới (admin)
 *  - 'download-status'  : thay đổi trạng thái tạm dừng tải xuống (public)
 */

'use strict';

// Map<channel, Set<res>>
const channels = new Map();

/**
 * Đăng ký một SSE client vào channel.
 * @param {string} channel
 * @param {import('express').Response} res
 */
function subscribe(channel, res) {
  if (!channels.has(channel)) channels.set(channel, new Set());
  channels.get(channel).add(res);
}

/**
 * Huỷ đăng ký khi client disconnect.
 * @param {string} channel
 * @param {import('express').Response} res
 */
function unsubscribe(channel, res) {
  if (channels.has(channel)) channels.get(channel).delete(res);
}

/**
 * Gửi sự kiện tới tất cả clients đang lắng nghe channel.
 * @param {string} channel
 * @param {string} event   - tên event (VD: 'new-message', 'status-change')
 * @param {object} data    - payload (sẽ được JSON.stringify)
 */
function broadcast(channel, event, data) {
  if (!channels.has(channel)) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of channels.get(channel)) {
    try {
      res.write(payload);
    } catch (_) {
      // client đã đóng, dọn dẹp
      channels.get(channel).delete(res);
    }
  }
}

/**
 * Express middleware: thiết lập response header SSE và gắn cleanup.
 * Gọi hàm này trong route handler trước khi subscribe().
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {number} [heartbeatMs=25000]  - khoảng gửi comment keep-alive (ms)
 * @returns {() => void}  hàm cleanup (gọi khi muốn huỷ sớm)
 */
function initSSE(req, res, heartbeatMs = 25000) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // tắt buffer ở nginx
  res.flushHeaders();

  // Gửi comment keep-alive để giữ kết nối qua proxy/load-balancer
  const hb = setInterval(() => {
    try { res.write(': ping\n\n'); } catch (_) { clearInterval(hb); }
  }, heartbeatMs);

  const cleanup = () => clearInterval(hb);
  req.on('close', cleanup);
  return cleanup;
}

module.exports = { subscribe, unsubscribe, broadcast, initSSE };