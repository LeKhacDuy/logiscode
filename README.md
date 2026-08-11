# EduManage - Backend REST API & Swagger Test Interface

Hệ thống **Backend REST API** cho hệ thống Quản lý Lớp học & Khóa học (EduManage System) phát triển bằng **Node.js, Express.js và TypeScript**, tích hợp trang thử nghiệm API tương tác **Swagger UI** dành riêng cho các lập trình viên Frontend (FE Devs).

---

## 🌟 Nổi Bật Dành Cho FE Devs

Trang thử nghiệm API tự động (Swagger UI) được tích hợp sẵn giúp FE dev không cần cài thêm phần mềm như Postman hay Insomnia.
- **URL Swagger UI**: `http://localhost:5001/api-docs` (hoặc `http://YOUR_VPS_IP:5001/api-docs` trên VPS)
- **Mã nguồn**: Viết hoàn toàn bằng TypeScript với type definitions chuẩn hóa cho tất cả các đối tượng (User, Course, Class, Exercise, Submission, SelfStudy).
- **Seed Data sẵn có**: Đã nạp sẵn dữ liệu giả lập cho Admin, Giáo viên, Học viên, Khóa học, Lớp học, Nhóm bài tập 5 dạng (Trắc nghiệm, Tự luận, Điền từ, Listening, Speaking).

---

## 🐳 Hướng Dẫn Dockerize & Deploy Trên VPS

### Bước 1: Push mã nguồn lên Git (GitHub / GitLab)
Trên máy cá nhân, chạy các lệnh sau trong Terminal:
```bash
git init
git add .
git commit -m "feat: complete edumanage backend REST API with Docker & Swagger"
git branch -M main
git remote add origin <URL_REPOSITORY_GIT_CUA_BAN>
git push -u origin main
```

---

### Bước 2: Chạy trực tiếp bằng Docker Compose trên máy local (Kiểm thử)
```bash
# Build và chạy Docker container
docker compose up -d --build

# Xem log container
docker compose logs -f
```

---

### Bước 3: Deploy lên VPS (Ubuntu / Debian / CentOS)

#### 1. SSH vào VPS của bạn:
```bash
ssh root@YOUR_VPS_IP
```

#### 2. Cài đặt Docker & Docker Compose (nếu VPS chưa có):
```bash
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
```

#### 3. Clone repo về VPS và chạy Deploy:
```bash
git clone <URL_REPOSITORY_GIT_CUA_BAN> logiscode
cd logiscode

# Cấp quyền thực thi và chạy script deploy
chmod +x deploy.sh
./deploy.sh
```

---

## 🗝️ Tài Khoản Mẫu Để Test Trực Tiếp Trên Swagger UI

Bấm nút **Authorize 🔓** ở góc trên màn hình Swagger UI và sử dụng Token nhận được sau khi login một trong các tài khoản dưới đây:

| Vai Trò | Email | Mật Khẩu | Quyền Hạn |
|---|---|---|---|
| **ADMIN** | `admin@edumanage.com` | `123456` | Toàn quyền Quản lý Users, Courses, Classes, Exercises |
| **GIÁO VIÊN (Teacher)** | `gv.an@edumanage.com` | `123456` | Xem lớp dạy, Đổi status lớp, Đăng bài Tự học, Chấm điểm bài tập, Xem báo cáo Ai đã xem tự học |
| **HỌC VIÊN (Student)** | `hv.binh@edumanage.com` | `123456` | Xem lớp học thuộc về, Xem đề 5 dạng bài (**cảnh báo cấm AI**), Nộp bài tập, Xem bài tự học (tự động ghi nhận lượt xem) |

---

## 📑 Chi Tiết Danh Sách API Modules

### 1. Authentication & Profile (`/api/v1/auth`)
- `POST /api/v1/auth/login`: Đăng nhập bằng Email + Password (trả về JWT Token).
- `GET /api/v1/auth/me`: Lấy thông tin user hiện tại từ JWT Token.

### 2. User Management (`/api/v1/users`) - Admin Only
- `GET /api/v1/users`: Xem danh sách tài khoản (Search fullname/email, Filter role/status, Pagination).
- `POST /api/v1/users`: Thêm tài khoản mới (Admin/GV/HV, status active/lock).
- `PUT /api/v1/users/:id`: Chỉnh sửa fullname, đổi status (`lock` => **User lập tức bị đăng xuất tự động & chặn login**).
- `DELETE /api/v1/users/:id`: Xóa tài khoản (Có option `?forceKick=true` tự động gỡ user khỏi lớp rồi xóa).

### 3. Course Management (`/api/v1/courses`) - Admin Only
- `GET /api/v1/courses`: Danh sách khóa học (Search, Pagination).
- `POST /api/v1/courses`: Thêm khóa học mới (**Ràng buộc: Check trùng tên + trùng level**, gán nhóm bài tập cho từng buổi).
- `PUT /api/v1/courses/:id`: Sửa khóa học & cập nhật danh sách buổi học.
- `DELETE /api/v1/courses/:id`: Xóa khóa học (**Ràng buộc: Chỉ xóa khi khóa chưa gán vào lớp nào**).

### 4. Class Management (`/api/v1/classes`)
- `GET /api/v1/classes`:
  - **ADMIN**: Bảng danh sách tất cả lớp học (Search, Filter status, Pagination).
  - **GV / HV**: Danh sách lớp thuộc về kèm **Tiến độ học tập %** (ví dụ `12/36 buổi`).
- `POST /api/v1/classes` (Admin): Tạo lớp học (Tên lớp, Khóa học, Status, Giáo viên, Học viên).
- `PUT /api/v1/classes/:id`: Sửa lớp (Admin sửa thành viên; Giáo viên đổi status lớp `schedule`/`ongoing`/`ended`).
- `DELETE /api/v1/classes/:id` (Admin): Xóa lớp.

### 5. Sessions & Lesson Details (`/api/v1/classes/:classId/sessions`)
- `GET /api/v1/classes/:classId/sessions`: Danh sách các buổi học (Tiêu đề, Hạn nộp, Số lượng hv nộp bài, Số tin nhắn tự học).
- **Tab 1: Exercise Submissions**:
  - `GET .../sessions/:sessionId/exercise`: Lấy đề bài tập 5 dạng (có **Cảnh báo nghiêm cấm sử dụng AI**).
  - `POST .../sessions/:sessionId/submit` (Student): Nộp bài tập 5 dạng (Trắc nghiệm, Tự luận, Điền từ, Listening, Speaking audio link) -> Tự động check và đánh tag `isLate` nếu quá hạn.
  - `POST .../sessions/:sessionId/submissions/:subId/grade` (Teacher): Mở Popup Chấm bài (nhập điểm 0-100 & nhận xét).
- **Tab 2: Self-Study & Tracking**:
  - `GET .../sessions/:sessionId/self-study`: Xem bài tự học.
  - `POST .../sessions/:sessionId/self-study` (Teacher): Đăng/chỉnh sửa nội dung tự học.
  - `POST .../sessions/:sessionId/self-study/view` (Student): Tự động lưu lượt xem & timestamp.
  - `GET .../sessions/:sessionId/self-study/tracking` (Teacher/Admin): Xem danh sách chi tiết học viên **ĐÃ XEM** (kèm thời gian xem) và **CHƯA XEM**.

### 6. Exercise Builder Management (`/api/v1/exercises`) - Admin & Teacher
- `GET /api/v1/exercises`: Danh sách nhóm bài tập (Search, Filter active/inactive, Pagination).
- `POST /api/v1/exercises`: Tạo nhóm bài tập (Hỗ trợ 5 loại: Trắc nghiệm kèm giải thích câu đúng, Tự luận, Điền từ, Listening có file âm thanh, Speaking có đề bài đoạn văn & thu âm).
- `PUT /api/v1/exercises/:id`: Cập nhật nội dung câu hỏi/câu trả lời.
- `DELETE /api/v1/exercises/:id`: Xóa nhóm bài tập (**Ràng buộc: Chỉ xóa khi bài tập chưa gán với khóa nào**).
