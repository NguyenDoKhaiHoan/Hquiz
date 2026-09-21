# Hquiz

Ứng dụng luyện thi trắc nghiệm React + Express + MySQL. Backend tự tạo database `hquiz`, bảng và dữ liệu mẫu khi khởi động.

## Cấu hình MySQL

1. Đảm bảo MySQL Server đang chạy.
2. Tạo file `.env` từ `.env.example` và điền thông tin MySQL:

```env
API_PORT=3001
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=mat_khau_mysql
MYSQL_DATABASE=hquiz
```

Tài khoản cần có quyền tạo database. Có thể chạy thủ công [db/schema.sql](db/schema.sql).

## Chạy dự án

```bash
npm run dev:full
```

Frontend: `http://localhost:5173`

API: `http://localhost:3001`

API chính: `GET /api/topics`, `GET /api/questions`, `POST /api/questions`, `POST /api/results`.

File DOCX/TXT/CSV/JSON được phân tích ở frontend, sau đó đồng bộ câu hỏi vào MySQL.
