# Thiệp cưới online

Website thiệp cưới React + trang quản trị để đổi nội dung mà không cần sửa code.

```
wedding/
├── client/          React + Vite (thiệp và trang quản trị)
│   └── src/
│       ├── InvitationPage.jsx    trang thiệp
│       ├── components/           bìa thiệp, hoa rơi, nút nhạc, lightbox
│       ├── sections/             12 section nội dung (opening, invitation, calendar...)
│       ├── admin/                trang quản trị /admin
│       └── styles/               CSS
└── server/          Express API + lưu dữ liệu JSON + upload file
    ├── data/        content.json, rsvp.json, wishes.json (tự tạo)
    └── uploads/     ảnh và nhạc tải lên
```

## Chạy lần đầu

```bash
npm install            # cài concurrently
npm run install:all    # cài dependencies cho server + client
npm run dev            # chạy cả hai
```

- Thiệp: http://localhost:5173
- Quản trị: http://localhost:5173/admin
- API: http://localhost:4000

Muốn đổi mật khẩu khác thì dùng biến môi trường (không cần sửa code):

```bash
ADMIN_PASSWORD="mat-khau-cua-ban" npm run dev
```

## Chạy bản production (1 cổng duy nhất)

```bash
npm run build          # build client vào client/dist
npm start              # server tự phục vụ luôn giao diện ở cổng 4000
```

Deploy lên VPS: copy cả thư mục, chạy `npm run build` rồi giữ server sống bằng `pm2 start server/index.js --name wedding`.
Nhớ backup 2 thư mục `server/data` và `server/uploads` — đó là toàn bộ nội dung thiệp.

## Trang quản trị có gì

| Tab             | Chỉnh được                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| Bìa & mở thiệp  | tên cô dâu chú rể, ngày, ảnh nền, chữ trên nút mở thiệp                                                     |
| Cô dâu & Chú rể | ảnh, họ tên, bố mẹ hai bên, câu nói, Facebook                                                               |
| Nội dung thiệp  | **bật/tắt và đổi thứ tự từng section**, sửa nội dung từng section                                           |
| Nhạc & hiệu ứng | tải nhạc nền, âm lượng, hoa rơi, scroll reveal, parallax                                                    |
| Giao diện       | bảng màu (4 preset sẵn), font chữ, bề rộng cột thiệp + panel đỏ, dòng chân trang, thẻ chia sẻ Zalo/Facebook |
| Khách mời       | danh sách RSVP (xuất CSV), lời chúc (ẩn/hiện/xoá)                                                           |
| Sao lưu         | tải file JSON sao lưu, khôi phục, về nội dung mẫu                                                           |

Khung xem trước bên phải cập nhật ngay khi gõ. Bấm **Lưu thay đổi** (hoặc `Ctrl+S`) để lưu.

## Các section

Thứ tự mặc định lấy đúng theo bản Figma (node 1:41):

1. `opening` — "SAVE THE DATE" + phong thư đỏ có ảnh cưới nhô ra + tên đôi
2. `invitation` — panel đỏ "Thông tin lễ cưới": hai cột ông bà, tên cô dâu chú rể,
   nơi cử hành, giờ + thứ, rồi khối ngày cưới `NGÀY | THÁNG / NĂM` và dòng âm lịch
3. `gallery` — album ảnh dạng **coverflow 3D** (ảnh giữa lớn, hai bên nghiêng nhỏ dần)
4. `calendar` — panel đỏ "Thông tin tiệc cưới": ngày tiệc, mốc đón khách/khai tiệc,
   **lịch tháng nền kem có trái tim đánh dấu ngày cưới**, link "Thêm vào lịch"
5. `map` — "Tiệc cưới sẽ tổ chức tại" + địa chỉ + bản đồ Google Maps
6. `events` — panel đỏ "Lịch trình ngày cưới": icon · giờ · dot nối vạch dọc · việc
7. `wishes` — sổ lưu bút trên tờ giấy note, có nút 🪄 gợi ý lời chúc
8. `gift` — hộp quà mừng: phong bì đỏ nghiêng, bấm vào mở modal QR

Bốn section không có trong Figma, mặc định tắt (bật trong /admin nếu cần):
`rsvp`, `thanks`, `couple`, `story`.

## Bám theo Figma

Bìa là nền đỏ đô radial full màn với tấm thiệp kem **600x420** ở giữa; trang nội dung là
**một cột giấy kem rộng 900px căn giữa**, bên trong là các **panel đỏ đô rộng 560px**
(đổi được cả hai trong tab Giao diện).

Bảng màu lấy từ bản thiết kế: nền cột `#FFF7EB`, panel `#511419`, chữ trên panel
`#ECE4D8`, nhấn `#B58B2F`.

Phông chữ theo Figma: Playfair Display (tên trên bìa), Viaoda Libre (tên đôi đầu trang),
The Nautigal (chữ & khổng lồ, tiêu đề lịch), EB Garamond (tên trong panel đỏ),
Cormorant Garamond ("SAVE THE DATE"), Lora (bìa thiệp), Inter (toàn bộ phần còn lại).

### Ảnh trang trí xuất từ Figma

Nằm trong `client/public/figma/` — dùng trực tiếp bằng đường dẫn tuyệt đối:

| File                                      | Dùng ở đâu                                 |
| ----------------------------------------- | ------------------------------------------ |
| `castle.png`                              | hoạ tiết lâu đài mờ (4 chỗ như Figma)      |
| `envelope-back.png`, `envelope-front.png` | phong thư phần mở đầu                      |
| `flower.png`                              | nhánh hoa trên bìa và tràn ra các panel đỏ |
| `paper-texture.png`                       | vân giấy phủ cột thiệp và panel            |
| `papernote.png`                           | tờ giấy note sau form sổ lưu bút           |
| `redenvelope.png`                         | phong bì hộp quà mừng                      |
| `icon-camera/cake/cook.png`               | icon lịch trình ngày cưới                  |
| `demo-*.jpg`                              | ảnh mẫu, thay bằng ảnh thật trong /admin   |

Muốn xuất lại ảnh từ Figma: mở file trong Figma desktop rồi dùng MCP `figma-mcp-go`
(`save_screenshots`) — cấu hình sẵn trong `.mcp.json`.

## Mẹo dùng

**Gửi thiệp có tên khách**: thêm `?to=` vào cuối link.
`https://tenmiencuaban.com/?to=Nguyễn Văn A` → bìa thiệp hiện "Kính mời: Nguyễn Văn A",
form RSVP và lưu bút cũng tự điền sẵn tên đó.

**Google Maps**: mở Google Maps → Chia sẻ → Nhúng bản đồ → copy, dán cả thẻ `<iframe>`
vào ô "Link nhúng Google Maps". Nếu để trống, bản đồ tự hiển thị theo địa chỉ đã nhập.

**Nhạc nền**: nhạc chỉ phát sau khi khách bấm "Mở thiệp" — trình duyệt chặn tự phát nhạc
trước thao tác của người dùng, nên đây là cách duy nhất chạy được trên iOS/Android.

**Ảnh**: nên nén ảnh album xuống dưới 400KB mỗi ảnh (squoosh.app) để thiệp mở nhanh trên 4G.

## API

| Method   | Endpoint             | Mô tả                      |
| -------- | -------------------- | -------------------------- |
| GET      | `/api/content`       | toàn bộ nội dung thiệp     |
| POST     | `/api/rsvp`          | khách gửi xác nhận tham dự |
| GET/POST | `/api/wishes`        | lời chúc                   |
| POST     | `/api/admin/login`   | đăng nhập, trả token       |
| PUT      | `/api/admin/content` | lưu nội dung (cần token)   |
| POST     | `/api/admin/upload`  | tải ảnh/nhạc (cần token)   |
| GET      | `/api/admin/export`  | tải file sao lưu           |

Token lưu trong `localStorage`, hạn 7 ngày, gửi qua header `x-admin-token`.
