// Điểm vào của Vercel Serverless Function.
// Vercel gom mọi request /api/* vào đây (xem rewrites trong vercel.json)
// rồi đưa thẳng cho Express xử lý.
export { default } from '../server/app.js';
