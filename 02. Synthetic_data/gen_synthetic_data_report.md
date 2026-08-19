# Báo Cáo Tạo Dữ Liệu Synthetic Rider-Level

## 1. Bối cảnh bài toán

Phần này tạo một **synthetic rider-level dataset** gồm **20,000 rider**, cho các bước tiếp theo: customer segmentation, A/B testing 

Dữ liệu đầu vào từ NYC TLC chỉ có ở mức chuyến đi. Mỗi dòng là một chuyến taxi, không có `user_id` thật để nối nhiều chuyến về cùng một khách hàng. Trong khi đó, bài toán promotion cần dữ liệu ở mức rider: mỗi người có lịch sử hành vi, khả năng nhận voucher, outcome sau voucher và ground truth treatment effect để kiểm định phương pháp phân tích.

Vì vậy, synthetic data được xây dựng theo logic:

```text
Trip-level TLC data thật
    -> rút ra pattern hành vi chuyến đi
    -> mô phỏng 20,000 rider
    -> gán các chuyến TLC thật cho từng rider
    -> tổng hợp thành feature rider-level
    -> sinh treatment, outcome và treatment effect
```

Mục đích:

> Từ dữ liệu chuyến đi thực tế, tạo ra một bộ dữ liệu rider-level có hành vi đủ thật, causal contract đủ rõ và outcome đủ kiểm soát để dùng cho segmentation và thí nghiệm voucher.

## 2. Workflow tạo dữ liệu

### Bước 1 - Nhận dữ liệu sạch từ EDA

Synthetic Data bắt đầu từ dữ liệu TLC đã được làm sạch ở bước EDA.

Từ dữ liệu sạch, tạo các biến phụ trợ:

| Biến | Ý nghĩa |
|---|---|
| `hour` | Giờ đón khách |
| `is_wknd` | Chuyến cuối tuần |
| `is_air` | Chuyến liên quan sân bay |
| `is_flex` | Chuyến thanh toán Flex Fare |
| `is_card` | Chuyến thanh toán thẻ |
| `tip_rate` | Tỷ lệ tip trên fare |

Các biến này là cầu nối giữa EDA và dữ liệu synthetic: chúng biến dữ liệu chuyến đi thô thành các tín hiệu hành vi có thể tổng hợp lên cấp rider.

### Bước 2 - Chia chuyến đi thành archetype

Mỗi chuyến TLC được gán vào một archetype dựa trên hai trục: khung giờ và cự ly. Mục tiêu là giữ lại cấu trúc hành vi thật của chuyến đi, thay vì phát sinh toàn bộ feature từ phân phối giả định.

Định nghĩa archetype:

| Trục | Nhóm |
|---|---|
| Khung giờ | `morning`, `midday`, `evening`, `late_night` |
| Cự ly | `short`, `medium`, `long`, `very_long` |

Kết hợp hai trục này tạo thành:

```text
4 khung giờ x 4 nhóm cự ly = 16 archetype
```

Sau đó, notebook tính `p_arch`, tức tỷ lệ xuất hiện của từng archetype trong dữ liệu TLC thật. Tỷ lệ này được dùng làm phân phối nền khi mô phỏng thói quen của mỗi rider.

### Bước 3 - Sinh tần suất và recency của rider

Mỗi rider được mô phỏng bằng một mức nhu cầu riêng `lambda_i`, đại diện cho số chuyến kỳ vọng trong 30 ngày. `lambda_i` được sinh từ LogNormal để tạo ra độ lệch tự nhiên giữa người đi ít và người đi nhiều.

Các tham số chính:

| Tham số | Giá trị | Ý nghĩa |
|---|---:|---|
| `N_RIDERS` | 20,000 | Số rider synthetic |
| `SEED` | 42 | Cố định random seed để tái lập |
| `BASELINE_MEAN` | 8.0 | Số chuyến trung bình / rider / 30 ngày |
| `CV_LAMBDA` | 0.60 | Độ phân tán tần suất giữa rider |
| `ZERO_TARGET` | 0.20 | Tỷ lệ rider không có chuyến trong outcome window |
| `WAKE_RATE` | 0.25 | Tỷ lệ rider dormant được voucher đánh thức |

Quy trình phát sinh:

```text
lambda_i ~ LogNormal(mean=8, CV=0.60)
    -> xác định xác suất dormant
    -> sinh số ngày còn hoạt động trong feature window
    -> sinh total_rides trong 90 ngày
    -> sinh recency_days
```

Kết quả của bước này là hai biến hành vi nền:

| Biến | Ý nghĩa |
|---|---|
| `total_rides` | Số chuyến của rider trong 90 ngày quan sát |
| `recency_days` | Số ngày từ chuyến gần nhất |

### Bước 4 - Gán chuyến TLC thật cho từng rider

Mỗi rider có một vector sở thích archetype:

```text
w_i ~ Dirichlet(ALPHA * p_arch * N_ARCH)
```

Trong đó:

| Thành phần | Ý nghĩa |
|---|---|
| `p_arch` | Phân phối archetype thật từ TLC |
| `ALPHA = 0.1` | Điều chỉnh mức độ tập trung hành vi |
| `N_ARCH = 16` | Số archetype |

Nếu `ALPHA` nhỏ, rider có xu hướng tập trung vào một vài kiểu chuyến quen thuộc. Nếu `ALPHA` lớn, rider giống phân phối chung của toàn bộ TLC hơn.

Từ vector `w_i`, mỗi rider được bốc đúng `total_rides` chuyến. Nhờ vậy, cùng một lúc dataset giữ được hai điều:

| Thành phần | Nguồn |
|---|---|
| Tần suất sử dụng | Mô phỏng ở cấp rider |
| Cự ly, fare, tip, sân bay, borough | Lấy từ chuyến TLC thật |

### Bước 5 - Tổng hợp thành feature rider-level

Sau khi mỗi rider có một tập chuyến lịch sử, dữ liệu được tổng hợp từ trip-level lên rider-level. Kết quả là bảng `customer_features_final.csv` gồm **20,000 dòng x 14 cột**.

Các feature cuối cùng:

| Cột | Nguồn | Ý nghĩa |
|---|---|---|
| `user_id` | Sinh | Mã rider |
| `age` | Mô phỏng theo phân phối tuổi | Tuổi rider |
| `gender` | Mô phỏng theo phân phối giới | Giới tính |
| `home_borough` | TLC | Quận pickup chính |
| `total_rides` | Mô phỏng | Số chuyến trong 90 ngày |
| `recency_days` | Mô phỏng | Số ngày từ chuyến gần nhất |
| `typical_distance` | TLC | Median trip distance |
| `route_entropy` | TLC | Độ đa dạng tuyến đi |
| `pct_airport` | TLC | Tỷ lệ chuyến sân bay |
| `pref_time_bucket` | TLC | Khung giờ đi nhiều nhất |
| `weekend_ratio` | TLC | Tỷ lệ chuyến cuối tuần |
| `pct_flex_payment` | TLC | Tỷ lệ chuyến Flex Fare |
| `pct_tip_rate` | TLC | Tỷ lệ tip trung bình |
| `avg_fare` | TLC | Fare trung bình |


### Bước 6 - Sinh treatment effect và outcome

Sau khi có feature rider-level, sinh outcome cho bài toán promotion. Treatment được định nghĩa là nhận voucher khuyến mãi:

```text
T_i = 1 nếu rider nhận voucher
T_i = 0 nếu rider thuộc control
```

Outcome là số chuyến trong 30 ngày sau feature window:

```text
Y_i = số chuyến trong 30 ngày tiếp theo
```

Hai khái niệm treatment effect:

| Cột | Ý nghĩa |
|---|---|
| `cate_true` | Treatment effect kỳ vọng theo covariate |
| `ite_realized` | Treatment effect thực tế của từng rider, có thêm nhiễu cá nhân |

Logic outcome:

```text
Y(0) = outcome nền nếu không nhận voucher
Y(1) = outcome nền + ite_realized nếu nhận voucher
```

Điểm quan trọng là voucher không tác động giống nhau cho mọi rider. Một số rider có khả năng tăng chuyến mạnh hơn, một số rider gần như không phản hồi. Điều này làm dataset phù hợp hơn cho uplift modeling so với một ATE đồng nhất.

### Bước 7 - Tạo RCT và observational assignment

Notebook tạo hai nhánh treatment assignment trong cùng file `experiment_ab_final.csv`.

| Nhánh | Cột treatment | Cột outcome | Cách gán | Vai trò |
|---|---|---|---|---|
| RCT | `T_rct` | `Y_rct` | Ngẫu nhiên 50/50 trong block | Ước lượng treatment effect ít bias |
| Observational | `T_obs` | `Y_obs` | Phụ thuộc propensity | Tạo selection bias để kiểm định phương pháp xử lý bias |

Với observational data, xác suất nhận voucher không còn ngẫu nhiên. Rider có tần suất, recency, engagement hoặc khu vực khác nhau có thể có xác suất được chọn khác nhau. Vì vậy, chênh lệch outcome thô giữa treatment và control trong observational data thường lớn hơn treatment effect thật.

Kết quả minh họa từ notebook:

| Nhánh | Treatment mean | Control mean | Chênh lệch thô |
|---|---:|---:|---:|
| RCT (`Y_rct`) | 9.166 | 7.601 | +1.566 |
| Observational (`Y_obs`) | 10.665 | 6.332 | +4.333 |

Ground truth effect:

| Chỉ số | Giá trị |
|---|---:|
| `ate_true = mean(cate_true)` | 1.5183 chuyến / rider / 30 ngày |
| `ate_realized = mean(ite_realized)` | 1.5182 chuyến / rider / 30 ngày |

Điều này cho thấy observational naive estimate bị inflate mạnh do selection bias, trong khi RCT gần hơn với treatment effect thật.

## 3. Causal contract

Dataset được thiết kế với causal contract rõ ràng:

| Khái niệm | Định nghĩa |
|---|---|
| Unit | Rider `i`, từ 1 đến 20,000 |
| Treatment | Nhận voucher khuyến mãi |
| Feature window | 90 ngày lịch sử hành vi |
| Outcome window | 30 ngày sau feature window |
| Outcome | Số chuyến trong outcome window |
| Potential outcomes | `Y_i(0)` và `Y_i(1)` |
| Ground truth ATE | `mean(cate_true)` hoặc `mean(ite_realized)` |
| Observed outcomes | `Y_rct`, `Y_obs` |

Causal contract này giúp các bước sau có điểm chuẩn để đánh giá. Nếu phương pháp A/B testing hoặc uplift modeling ước lượng lệch xa `ate_true`, ta biết vấn đề đến từ phương pháp phân tích chứ không phải vì không biết ground truth.

## 4. Kết quả cuối cùng

Notebook tạo ra hai file output chính:

| File | Kích thước | Vai trò |
|---|---:|---|
| `output/customer_features_final.csv` | 20,000 dòng x 14 cột | Dataset rider-level cơ bản cho segmentation |
| `output/experiment_ab_final.csv` | 20,000 dòng x 23 cột | Dataset có treatment, outcome và ground truth effect |

Cấu trúc file experiment:

| Nhóm cột | Cột |
|---|---|
| Feature rider | `user_id`, `age`, `gender`, `home_borough`, `total_rides`, `recency_days`, `typical_distance`, `route_entropy`, `pct_airport`, `pref_time_bucket`, `weekend_ratio`, `pct_flex_payment`, `pct_tip_rate`, `avg_fare` |
| Blocking / propensity | `is_urban`, `block_id`, `propensity_true` |
| Treatment | `T_rct`, `T_obs` |
| Outcome | `Y_rct`, `Y_obs` |
| Ground truth effect | `cate_true`, `ite_realized` |

Kết luận:

```text
customer_features_final.csv -> dùng cho Segmentation
experiment_ab_final.csv     -> dùng cho A/B Testing, Stress Test và Uplift Model
```

Synthetic data là cầu nối giữa EDA và toàn bộ phần experimentation phía sau. Nó giữ lại pattern hành vi thật từ TLC, nhưng bổ sung `user_id`, treatment assignment, outcome và ground truth effect để project có thể kiểm định các phương pháp tăng trưởng một cách có kiểm soát.

