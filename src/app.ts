import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from './config/swagger';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import courseRoutes from './routes/course.routes';
import classRoutes from './routes/class.routes';
import sessionRoutes from './routes/session.routes';
import exerciseRoutes from './routes/exercise.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;


// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
}));
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI Documentation & FE Test Interface
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Healthcheck Route
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'EduManage Backend API System is running smoothly.',
    timestamp: new Date().toISOString(),
    swaggerDocs: `http://localhost:${PORT}/api-docs`
  });
});

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/classes', classRoutes);
app.use('/api/v1/classes/:classId/sessions', sessionRoutes);
app.use('/api/v1/exercises', exerciseRoutes);

// Global 404 Route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Đường dẫn API '${req.originalUrl}' không tồn tại. Vui lòng truy cập http://localhost:${PORT}/api-docs để xem danh sách API.`
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 EduManage Backend API is running on http://localhost:${PORT}`);
  console.log(`🌐 FE Dev Testing Page (Swagger UI): http://localhost:${PORT}/api-docs`);
  console.log(`=======================================================`);
});

export default app;
