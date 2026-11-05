# Nhận Telegram khi không mở web (máy chủ đám mây miễn phí)

Trang web chỉ chạy khi đang mở. Tắt trình duyệt hay khóa điện thoại là không còn gì kiểm tra tín hiệu nữa.
Máy chủ đám mây giải quyết việc này. Nó chạy **chính mã nguồn của trang** trên GitHub Actions (miễn phí), cứ 10 phút bật một lần
và mỗi lần chạy liên tục khoảng 9,5 phút, làm mới tín hiệu mỗi 60 giây. Máy chủ đóng vai **máy chính**:

- Báo Telegram khi có tín hiệu mới, lệnh khớp, chạm TP1, chạm TP2 / cắt lỗ / đóng lệnh, bỏ lệnh chờ.
- Tự đặt lệnh vào Sổ lệnh nếu bạn bật **Tự động đặt lệnh**. Sổ lệnh được ghi vào Gist, mở web là thấy.
- Dùng đúng thiết lập trên web (chiến lược, khung, vốn, rủi ro, TP) qua Gist đồng bộ.
- Khi máy chủ đang chạy, các trang web **tự ngừng gửi Telegram** để bạn không nhận tin trùng.
  Cài đặt → Cảnh báo Telegram có dòng cho biết ai đang gửi.

Làm một lần, khoảng 10 phút.

## Bước 1. Bật đồng bộ và Telegram trên web (nếu chưa)

1. Cài đặt → **Đồng bộ máy tính ↔ điện thoại**: dán mã GitHub (quyền **gist**), bấm Kết nối.
2. Cài đặt → **Cảnh báo Telegram**: nhập Bot token, bấm Lấy Chat ID, bấm Gửi thử.
   Token được đồng bộ qua Gist nên máy chủ tự dùng được, không cần nhập lại.

## Bước 2. Tạo kho chứa mã trên GitHub

1. Vào https://github.com/new
2. Repository name: `tin-hieu`. Chọn **Public**.
   - Public thì GitHub Actions **miễn phí không giới hạn**. Kho chỉ chứa mã nguồn.
     Sổ lệnh, token, vốn của bạn nằm trong **Gist bí mật** và **Secrets**, người khác không xem được.
   - Private chỉ có 2.000 phút miễn phí mỗi tháng, không đủ để chạy liên tục.
3. Bấm **Create repository**.
4. Trên trang kho vừa tạo, bấm **uploading an existing file**. Kéo thả **toàn bộ nội dung** thư mục `tin-hieu`
   (index.html, css, js, bot…) rồi bấm **Commit changes**. Không cần tải file Prompt.txt lên.
5. Tạo file lịch chạy: trong kho bấm **Add file → Create new file**.
   - Ô tên file gõ đúng: `.github/workflows/tin-hieu-bot.yml` (gõ dấu `/` thì GitHub tự tạo thư mục).
   - Mở file `bot/tin-hieu-bot.yml` trong thư mục dự án, chép toàn bộ nội dung dán vào, bấm **Commit changes**.

## Bước 3. Thêm mã bí mật (Secrets)

Trong kho: **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Giá trị |
|---|---|
| `GIST_TOKEN` | Mã GitHub quyền gist, **giống hệt mã đã dán ở mục Đồng bộ trên web** (bắt buộc) |
| `TG_TOKEN` | Bot token Telegram (không bắt buộc nếu đã nhập trên web) |
| `TG_CHAT` | Chat ID Telegram (không bắt buộc nếu đã nhập trên web) |

## Bước 4. Chạy thử

1. Tab **Actions**. Nếu GitHub hỏi, bấm **I understand my workflows, go ahead and enable them**.
2. Chọn **Tín hiệu – máy chủ Telegram** → **Run workflow**.
3. Khoảng 1 phút sau, Telegram nhận tin: *🤖 Máy chủ đám mây Tín hiệu đã chạy*.
   Lần chạy đầu chỉ ghi nhớ các tín hiệu đang có. Từ lần sau, tín hiệu mới sẽ được báo.
4. Bấm vào lượt chạy để xem nhật ký: coin đang theo dõi, tín hiệu, số lệnh mở.

Sau đó máy chủ tự chạy mỗi 10 phút, không cần làm gì thêm.

## Lưu ý

- **Dữ liệu giá**: máy chủ GitHub đặt ở Mỹ nên Binance Futures chặn (mã 451). Máy chủ tự dùng dữ liệu Binance **Spot**,
  giá gần như trùng Futures. Tín hiệu có thể lệch rất nhỏ so với web ở một vài nến.
  Coin chỉ có trên Futures (không có trên Spot) sẽ bị bỏ qua.
- **Độ trễ**: thường dưới 1–2 phút. Lúc GitHub đông, lượt chạy có thể trễ vài phút.
- **Tự học** vẫn do web làm khi bạn mở web. Máy chủ chỉ ghi kết quả, không tự học lại.
- GitHub tạm dừng lịch chạy nếu kho **không có thay đổi gì trong 60 ngày**. Khi đó GitHub gửi email.
  Vào Actions bấm **Enable workflow**, hoặc sửa một file bất kỳ trong kho.
- Muốn tắt máy chủ: Actions → Tín hiệu – máy chủ Telegram → **…** → **Disable workflow**.
  Khoảng 20 phút sau, các trang web tự gửi Telegram lại như cũ.
- Chạy thử trên máy tính (cần Node.js 18+): `GIST_TOKEN=ghp_xxx node bot/bot.js`
