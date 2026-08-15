# Báo Cáo Customer Segmentation

## 1. Bối cảnh bài toán

Phần này thực hiện phân khúc **20,000 rider** dựa trên hành vi sử dụng dịch vụ. Mục tiêu không chỉ là chia khách hàng thành các nhóm khác nhau, mà là tìm ra một nhóm đủ rõ về hành vi, đủ lớn về quy mô và đủ phù hợp để triển khai A/B test khuyến mãi ở bước tiếp theo.

Trong bối cảnh promotion, việc gửi voucher cho toàn bộ người dùng thường dễ gây lãng phí ngân sách. Một số rider vốn đã đi đều, một số rider có nhu cầu khó thay đổi bằng giá, và chỉ một phần khách hàng có khả năng phản hồi tốt với ưu đãi. Vì vậy, segmentation được dùng như bước lọc chiến lược trước khi thiết kế A/B test.

Mục đích:

> Trong toàn bộ rider, nhóm khách hàng nào có hành vi đủ khác biệt và đủ tiềm năng để chọn làm target cho chiến dịch voucher?

## 2. Workflow phân tích

### Bước 1 - Kiểm tra chất lượng dữ liệu

Trước khi phân cụm 20,000 rider, cần kiểm tra dữ liệu có đủ sạch để đưa vào mô hình hay không. Đây là bước nền vì clustering rất nhạy với dữ liệu lỗi: một rider bị lặp, giá trị thiếu hoặc phân phối bất thường đều có thể làm tâm cụm bị kéo lệch.

Ở bước này, dữ liệu được kiểm tra theo ba nhóm vấn đề chính:

- Missing values trên toàn bộ dataset.
- Dòng trùng lặp hoàn toàn và `user_id` trùng.
- Phân phối của biến số lượng và biến phân loại để phát hiện điểm bất thường.

Kết quả:

| Chỉ số | Giá trị |
|---|---:|
| Giá trị thiếu | 0 |
| Dòng trùng lặp hoàn toàn | 0 |
| `user_id` trùng | 0 |

Phân phối một số biến phân loại cũng tương đối hợp lý. `gender` khá cân bằng giữa Other, Female và Male; `pref_time_bucket` trải trên evening, midday, late_night và morning; `home_borough` tập trung chủ yếu ở Manhattan, sau đó là Queens.

Sau bước này, dữ liệu đủ điều kiện để chuyển sang phần kỹ thuật quan trọng hơn: chọn những biến thật sự phản ánh hành vi cần phân cụm.

### Bước 2 - Chọn biến phân cụm và chuẩn hóa

Vì mục tiêu là tìm nhóm phù hợp cho promotion, phân tích không đưa tất cả biến vào KMeans. Thay vào đó, phần clustering tập trung vào 4 trục hành vi liên quan trực tiếp đến khả năng phản hồi với khuyến mãi:

| Biến | Ý nghĩa |
|---|---|
| `pct_tip_rate` | Tỷ lệ chuyến có tip |
| `pct_flex_payment` | Tỷ lệ chuyến dùng thanh toán Flex |
| `pct_airport` | Tỷ lệ chuyến liên quan sân bay |
| `weekend_ratio` | Tỷ lệ chuyến diễn ra cuối tuần |

Các biến này đều là tỷ lệ, nhưng vẫn cần chuẩn hóa trước khi đưa vào KMeans. Lý do là KMeans dựa trên khoảng cách Euclid; nếu các biến không cùng thang đo, biến có độ biến thiên lớn hơn sẽ ảnh hưởng quá mạnh đến kết quả chia cụm.

Dữ liệu được chuẩn hóa bằng `StandardScaler` để đưa mỗi biến về:

```text
mean = 0
standard deviation = 1
```

Kết quả kiểm tra sau chuẩn hóa:

| Chỉ số | Giá trị |
|---|---:|
| Ma trận phân cụm | 20,000 x 4 |
| Mean sau chuẩn hóa | xấp xỉ 0 |
| Standard deviation sau chuẩn hóa | xấp xỉ 1 |

Khi các trục đã được đưa về cùng thang đo, bước tiếp theo là quyết định nên chia rider thành bao nhiêu cụm. Đây là phần không thể chọn cảm tính, vì số cụm sẽ quyết định toàn bộ cách diễn giải persona phía sau.

### Bước 3 - Chọn số cụm K

K được chọn theo logic **ràng buộc trước, tối ưu sau**. Cách làm này giúp tránh tình huống một chỉ số kỹ thuật nhìn có vẻ tốt nhưng tạo ra các cụm quá nhỏ, không ổn định hoặc khó dùng cho chiến dịch thật.

Trước hết, mỗi giá trị K phải vượt qua hai ràng buộc:

| Ràng buộc | Ngưỡng | Ý nghĩa kỹ thuật và kinh doanh |
|---|---:|---|
| `min_share` | >= 5% | Cụm nhỏ hơn 5% dân số không đủ quy mô để chạy chiến dịch riêng |
| `ari_2_seed` | >= 0.90 | Hai seed khởi tạo khác nhau phải cho kết quả gần giống nhau |

`ari_2_seed` được tính bằng Adjusted Rand Index giữa hai lần chạy KMeans với seed khác nhau. Nếu ARI thấp, kết quả phân cụm có thể phụ thuộc vào may rủi khởi tạo thay vì phản ánh cấu trúc thật trong dữ liệu.

Sau khi loại các K không đạt ràng buộc, phân tích chọn K có `sil_gap` lớn nhất:

```text
sil_gap = silhouette_real - silhouette_null
```

Ở đây, `silhouette_real` đo độ tách cụm trên dữ liệu thật. Nhưng chỉ nhìn silhouette thô là chưa đủ, vì ngay cả dữ liệu không có cấu trúc cụm rõ ràng vẫn có thể tạo silhouette dương. Vì vậy, phân tích tạo thêm dữ liệu null bằng cách hoán vị độc lập từng cột: phân phối từng biến được giữ nguyên, nhưng quan hệ giữa các biến bị phá vỡ. Nếu silhouette trên dữ liệu thật chỉ ngang dữ liệu null, cụm tìm được có khả năng chỉ là hiệu ứng thuật toán.

Kết quả đánh giá:

| K | Silhouette | Silhouette null | Sil gap | ARI 2 seed | Min share | Kết luận |
|---:|---:|---:|---:|---:|---:|---|
| 2 | 0.3405 | 0.3190 | 0.0216 | 0.9991 | 22.03% | Đạt ràng buộc |
| 3 | 0.2484 | 0.2005 | 0.0479 | 0.9751 | 13.04% | Đạt, sil_gap cao nhất |
| 4 | 0.2197 | 0.1984 | 0.0213 | 0.9979 | 11.31% | Đạt ràng buộc |
| 5 | 0.2218 | 0.2140 | 0.0078 | 0.9986 | 1.53% | Loại vì cụm nhỏ |
| 6 | 0.2066 | 0.1917 | 0.0149 | 0.9735 | 1.51% | Loại vì cụm nhỏ |

Nếu chỉ nhìn silhouette thô, K = 2 có vẻ tốt nhất. Tuy nhiên silhouette null của K = 2 cũng rất cao, nghĩa là phần lớn điểm số đến từ cấu trúc ngẫu nhiên sau khi hoán vị dữ liệu. K = 3 có silhouette thấp hơn nhưng phần vượt baseline ngẫu nhiên lại cao nhất, đồng thời vẫn giữ được cụm nhỏ nhất ở mức 13.04% và ARI ổn định 0.9751.

Vì vậy, lựa chọn cuối cùng là:

```text
K = 3
```

Để chắc hơn, kết quả này được đối chiếu bằng Elbow method. Inertia được tính cho K từ 1 đến 6, sau đó điểm gãy được xác định bằng kneedle: điểm có khoảng cách xa nhất tới đường thẳng nối điểm đầu và điểm cuối của đường inertia.

Kết quả Elbow:

| K | Khoảng cách tới dây cung |
|---:|---:|
| 1 | 0.0000 |
| 2 | 0.1257 |
| 3 | 0.1776 |
| 4 | 0.1450 |
| 5 | 0.0901 |
| 6 | 0.0000 |

Elbow method cũng chọn **K = 3**. Khi cả `sil_gap` và elbow cùng chỉ về một giá trị, lựa chọn K = 3 có cơ sở kỹ thuật vững hơn.

### Bước 4 - Huấn luyện KMeans

Sau khi chọn K = 3, mô hình KMeans được huấn luyện trên ma trận 4 biến đã chuẩn hóa.

Cấu hình mô hình:

```text
KMeans(n_clusters=3, n_init=10, random_state=42)
```

Trong đó:

- `n_clusters=3`: số cụm được chọn từ bước đánh giá K.
- `n_init=10`: chạy nhiều lần với các tâm khởi tạo khác nhau và lấy kết quả có inertia thấp nhất.
- `random_state=42`: cố định seed để kết quả có thể tái lập.

Sau khi fit mô hình, mỗi rider được gán một nhãn `cluster`. Quy mô các cụm:

| Cụm | Số rider | Tỷ lệ |
|---:|---:|---:|
| 0 | 10,946 | 54.73% |
| 1 | 2,608 | 13.04% |
| 2 | 6,446 | 32.23% |

Kết quả này cho thấy cả ba cụm đều có quy mô đủ lớn để diễn giải và dùng cho quyết định kinh doanh. Tuy nhiên nhãn cụm 0, 1, 2 tự thân chưa có ý nghĩa; vì vậy bước tiếp theo là xây dựng persona cho từng cụm.

### Bước 5 - Xây dựng hồ sơ persona

Để biến kết quả kỹ thuật thành insight có thể dùng được, từng cụm được mô tả bằng hai nhóm biến.

| Nhóm biến | Gồm | Vai trò |
|---|---|---|
| Trục phân cụm | `pct_tip_rate`, `pct_flex_payment`, `pct_airport`, `weekend_ratio` | Dùng trực tiếp trong KMeans |
| Trục mô tả | `typical_distance`, `avg_fare`, `pref_time_bucket`, `home_borough` | Chỉ dùng để diễn giải, không đưa vào KMeans |

Với các trục phân cụm, phân tích tính z-score trung bình theo từng cụm:

```text
z = (x - mean) / std
```

Nếu z-score dương, cụm đó cao hơn trung bình toàn bộ rider trên biến tương ứng. Nếu z-score âm, cụm đó thấp hơn trung bình. Cách này giúp nhìn nhanh cụm nào nổi bật ở hành vi nào.

Hồ sơ 3 cụm:

| Cụm | n | Share | z_tip | z_flex | z_airport | z_weekend | Cự ly TB | Fare TB | Rides TB |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 10,946 | 54.73% | +0.42 | -0.43 | -0.36 | -0.28 | 1.70 | 16.51 | 23.12 |
| 1 | 2,608 | 13.04% | -0.78 | -0.42 | +2.04 | -0.20 | 7.32 | 38.26 | 21.51 |
| 2 | 6,446 | 32.23% | -0.41 | +0.90 | -0.21 | +0.56 | 3.02 | 22.67 | 21.61 |

Phân phối khung giờ theo cụm:

| Cụm | Evening | Late night | Midday | Morning |
|---:|---:|---:|---:|---:|
| 0 | 38.0% | 10.2% | 35.1% | 16.6% |
| 1 | 32.4% | 15.7% | 35.1% | 16.8% |
| 2 | 26.4% | 34.3% | 22.4% | 16.8% |

Từ các z-score và biến mô tả, mỗi cụm được đặt tên persona theo trục hành vi nổi bật nhất.

#### Cụm 0 - Khách nội đô ngày thường, tip cao

Cụm 0 là nhóm lớn nhất, chiếm 54.73% rider. Nhóm này có `z_pct_tip_rate = +0.42`, cao nhất trong ba cụm, trong khi các trục Flex, sân bay và cuối tuần đều thấp hơn trung bình. Cự ly trung bình chỉ 1.70 dặm và fare trung bình 16.51, thấp nhất trong ba nhóm.

Về hành vi, đây là nhóm đi lại nội đô, chặng ngắn, thường xuất hiện vào evening và midday. Nhóm này có thể mang lại volume ổn định, nhưng vì hành vi đi lại đã đều, voucher có rủi ro rơi vào những chuyến vốn dĩ vẫn xảy ra.

#### Cụm 1 - Khách sân bay / đường dài

Cụm 1 nhỏ nhất, chiếm 13.04% rider, nhưng có dấu hiệu rất rõ: `z_pct_airport = +2.04`, vượt xa các cụm còn lại. Cự ly trung bình 7.32 dặm và fare trung bình 38.26 đều cao nhất.

Nhóm này có giá trị mỗi chuyến cao, nhưng nhu cầu thường gắn với lịch bay hoặc chuyến đi đường dài. Vì vậy, hành vi có thể khó dịch chuyển chỉ bằng voucher giá ngắn hạn.

#### Cụm 2 - Khách cuối tuần, trả Flex, tip thấp

Cụm 2 chiếm 32.23% rider và nổi bật ở hai trục: `z_pct_flex_payment = +0.90` và `z_weekend_ratio = +0.56`. Nhóm này cũng có tỷ lệ late night cao nhất, đạt 34.3%, cao hơn đáng kể so với cụm 0 và cụm 1.

Về mặt kinh doanh, đây là nhóm có dấu hiệu nhạy với chi phí và hành vi đi lại mang tính dịp, như đi chơi cuối tuần hoặc về khuya. Tỷ lệ dùng Flex cao cho thấy họ quan tâm đến cách thanh toán hoặc tính linh hoạt của chi phí; tip thấp hơn trung bình cũng củng cố giả thuyết rằng nhóm này có thể phản hồi tốt hơn với ưu đãi giá.

### Bước 6 - Chọn nhóm target cho A/B test

Sau khi đã hiểu persona của từng cụm, cụm target được chọn dựa trên mục tiêu của bước tiếp theo: tăng incremental trips bằng voucher.

Cụm 0 tuy đông nhất nhưng đã đi lại đều đặn trong tuần. Nếu gửi voucher cho nhóm này, một phần ngân sách có thể bị dùng cho những chuyến vốn dĩ vẫn xảy ra, làm giảm incremental impact.

Cụm 1 có fare cao và hành vi sân bay rõ ràng, nhưng nhu cầu lại gắn nhiều với lịch trình bắt buộc. Voucher có thể không đủ mạnh để tạo thêm nhiều chuyến mới.

Cụm 2 cân bằng hơn giữa quy mô và khả năng phản hồi. Nhóm này đủ lớn để chạy A/B test, có hành vi cuối tuần và late night rõ ràng, dùng Flex cao và tip thấp. Vì mục tiêu là tìm nhóm có khả năng tăng thêm số chuyến nhờ promotion, cụm 2 là lựa chọn hợp lý nhất.

Kết luận target:

```text
TARGET_CLUSTER = 2
Persona = Khách cuối tuần, trả Flex, tip thấp
Quy mô = 6,446 rider, tương đương 32.2% toàn bộ rider
```

## 3. Kết quả cuối cùng

Kết quả cuối cùng tạo ra 3 persona chính:

| Cụm | Persona | Số rider | Tỷ lệ |
|---:|---|---:|---:|
| 0 | Khách nội đô ngày thường, tip cao | 10,946 | 54.7% |
| 1 | Khách sân bay / đường dài | 2,608 | 13.0% |
| 2 | Khách cuối tuần, trả Flex, tip thấp - TARGET | 6,446 | 32.2% |

Nhóm được chọn cho A/B test là **Cụm 2**. Đây là nhóm có logic kinh doanh rõ nhất cho voucher: đủ lớn để triển khai, có dấu hiệu nhạy giá và có hành vi đi lại theo dịp, nên có khả năng tạo incremental trips tốt hơn hai cụm còn lại.
