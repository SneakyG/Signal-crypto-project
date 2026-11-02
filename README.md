# Tín hiệu - Bảng giao dịch (dự án nhiều file)

Ứng dụng web chạy ngay trong trình duyệt, không cần cài đặt hay máy chủ.
Mở file `index.html` bằng Chrome hoặc Edge (cần có internet để lấy giá từ Binance). Dữ liệu của bạn lưu trong trình duyệt.

> Nút **Đặt lệnh** chỉ ghi nhận và theo dõi lệnh trong ứng dụng, **không gửi lệnh lên sàn**. Đây là công cụ phân tích theo quy tắc kỹ thuật, không phải lời khuyên đầu tư và không đảm bảo lợi nhuận.

## Cấu trúc

```
index.html                 6 trang: Bảng tín hiệu, Sổ lệnh, Phân tích, Tin tức, Chiến lược, Cài đặt
css/
  base.css                 màu, nền động, hiệu ứng chuyển động
  layout.css               thanh menu, khung trang
  components.css           thẻ, bảng, KPI, nút, thông báo...
js/
  core/      util.js (tiện ích, bảng sắp xếp) · indicators.js (EMA, RSI, ATR, MACD) · data.js (Binance, bộ nhớ đệm) · htf.js (xu hướng 1D/4h)
  strategies/ registry.js (các phiên bản chiến lược) · ema.js (chiến lược của bạn) · smc.js (SMC/ICT)
  trading/   lifecycle.js (vòng đời lệnh) · backtest.js · sizing.js (chia vốn) · book.js (sổ lệnh) · scan.js (quét coin realtime)
  learning/  learner.js (học từ lệnh thua, mốc 70% / 90%)
  services/  telegram.js · notify.js · news.js (RSS) · xlsx.js (xuất Excel không cần thư viện)
  ui/        signals.js · book-page.js · analysis.js · news-page.js · lab.js · settings.js · tick.js (giá realtime 3 giây)
  main.js                  khởi động
```

## Quy trình một lệnh

1. **Hướng** lấy từ 4h (1D không được ngược chiều). Khung nhỏ (5m/15m/1h) chỉ vào lệnh theo hướng đó.
2. Có tín hiệu **mới** → đặt **lệnh chờ** (limit). Mất tín hiệu ở nến đóng kế tiếp, hoặc quá 3 nến chưa khớp, hoặc giá chạy qua TP1 khi chưa khớp → **báo bỏ lệnh**.
3. Khớp → theo dõi. **1R** = khoảng từ giá vào tới cắt lỗ. Cắt lỗ = −1R, TP1 = +1,5R, TP2 = +3R.
4. Chạm **TP1**: chốt 50%, dời cắt lỗ về giá vào, **tính là lệnh THẮNG**. Phần còn lại chạm TP2 (tổng +2,25R) hoặc về giá vào (tổng +0,75R).
5. **Cắt sớm** khi chiến lược thấy hết hy vọng thắng (khung lớn đảo chiều ngược lệnh, mất động lượng khi giá nằm dưới giá vào, CHoCH ngược chiều, quá 12 nến chưa chạy được 0,5R, xuất hiện tín hiệu ngược chiều sau TP1, hết 48 nến giữ lệnh). Có thông báo trên trang, Telegram và thông báo trình duyệt.
6. Quy ước bảo thủ: trong cùng một nến chạm cả cắt lỗ và chốt lời thì tính là cắt lỗ. Phí 0,05% mỗi chiều.

## Chia vốn

Mọi lệnh dùng cùng một khoản `A = vốn × rủi ro% ÷ (số lệnh × khoảng cắt lỗ điển hình theo % giá)`, với số lệnh tối đa 20 đến 25. Nếu cả N lệnh cùng cắt lỗ thì tổng lỗ đúng bằng mức rủi ro tổng (mặc định 5%). Đòn bẩy cần thiết được làm tròn lên thành số nguyên.

## Chiến lược

- **Chiến lược của bạn (EMA đa khung):** EMA20/50/200, MACD, RSI, volume, ATR + xu hướng 1D/4h. Có 3 bộ lọc SMC tuỳ chọn (Discount/Premium, quét thanh khoản, vùng OB/FVG) mặc định tắt; bộ học chỉ bật khi chúng làm tăng tỉ lệ thắng.
- **SMC / ICT:** BOS/CHoCH, Order Block, Fair Value Gap chưa chạm, quét thanh khoản, Discount/Premium, kill zone (tuỳ chọn). Đây là bản cài đặt tự viết từ dữ liệu nến, mang tính xấp xỉ.
- Chọn chiến lược ở Bảng tín hiệu: bảng áp dụng ngay và quét lại để chọn coin theo chiến lược đó.

## Bộ học (trang Chiến lược)

Chia dữ liệu theo thời gian: 60% đầu để học, 40% mới nhất để kiểm chứng. Mỗi bước phân tích nguyên nhân các lệnh thua, thử siết từng tham số một nấc, giữ nấc làm tăng cận dưới tỉ lệ thắng (Wilson) mà không làm xấu phần kiểm chứng.
- **✓70%:** 10 lệnh kiểm chứng gần nhất thắng ≥ 7 (và lãi kỳ vọng dương) → lưu phiên bản, nhân bản bản mới để học tiếp.
- **★90%:** thắng ≥ 9/10 → lưu thêm một bản dự phòng.
- 10 lệnh là mẫu nhỏ, đạt mốc có thể do may mắn. Hãy xem thêm tỉ lệ thắng tổng, cận dưới và chạy lại backtest trên coin khác.

## Dữ liệu và nguồn tin

- Giá: Binance Futures (dự phòng Spot). Bấm tên coin để mở biểu đồ `BINANCE:XXXUSDT.P` trên TradingView.
- Tin tức: RSS của Cointelegraph, CoinDesk, Decrypt, The Block, CryptoSlate, Bitcoin Magazine qua rss2json.com. (API tin tức của CryptoCompare/CoinDesk Data đã thu phí từ 05/2026.) Nhãn Tăng/Giảm gán tự động theo từ khoá, chỉ để tham khảo.
- Sổ lệnh tự xoá khi qua ngày (lệnh đang mở vẫn được theo dõi). Có nút xuất Excel và tải kết quả hôm qua.
