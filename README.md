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

### 1. Tạo bucket Cloudflare R2 (chỉ làm 1 lần, dùng chung cho cả 2 site)

Cloudflare Dashboard → **R2 Object Storage** → **Create bucket** → đặt tên
`wedding-storage` (tên tuỳ chọn). Đây là nơi chứa nội dung thiệp, danh sách
khách, lời chúc và ảnh.

Bật truy cập công khai để ảnh hiển thị được trên thiệp — vào bucket vừa tạo →
**Settings → Public access**:
- Nhanh nhất: bật **Public Development URL**, Cloudflare cho một domain dạng
  `pub-xxxxxxxx.r2.dev`. Dùng tạm được, Cloudflare khuyến cáo không dùng lâu dài
  cho production nhưng đủ tốt cho một trang thiệp cưới.
- Chuẩn hơn: gắn **Custom Domain** (cần domain đã trỏ DNS qua Cloudflare), ví dụ
  `anh.example.com`.

Ghi lại domain đó — đây chính là `R2_PUBLIC_HOST` dùng ở bước sau.

Tạo API token để server ghi/đọc được bucket — **R2 → Manage API tokens →
Create API token**, quyền **Object Read & Write**, giới hạn vào đúng bucket vừa
tạo. Cloudflare đưa các giá trị sau, ghi lại hết vì secret chỉ hiện một lần:

| Biến | Lấy ở đâu |
| --- | --- |
| `R2_ACCOUNT_ID` | góc phải R2 Overview, hoặc trong URL dashboard |
| `R2_ACCESS_KEY_ID` | hiện ra khi tạo API token |
| `R2_SECRET_ACCESS_KEY` | hiện ra khi tạo API token (chỉ thấy **1 lần**, chép lại ngay) |
| `R2_BUCKET` | tên bucket, ví dụ `wedding-storage` |
| `R2_PUBLIC_HOST` | domain public đã bật ở trên (không kèm `https://`) |

> **Site cũ đang chạy trên Vercel Blob?** Đừng xoá Blob store ngay. Thêm 5 biến
> `R2_*` trên vào máy (file `.env` ở gốc repo, cùng với `BLOB_READ_WRITE_TOKEN`,
> `SITE_ID`, `DATA_SECRET` cũ), rồi chạy `npm run migrate:blob-to-r2` — script tự
> copy toàn bộ ảnh + dữ liệu sang bucket mới và viết lại URL ảnh bên trong các
> file JSON. Xem chi tiết trong `server/scripts/migrate-blob-to-r2.mjs`.

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
| `R2_ACCOUNT_ID` | như bước 1 |
| `R2_ACCESS_KEY_ID` | như bước 1 |
| `R2_SECRET_ACCESS_KEY` | như bước 1 |
| `R2_BUCKET` | như bước 1 |
| `R2_PUBLIC_HOST` | như bước 1 |

Sửa `hostname` trong `vercel.json` (khoá `images.remotePatterns`) thành đúng
`R2_PUBLIC_HOST` rồi commit — Vercel Image Optimization chỉ tối ưu được ảnh từ
domain đã khai ở đây.

Cuối cùng bấm **Deployments → Redeploy** để các biến có hiệu lực.

### 3. Tạo project thứ hai (nhà gái)

Làm y hệt bước 2 với **cùng repo đó**, chỉ khác:

| Biến | Giá trị |
| --- | --- |
| `SITE_ID` | `nha-gai` |
| `ADMIN_PASSWORD` | mật khẩu của cô dâu |
| `DATA_SECRET` | chuỗi ngẫu nhiên **khác** với nhà trai |
| `SESSION_SECRET` | chuỗi ngẫu nhiên **khác** với nhà trai |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_PUBLIC_HOST` | **giống hệt** nhà trai — cùng một bucket |

`SITE_ID` khác nhau là đủ để hai bên tách dữ liệu dù dùng chung bucket.

Kết quả:

| | Nhà trai | Nhà gái |
| --- | --- | --- |
| Thiệp | `nha-trai.vercel.app` | `nha-gai.vercel.app` |
| Quản trị | `nha-trai.vercel.app/admin` | `nha-gai.vercel.app/admin` |
| Dữ liệu trên R2 | `nha-trai/…` | `nha-gai/…` |

### Sinh chuỗi ngẫu nhiên cho DATA_SECRET / SESSION_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Đặt `DATA_SECRET` một lần rồi thôi.** Đường dẫn file dữ liệu được băm ra từ
> nó, đổi giá trị là site không tìm thấy nội dung cũ nữa (dữ liệu vẫn còn trên
> R2, nhưng nằm ở đường dẫn khác).

### Những điểm khác so với chạy trên máy

- **Không còn `server/data` và `server/uploads`.** Filesystem của Vercel chỉ đọc
  và bị xoá sạch mỗi lần deploy, nên toàn bộ đã chuyển sang Cloudflare R2
  (`server/store.js`). Chạy ở máy vẫn ghi file như cũ — cứ thiếu biến `R2_*`
  là tự động dùng file.
- **Ảnh tự thu nhỏ về tối đa 1600px trước khi tải lên** (`shrinkImage` trong
  `client/src/api.js`). Vercel chặn request nặng quá 4.5 MB, mà ảnh điện thoại
  thường 5–12 MB. Thu nhỏ vừa lách được giới hạn, vừa làm thiệp mở nhanh hơn.
  Vẫn xuất JPEG chứ không xuất WebP: một trong các ảnh này được chọn làm
  `og:image`, mà Zalo không dựng được preview từ WebP.
- **Mỗi khung ảnh chỉ tải đúng khổ nó cần** (`client/src/img.js`). Ảnh gốc 1600px
  chỉ dùng cho lightbox; album lấy bản 320/640px, ảnh người 320/640px, thumbnail
  trong /admin 128px — qua API tối ưu ảnh của Vercel (`/_vercel/image`, khai ở
  khoá `images` trong `vercel.json`), trả về AVIF/WebP do trình duyệt tự chọn.
  Chạy ở máy thì cờ tắt và mọi ảnh dùng URL gốc, vì `/_vercel/image` không có.
- **Album chỉ nạp 5 ảnh quanh ảnh đang xem.** Các `.cf-item` chồng lên nhau nên
  ảnh xa chỉ bị `opacity: 0` — vẫn nằm trong viewport, `loading="lazy"` không
  chặn được. `GallerySection.jsx` tự gán `src` theo vị trí và mở rộng dần khi
  khách lật, nên album 30 ảnh không còn tải 30 file một lượt.
- **Ảnh nền bìa được preload từ HTML** (`server/shareMeta.js`). Nó là ảnh LCP mà
  lại nằm trong `background-image` do React đặt sau khi tải xong bundle, nên
  máy chủ chèn sẵn `<link rel="preload">` trỏ đúng URL mà `coverBgUrl()` sinh ra.
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

Form RSVP hỏi thêm **số điện thoại** (công tắc "Hỏi số điện thoại", kèm công tắc
bắt buộc hay không — bắt buộc chỉ áp dụng với khách chọn sẽ tham dự, khách báo
bận vẫn gửi được khi để trống). Số được chuẩn hoá về dạng chỉ chữ số ở máy chủ,
hiện thành link bấm-để-gọi ở tab Khách mời và có một cột riêng trong file CSV.

Form RSVP hỏi thêm **điểm đón xe**: danh sách điểm đón đặt trong /admin (mỗi
điểm gắn với nhà gái / nhà trai / cả hai), ô chọn luôn hiện trong form và lọc
lại theo bên khách vừa chọn. Hạn phản hồi tách riêng thành ô ngày `deadline`,
tự ghép vào sau câu ghi chú nên đổi hạn không phải sửa lại câu chữ.

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

Nằm trong `client/public/figma/` — dùng trực tiếp bằng đường dẫn tuyệt đối
(đã chuyển hết từ PNG sang WebP: 1,9 MB → 289 KB, cùng chất lượng):

| File                                        | Dùng ở đâu                                 |
| ------------------------------------------- | ------------------------------------------ |
| `castle.webp`                               | hoạ tiết lâu đài mờ (4 chỗ như Figma)      |
| `envelope-back.webp`, `envelope-front.webp` | phong thư phần mở đầu                      |
| `flower.webp`                               | nhánh hoa trên bìa và tràn ra các panel đỏ |
| `paper-texture.webp`                        | vân giấy phủ cột thiệp và panel            |
| `papernote.webp`                            | tờ giấy note sau form sổ lưu bút           |
| `redenvelope.webp`                          | phong bì hộp quà mừng                      |
| `icon-camera/cake/cook.webp`                | icon lịch trình ngày cưới                  |
| `demo-*.jpg`                                | ảnh mẫu, thay bằng ảnh thật trong /admin   |

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

**Link YouTube làm nhạc nền — phải đổi sang file**: iframe YouTube phát được nhạc,
nhưng trình duyệt nhúng trong app (Zalo, Messenger...) trên iPhone bung mọi video ra
trình phát toàn màn hình của hệ thống, khách bấm "Mở thiệp" là thấy video đè lên thiệp.
Cú bung đó không đi qua Fullscreen API nên trang không chặn được; thiệp chỉ còn cách
nhận diện đúng nhóm máy đó (`youtubeAudioBlocked()` trong `client/src/utils.js`) và tắt
nhạc để khách khỏi bị video nhảy vào mặt. Muốn ai cũng nghe được thì lấy phần tiếng của
video ra thành file:

```bash
winget install yt-dlp.yt-dlp ffmpeg              # cài 1 lần (ffmpeg chỉ cần nếu muốn .mp3)
npm run music:from-youtube -- "https://youtu.be/xxxxxxxxxxx"
```

Script tải audio, lưu vào đúng kho của site rồi gán luôn vào ô nhạc trong /admin. Thêm
`--clip 15-105` để bỏ đoạn đầu, `--bitrate 96` cho file nhẹ, `--no-apply` nếu chỉ muốn
lấy link mà chưa sửa nội dung. Ghi vào kho nào là do biến môi trường quyết định giống
lúc chạy server: thiếu biến `R2_*` thì xuống `server/uploads`, đủ biến thì
lên R2 của site thật — khi đó nhớ đặt đúng cả `SITE_ID` và `DATA_SECRET` (để trong
`.env` ở gốc repo là script tự đọc). `DEFAULT_MUSIC_URL` trong `server/defaultContent.js`
cũng đang là link YouTube, nên đổi thành link file đã tải nếu muốn bài mặc định nghe được
ở mọi máy.

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
