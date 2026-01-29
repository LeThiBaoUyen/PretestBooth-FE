# API Integration Guide

## Tổng quan

Frontend đã được tích hợp với Backend API để xử lý các chức năng authentication:

- Đăng ký (Register)
- Đăng nhập (Login)
- Quên mật khẩu (Forgot Password)
- Đặt lại mật khẩu (Reset Password)
- Xác thực email (Verify Email)
- Gửi lại email xác thực (Resend Verification)

## Cấu trúc API Service

### 1. Types (`src/client/lib/api/types.ts`)

Chứa tất cả các interfaces và types cho API requests/responses:

- `LoginRequest`, `LoginResponse`
- `RegisterRequest`, `RegisterResponse`
- `ForgotPasswordRequest`, `ForgotPasswordResponse`
- `ResetPasswordRequest`, `ResetPasswordResponse`
- `VerifyEmailRequest`, `VerifyEmailResponse`
- `User`, `ApiError`

### 2. API Client (`src/client/lib/api/auth.ts`)

Service chính để gọi API:

```typescript
import { apiClient } from "@/client/lib/api/auth";

// Login
const response = await apiClient.login({ email, password });

// Register
await apiClient.register({ email, password });

// Forgot Password
await apiClient.forgotPassword({ email });

// Reset Password
await apiClient.resetPassword({ email, code, newPassword });

// Verify Email
await apiClient.verifyEmail({ token });

// Resend Verification
await apiClient.resendVerification({ email });

// Logout
await apiClient.logout(accessToken);
```

### 3. Auth Storage (`src/client/lib/auth/storage.ts`)

Helper để quản lý tokens và user info trong localStorage:

```typescript
import { authStorage } from "@/client/lib/auth/storage";

// Save tokens after login
authStorage.setAccessToken(token);
authStorage.setRefreshToken(refreshToken);
authStorage.setUser(user);

// Get tokens
const token = authStorage.getAccessToken();
const refreshToken = authStorage.getRefreshToken();
const user = authStorage.getUser();

// Clear auth data on logout
authStorage.clearAuth();
```

## Các trang đã tích hợp

### 1. Login Page (`/login`)

- Gọi API `POST /auth/login`
- Lưu access token, refresh token và user info
- Redirect đến `/exam` sau khi đăng nhập thành công
- Hiển thị lỗi nếu credentials không hợp lệ

### 2. Register Page (`/register`)

- Gọi API `POST /auth/register`
- Chỉ gửi email và password (theo API backend)
- Redirect đến `/login` sau khi đăng ký thành công
- Hiển thị thông báo yêu cầu xác thực email

### 3. Forgot Password Page (`/forgot`)

- Gọi API `POST /auth/forgot-password`
- Gửi email để nhận mã reset password
- Hiển thị thông báo thành công

### 4. Reset Password Page (`/reset`)

- Gọi API `POST /auth/reset-password`
- Nhập email, code (6 digits), và new password
- Redirect đến `/login` sau khi reset thành công

### 5. Verify Email Page (`/verify-email`)

- Gọi API `POST /auth/verify-email`
- Tự động xác thực khi user click vào link trong email
- Redirect đến `/login` sau 3 giây nếu thành công
- Có nút resend verification email nếu thất bại

## Cấu hình

### Environment Variables

Tạo file `.env.local` trong thư mục root của frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### API Base URL

- Development: `http://localhost:3000`
- Production: Thay đổi trong `.env.local` hoặc `.env.production`

## Flow Authentication

### 1. Đăng ký

```
User -> /register -> API POST /auth/register -> Email xác thực được gửi -> /login
```

### 2. Xác thực Email

```
User click link in email -> /verify-email?token=xxx -> API POST /auth/verify-email -> /login
```

### 3. Đăng nhập

```
User -> /login -> API POST /auth/login -> Save tokens -> /exam
```

### 4. Quên mật khẩu

```
User -> /forgot -> API POST /auth/forgot-password -> Email với code được gửi
User -> /reset -> API POST /auth/reset-password -> /login
```

## Error Handling

Tất cả API calls đều có error handling:

```typescript
try {
  const response = await apiClient.login(credentials);
  // Success handling
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Default error message";
  setSubmitMessage(message);
}
```

Backend sẽ trả về error với format:

```json
{
  "statusCode": 400,
  "message": "Error message" | ["Error 1", "Error 2"],
  "error": "Bad Request"
}
```

## Validation Rules

### Email (Register & Login)

- Format: `XXXXXXXX.yourname@(student|teacher).iuh.edu.vn`
- Backend chỉ chấp nhận email trường

### Password

- Minimum: 6 characters (theo API backend)
- Frontend có thêm rules phức tạp hơn cho UX tốt hơn

### Reset Code

- Exactly 6 digits
- Có expiration time

## Testing

### 1. Start Backend

```bash
cd PretestBooth-BE
npm install
npm run start:dev
```

### 2. Start Frontend

```bash
cd PretestBooth-FE
npm install
npm run dev
```

### 3. Test Flow

1. Đăng ký tài khoản tại `/register`
2. Check email để lấy verification token
3. Click link hoặc vào `/verify-email?token=xxx`
4. Đăng nhập tại `/login`
5. Test forgot password flow

## Next Steps

### Features cần thêm:

1. **Protected Routes**: Middleware để check authentication
2. **Token Refresh**: Auto refresh token khi expired
3. **Logout Functionality**: Clear tokens và redirect
4. **Role-based Access**: Phân quyền STUDENT/TEACHER/ADMIN
5. **Profile Page**: Hiển thị và edit user info
6. **Remember Me**: Persistent login
7. **Social Login**: Google, Microsoft OAuth

### Security Improvements:

1. HTTP-only cookies cho tokens (thay vì localStorage)
2. CSRF protection
3. Rate limiting
4. Password strength indicator
5. 2FA (Two-factor authentication)

## Troubleshooting

### CORS Issues

Đảm bảo backend có CORS enabled:

```typescript
// Backend main.ts
app.enableCors({
  origin: "http://localhost:3001", // Frontend URL
  credentials: true,
});
```

### API Connection Failed

- Check backend đang chạy trên port 3000
- Check `NEXT_PUBLIC_API_URL` trong `.env.local`
- Check network tab trong browser DevTools

### Token Issues

- Clear localStorage và thử lại
- Check token expiration
- Implement refresh token logic

## API Documentation

Xem chi tiết API tại: `PretestBooth-BE/API_DOCUMENTATION.md`
