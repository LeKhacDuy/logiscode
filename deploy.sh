#!/bin/bash

# EduManage Backend API - One-Click VPS Deployment Script

echo "🚀 Starting EduManage Backend API deployment..."

# Pull latest changes from Git
echo "📥 Pulling latest code from Git repository..."
git pull origin main

# Build and restart Docker containers
echo "🐳 Building Docker images and starting container..."
docker compose down
docker compose up -d --build

echo "✅ Deployment completed successfully!"
echo "🌐 API Base URL: http://YOUR_VPS_IP:5001/api/v1"
echo "🌐 Swagger UI Test Page: http://YOUR_VPS_IP:5001/api-docs"
