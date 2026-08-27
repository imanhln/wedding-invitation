import { useState } from "react";
import {
  Text,
  TextArea,
  Toggle,
  Select,
  Range,
  MediaPicker,
  ListEditor,
  MediaModal,
} from "./fields.jsx";
import { uid } from "../utils.js";
import { coverWidth, imgProps } from "../img.js";

/** Form chỉnh sửa riêng cho từng loại section. */
export default function SectionEditor({ section, onChange }) {
  const set = (patch) => onChange({ ...section, ...patch });

  switch (section.type) {
    /* ------------------------------- Mở đầu ------------------------------- */
    case "opening":
    case "hero":
      return (
        <>
          <Text
            label="Chữ nhỏ trên cùng"
            value={section.kicker}
            onChange={(v) => set({ kicker: v })}
            placeholder="Save The Date"
          />
          <MediaPicker
            label="Ảnh nhô ra khỏi phong thư"
            value={section.image}
            onChange={(v) => set({ image: v })}
            hint="Ảnh dọc, tỉ lệ 3:4"
          />
          <Range
            label="Độ nghiêng ảnh"
            value={section.imageTilt ?? 7}
            min={-15}
            max={15}
            onChange={(v) => set({ imageTilt: v })}
            suffix="°"
          />
          <div className="a-row">
            <Text
              label="Tên dòng 1"
              value={section.nameLine1}
              onChange={(v) => set({ nameLine1: v })}
            />
            <Text
              label="Tên dòng 2"
              value={section.nameLine2}
              onChange={(v) => set({ nameLine2: v })}
            />
          </div>
        </>
      );

    /* ------------------------------ Thiệp mời ----------------------------- */
    case "invitation":
      return (
        <>
          <Text
            label="Tiêu đề trên panel"
            value={section.panelTitle}
            onChange={(v) => set({ panelTitle: v })}
            placeholder="THIỆP MỜI DỰ LỄ CƯỚI"
          />
          <Toggle
            label="Hiện thông tin gia đình hai bên"
            value={section.showFamily}
            onChange={(v) => set({ showFamily: v })}
            hint="Tên bố mẹ lấy từ tab Cô dâu & Chú rể"
          />
          <div className="a-row">
            <Text
              label="Nhãn bên nhà trai"
              value={section.groomSideLabel}
              onChange={(v) => set({ groomSideLabel: v })}
            />
            <Text
              label="Nhãn bên nhà gái"
              value={section.brideSideLabel}
              onChange={(v) => set({ brideSideLabel: v })}
            />
          </div>
          <TextArea
            label="Dòng dẫn giữa panel"
            rows={2}
            value={section.middleNote}
            onChange={(v) => set({ middleNote: v })}
            hint="Mỗi dòng xuống hàng là một dòng trên thiệp"
          />
          <Text
            label="Dòng dẫn nơi tổ chức"
            value={section.venueLine}
            onChange={(v) => set({ venueLine: v })}
            placeholder="Lễ thành hôn được tổ chức tại"
          />
          <div className="a-row">
            <Text
              label="Nơi tổ chức"
              value={section.venuePlace}
              onChange={(v) => set({ venuePlace: v })}
              placeholder="Tư gia"
            />
            <Select
              label="Bên nhà"
              value={section.venueSide}
              onChange={(v) => set({ venueSide: v })}
              options={[
                { value: "nhà trai", label: "Nhà trai" },
                { value: "nhà gái", label: "Nhà gái" },
                { value: "", label: "Không ghi" },
              ]}
              hint="Ghép sau ô bên trái: “Tư gia nhà trai”"
            />
          </div>
          <div className="a-row">
            <Text
              label="Ngày lễ thành hôn"
              type="date"
              value={section.eventDate}
              onChange={(v) => set({ eventDate: v })}
              hint="Dùng cho dòng thứ + số ngày/tháng/năm"
            />
            <Text
              label="Giờ"
              type="time"
              value={section.eventTime}
              onChange={(v) => set({ eventTime: v })}
            />
          </div>
          <Text
            label="Dòng âm lịch"
            value={section.lunarLine}
            onChange={(v) => set({ lunarLine: v })}
            placeholder="(Tức ngày 10 tháng 8 âm lịch)"
          />
          <TextArea
            label="Địa chỉ nơi cử hành"
            rows={2}
            value={section.addressLine}
            onChange={(v) => set({ addressLine: v })}
            hint="Hiện ngay dưới dòng nơi cử hành. Để trống thì ẩn."
          />
          <Text
            label="Ghi chú dưới panel"
            value={section.footNote}
            onChange={(v) => set({ footNote: v })}
          />
        </>
      );

    /* --------------------- Save the date + lịch tháng --------------------- */
    case "calendar":
    case "countdown":
      return (
        <>
          <Text
            label="Tiêu đề trên panel"
            value={section.panelTitle}
            onChange={(v) => set({ panelTitle: v })}
            placeholder="Thông tin tiệc cưới"
          />
          <Text
            label="Dòng dẫn"
            value={section.script}
            onChange={(v) => set({ script: v })}
            placeholder="Tiệc cưới sẽ diễn ra vào lúc:"
          />
          <Text
            label="Thời điểm tiệc cưới"
            type="datetime-local"
            value={(section.targetDate || "").slice(0, 16)}
            onChange={(v) => set({ targetDate: v })}
            hint="Dùng cho dòng thứ + giờ, số ngày/tháng/năm và nút thêm vào lịch"
          />
          <Text
            label="Ngày âm lịch"
            value={section.lunarText}
            onChange={(v) => set({ lunarText: v })}
            placeholder="(Tức ngày 9 tháng 8 âm lịch)"
          />

          <ListEditor
            items={section.reception}
            onChange={(reception) => set({ reception })}
            addLabel="Thêm mốc giờ"
            titleOf={(it, i) => it.label || `Mốc ${i + 1}`}
            newItem={() => ({ id: uid(), label: "", time: "" })}
            renderItem={(item, upd) => (
              <div className="a-row">
                <Text
                  label="Nhãn"
                  value={item.label}
                  onChange={(v) => upd({ label: v })}
                  placeholder="Đón khách"
                />
                <Text
                  label="Giờ"
                  type="time"
                  value={item.time}
                  onChange={(v) => upd({ time: v })}
                />
              </div>
            )}
          />

          <div className="a-row">
            <Toggle
              label="Hiện đếm ngược"
              value={section.showCountdown}
              onChange={(v) => set({ showCountdown: v })}
            />
            <Toggle
              label="Hiện lịch tháng"
              value={section.showCalendar}
              onChange={(v) => set({ showCalendar: v })}
            />
          </div>
          <Text
            label="Ngày được đánh dấu trên lịch"
            type="date"
            value={section.markDate}
            onChange={(v) => set({ markDate: v })}
            hint="Để trống sẽ dùng ngày tiệc cưới ở trên"
          />
          <p className="a-note">
            Cuối panel này có hai nút: “Mở bản đồ” (sửa ở phần “Bản đồ (nút
            trong panel tiệc cưới)”) và “Xác nhận tham dự” (sửa ở phần “Xác nhận
            tham dự (nút trong panel tiệc cưới)”).
          </p>
        </>
      );

    /* ------------------- Xác nhận tham dự (nút + modal) ------------------- */
    case "rsvp":
      return (
        <>
          <p className="a-note">
            Phần này không phải một khối riêng trên thiệp: công tắc ở trên
            bật/tắt nút “Xác nhận tham dự” trong panel thông tin tiệc cưới, form
            hiện trong modal khi khách bấm nút.
          </p>

          <div className="a-row">
            <Text
              label="Chữ trên nút"
              value={section.buttonText}
              onChange={(v) => set({ buttonText: v })}
              placeholder="Xác nhận tham dự"
            />
            <Text
              label="Tiêu đề modal"
              value={section.modalTitle}
              onChange={(v) => set({ modalTitle: v })}
              placeholder="Xác nhận tham dự"
            />
          </div>
          <Text
            label="Dòng dẫn trong modal"
            value={section.subtitle}
            onChange={(v) => set({ subtitle: v })}
            placeholder="Bạn có thể đến chung vui cùng chúng mình chứ?"
          />
          <div className="a-row">
            <Text
              label="Ghi chú (câu dẫn hạn phản hồi)"
              value={section.note}
              onChange={(v) => set({ note: v })}
              placeholder="Vui lòng phản hồi trước ngày"
              hint="Ngày ở ô bên cạnh sẽ tự ghép vào cuối câu này."
            />
            <Text
              label="Hạn phản hồi"
              type="date"
              value={section.deadline}
              onChange={(v) => set({ deadline: v })}
              hint="Để trống thì chỉ hiện câu chữ, không kèm ngày."
            />
          </div>
          <TextArea
            label="Lời cảm ơn sau khi gửi"
            rows={2}
            value={section.thankYouText}
            onChange={(v) => set({ thankYouText: v })}
          />

          <div className="a-row">
            <Toggle
              label="Hỏi có tham dự không"
              value={section.askAttendance}
              onChange={(v) => set({ askAttendance: v })}
            />
            <Toggle
              label="Hỏi số người đi cùng"
              value={section.askGuestCount}
              onChange={(v) => set({ askGuestCount: v })}
            />
            <Toggle
              label="Hỏi là khách của bên nào"
              value={section.askSide}
              onChange={(v) => set({ askSide: v })}
            />
            <Toggle
              label="Hỏi điểm đón xe"
              value={section.askPickup}
              onChange={(v) => set({ askPickup: v })}
              hint="Ô chọn điểm đón hiện sẵn trong form; chọn bên khách xong thì danh sách lọc lại theo bên đó."
            />
          </div>

          {section.askPickup && (
            <>
              <Text
                label="Nhãn ô chọn điểm đón"
                value={section.pickupLabel}
                onChange={(v) => set({ pickupLabel: v })}
                placeholder="Điểm đón xe"
              />
              <ListEditor
                items={section.pickupPoints}
                onChange={(pickupPoints) => set({ pickupPoints })}
                addLabel="Thêm điểm đón"
                titleOf={(it, i) => it.label || `Điểm đón ${i + 1}`}
                newItem={() => ({ id: uid(), side: "Cả hai", label: "" })}
                renderItem={(item, upd) => (
                  <div className="a-row">
                    <Text
                      label="Tên điểm đón"
                      value={item.label}
                      onChange={(v) => upd({ label: v })}
                      placeholder="Nhà gái - Thiệu Trung, Thanh Hoá"
                    />
                    <Select
                      label="Hiện với khách của"
                      value={item.side}
                      onChange={(v) => upd({ side: v })}
                      options={[
                        { value: "Cả hai", label: "Cả hai bên" },
                        { value: "Cô dâu", label: "Cô dâu" },
                        { value: "Chú rể", label: "Chú rể" },
                      ]}
                    />
                  </div>
                )}
              />
            </>
          )}
        </>
      );

    /* -------------------------------- Bản đồ ------------------------------ */
    case "map":
      return (
        <>
          <p className="a-note">
            Bản đồ không còn nhúng trong trang. Phần này cấu hình nút “Mở bản
            đồ” ở cuối panel thông tin tiệc cưới — bấm vào là mở Google Maps ở
            tab mới. Công tắc ở trên bật/tắt chính cái nút đó.
          </p>
          <Text
            label="Chữ trên nút"
            value={section.buttonText}
            onChange={(v) => set({ buttonText: v })}
            placeholder="Mở bản đồ"
          />
          <TextArea
            label="Toạ độ hoặc link Google Maps"
            rows={2}
            value={section.mapUrl}
            onChange={(v) => set({ mapUrl: v })}
            hint="Chính xác nhất là dán toạ độ dạng 19.87625,105.684278. Cũng nhận link Google Maps bất kỳ. Để trống sẽ tra theo địa chỉ bên dưới. Nút chỉ mở Maps ghim sẵn vị trí, không tự bật chỉ đường."
          />
          <TextArea
            label="Địa chỉ"
            rows={2}
            value={section.address}
            onChange={(v) => set({ address: v })}
            hint="Dùng để tra bản đồ khi ô trên để trống"
          />
        </>
      );

    /* -------------------------------- Album ------------------------------- */
    case "gallery":
      return <GalleryEditor section={section} set={set} />;

    /* ------------------------------- Sự kiện ------------------------------ */
    case "events":
      return (
        <>
          <Text
            label="Tiêu đề trên panel"
            value={section.panelTitle}
            onChange={(v) => set({ panelTitle: v })}
            placeholder="Lịch trình ngày cưới"
          />
          <ListEditor
            items={section.items}
            onChange={(items) => set({ items })}
            addLabel="Thêm mốc lịch trình"
            titleOf={(it, i) => it.label || `Mốc ${i + 1}`}
            newItem={() => ({
              id: uid(),
              time: "",
              label: "",
              icon: "",
              note: "",
            })}
            renderItem={(item, upd) => (
              <>
                <div className="a-row">
                  <Text
                    label="Giờ"
                    type="time"
                    value={item.time}
                    onChange={(v) => upd({ time: v })}
                  />
                  <Select
                    label="Icon"
                    value={item.icon}
                    onChange={(v) => upd({ icon: v })}
                    options={[
                      { value: "", label: "Không có" },
                      { value: "camera", label: "Máy ảnh" },
                      { value: "cake", label: "Bánh cưới" },
                      { value: "cook", label: "Đầu bếp" },
                    ]}
                  />
                </div>
                <Text
                  label="Nội dung"
                  value={item.label}
                  onChange={(v) => upd({ label: v })}
                  placeholder="Đón khách"
                />
                <Text
                  label="Ghi chú nhỏ (tuỳ chọn)"
                  value={item.note}
                  onChange={(v) => upd({ note: v })}
                />
              </>
            )}
          />
        </>
      );

    /* ------------------------------- Lưu bút ------------------------------ */
    case "wishes":
      return (
        <>
          <Text
            label="Tiêu đề"
            value={section.title}
            onChange={(v) => set({ title: v })}
          />
          <Text
            label="Mô tả"
            value={section.subtitle}
            onChange={(v) => set({ subtitle: v })}
          />
          <Text
            label="Gợi ý trong ô nhập"
            value={section.placeholder}
            onChange={(v) => set({ placeholder: v })}
          />
          <Text
            label="Chữ trên nút"
            value={section.buttonText}
            onChange={(v) => set({ buttonText: v })}
          />
          <Toggle
            label="Hiện danh sách lời chúc"
            value={section.showList}
            onChange={(v) => set({ showList: v })}
          />
        </>
      );

    /* ------------------------------ Mừng cưới ----------------------------- */
    case "gift":
      return (
        <>
          <Text
            label="Tiêu đề"
            value={section.title}
            onChange={(v) => set({ title: v })}
          />
          <Text
            label="Mô tả"
            value={section.subtitle}
            onChange={(v) => set({ subtitle: v })}
          />
          <div className="a-row">
            <Text
              label="Chữ trên nút"
              value={section.buttonText}
              onChange={(v) => set({ buttonText: v })}
            />
            <Text
              label="Tiêu đề hộp QR"
              value={section.modalTitle}
              onChange={(v) => set({ modalTitle: v })}
            />
          </div>
          <ListEditor
            items={section.accounts}
            onChange={(accounts) => set({ accounts })}
            addLabel="Thêm tài khoản"
            titleOf={(it, i) => it.side || `Tài khoản ${i + 1}`}
            newItem={() => ({
              id: uid(),
              side: "",
              owner: "",
              bank: "",
              number: "",
              qr: "",
            })}
            renderItem={(item, upd) => (
              <>
                <Text
                  label="Nhãn"
                  value={item.side}
                  onChange={(v) => upd({ side: v })}
                  placeholder="Nhà trai"
                />
                <Text
                  label="Ngân hàng"
                  value={item.bank}
                  onChange={(v) => upd({ bank: v })}
                />
                <Text
                  label="Chủ tài khoản"
                  value={item.owner}
                  onChange={(v) => upd({ owner: v })}
                />
                <Text
                  label="Số tài khoản"
                  value={item.number}
                  onChange={(v) => upd({ number: v })}
                />
                <MediaPicker
                  label="Ảnh QR"
                  value={item.qr}
                  onChange={(v) => upd({ qr: v })}
                />
              </>
            )}
          />
        </>
      );

    /* -------------------------------- Cảm ơn ------------------------------ */
    case "thanks":
      return (
        <>
          <Text
            label="Tiêu đề"
            value={section.title}
            onChange={(v) => set({ title: v })}
          />
          <TextArea
            label="Nội dung"
            value={section.body}
            onChange={(v) => set({ body: v })}
            hint="Mỗi dòng xuống hàng là một đoạn"
          />
          <Text
            label="Ký tên"
            value={section.signature}
            onChange={(v) => set({ signature: v })}
          />
          <MediaPicker
            label="Ảnh"
            value={section.image}
            onChange={(v) => set({ image: v })}
          />
        </>
      );

    /* --------------------------- Cô dâu & chú rể -------------------------- */
    case "couple":
      return (
        <>
          <Text
            label="Tiêu đề"
            value={section.title}
            onChange={(v) => set({ title: v })}
          />
          <Text
            label="Mô tả"
            value={section.subtitle}
            onChange={(v) => set({ subtitle: v })}
          />
          <Toggle
            label="Hiện thông tin gia đình"
            value={section.showFamily}
            onChange={(v) => set({ showFamily: v })}
          />
          <p className="a-note">
            Ảnh và tên được sửa ở tab <b>Cô dâu &amp; Chú rể</b>.
          </p>
        </>
      );

    /* --------------------------- Chuyện tình yêu -------------------------- */
    case "story":
      return (
        <>
          <Text
            label="Tiêu đề"
            value={section.title}
            onChange={(v) => set({ title: v })}
          />
          <Text
            label="Mô tả"
            value={section.subtitle}
            onChange={(v) => set({ subtitle: v })}
          />
          <ListEditor
            items={section.items}
            onChange={(items) => set({ items })}
            addLabel="Thêm cột mốc"
            titleOf={(it, i) => it.title || `Cột mốc ${i + 1}`}
            newItem={() => ({
              id: uid(),
              date: "",
              title: "",
              text: "",
              image: "",
            })}
            renderItem={(item, upd) => (
              <>
                <Text
                  label="Thời điểm"
                  value={item.date}
                  onChange={(v) => upd({ date: v })}
                  placeholder="06.2019"
                />
                <Text
                  label="Tiêu đề"
                  value={item.title}
                  onChange={(v) => upd({ title: v })}
                />
                <TextArea
                  label="Nội dung"
                  rows={3}
                  value={item.text}
                  onChange={(v) => upd({ text: v })}
                />
                <MediaPicker
                  label="Ảnh"
                  value={item.image}
                  onChange={(v) => upd({ image: v })}
                />
              </>
            )}
          />
        </>
      );

    default:
      return <p className="a-note">Loại section chưa hỗ trợ chỉnh sửa.</p>;
  }
}

/* ------------------------- Trình quản lý album ảnh ------------------------ */

function GalleryEditor({ section, set }) {
  const [picking, setPicking] = useState(false);
  const photos = section.photos || [];

  const addMany = (urls) =>
    set({
      photos: [
        ...photos,
        ...urls.map((url) => ({ id: uid(), url, caption: "" })),
      ],
    });
  const update = (i, patch) =>
    set({
      photos: photos.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    });
  const remove = (i) => set({ photos: photos.filter((_, idx) => idx !== i) });
  const move = (i, dir) => {
    const next = [...photos];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set({ photos: next });
  };

  return (
    <>
      <Text
        label="Tiêu đề"
        value={section.title}
        onChange={(v) => set({ title: v })}
      />
      <Text
        label="Mô tả"
        value={section.subtitle}
        onChange={(v) => set({ subtitle: v })}
      />
      <p className="a-note">
        Album hiển thị dạng <b>coverflow 3D</b> như bản Figma: ảnh giữa lớn, hai
        bên nghiêng nhỏ dần. Thứ tự ảnh bên dưới là thứ tự trượt.
      </p>

      <Toggle
        label="Tự động chạy album"
        value={section.autoPlay !== false}
        onChange={(v) => set({ autoPlay: v })}
        hint="Dừng lại khi khách rê chuột lên album hoặc mở ảnh phóng to"
      />
      {section.autoPlay !== false && (
        <Range
          label="Thời gian mỗi ảnh"
          value={section.autoPlayDelay ?? 4}
          min={2}
          max={12}
          onChange={(v) => set({ autoPlayDelay: v })}
          suffix="s"
        />
      )}

      <div className="a-field">
        <span className="a-label">Ảnh trong album ({photos.length})</span>
        <button
          type="button"
          className="a-btn a-btn-dashed"
          onClick={() => setPicking(true)}
        >
          + Thêm ảnh (chọn nhiều cùng lúc)
        </button>

        <div className="a-photo-grid">
          {photos.map((p, i) => (
            <div className="a-photo" key={p.id || i}>
              <img {...imgProps(p.url, coverWidth(140, 140))} alt="" loading="lazy" decoding="async" />
              <input
                value={p.caption || ""}
                placeholder="Chú thích"
                onChange={(e) => update(i, { caption: e.target.value })}
              />
              <div className="a-photo-tools">
                <button type="button" onClick={() => move(i, -1)} title="Trước">
                  ←
                </button>
                <button type="button" onClick={() => move(i, 1)} title="Sau">
                  →
                </button>
                <button
                  type="button"
                  className="is-danger"
                  onClick={() => remove(i)}
                  title="Xoá"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {picking && (
        <MediaModal
          multiple
          onClose={() => setPicking(false)}
          onPick={(url) => {
            addMany([url]);
            setPicking(false);
          }}
          onPickMany={(urls) => {
            addMany(urls);
            setPicking(false);
          }}
        />
      )}
    </>
  );
}
