# Báo Cáo A/B Testing - Chiến Dịch Voucher

## 1. Bối cảnh bài toán

Sau khi segmentation đã xác định được nhóm **Cụm 2 - Khách cuối tuần, trả Flex, tip thấp**, bước A/B testing dùng để kiểm tra xem voucher có thật sự làm nhóm này đi nhiều hơn hay không.

Điểm quan trọng là bài toán không chỉ hỏi “voucher có tăng số chuyến không”. Vì mỗi rider nhận voucher đều tạo chi phí, phân tích phải đi thêm một bước nữa: uplift đo được có đủ lớn để bù chi phí voucher, chi phí vận hành và tạo lợi nhuận hay không.

Câu hỏi đặt ra:

> Nếu gửi voucher cho nhóm Khách cuối tuần, trả Flex, tip thấp, số chuyến tăng thêm có đủ để triển khai chiến dịch một cách có lãi không?


## 2. Workflow 

### Bước 1 - Chọn nhóm target

Trước khi đo tác động, cần xác định rõ voucher đang được đánh giá trên nhóm rider nào. Chiến dịch này không nhắm đến toàn bộ user, mà tập trung vào cụm đã được chọn từ segmentation vì có dấu hiệu nhạy với ưu đãi giá: đi nhiều cuối tuần, dùng Flex cao và tip thấp.

Trong dữ liệu A/B test, nhóm target được lọc bằng `is_target = 1`.

| Chỉ số | Giá trị |
|---|---:|
| Cụm target | 2 |
| Persona | Khách cuối tuần, trả Flex, tip thấp |
| Tổng số rider | 6,446 |
| Treatment | 3,216 |
| Control | 3,230 |
| Treatment share | 49.9% |

Đơn vị randomization là **rider**. Mỗi rider hoặc nhận voucher, hoặc không nhận voucher.

Sau khi đã cố định đúng nhóm thử nghiệm, bước tiếp theo là định nghĩa thế nào là “thành công”. Với chiến dịch voucher, thành công không chỉ là uplift dương, mà uplift đó phải vượt ngưỡng hòa vốn.

### Bước 2 - Xác định metric và ngưỡng hòa vốn

Metric chính là:

```text
Incremental trips per rider trong 30 ngày
```

Giả thuyết kiểm định:

| Giả thuyết | Nội dung |
|---|---|
| H0 | Voucher không làm thay đổi số chuyến trung bình của rider thuộc cụm target |
| H1 | Voucher làm tăng số chuyến trung bình của rider thuộc cụm target |


```text
BREAKEVEN = (voucher_value + opex_per_rider) / (avg_fare * take_rate)
```

Giả định kinh tế:

| Tham số | Giá trị |
|---|---:|
| Mệnh giá voucher | $5.00 / rider |
| Chi phí vận hành | $1.25 / rider |
| Tổng chi phí | $6.25 / rider |
| Take rate | 20% |
| Fare trung bình cụm target | $22.67 / chuyến |
| Doanh thu biên mỗi chuyến | $4.53 |
| Ngưỡng hòa vốn | 1.3783 chuyến / rider |

Nghĩa là mỗi rider được gửi voucher cần tạo thêm ít nhất **1.3783 chuyến** để chiến dịch không lỗ. Ngưỡng này tính trên **tổng chi phí** $6.25, tức đã gồm cả opex chứ không chỉ mệnh giá voucher.

### Bước 3 - Power analysis

Khi đã có ngưỡng hòa vốn, phân tích kiểm tra xem experiment có đủ sức phát hiện một tác động ở mức đáng quan tâm hay không. Nếu MDE lớn hơn breakeven, thí nghiệm có thể bỏ lỡ một tác động vẫn có ý nghĩa kinh doanh.

Kết quả:

| Chỉ số | Giá trị |
|---|---:|
| SD(Y0) trong block | 5.5373 |
| SE thiết kế | 0.1379 |
| MDE | 0.3864 |
| Breakeven | 1.3783 |
| Kết luận | Đủ power |

Vì **MDE = 0.3864 < Breakeven = 1.3783**, thiết kế đủ mạnh để phát hiện tác động ở mức hòa vốn. Điều này cho phép tiếp tục đọc kết quả treatment với độ tin cậy tốt hơn.

### Bước 4 - Kiểm tra randomization

Trước khi ước lượng tác động, cần kiểm tra treatment và control có được chia hợp lệ không. Nếu hai nhóm đã lệch từ đầu, chênh lệch outcome sau đó có thể không đến từ voucher.

Đầu tiên là Sample Ratio Mismatch. Với thiết kế 50/50, tỷ lệ treatment không cần đúng tuyệt đối, nhưng không được lệch bất thường.

```text
Treatment: 3,216
Control:   3,230
SRM p-value: 0.8714
```

Kết quả không có dấu hiệu SRM.

Sau đó, phân tích kiểm tra covariate balance bằng SMD. Nhóm treatment và control được so trên 11 biến số gồm `total_rides`, `recency_days`, `typical_distance`, `route_entropy`, `pct_airport`, `weekend_ratio`, `pct_flex_payment`, `pct_tip_rate`, `avg_fare`, `age`, `is_urban`, cùng các biến phân loại `gender`, `home_borough`, `pref_time_bucket`.

| Nhóm biến | Max \|SMD\| | Kết luận |
|---|---:|---|
| Biến số | 0.0306 | Cân bằng |
| Biến phân loại | 0.0580 | Cân bằng |

Tất cả đều thấp hơn ngưỡng 0.10, nên hai nhánh đủ cân bằng để tiếp tục ước lượng tác động.

### Bước 5 - Ước lượng tác động

Khi randomization đã đạt yêu cầu, phân tích chuyển sang đo voucher làm tăng bao nhiêu chuyến trên mỗi rider.

Hai estimator được dùng:

| Estimator | Vai trò |
|---|---|
| Hiệu trung bình thô | Cách đọc trực quan giữa treatment và control |
| `Y ~ T + block FE`, SE HC1 | Ước lượng chính, khớp với thiết kế randomization theo block |

Kết quả hiệu trung bình thô:

| Chỉ số | Giá trị |
|---|---:|
| Mean treatment | 9.3999 |
| Mean control | 7.3201 |
| ATE | 2.0798 |
| SE Welch | 0.1709 |
| 95% CI | [1.7448, 2.4147] |
| Relative lift | 28.4% |
| p-value | 1.022e-33 |

Kết quả chính dùng block fixed effects:

| Chỉ số | Giá trị |
|---|---:|
| Uplift / rider | 1.9670 chuyến |
| SE | 0.1412 |
| 95% CI | [1.6901, 2.2439] |
| Relative lift | 26.9% |
| p-value | 1.83e-43 |
| Breakeven | 1.3783 |

Diễn giải: rider nhận voucher tạo thêm trung bình khoảng **1.967 chuyến trong 30 ngày** so với rider không nhận voucher. Cận dưới 95% CI là **1.6901**, vẫn cao hơn ngưỡng hòa vốn **1.3783**, nên kết quả đủ mạnh cả về thống kê lẫn kinh tế.

Phân phối outcome cũng đi theo hướng hợp lý: trung vị số chuyến tăng từ 6 lên 9, tỷ lệ rider 0 chuyến giảm từ 20.4% xuống 13.8%, và xác suất một rider treatment có nhiều chuyến hơn rider control là 0.598.

### Bước 6 - Guardrail

Metric chính chỉ nói voucher có kéo số chuyến lên không. Ở đây cần khẳng định **không có tổn hại**, nên `p > 0.05` không đủ — mỗi guardrail được khai báo ngưỡng trước và đọc cận khoảng tin cậy về phía xấu.

| Guardrail | Đo được | Ngưỡng | Kết quả |
|---|---|---|---|
| Doanh thu biên tăng thêm / rider | $8.49 (cận dưới $7.04) | ≥ chi phí $6.25 | Đạt |
| ATE mọi nhóm hoạt động nền | cận trên xấu nhất 2.1589 | > 0 ở cả ba nhóm | Đạt |
| Voucher chi cho rider 0 chuyến | 13.81% | ≤ 20% | Đạt |

Nhóm ở guardrail thứ hai chia theo `total_rides` đo **trước** thí nghiệm nên không phá randomization; cả ba nhóm đều có CI nằm trọn trên 0.

Guardrail thứ nhất phát hiện một điều Bước 8 phải tính đến. Bước 8 quy uplift ra tiền bằng cước trung bình cả cụm, được $8.92/rider. Đo thẳng doanh thu biên từng rider chỉ được **$8.49** — tỷ lệ 0.9515, vì chuyến tăng thêm đến từ rider cước thấp hơn trung bình. Kết luận triển khai không đổi.

### Bước 7 - Monte Carlo validation

Sau khi có uplift chính, phân tích kiểm tra estimator có ổn định dưới cơ chế randomization hay không. Cách làm là giữ nguyên potential outcomes, rồi bốc lại treatment assignment 1,000 lần theo đúng thiết kế 50% trong từng block.

Mô phỏng được chạy ở 5 mức effect size để kiểm tra bias, coverage và power.

| Effect size | Tác động thật | TB ước lượng | Bias | Coverage | Power |
|---:|---:|---:|---:|---:|---:|
| 0.00 | 0.0000 | 0.0018 | 0.0018 | 0.951 | 0.049 |
| 0.10 | 0.1833 | 0.1768 | -0.0065 | 0.950 | 0.249 |
| 0.25 | 0.4583 | 0.4608 | 0.0025 | 0.946 | 0.920 |
| 0.50 | 0.9166 | 0.9140 | -0.0026 | 0.950 | 1.000 |
| 1.00 | 1.8332 | 1.8326 | -0.0006 | 0.958 | 1.000 |

Estimator gần như không bias, coverage nằm quanh mức kỳ vọng 95%, và sai lầm loại I ở effect size 0 là 0.049. Điều này củng cố rằng kết quả A/B test không phải là của một lần randomization cụ thể.

### Bước 8 - Đánh giá kinh doanh cho cụm target

Kết quả thống kê được chuyển thành tác động tài chính bằng cách nhân uplift với số rider target, rồi so incremental revenue với tổng chi phí voucher + opex(chi phí vận hành)

| Chỉ số | Giá trị |
|---|---:|
| Rider được gửi voucher | 6,446 |
| Uplift dùng để tính | 1.9670 |
| Incremental trips | 12,679 |
| Chi phí voucher | $32,230 |
| Chi phí vận hành | $8,058 |
| Tổng chi phí | $40,288 |
| Doanh thu biên tăng thêm | $57,494 |
| Lợi nhuận ròng | $17,206 |
| ROI | 42.7% |
| Cost per incremental trip | $3.18 |
| Ngưỡng hòa vốn | 1.3783 chuyến / rider |

### Bước 9 - Rubric đánh giá

Trước khi mở rộng câu hỏi sang các cụm khác, kết quả được chấm lại theo một rubric, gồm ba trục đo chất lượng ước lượng và hai trục đo giá trị kinh doanh.

| Tiêu chí | Giá trị | Ngưỡng | Kết quả |
|---|---:|---|---|
| Accuracy — \|uplift − sự thật\| | 0.1338 | < 0.20 | PASS |
| Bias — \|TB ước lượng − sự thật\| (Monte Carlo) | 0.0065 | < 0.05 | PASS |
| Coverage — tỷ lệ KTC 95% phủ sự thật | 0.946 - 0.958 | 0.93 - 0.97 | PASS |
| Decision — cận dưới KTC vượt breakeven | 1.6901 vs 1.3783 | cận dưới > breakeven | PASS |
| Cost — chi phí / incremental trip | $3.18 | < doanh thu biên $4.53 | PASS |
| Latency — thời gian một lần fit | 0.38 ms | — | — |

Accuracy đo lệch so với `ate_realized = 1.8332`, tức estimand thật của nhánh RCT, còn bias là mức lệch hệ thống lớn nhất qua 5 mức effect size ở Bước 7. Cả năm tiêu chí có ngưỡng đều đạt, nên kết quả đủ điều kiện để dùng cho quyết định triển khai.

### Bước 10 - Phân tích CATE: nếu rải voucher cho tất cả?

Tuy nhiên, vấn đề đặt ra là: nếu không chọn lọc mà rải voucher cho toàn bộ 20,000 rider thì sao?

Kết quả CATE theo cụm:

| Cụm | Persona | n | CATE | 95% CI thấp | 95% CI cao | Fare TB | Breakeven riêng | Quyết định |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 0 | Khách nội đô ngày thường, tip cao | 10,946 | 1.6016 | 1.3944 | 1.8087 | $16.51 | 1.8931 | Dừng |
| 1 | Khách sân bay / đường dài | 2,608 | 0.4073 | -0.1602 | 0.9747 | $38.26 | 0.8168 | Dừng |
| 2 | Khách cuối tuần, trả Flex, tip thấp | 6,446 | 1.9670 | 1.6902 | 2.2438 | $22.67 | 1.3783 | Triển khai |

ATE gộp toàn tệp là **1.5668**, còn breakeven gộp là **1.4650**, nên nếu chỉ nhìn trung bình chung thì kết luận là **cân nhắc**. Nhưng khi tách theo cụm, chỉ có **1/3 cụm** tự vượt được ngưỡng hòa vốn riêng.

So sánh hai kịch bản:

| Kịch bản | Số rider | Chi phí | Doanh thu biên | Lợi nhuận | ROI |
|---|---:|---:|---:|---:|---:|
| Rải cho tất cả | 20,000 | $125,000 | $123,500 | -$1,500 | -1.2% |
| Chỉ cụm đạt ngưỡng | 6,446 | $40,288 | $57,494 | $17,206 | 42.7% |

Kết luận: voucher không nên rải đại trà. Cụm 0 có uplift dương nhưng không đủ bù breakeven riêng; cụm 1 có fare cao nhưng uplift quá thấp và không chắc chắn. Chỉ cụm 2 vừa có uplift cao, vừa vượt ngưỡng hòa vốn.

### Vì sao phải target thay vì rải đều

| Kịch bản | Doanh thu biên / rider | Trừ mệnh giá voucher | Opex tối đa chịu được |
|---|---:|---:|---:|
| Rải cho tất cả | $6.175 | −$5.00 | **$1.175** |
| Chỉ cụm 2 | $8.919 | −$5.00 | **$3.919** |

### Bước 11 - So sánh RCT vs Observational

Ba estimator trên cùng dữ liệu quan sát, đối chiếu `ate_true = 1.8368`:

| Estimator | Propensity | Ước lượng | 95% CI | Lệch vs truth | Phủ truth |
|---|---|---:|---|---:|---|
| Naive | T_obs thô | 4.8665 | [4.545, 5.188] | +3.0297 | Không |
| IPW Hájek | thật | 2.0657 | [1.665, 2.466] | +0.2289 | Có |
| AIPW | thật | 2.0171 | [1.712, 2.323] | +0.1803 | Có |
| IPW Hájek | ước lượng | 1.9964 | [1.574, 2.419] | +0.1596 | Có |
| AIPW | ước lượng | 2.0612 | [1.746, 2.376] | +0.2244 | Có |
| RCT, block FE | bốc thăm | 1.9670 | [1.690, 2.244] | +0.1302 | Có |

Naive báo 4.87 chuyến trong khi sự thật là 1.84, toàn bộ phần dư là confounding vì rider vốn đi nhiều cũng là người tự chọn nhận voucher. Sau hiệu chỉnh, sai lệch lớn nhất còn 8% của sai lệch naive. 
## 3. Kết luận

Chiến dịch voucher đạt các điều kiện quan trọng trên cụm target:

1. Randomization hợp lệ: không có SRM, covariates số và phân loại đều cân bằng.
2. Uplift rõ ràng: 1.9670 chuyến/rider, p-value rất nhỏ, 95% CI không chạm 0.
3. Vượt hòa vốn sau khi tính opex: cận dưới 95% CI 1.6901 vẫn cao hơn breakeven 1.3783.
4. Estimator đáng tin: bias thấp, coverage gần 95%, sai lầm loại I đúng mức.
5. Guardrail đều đạt: doanh thu biên phủ chi phí, không phân khúc nào bị hại, 13.81% voucher rơi vào rider 0 chuyến dưới ngưỡng 20%.
6. CATE cho thấy nên triển khai có chọn lọc, không nên rải voucher cho tất cả
7. Bốc thăm là thứ giữ cho kết luận đúng: cùng tập rider, nhánh quan sát chưa hiệu chỉnh cho ra 4.8665 thay vì 1.8368 

Khuyến nghị:

```text
Triển khai voucher cho 6,446 rider thuộc Cụm 2 - Khách cuối tuần, trả Flex, tip thấp.
Không rải voucher đại trà cho toàn bộ 20,000 rider.
```

Tổng kết:

```text
Incremental trips: 12,679
Total cost:        $40,288
Net profit:        $17,206
ROI:               42.7%
CPIT:              $3.18 / incremental trip
```

