# Frontend MaM Hotel

React và TypeScript giữ giao diện hiện có, gồm trang giới thiệu công khai trước đăng nhập và bốn màn làm việc cho nhân viên.

## Chạy và kiểm tra

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
npm test
npm run build
```

Vite chuyển tiếp `/api` và `/media` tới backend local `http://localhost:8080`. Khi triển khai ở nơi khác, đặt `VITE_API_BASE_URL` thành địa chỉ backend và cấu hình CORS tương ứng.

Các màn dùng API hiện hành được liệt kê trong [hợp đồng API](../docs/api-contract.md); unit test nằm cạnh mã nguồn trong `src/`.
