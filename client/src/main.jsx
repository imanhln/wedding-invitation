import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import InvitationPage from './InvitationPage.jsx';
import AdminApp from './admin/AdminApp.jsx';
import './styles/base.css';
import './styles/invitation.css';
import './styles/admin.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InvitationPage />} />
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
      {/* Đếm lượt xem trên Vercel Analytics; tự tắt khi chạy máy cá nhân. */}
      <Analytics />
    </BrowserRouter>
  </React.StrictMode>
);
