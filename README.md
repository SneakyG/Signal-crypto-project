# Tín hiệu - Bảng giao dịch (dự án nhiều file)

Ứng dụng web tĩnh chạy ngay trong trình duyệt, không cần máy chủ. Mở `index.html` bằng Chrome/Edge, hoặc đưa lên GitHub Pages (hướng dẫn bên dưới). Dữ liệu của bạn lưu trong trình duyệt.

## Đưa lên GitHub Pages

1. Tạo repository mới trên GitHub. Tài khoản GitHub miễn phí chỉ bật Pages cho repository **công khai** (repository riêng tư cần GitHub Pro). Mã nguồn sẽ công khai, nhưng token Telegram, sổ lệnh và cài đặt chỉ lưu trong trình duyệt của bạn, không nằm trong mã.
2. Tải toàn bộ nội dung thư mục `tin-hieu` lên **thư mục gốc** của repository (giữ nguyên các thư mục `css/`, `js/` và file `.nojekyll`).
3. Vào **Settings → Pages → Build and deployment → Source: Deploy from a branch**, chọn nhánh `main`, thư mục `/ (root)`, bấm **Save**.
4. Sau 1–2 phút trang có địa chỉ `https://<tên-tài-khoản>.github.io/<tên-repo>/`.

Lưu ý:
- Trang chạy HTTPS nên thông báo trình duyệt và nút "cài đặt ứng dụng" (biểu tượng ở thanh địa chỉ Chrome) hoạt động tốt hơn mở file trực tiếp.
- Mỗi địa chỉ (file trên máy, GitHub Pages) có bộ nhớ riêng: sổ lệnh và cài đặt không tự chuyển sang. Mở trên điện thoại cũng là bộ nhớ riêng.
- Binance chặn truy cập từ một số quốc gia (ví dụ Mỹ). Ở Việt Nam dùng bình thường.
- Cảnh báo Telegram chỉ gửi khi trang đang mở. Muốn chạy 24/7 cần máy chủ (VPS).
- Muốn cập nhật phiên bản mới: thay các file trong repository, GitHub tự đăng lại trang. Nếu trình duyệt còn bản cũ, bấm Ctrl+F5.

> Nút **Đặt lệnh** chỉ ghi nhận và theo dõi lệnh trong ứng dụng, **không gửi lệnh lên sàn**. Đây là công cụ phân tích theo quy tắc kỹ thuật, không phải lời khuyên đầu tư và không đảm bảo lợi nhuận.

## Cấu trúc

```
index.html                 6 trang: Bảng tín hiệu, Sổ lệnh, Phân tích, Tin tức, Chiến lược, Cài đặt (phím tắt 1–6)
manifest.webmanifest, icon.svg   cài như ứng dụng trên máy tính/điện thoại
.nojekyll                  để GitHub Pages phục vụ nguyên file
css/
  base.css                 màu, nền động, hiệu ứng chuyển động
  layout.css               thanh menu, khung trang
  components.css           thẻ, bảng, KPI, nút, thông báo...
js/
  core/      util.js (tiện ích, bảng sắp xếp) · indicators.js (EMA, RSI, ATR, MACD) · data.js (Binance, bộ nhớ đệm) · htf.js (xu hướng 1D/4h)
  strategies/ registry.js (phiên bản, chế độ Tự động) · rsi2.js (RSI(2) Connors) · ema.js (EMA cũ, ẩn) · smc.js (SMC/ICT) · btc100.js (BTC x100 hợp lưu)
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
4. Chạm **TP1**: chốt 50%, dời cắt lỗ về giá vào, **tính là lệnh THẮNG** (chưa chạm TP1 là THUA, kể cả cắt sớm có lãi nhỏ). Tỉ lệ thắng ở mọi nơi (backtest, quét coin, tối ưu SL/TP, tự học, Sổ lệnh, Excel) đều theo quy tắc này. Phần còn lại chạm TP2 (tổng +2,25R) hoặc về giá vào (tổng +0,75R).
5. **Cắt sớm** khi chiến lược thấy hết hy vọng thắng (khung lớn đảo chiều ngược lệnh, mất động lượng khi giá nằm dưới giá vào, CHoCH ngược chiều, quá 12 nến chưa chạy được 0,5R, xuất hiện tín hiệu ngược chiều sau TP1, hết 48 nến giữ lệnh). Có thông báo trên trang, Telegram và thông báo trình duyệt.
6. Quy ước bảo thủ: trong cùng một nến chạm cả cắt lỗ và chốt lời thì tính là cắt lỗ. Phí 0,05% mỗi chiều.

## Chia vốn (rủi ro mỗi lệnh)

**Rủi ro mỗi lệnh (% vốn)** = số tiền mất khi MỘT lệnh chạm cắt lỗ (đã gồm phí). Ví dụ vốn 1000$, 5% → mỗi lệnh thua mất 50$.
- Giá trị vị thế = vốn × % rủi ro ÷ (khoảng cắt lỗ % + phí hai chiều %).
- Ký quỹ (số tiền đặt lệnh) = giá trị vị thế ÷ đòn bẩy, **luôn ≤ vốn**.
- Đòn bẩy tự chọn (số nguyên, **tối đa 25×**) để ký quỹ ≈ vốn ÷ số lệnh tối đa, nhưng bị giới hạn để **giá thanh lý luôn nằm xa hơn cắt lỗ**. Cắt lỗ càng sát thì ký quỹ cần càng lớn (ví dụ cắt lỗ 0,5% với 25× cần ký quỹ ≈ 333$ cho vốn 1000$). Bạn sửa ký quỹ trên thẻ thì bảng tính lại đòn bẩy, mức thua vẫn giữ đúng % vốn.
- Chiến lược BTC x100 dùng đúng đòn bẩy 100.
- Lưu ý: 5% mỗi lệnh là mức rủi ro rất cao (5 lệnh thua liên tiếp ≈ −23% vốn). KPI "Rủi ro đang mở" cho biết tổng có thể mất nếu mọi lệnh đang mở cùng chạm cắt lỗ.

## Chiến lược

- **Hồi quy RSI(2) Connors đa khung (1h)** — thay chiến lược EMA cũ: hướng 1D/4h; giá cùng phía SMA200 (1h) và RSI(2) < 10 / > 90 → lệnh chờ hồi 0,5 ATR; cắt lỗ 4 ATR; TP1 0,5R (chốt 50%, dời SL về giá vào), TP2 1R; thoát khi hồi về SMA5 có lãi. Kiểm chứng trên dữ liệu thật Binance Futures (13 coin, ~208 ngày tới 02/11/2026): **1.106 lệnh, thắng 73,5%, lãi kỳ vọng −0,02R sau phí** (gần hòa vốn). Chiến lược EMA cũ được ẩn, chỉ giữ để theo dõi lệnh cũ.
- **BTC x100 · SMC/ICT hợp lưu (chỉ BTC, 15m):** hướng từ 1D/4h → quét thanh khoản (đáy/đỉnh cũ, PDL/PDH, phiên Á) → MSS có lực → lệnh chờ ở giữa FVG/OB. Cộng điểm: Discount/Premium 4h, OTE 62–79%, kill zone London/New York, SMT phân kỳ với ETH, volume. Cắt lỗ ngoài cú quét, tối đa 0,45% (thanh lý x100 cách ≈ 0,6%).
- **⚡ Tự động:** với mỗi coin, bảng backtest mọi chiến lược (bản gốc và bản đã lưu ✓70%/★90%) rồi dùng chiến lược thắng cao nhất cho coin đó.
- **SMC / ICT:** BOS/CHoCH, Order Block, Fair Value Gap chưa chạm, quét thanh khoản, Discount/Premium, kill zone (tuỳ chọn). Đây là bản cài đặt tự viết từ dữ liệu nến, mang tính xấp xỉ.
- Chọn chiến lược ở Bảng tín hiệu: bảng áp dụng ngay và quét lại 30 coin phổ biến, chọn tối đa 10 coin theo chiến lược đó.
- **Vì sao coin có 4–5 vạch sáng mà chưa có lệnh?** Bấm nút "Vì sao chưa có lệnh?" trên thẻ. Thường do thiếu điều kiện **bắt buộc** (vạch có viền, hay gặp nhất là "Xu hướng 4h/1D"), chưa đủ điểm tối thiểu, bị bộ lọc của bộ học chặn, hoặc tín hiệu đã cũ (bảng chỉ đặt lệnh cho tín hiệu mới).

## Tối ưu SL/TP theo thống kê từng coin

Với mỗi coin đang theo dõi và chiến lược của nó, bảng mô phỏng lại toàn bộ tín hiệu trong ~5000 nến gần nhất với nhiều mức cắt lỗ (×0,8 tới ×2,5 so với gốc) và chốt lời (TP1 0,5–1,5R, TP2 1,5–3R), chọn bộ có lãi kỳ vọng tốt nhất trên 70% dữ liệu cũ và **chỉ áp dụng nếu 30% dữ liệu mới nhất cũng tốt hơn bản gốc**. Thẻ tín hiệu ghi rõ: tỉ lệ "bị quét SL rồi chạy đúng hướng" và "suýt chạm TP1" trước/sau khi tối ưu. Ký quỹ và đòn bẩy tính theo SL/TP đã tối ưu. BTC x100 giữ TP1 1,5R / TP2 3R, chỉ tối ưu cắt lỗ trong giới hạn an toàn với thanh lý. Tự chạy lại sau mỗi lần quét (5 phút; mỗi coin tối đa 1 lần/giờ).

## Tự học (trang Chiến lược)

Mỗi lệnh kết thúc (lệnh thật trong Sổ lệnh hoặc tín hiệu bảng đang theo dõi) được ghi cho phiên bản đã tạo ra nó. Cứ đủ 10 kết quả mới: thắng ≥ 7/10 thì giữ nguyên; thắng < 7/10 thì bảng tự học lại phiên bản đó. Bản đạt ✓70% / ★90% hiện ngay ở ô Chiến lược trên Bảng tín hiệu. Có công tắc bật/tắt tự học.

## Bộ học (chi tiết)

Chia dữ liệu theo thời gian: 60% đầu để học, 40% mới nhất để kiểm chứng. Mỗi bước phân tích nguyên nhân các lệnh thua, thử siết từng tham số một nấc, giữ nấc làm tăng cận dưới tỉ lệ thắng (Wilson) mà không làm xấu phần kiểm chứng.
- **✓70%:** 10 lệnh kiểm chứng gần nhất thắng ≥ 7 (và lãi kỳ vọng dương) → lưu phiên bản, nhân bản bản mới để học tiếp.
- **★90%:** thắng ≥ 9/10 → lưu thêm một bản dự phòng.
- 10 lệnh là mẫu nhỏ, đạt mốc có thể do may mắn. Hãy xem thêm tỉ lệ thắng tổng, cận dưới và chạy lại backtest trên coin khác.

## Dữ liệu và nguồn tin

- Giá: Binance Futures (dự phòng Spot). Bấm tên coin để mở biểu đồ `BINANCE:XXXUSDT.P` trên TradingView.
- Tin tức: tự cập nhật mỗi 60 giây từ RSS của Cointelegraph, CoinDesk, Decrypt, The Block, CryptoSlate, Bitcoin Magazine, CryptoPotato (đọc qua allorigins.win, dự phòng rss2json.com) và cryptocurrency.cv. Tin mới về coin đang theo dõi hiện thông báo. Nhãn Tăng/Giảm gán tự động theo từ khoá, chỉ để tham khảo.
- Sổ lệnh tự xoá khi qua ngày (lệnh đang mở vẫn được theo dõi). Nút **Xuất Excel** tạo file 5 sheet: Tổng quan (KPI bằng công thức, 3 biểu đồ), Lệnh (có bộ lọc, công thức lãi/lỗ, lũy kế, sụt vốn), Theo coin, Nhật ký, Giải thích. Sửa vốn hoặc phí ở sheet Tổng quan thì mọi số tự tính lại.
