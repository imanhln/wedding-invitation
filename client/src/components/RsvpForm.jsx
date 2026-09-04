import { useState } from 'react';
import { sendRsvp } from '../api.js';
import { guestFromUrl, formatShortDate } from '../utils.js';

const SIDES = ['Chú rể', 'Cô dâu', 'Cả hai'];

/**
 * Điểm đón hợp lệ với bên khách vừa chọn: điểm đặt "Cả hai" luôn hiện, khách
 * chọn "Cả hai" (hoặc chưa chọn bên nào) thì thấy hết. Điểm không tên thì bỏ.
 */
function pickupsFor(points, side) {
  return (points || []).filter(
    (p) => p?.label && (!side || !p.side || p.side === 'Cả hai' || side === 'Cả hai' || p.side === side)
  );
}

/**
 * Form xác nhận tham dự — hiển thị trong modal mở từ panel thông tin
 * tiệc cưới (CalendarSection).
 * `data`: { askAttendance, askGuestCount, askSide, askPhone, phoneRequired,
 *           askStay, stayLabel, stayYesText, stayNoText,
 *           askPickup, pickupLabel, pickupPoints, note, deadline, thankYouText }
 */
export default function RsvpForm({ data = {} }) {
  const [form, setForm] = useState({
    name: guestFromUrl(),
    phone: '',
    attending: 'yes',
    guests: 1,
    side: '',
    pickup: '',
    stay: 'yes',
    message: ''
  });
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Ô điểm đón luôn hiện; đổi bên khách thì lọc lại danh sách, điểm đang chọn
  // không còn hợp lệ nữa thì bỏ chọn.
  const updateSide = (e) => {
    const side = e.target.value;
    const valid = pickupsFor(data.pickupPoints, side).some((p) => p.label === form.pickup);
    setForm((f) => ({ ...f, side, pickup: valid ? f.pickup : '' }));
  };

  const pickups = pickupsFor(data.pickupPoints, form.side);

  // Số điện thoại, điểm đón và chuyện ở lại chỉ hỏi khách nhận sẽ đến — khách
  // đã báo bận thì không cần liên lạc lại hay sắp xe.
  const attendingNow = form.attending === 'yes';
  const showPhone = !!data.askPhone && attendingNow;
  const showPickup = data.askPickup && pickups.length > 0 && attendingNow;
  const showStay = !!data.askStay && attendingNow;

  const phoneRequired = showPhone && !!data.phoneRequired;

  // Ghi chú = câu chữ trong trang quản trị + hạn phản hồi đặt riêng bằng ô ngày
  const note = [data.note, data.deadline && formatShortDate(data.deadline)].filter(Boolean).join(' ');

  const submit = async (e) => {
    e.preventDefault();

    // Chặn sớm cho khách sửa ngay tại chỗ; máy chủ vẫn kiểm lại lần nữa.
    const digits = form.phone.replace(/\D/g, '');
    if (showPhone && digits && (digits.length < 8 || digits.length > 15)) {
      setError('Số điện thoại chưa đúng, bạn kiểm tra lại nhé.');
      setState('error');
      return;
    }

    setState('sending');
    setError('');
    try {
      await sendRsvp({
        ...form,
        phone: showPhone ? form.phone : '',
        attending: form.attending === 'yes',
        pickup: showPickup ? form.pickup : '',
        stay: showStay ? form.stay : ''
      });
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

      {showPhone && (
        <label className="field">
          <span>Số điện thoại{phoneRequired ? ' *' : ''}</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={update('phone')}
            required={phoneRequired}
            placeholder="0912 345 678"
          />
        </label>
      )}

      {showStay && (
        <div className="field">
          <span>{data.stayLabel || 'Sau tiệc bạn...'}</span>
          <div className="choice-row">
            <label className={`choice ${form.stay === 'yes' ? 'is-active' : ''}`}>
              <input type="radio" name="stay" value="yes" checked={form.stay === 'yes'} onChange={update('stay')} />
              <span>{data.stayYesText || 'Ở lại chơi cùng chúng mình'}</span>
            </label>
            <label className={`choice ${form.stay === 'no' ? 'is-active' : ''}`}>
              <input type="radio" name="stay" value="no" checked={form.stay === 'no'} onChange={update('stay')} />
              <span>{data.stayNoText || 'Về luôn sau tiệc'}</span>
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
          <select value={form.side} onChange={updateSide}>
            <option value="">-- Chọn --</option>
            {SIDES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      )}

      {showPickup && (
        <label className="field">
          <span>{data.pickupLabel || 'Điểm đón xe'}</span>
          <select value={form.pickup} onChange={update('pickup')}>
            <option value="">-- Chọn điểm đón --</option>
            {pickups.map((p) => (
              <option key={p.id || p.label} value={p.label}>{p.label}</option>
            ))}
          </select>
        </label>
      )}

      <label className="field">
        <span>Lời nhắn</span>
        <textarea rows="3" value={form.message} onChange={update('message')} placeholder="Chúc mừng hai bạn..." />
      </label>

      {note && <p className="form-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}

      <button className="btn btn-primary btn-block" disabled={state === 'sending'}>
        {state === 'sending' ? 'Đang gửi...' : 'Gửi xác nhận'}
      </button>
    </form>
  );
}
