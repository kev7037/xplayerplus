// پیش‌نمایش لینک برای اشتراک (عنوان آهنگ، خواننده، عکس)
// وقتی لینک شیر میشه، واتساپ/تلگرام این صفحه رو می‌خونن و og:meta ها رو نشون می‌دن
exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const play = q.play || '';
  const title = decodeURIComponent(q.title || 'آهنگ');
  const artist = decodeURIComponent(q.artist || 'ناشناس');
  const image = q.image || '';
  const appBase = (q.appBase || '').replace(/^\/+/, '') ? '/' + (q.appBase || '').replace(/^\/+|\/+$/g, '') : '';

  const host = event.headers['x-forwarded-host'] || event.headers.host || '';
  const proto = event.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const base = `${proto}://${host}`;
  const appPath = base + (appBase || '/');
  const appUrl = play ? appPath + (appPath.includes('?') ? '&' : '?') + 'play=' + encodeURIComponent(play) : appPath;

  const imgAbsolute = image && !image.startsWith('http') ? `${base}/${image.replace(/^\//, '')}` : image;
  const desc = `${title} - ${artist} | xPlayer`;

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - ${escapeHtml(artist)} | xPlayer</title>
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="xPlayer">
  <meta property="og:title" content="${escapeHtml(title)} - ${escapeHtml(artist)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:image" content="${imgAbsolute || base + '/icon.svg'}">
  <meta property="og:url" content="${escapeHtml(appUrl)}">
  <meta property="og:locale" content="fa_IR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)} - ${escapeHtml(artist)}">
  <meta name="twitter:description" content="${escapeHtml(desc)}">
  <meta name="twitter:image" content="${imgAbsolute || base + '/icon.svg'}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(appUrl)}">
  <script>window.location.replace(${JSON.stringify(appUrl)});</script>
</head>
<body>
  <p>در حال انتقال به xPlayer…</p>
  <a href="${escapeHtml(appUrl)}">باز کردن آهنگ</a>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: html
  };
};

function escapeHtml(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
