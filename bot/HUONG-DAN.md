# Bot Telegram chạy 24/7 trên GitHub Actions (không cần mở web)

Trang web chỉ chạy khi đang mở. **Máy chủ đám mây** chạy độc lập hoàn toàn trên GitHub Actions (miễn phí):
tắt máy tính, khóa điện thoại, không mở web bao giờ cũng được.

**Một bộ máy duy nhất cho cả web lẫn Telegram.** Máy chủ (`bot/bot.js`) nạp và chạy **chính các file mã nguồn của trang**
trong thư mục `js/`: lấy giá Binance, các chiến lược (SMC / ICT, RSI(2), SMC + ICT Confluence, ICT BTC Scalper), quét coin,
tối ưu SL/TP, Sổ lệnh, gửi Telegram. Không có bản thuật toán thứ hai để phải giữ cho giống nhau, nên sửa chiến lược ở `js/`
là web và Telegram cùng đổi theo.

Máy chủ làm gì mỗi lượt (cứ 60 giây):

- Báo Telegram: tín hiệu mới, lệnh khớp, chạm TP1, chạm TP2 / cắt lỗ / đóng lệnh, bỏ lệnh chờ.
- Tự đặt lệnh vào Sổ lệnh nếu bạn bật **Tự động đặt lệnh**.
- Ghi Sổ lệnh, thiết lập và trí nhớ tín hiệu vào **Gist bí mật**. Mở web (máy tính hay GitHub Pages trên điện thoại) là thấy cùng dữ liệu.
- Khi máy chủ đang chạy, các trang web **tự ngừng gửi Telegram** để bạn không nhận tin trùng.

Làm một lần, khoảng 10 phút. **Không cần bật gì trên web trước.**

## Bước 1. Tạo bot Telegram

1. Trên Telegram nhắn **@BotFather** lệnh `/newbot`, đặt tên, nhận **Bot token** (dạng `123456:ABC-…`).
2. Nhắn một tin bất kỳ cho bot vừa tạo.
3. Lấy **Chat ID**: mở `https://api.telegram.org/bot<TOKEN>/getUpdates` (thay `<TOKEN>`), tìm `"chat":{"id":…}`.
   Hoặc trên web: Cài đặt → Cảnh báo Telegram → dán token → **Lấy Chat ID**.

## Bước 2. Tạo mã GitHub quyền gist (nên có)

GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)** → Generate new token.
Chỉ tích quyền **gist**, chọn thời hạn. Chép mã `ghp_…`.

Mã này để máy chủ lưu Sổ lệnh và thiết lập vào Gist bí mật, và để web đọc chung. Chưa có Gist thì **máy chủ tự tạo**.
Muốn xem trên web: Cài đặt → **Đồng bộ máy tính ↔ điện thoại** → dán cùng mã này → Kết nối.

## Bước 3. Tạo kho chứa mã trên GitHub

1. Vào https://github.com/new, đặt tên `tin-hieu`, chọn **Public**, bấm **Create repository**.
   - Public thì GitHub Actions **miễn phí không giới hạn**. Kho chỉ chứa mã nguồn; Sổ lệnh, token, vốn của bạn nằm trong
     **Gist bí mật** và **Secrets**, người khác không xem được.
   - Private chỉ có 2.000 phút miễn phí mỗi tháng, không đủ để chạy liên tục.
2. Bấm **uploading an existing file**, kéo thả **toàn bộ nội dung** thư mục `tin-hieu` (index.html, css, js, bot…), bấm **Commit changes**.
   Không cần tải `Prompt.txt`.
3. Tạo file lịch chạy: **Add file → Create new file**, ô tên file gõ đúng `.github/workflows/tin-hieu-bot.yml`
   (gõ dấu `/` thì GitHub tự tạo thư mục). Mở `bot/tin-hieu-bot.yml` trong thư mục dự án, chép toàn bộ nội dung dán vào, **Commit changes**.
   Nếu đã có file này từ trước thì mở nó, bấm ✏️, thay toàn bộ nội dung bằng bản mới.
   (Tải lên bằng GitHub Desktop / git thì thư mục `.github` đi kèm sẵn, bỏ qua bước này.)

## Bước 4. Thêm Secrets

Trong kho: **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Giá trị | |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Bot token ở Bước 1 | bắt buộc nếu không có `GIST_TOKEN` hoặc chưa nhập Telegram trên web |
| `TELEGRAM_CHAT_ID` | Chat ID ở Bước 1 | như trên |
| `GIST_TOKEN` | Mã `ghp_…` ở Bước 2 | **nên có** |

Đã đặt secret tên cũ `TG_TOKEN`, `TG_CHAT` thì vẫn dùng được, không cần đổi. Không cần API key Binance: máy chủ chỉ đọc giá công khai.

## Bước 5. Chạy thử

1. Tab **Actions**. Nếu GitHub hỏi, bấm **I understand my workflows, go ahead and enable them**.
2. Chọn **Tín hiệu – máy chủ Telegram** → **Run workflow**.
3. Khoảng 1 phút sau Telegram nhận tin *🤖 Máy chủ đám mây Tín hiệu đã chạy*.
   Lần chạy đầu chỉ ghi nhớ các tín hiệu đang có; từ lần sau, tín hiệu mới mới được báo.
4. Bấm vào lượt chạy để xem nhật ký: nguồn giá, coin đang theo dõi, tín hiệu, số lệnh mở.

Sau đó máy chủ tự chạy: GitHub bật lịch mỗi **5 phút** (mức tối thiểu GitHub cho phép), mỗi lượt chạy liên tục ~9,5 phút.
Lượt mới xếp hàng chờ lượt trước xong (không chạy chồng), nên gần như theo dõi liên tục kể cả khi GitHub trễ lịch.

## Web và Telegram khớp nhau thế nào

- **Cùng thuật toán:** máy chủ chạy đúng các file `js/` mà trang web dùng.
- **Cùng dữ liệu:** máy chủ GitHub đặt ở Mỹ nên Binance Futures chặn (mã 451); máy chủ dùng **Binance Spot** và ghi
  “nguồn giá” vào Gist. Trên web, Cài đặt → Cảnh báo Telegram → **Nguồn giá dữ liệu** mặc định **Tự động: khớp máy chủ đám mây**:
  khi máy chủ đang chạy, web dùng đúng nguồn của máy chủ, nên giá vào / SL / TP trên web và trong tin Telegram trùng nhau.
  Dòng ghi chú ngay dưới ô chọn cho biết đang khớp (✅) hay đang lệch (⚠).
  Chọn **Binance Futures** nếu bạn muốn web bám sát biểu đồ TradingView `.P` hơn (khi đó có thể lệch nhỏ so với Telegram).
- **Cùng Sổ lệnh và thiết lập:** qua Gist (cần `GIST_TOKEN`). Đổi chiến lược, khung, vốn, rủi ro, TP trên web là máy chủ dùng theo ở lượt sau.
- Coin chỉ có trên Futures, không có trên Spot, sẽ bị bỏ qua ở cả hai phía khi dùng Spot.

## Chế độ không có GIST_TOKEN

Chỉ cần `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`. Máy chủ lưu trí nhớ tín hiệu và Sổ lệnh của nó vào tệp `.bot-state/state.json`,
workflow giữ tệp này giữa các lượt bằng GitHub cache. Hạn chế: dùng thiết lập mặc định (chế độ Tự động, rủi ro 5%), web không xem được
Sổ lệnh của máy chủ, và cache GitHub có thể bị xóa sau 7 ngày không dùng (khi đó máy chủ chào lại và ghi nhớ lại từ đầu).
Muốn đầy đủ thì thêm `GIST_TOKEN`.

## Lưu ý

- **Độ trễ:** thường dưới 1–2 phút. Lúc GitHub đông, lượt chạy có thể trễ vài phút.
- **Tự học** vẫn do web làm khi bạn mở web. Máy chủ chỉ ghi kết quả, không tự học lại.
- GitHub tạm dừng lịch chạy nếu kho **không có thay đổi gì trong 60 ngày** (GitHub gửi email báo).
  Vào Actions bấm **Enable workflow**, hoặc sửa một file bất kỳ trong kho.
- Muốn tắt máy chủ: Actions → Tín hiệu – máy chủ Telegram → **…** → **Disable workflow**. Khoảng 20 phút sau các trang web tự gửi Telegram lại.
- Chạy thử trên máy tính (Node.js 18+):
  `TELEGRAM_BOT_TOKEN=… TELEGRAM_CHAT_ID=… GIST_TOKEN=ghp_… node bot/bot.js`
