# Báo Cáo Stress Test Pipeline

## 1. Bối cảnh bài toán

Sau phần segmentation và A/B testing, pipeline đã đưa ra một khuyến nghị khá rõ: chọn nhóm **Khách cuối tuần, trả Flex, tip thấp** làm target và triển khai voucher vì uplift vượt ngưỡng hòa vốn.

Tuy nhiên, một kết luận tốt trên một lần chạy chưa đủ để ra quyết định. Nếu chỉ cần đổi seed KMeans, đổi cách ước lượng ATE, bootstrap lại mẫu, hoặc thay đổi một vài giả định kinh tế mà kết luận bị lật, thì khuyến nghị đó chưa đủ chắc để trình bày như một quyết định đáng tin.

Vì vậy, phần stress test được dùng để cố tình làm lung lay pipeline. Thay vì tìm thêm một kết luận mới, phân tích này hỏi:

> Nếu thay đổi những lựa chọn hợp lý trong pipeline, kết luận về target segment, uplift và quyết định rollout có còn đứng vững không?

Luồng kiểm tra được chia thành ba lớp. Đầu tiên là kiểm tra segmentation: nhóm target có còn là cùng một nhóm rider khi thay đổi seed hoặc mẫu dữ liệu không. Sau đó là kiểm tra experiment: uplift có còn dương, có ý nghĩa và vượt ngưỡng hòa vốn khi đổi estimator, bỏ bớt khối hoặc resampling không. Cuối cùng là kiểm tra khuyến nghị: quyết định triển khai có còn hợp lý khi thay đổi voucher value và take rate không.

## 2. Workflow 

### Bước 1 - Lấy lại kết luận gốc làm mốc so sánh

Trước khi stress test, cần cố định một baseline để mọi phép lay đều được so với cùng một điểm gốc. Baseline ở đây là kết quả đã được chọn trong các phần trước:

| Thành phần | Giá trị gốc |
|---|---:|
| Số rider | 20,000 |
| Số cụm segmentation | K = 3 |
| Target cluster | Cụm 2 |
| Target size | 6,446 rider |
| Persona target | Khách cuối tuần, trả Flex, tip thấp |
| ATE chính | 1.9670 chuyến / rider |
| SE | 0.1412 |
| 95% CI | [1.6902, 2.2438] |
| Breakeven | 1.3783 chuyến / rider |

Ngưỡng hòa vốn tính cả chi phí vận hành: `(5.00 + 1.25) / (22.67 × 0.20) = 1.3783`. 

### Bước 2 - Stress segmentation

Segmentation là nền của toàn bộ phần sau, vì A/B test và khuyến nghị đều chỉ chạy trên target segment. Nếu target segment không ổn định, các con số uplift phía sau có thể đang mô tả một nhóm không thật sự nhất quán.

Một vấn đề kỹ thuật cần xử lý trước là **cluster ID của KMeans không có ý nghĩa cố định**. Cùng một nhóm rider có thể được đánh số là cluster 2 ở lần chạy này nhưng thành cluster khác ở lần chạy khác. Vì vậy, không thể chỉ so `cluster == 2` giữa các lần chạy.

Thay vào đó, target mới được truy lại bằng centroid. Với mỗi lần chạy mới, cụm nào có centroid gần centroid target gốc nhất sẽ được xem là target tương ứng:

```text
target_new = argmin distance(centroid_new, target_centroid_original)
```

Sau khi truy lại target, độ ổn định được đo bằng:

| Chỉ số | Ý nghĩa |
|---|---|
| ARI | Toàn bộ cách chia cụm có giống baseline không |
| Jaccard | Tập rider target mới trùng target gốc bao nhiêu |
| Precision | Target mới có bị kéo thêm rider ngoài không |
| Recall | Target gốc còn được giữ lại bao nhiêu |

Phân tích đổi seed KMeans từ 42 đến 51, giữ nguyên K = 3 và giữ nguyên dữ liệu. Nếu chỉ đổi điểm khởi tạo mà target thay đổi mạnh, nghĩa là segmentation phụ thuộc vào may rủi thuật toán.

| Chỉ số | Khoảng giá trị |
|---|---:|
| ARI | 0.9775 - 1.0000 |
| Jaccard | 0.9786 - 1.0000 |
| Precision | 0.9937 - 1.0000 |
| Recall | 0.9846 - 1.0000 |
| Target size | 6,384 - 6,484 |

Kết quả này cho thấy seed gần như không làm thay đổi target. Ngay cả lần xấu nhất vẫn giữ được khoảng 98.5% rider gốc, nên kết luận “có một nhóm Flex cao, weekend cao, tip thấp” không phụ thuộc vào khởi tạo KMeans.

Để kiểm tra thêm tính ổn định theo mẫu dữ liệu, phân tích bootstrap rider 40 lần. Mỗi vòng lấy mẫu có hoàn lại, fit lại KMeans trên mẫu bootstrap, rồi gán lại toàn bộ 20,000 rider gốc để mọi rider đều được chấm xác suất thuộc target.

| Chỉ số | Giá trị |
|---|---:|
| Jaccard trung bình | 0.9633 |
| Jaccard min - max | 0.9002 - 0.9918 |
| Rider target gốc vẫn thuộc target | 99.8% |
| Rider ngoài bị kéo vào | 0.4% |
| Rider có vị trí lung lay | 3.6% |


### Bước 3 - Stress experiment: đặc tả mô hình

Sau khi biết target ổn định, câu hỏi tiếp theo là kết quả A/B test có bền không. Lớp đầu tiên lay **cách tính**: nếu uplift chỉ xuất hiện dưới đúng một dạng mô hình, thì kết luận voucher hiệu quả sẽ yếu.

Ba estimator được so sánh. 

| Estimator | ATE | SE | 95% CI thấp | 95% CI cao | Vượt breakeven |
|---|---:|---:|---:|---:|---|
| Hiệu trung bình thô | 2.0798 | 0.1709 | 1.7449 | 2.4146 | Có |
| Block FE + HC1 | 1.9670 | 0.1412 | 1.6902 | 2.2438 | Có |
| Block FE + hiệp biến + HC1 | 1.9172 | 0.1329 | 1.6566 | 2.1777 | Có |

Biên độ giữa ba estimator là 0.1626 chuyến, tương đương 1.2 SE hoặc 8.3% ATE chính. Cả ba đều cho cùng kết luận: uplift dương và cận dưới 95% CI vượt breakeven.


Tiếp theo là bỏ từng khối. Đây là phép kiểm duy nhất phá được cấu trúc thiết kế: bootstrap phân tầng và chia đôi mẫu đều lấy lại mẫu **trong từng ô** `block x nhánh` nên mẫu nào cũng còn đủ 10 khối

| Chỉ số | Giá trị |
|---|---:|
| ATE riêng từng khối | 1.2020 - 2.4977 |
| ATE khi bỏ một khối | 1.9062 - 2.0463 |
| Biên độ khi bỏ khối | 0.1401 (1.0 SE) |
| Số lần vẫn vượt breakeven | 10 / 10 |


### Bước 4 - Stress experiment

Đầu tiên là Fisher randomization test: giữ nguyên `Y`, chỉ tráo lại ai nhận voucher **trong từng khối**, đúng cách đã bốc thăm. Phân phối thu được là phân phối thật của estimator dưới giả thuyết “voucher không tác động lên bất kỳ ai”.

| Chỉ số | Giá trị |
|---|---:|
| Số lần hoán vị | 10,000 |
| Tâm phân phối null | +0.0018 |
| SD null | 0.1437 |
| ATE quan sát | 1.9670 |
| ATE quan sát so với null | 13.7 SD |
| p-value hoán vị | < 0.0001 |

Không lần hoán vị nào chạm tới ATE quan sát.

Sau đó là bootstrap phân tầng, bốc lại có hoàn lại trong từng ô `block x nhánh` để mẫu mô phỏng giữ đúng cấu trúc thiết kế.

| Chỉ số | Giá trị |
|---|---:|
| Số lần bootstrap | 2,000 |
| 95% CI HC1 | [1.6902, 2.2438] |
| 95% CI bootstrap | [1.6979, 2.2531] |
| Lệch biên lớn nhất | 0.0093 (1.7% độ rộng CI) |
| SD bootstrap | 0.1421 |
| Tỷ lệ bootstrap vượt breakeven | 100.0% |

Hai phép trả lời hai câu hỏi khác nhau: hoán vị kiểm **giả thuyết null**, bootstrap kiểm **độ rộng khoảng tin cậy**. Kết quả hội tụ — ba cách đo độ phân tán của estimator cùng cho khoảng 0.142: SE giải tích 0.1412, SD null 0.1437, SD bootstrap 0.1421.

### Bước 5 - Stress khuyến nghị kinh tế

Hai lớp trên lay **cách đo**. Lớp này lay **giả định kinh doanh** 

Quy tắc quyết định:

| Quyết định | Điều kiện |
|---|---|
| Triển khai | Toàn bộ 95% CI nằm trên breakeven |
| Cân nhắc | ATE nằm trên breakeven nhưng CI chạm breakeven |
| Dừng | ATE nằm dưới breakeven |

Kết luận lật đúng lúc ngưỡng hòa vốn chạm **cận dưới CI** là 1.6902, nên mỗi giả định có một điểm lật giải thẳng ra được chứ không phải dò bằng lưới:

| Giả định | Đang dùng | Điểm lật | Biên an toàn |
|---|---:|---:|---:|
| Chi phí / rider | $6.25 | $7.66 | +22.6% |
| Mệnh giá voucher | $5.00 | $6.41 | +28.3% |
| Take rate | 20.0% | 16.3% | -18.5% |
| Cước trung bình / chuyến | $22.67 | $18.49 | -18.5% |

Mỗi dòng lay một trục và giữ nguyên ba trục còn lại. Nếu voucher tăng đồng thời take rate giảm thì lật sớm hơn — đó là lúc cần đọc lưới hai chiều:

| Voucher | Take rate 15% | Take rate 20% | Take rate 25% |
|---:|---|---|---|
| $3 | Triển khai | Triển khai | Triển khai |
| $4 | Triển khai | Triển khai | Triển khai |
| $5 | Cân nhắc | Triển khai | Triển khai |
| $6 | Dừng | Triển khai | Triển khai |
| $8 | Dừng | Dừng | Triển khai |
| $10 | Dừng | Dừng | Dừng |
| $12 | Dừng | Dừng | Dừng |

Với giả định đang dùng là **voucher $5** và **take rate 20%**, quyết định vẫn là **Triển khai**.


Biên lật theo từng mức take rate: ở 15% quyết định lật ngay từ voucher $5, ở 20% lật từ $8, ở 25% lật từ $10.

## 3. Tổng hợp kết quả

| Kết luận được stress test | Bằng chứng | Ngưỡng | Kết quả |
|---|---|---|---|
| Cách chia cụm không đổi khi đổi seed | ARI 0.978 - 1.000 | >= 0.90 | Vững |
| Target giữ thành viên khi đổi seed | Jaccard 0.979 - 1.000 | >= 0.80 | Vững |
| Thành viên target ổn định qua bootstrap | 99.8% | >= 90% | Vững |
| Kết luận không đổi theo estimator | Biên độ 0.163 chuyến | < 0.20 | Vững |
| Không khối nào chi phối kết quả | Biên độ 0.140 khi bỏ khối | < 2 SE | Vững |
| Voucher có tác động dương | p hoán vị < 0.0001 | < 0.05 | Vững |
| Công thức SE đáng tin | SD null lệch 1.8% so với SE | < 10% | Vững |
| Khoảng tin cậy HC1 đáng tin | Lệch biên 0.0093 | < 0.10 | Vững |
| Uplift vượt hòa vốn | 100.0% lần bootstrap | >= 95% | Vững |
| Quyết định không lật trong vùng vận hành | 100% ô | >= 90% | Vững |
| Quyết định không lật trên toàn lưới kinh tế | 52% ô | >= 90% | Mong manh |
