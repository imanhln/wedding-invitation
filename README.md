# Thiệp cưới online

Website thiệp cưới React + trang quản trị để đổi nội dung mà không cần sửa code.

```
wedding/
├── client/          React + Vite (thiệp và trang quản trị)
│   └── src/
│       ├── InvitationPage.jsx    trang thiệp
│       ├── components/           bìa thiệp, hoa rơi, nút nhạc, lightbox
│       ├── sections/             11 section nội dung (opening, invitation, calendar...)
│       ├── admin/                trang quản trị /admin
│       └── styles/               CSS
└── server/          Express API + lưu dữ liệu JSON + upload file
    ├── data/        content.json, rsvp.json, wishes.json (tự tạo)
    └── uploads/     ảnh và nhạc tải lên
```

## Chạy lần đầu

```bash
npm run install:all    # cài dependencies cho gốc (server dùng chung) + client
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


## Deploy lên Vercel — 2 site riêng cho nhà trai và nhà gái

Cùng một repo, dựng thành **2 project Vercel**. Hai bên có nội dung riêng, trang
quản trị riêng, mật khẩu riêng, không thấy dữ liệu của nhau. Còn code thì chung:
sửa giao diện một lần, push một lần, cả hai site tự deploy lại.

### 1. Tạo Blob store (chỉ làm 1 lần, dùng chung cho cả 2 site)

Vercel Dashboard → **Storage** → **Create Database** → **Blob** → đặt tên
`wedding-blob`. Đây là nơi chứa nội dung thiệp, danh sách khách, lời chúc và ảnh.

### 2. Tạo project thứ nhất (nhà trai)

Vercel → **Add New → Project** → chọn repo này → **Deploy**.
Vercel tự đọc `vercel.json`, không cần chỉnh gì trong phần build settings.

Vào **Settings → Environment Variables**, thêm:

| Biến | Giá trị |
| --- | --- |
| `SITE_ID` | `nha-trai` |
| `ADMIN_PASSWORD` | mật khẩu của chú rể |
| `DATA_SECRET` | một chuỗi ngẫu nhiên dài |
| `SESSION_SECRET` | một chuỗi ngẫu nhiên khác |

Rồi vào **Storage** của project → **Connect** cái `wedding-blob` vừa tạo.
Bước này Vercel tự thêm biến `BLOB_READ_WRITE_TOKEN`, không phải tự gõ.

Cuối cùng bấm **Deployments → Redeploy** để các biến có hiệu lực.

### 3. Tạo project thứ hai (nhà gái)

Làm y hệt bước 2 với **cùng repo đó**, chỉ khác:

| Biến | Giá trị |
| --- | --- |
| `SITE_ID` | `nha-gai` |
| `ADMIN_PASSWORD` | mật khẩu của cô dâu |
| `DATA_SECRET` | chuỗi ngẫu nhiên **khác** với nhà trai |
| `SESSION_SECRET` | chuỗi ngẫu nhiên **khác** với nhà trai |

Nối vào **cùng** `wedding-blob`. `SITE_ID` khác nhau là đủ để hai bên tách dữ liệu.

Kết quả:

| | Nhà trai | Nhà gái |
| --- | --- | --- |
| Thiệp | `nha-trai.vercel.app` | `nha-gai.vercel.app` |
| Quản trị | `nha-trai.vercel.app/admin` | `nha-gai.vercel.app/admin` |
| Dữ liệu trên Blob | `nha-trai/…` | `nha-gai/…` |

### Sinh chuỗi ngẫu nhiên cho DATA_SECRET / SESSION_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Đặt `DATA_SECRET` một lần rồi thôi.** Đường dẫn file dữ liệu được băm ra từ
> nó, đổi giá trị là site không tìm thấy nội dung cũ nữa (dữ liệu vẫn còn trên
> Blob, nhưng nằm ở đường dẫn khác).

### Những điểm khác so với chạy trên máy

- **Không còn `server/data` và `server/uploads`.** Filesystem của Vercel chỉ đọc
  và bị xoá sạch mỗi lần deploy, nên toàn bộ đã chuyển sang Vercel Blob
  (`server/store.js`). Chạy ở máy vẫn ghi file như cũ — cứ không có
  `BLOB_READ_WRITE_TOKEN` là tự động dùng file.
- **Ảnh tự thu nhỏ về tối đa 2000px trước khi tải lên** (`shrinkImage` trong
  `client/src/api.js`). Vercel chặn request nặng quá 4.5 MB, mà ảnh điện thoại
  thường 5–12 MB. Thu nhỏ vừa lách được giới hạn, vừa làm thiệp mở nhanh hơn.
- **File nhạc không thu nhỏ được**, nên mp3 phải dưới 4 MB. Nặng hơn thì nén lại,
  hoặc dán thẳng URL bên ngoài vào ô nhạc nền trong trang quản trị.
- **Token đăng nhập admin giờ ký bằng HMAC** (`server/session.js`) thay vì lưu
  danh sách phiên, vì serverless không có chỗ nhớ. Đăng xuất = xoá token ở trình
  duyệt; token cũ vẫn tự hết hạn sau 7 ngày. Muốn vô hiệu hoá ngay tất cả phiên
  đang đăng nhập thì đổi `SESSION_SECRET`.

### Backup

Vào `/admin` → **Xuất dữ liệu**, tải file JSON về. File này gồm cả nội dung
thiệp, danh sách khách và lời chúc — nhập lại được bằng nút **Nhập dữ liệu**.
Mỗi site xuất riêng một file.

`server/data/*.json` (dữ liệu đang chạy) bị `.gitignore` bỏ qua, nên bản chốt
được để trong `server/data/_snapshot/` — thư mục này **không** bị bỏ qua:

```
_snapshot/
├── content.json.YYYYMMDD              snapshot từng file, để đối chiếu
├── rsvp.json.YYYYMMDD
├── wishes.json.YYYYMMDD
└── wedding-<site>-backup.YYYYMMDD.json   đúng định dạng Xuất/Nhập dữ liệu
```

File `wedding-<site>-backup...` là thứ dùng để khôi phục: kéo vào `/admin` →
**Nhập dữ liệu**, chạy được cho cả site trên Vercel chứ không riêng máy cá nhân.
Ba file kia chỉ để xem/đối chiếu, muốn dùng thì copy đè vào `server/data/`.

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
   nơi cử hành (`Tư gia` + nhà trai/nhà gái + địa chỉ, chỉnh trong /admin),
   giờ + thứ, rồi khối ngày cưới `NGÀY | THÁNG / NĂM` và dòng âm lịch
3. `gallery` — album ảnh dạng **coverflow 3D** (ảnh giữa lớn, hai bên nghiêng nhỏ dần),
   tự chạy và dừng lại khi khách rê chuột lên hoặc mở ảnh phóng to
4. `calendar` — panel đỏ "Thông tin tiệc cưới": ngày tiệc, mốc đón khách/khai tiệc,
   **lịch tháng nền kem có trái tim đánh dấu ngày cưới**, rồi hai nút "Mở bản đồ"
   và "Xác nhận tham dự"
5. `events` — panel đỏ "Lịch trình ngày cưới": icon · giờ · dot nối vạch dọc · việc
6. `wishes` — sổ lưu bút trên tờ giấy note, có nút 🪄 gợi ý lời chúc
7. `gift` — hộp quà mừng: phong bì đỏ nghiêng, bấm vào mở modal QR

Hai section không phải khối riêng trên thiệp mà chỉ là cấu hình cho hai cái nút ở
cuối panel "Thông tin tiệc cưới": `map` (nút "Mở bản đồ", mở Google Maps ở tab mới)
và `rsvp` (nút "Xác nhận tham dự"). Tắt công tắc của chúng là ẩn nút tương ứng.

Ba section không có trong Figma, mặc định tắt (bật trong /admin nếu cần):
`thanks`, `couple`, `story`.

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

**Google Maps**: bản đồ không nhúng trong trang nữa, chỉ còn nút "Mở bản đồ" ở cuối
panel tiệc cưới. Chính xác nhất là dán toạ độ dạng `19.87625,105.684278` vào ô "Toạ độ
hoặc link Google Maps"; ô này cũng nhận link Google Maps bất kỳ. Để trống thì tra theo
ô "Địa chỉ".

**Nhạc nền**: nhạc chỉ phát sau khi khách bấm "Mở thiệp" — trình duyệt chặn tự phát nhạc
trước thao tác của người dùng, nên đây là cách duy nhất chạy được trên iOS/Android.
Để trống ô nhạc trong /admin thì thiệp dùng lại bài mặc định — sửa `DEFAULT_MUSIC_URL`
trong `server/defaultContent.js` để đổi bài đó. Trang quản trị đọc về bản đã bù
mặc định rồi lưu lại nguyên cục, nên lúc ghi xuống `normalizeContent()` gỡ bài mặc
định ra khỏi ô nhạc — có vậy "để trống = dùng mặc định" mới không bị đóng đinh sau
lần Lưu đầu tiên.

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
