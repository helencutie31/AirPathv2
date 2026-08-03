# Sử dụng image Node.js gọn nhẹ
FROM node:20-alpine

# Thư mục làm việc trong container
WORKDIR /app

# Copy file định nghĩa thư viện (nếu dùng npm)
COPY package*.json ./

# Cài đặt thư viện
RUN npm ci --omit=dev

# Copy toàn bộ mã nguồn BE vào container
COPY src ./src

# Expose cổng mà backend sẽ chạy
EXPOSE 8080

# Đặt biến môi trường PORT khớp với EXPOSE
ENV PORT=8080

# Chạy server
CMD ["npm", "start"]