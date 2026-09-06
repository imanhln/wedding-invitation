// Chạy máy cá nhân: `npm run dev` hoặc `npm start`.
// Trên Vercel thì api/index.js mới là điểm vào — file này không được dùng.
import app from './app.js';
import { SITE_ID, useRemote } from './store.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`\n  Wedding API  -> http://localhost:${PORT}`);
  console.log(`  Site: ${SITE_ID}   |   Luu tru: ${useRemote ? 'Cloudflare R2' : 'file cuc bo'}`);
  console.log(`  Mat khau admin: ${process.env.ADMIN_PASSWORD || '1'} (doi bang bien moi truong ADMIN_PASSWORD)\n`);
});
