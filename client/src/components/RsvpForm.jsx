import { useState } from 'react';
import { sendRsvp } from '../api.js';
import { guestFromUrl } from '../utils.js';

/**
 * Form xác nhận tham dự — hiển thị trong modal mở từ panel thông tin
 * tiệc cưới (CalendarSection).
 * `data`: { askAttendance, askGuestCount, askSide, note, thankYouText }
 */
export default function RsvpForm({ data = {} }) {
  const [form, setForm] = useState({
    name: guestFromUrl(),
    attending: 'yes',
    guests: 1,
    side: '',
    message: ''
  });
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setState('sending');
    setError('');
    try {
      await sendRsvp({ ...form, attending: form.attending === 'yes' });
      setState('done');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div className="form-success">
        <span className="form-success-mark">❦</span>
        <p>{data.thankYouText || 'Cảm ơn bạn rất nhiều! Hẹn gặp bạn trong ngày vui của chúng mình.'}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="form">
      <label className="field">
        <span>Tên của bạn *</span>
        <input value={form.name} onChange={update('name')} required placeholder="Nguyễn Văn A" />
      </label>

      {data.askAttendance && (
        <div className="field">
          <span>Bạn sẽ tham dự chứ?</span>
          <div className="choice-row">
            <label className={`choice ${form.attending === 'yes' ? 'is-active' : ''}`}>
              <input type="radio" name="attending" value="yes" checked={form.attending === 'yes'} onChange={update('attending')} />
              <span>Có, mình sẽ đến</span>
            </label>
            <label className={`choice ${form.attending === 'no' ? 'is-active' : ''}`}>
              <input type="radio" name="attending" value="no" checked={form.attending === 'no'} onChange={update('attending')} />
              <span>Rất tiếc, mình bận</span>
            </label>
          </div>
        </div>
      )}

      {data.askGuestCount && (
        <label className="field">
          <span>Số người tham dự</span>
          <input type="number" min="1" max="20" value={form.guests} onChange={update('guests')} />
        </label>
      )}

      {data.askSide && (
        <label className="field">
          <span>Bạn là khách của</span>
          <select value={form.side} onChange={update('side')}>
            <option value="">-- Chọn --</option>
            <option value="Chú rể">Chú rể</option>
            <option value="Cô dâu">Cô dâu</option>
            <option value="Cả hai">Cả hai</option>
          </select>
        </label>
      )}

      <label className="field">
        <span>Lời nhắn</span>
        <textarea rows="3" value={form.message} onChange={update('message')} placeholder="Chúc mừng hai bạn..." />
      </label>

      {data.note && <p className="form-note">{data.note}</p>}
      {error && <p className="form-error">{error}</p>}

      <button className="btn btn-primary btn-block" disabled={state === 'sending'}>
        {state === 'sending' ? 'Đang gửi...' : 'Gửi xác nhận'}
      </button>
    </form>
  );
}
