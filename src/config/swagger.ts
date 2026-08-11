import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EduManage Class & Course Management System API',
      version: '1.0.0',
      description: `
### 🚀 Tài liệu & Giao diện Test API dành cho Lập trình viên Frontend (FE Dev)

Hệ thống cung cấp đầy đủ các RESTful API phục vụ hệ thống Quản lý Lớp học & Khóa học theo đúng ma trận phân quyền: **ADMIN**, **GIÁO VIÊN**, và **HỌC VIÊN**.

#### 🔑 Hướng dẫn Test API trực tiếp trên giao diện:
1. Gọi API **POST /api/v1/auth/login** với một trong các tài khoản mẫu bên dưới để lấy JWT Token:
   - **ADMIN**: \`admin@edumanage.com\` / Pass: \`123456\`
   - **GIÁO VIÊN**: \`gv.an@edumanage.com\` / Pass: \`123456\`
   - **HỌC VIÊN**: \`hv.binh@edumanage.com\` / Pass: \`123456\`
2. Bấm nút **Authorize 🔓** ở góc trên bên phải màn hình.
3. Nhập token vào ô value theo định dạng: \`Bearer <your_token>\` và bấm **Authorize**.
4. Chọn API bất kỳ -> Bấm **Try it out** -> Nhập tham số/body mẫu có sẵn -> Bấm **Execute** để xem phản hồi thực tế!
      `,
      contact: {
        name: 'EduManage API Support'
      }
    },
    servers: [
      {
        url: 'http://localhost:5001',
        description: 'Local Development Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Nhập JWT Token theo dạng: Bearer <token>'
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js']
};

export const swaggerSpec = swaggerJsdoc(options);
