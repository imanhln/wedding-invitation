import { useEffect, useState } from 'react';
import BlockTitle from '../components/BlockTitle.jsx';
import Reveal from '../components/Reveal.jsx';
import { fetchWishes, sendWish } from '../api.js';
import { guestFromUrl } from '../utils.js';

/** Figma hiển thị "12:30:49 26/7/2026" */
const stamp = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const SUGGESTIONS = [
  'Chúc mừng ngày vui của hai bạn, trăm năm hạnh phúc bền lâu!',
  'Đẹp đôi quá! Chúc hai bạn sống bên nhau đầu bạc răng long.',
  'Mừng hạnh phúc hai bạn! Chúc gia đình nhỏ luôn đầy ắp tiếng cười.',
  'Chúc cô dâu chú rể luôn giữ được nụ cười này mãi mãi nhé!',
  'Nhìn thiệp là thấy tình yêu rồi. Chúc hai bạn trăm năm viên mãn!',
  'Chúc đám cưới thật trọn vẹn và ấm áp. Hạnh phúc nhé hai bạn!',
  'Cuối cùng cũng tới ngày trọng đại, chúc mừng cặp đôi xứng lứa vừa đôi!',
  'Chúc hai bạn mãi mãi yêu thương và bên nhau trọn đời!'
];

/**
 * Sổ lưu bút — Figma node 1:270: tờ giấy note phía sau, form 380x252
 * (ô tên, ô lời chúc, nút 🪄 gợi ý, nút "GỬI LỜI CHÚC"),
 * bên dưới là các thẻ lời chúc 577x85.
 */
export default function WishesSection({ data }) {
  const [wishes, setWishes] = useState([]);
  const [form, setForm] = useState({ name: guestFromUrl(), message: '' });
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (data.showList) fetchWishes().then(setWishes).catch(() => {});
  }, [data.showList]);

  const suggest = () => {
    const pick = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];
    setForm((f) => ({ ...f, message: pick }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setState('sending');
    setError('');
    try {
      const res = await sendWish(form);
      setWishes((w) => [res.wish, ...w]);
      setForm({ name: form.name, message: '' });
      setState('done');
      setTimeout(() => setState('idle'), 2500);
    } catch (err) {
      setError(err.message);
      setState('idle');
    }
  };

  return (
    <section className="block block-wishes" id={data.id}>
      <div className="wish-paper">
        <BlockTitle title={data.title} subtitle={data.subtitle} />

        <Reveal anim="up" className="wish-form-wrap">
          <form className="wish-form" onSubmit={submit}>
            <input
              className="line-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nhập tên*"
              required
            />

            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder={data.placeholder || 'Nhập lời chúc*'}
              required
            />

            <div className="wish-form-row">
              <button type="button" className="wish-magic" onClick={suggest} title="Gợi ý lời chúc">🪄</button>
              <button className="wish-send" disabled={state === 'sending'}>
                {state === 'sending' ? 'Đang gửi...' : state === 'done' ? 'Đã gửi' : data.buttonText || 'Gửi lời chúc'}
              </button>
            </div>

            {error && <p className="form-error">{error}</p>}
          </form>
        </Reveal>
      </div>

      {data.showList && wishes.length > 0 && (
        <div className="wish-list">
          {wishes.slice(0, 30).map((w, i) => (
            <Reveal key={w.id || i} anim="up" delay={Math.min(i, 5) * 70} className="wish-row">
              <div className="wish-row-head">
                <b>{w.name}</b>
                <span>{stamp(w.createdAt)}</span>
              </div>
              <p>{w.message}</p>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
