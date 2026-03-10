# Flowops Backend

A comprehensive B2B Multi-Channel CRM API built with FastAPI.

## 📁 Project Structure

```
backend/
├── .env                    # Environment variables
├── .gitignore             # Git ignore rules
├── requirements.txt       # Python dependencies
├── server.py             # Main FastAPI application
├── controller/           # Business logic and utilities
│   ├── __init__.py
│   ├── auth.py          # Authentication helpers
│   └── database.py      # Database connection
├── models/              # Pydantic data models
│   ├── __init__.py
│   ├── user.py
│   ├── product.py
│   ├── entity.py
│   ├── lead.py
│   ├── boq.py
│   ├── sales_order.py
│   ├── invoice.py
│   ├── payment.py
│   ├── warranty.py
│   ├── document.py
│   └── dashboard.py
├── schemas/             # Request/Response schemas
│   ├── __init__.py
│   ├── user.py
│   ├── product.py
│   ├── entity.py
│   ├── lead.py
│   ├── boq.py
│   ├── sales_order.py
│   ├── invoice.py
│   ├── payment.py
│   └── warranty.py
├── routes/              # API route handlers
│   ├── __init__.py
│   ├── auth.py
│   ├── leads.py
│   ├── products.py
│   ├── entities.py
│   ├── boqs.py
│   ├── sales_orders.py
│   ├── invoices.py
│   ├── payments.py
│   ├── warranties.py
│   ├── documents.py
│   └── dashboard.py
└── uploads/             # File upload directory
    └── .gitkeep
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- MongoDB
- Virtual Environment

### Installation

1. **Create and activate virtual environment:**

   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**

   - Copy `.env` and update with your settings
   - Ensure MongoDB is running

4. **Start the server:**
   ```bash
   python server.py
   ```

The API will be available at `http://localhost:8000`

## 📚 API Documentation

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## 🏗️ Architecture

### Models Layer

Pydantic models defining the data structure for database entities.

### Schemas Layer

Request and response models for API validation and serialization.

### Controller Layer

Business logic, authentication, and database connection management.

### Routes Layer

FastAPI route handlers organized by feature/module.

## 🔧 Development

### Code Organization

- **Separation of Concerns:** Each layer has a specific responsibility
- **Modular Design:** Features are organized in separate modules
- **Clean Architecture:** Dependencies flow inward toward business logic

### Key Features

- JWT Authentication
- MongoDB with Motor (async)
- File upload handling
- Comprehensive CRUD operations
- Multi-channel CRM functionality
- Professional API documentation

## 🔐 Environment Variables

```bash
MONGO_URL=mongodb://localhost:27017
DB_NAME=flowops_db
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000
```
