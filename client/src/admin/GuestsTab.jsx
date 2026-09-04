import { useEffect, useState } from 'react';
import { adminRsvp, deleteRsvp, adminWishes, toggleWish, deleteWish } from '../api.js';

const STAY_TEXT = { yes: 'Ở lại', no: 'Về luôn' };

export default function GuestsTab() {
  const [tab, setTab] = useState('rsvp');
  const [rsvp, setRsvp] = useState([]);
  const [wishes, setWishes] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    adminRsvp().then(setRsvp).catch((e) => setError(e.message));
    adminWishes().then(setWishes).catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const stats = {
    total: rsvp.length,
    yes: rsvp.filter((r) => r.attending).length,
    no: rsvp.filter((r) => !r.attending).length,
    people: rsvp.filter((r) => r.attending).reduce((sum, r) => sum + (Number(r.guests) || 1), 0),
    stay: rsvp.filter((r) => r.attending && r.stay === 'yes').length
  };

  const exportCsv = () => {
    const rows = [
      ['Tên', 'Điện thoại', 'Tham dự', 'Số người', 'Khách của', 'Điểm đón', 'Sau tiệc', 'Lời nhắn', 'Thời gian'],
      ...rsvp.map((r) => [
        r.name,
        // Tab ở đầu để Excel đọc là chữ, giữ số 0 đứng đầu ("0912..." chứ
        // không thành 912...).
        r.phone ? `\t${r.phone}` : '',
        r.attending ? 'Có' : 'Không',
        r.guests,
        r.side,
        r.pickup || '',
        STAY_TEXT[r.stay] || '',
        (r.message || '').replace(/[\r\n]+/g, ' '),
        new Date(r.createdAt).toLocaleString('vi-VN')
      ])
    ];
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'danh-sach-khach.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="a-card">
      <header className="a-card-head">
        <h2>Khách mời</h2>
        <p>Danh sách xác nhận tham dự và lời chúc khách gửi từ thiệp.</p>
      </header>

      <div className="a-card-body">
        <div className="a-stats">
          <div className="a-stat"><b>{stats.total}</b><span>Phản hồi</span></div>
          <div className="a-stat"><b>{stats.yes}</b><span>Sẽ tham dự</span></div>
          <div className="a-stat"><b>{stats.people}</b><span>Tổng số người</span></div>
          <div className="a-stat"><b>{stats.stay}</b><span>Ở lại sau tiệc</span></div>
          <div className="a-stat"><b>{stats.no}</b><span>Không đến được</span></div>
          <div className="a-stat"><b>{wishes.length}</b><span>Lời chúc</span></div>
        </div>

        <div className="a-subtabs">
          <button type="button" className={tab === 'rsvp' ? 'is-active' : ''} onClick={() => setTab('rsvp')}>
            Xác nhận tham dự ({rsvp.length})
          </button>
          <button type="button" className={tab === 'wishes' ? 'is-active' : ''} onClick={() => setTab('wishes')}>
            Lời chúc ({wishes.length})
          </button>
          <span className="a-spacer" />
          <button type="button" className="a-btn a-btn-sm" onClick={load}>Tải lại</button>
          {tab === 'rsvp' && <button type="button" className="a-btn a-btn-sm" onClick={exportCsv}>Xuất CSV</button>}
        </div>

        {error && <p className="a-error">{error}</p>}

        {tab === 'rsvp' ? (
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Tên</th><th>Điện thoại</th><th>Tham dự</th><th>Số người</th><th>Khách của</th>
                  <th>Điểm đón</th><th>Sau tiệc</th><th>Lời nhắn</th><th>Thời gian</th><th />
                </tr>
              </thead>
              <tbody>
                {rsvp.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.phone ? <a href={`tel:${r.phone}`}>{r.phone}</a> : '—'}</td>
                    <td><span className={`a-pill ${r.attending ? 'is-yes' : 'is-no'}`}>{r.attending ? 'Có' : 'Không'}</span></td>
                    <td>{r.guests}</td>
                    <td>{r.side}</td>
                    <td>{r.pickup}</td>
                    <td>{STAY_TEXT[r.stay] || '—'}</td>
                    <td className="a-td-msg">{r.message}</td>
                    <td>{new Date(r.createdAt).toLocaleString('vi-VN')}</td>
                    <td>
                      <button
                        type="button"
                        className="a-icon-btn is-danger"
                        onClick={() => deleteRsvp(r.id).then(() => setRsvp((l) => l.filter((x) => x.id !== r.id)))}
                      >✕</button>
                    </td>
                  </tr>
                ))}
                {!rsvp.length && <tr><td colSpan={10} className="a-empty">Chưa có phản hồi nào.</td></tr>}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="a-wish-admin">
            {wishes.map((w) => (
              <div className={`a-wish-row ${w.hidden ? 'is-hidden' : ''}`} key={w.id}>
                <div>
                  <b>{w.name}</b>
                  <span className="a-wish-time">{new Date(w.createdAt).toLocaleString('vi-VN')}</span>
                  <p>{w.message}</p>
                </div>
                <div className="a-wish-tools">
                  <button
                    type="button"
                    className="a-btn a-btn-sm a-btn-ghost"
                    onClick={() =>
                      toggleWish(w.id, !w.hidden).then(() =>
                        setWishes((l) => l.map((x) => (x.id === w.id ? { ...x, hidden: !x.hidden } : x)))
                      )
                    }
                  >
                    {w.hidden ? 'Hiện' : 'Ẩn'}
                  </button>
                  <button
                    type="button"
                    className="a-icon-btn is-danger"
                    onClick={() => deleteWish(w.id).then(() => setWishes((l) => l.filter((x) => x.id !== w.id)))}
                  >✕</button>
                </div>
              </div>
            ))}
            {!wishes.length && <p className="a-empty">Chưa có lời chúc nào.</p>}
          </div>
        )}
      </div>
    </section>
  );
}
