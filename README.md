# 学生管理系统

## 启动项目

### 1. 安装依赖

```powershell
cd E:\dj\student-management
npm install
```

### 2. 配置数据库


### 3. 初始化数据库和演示数据

```powershell
cd E:\dj\student-management\apps\api

npx prisma generate --schema prisma/schema.prisma
npm run db:push
npm run db:seed
```

### 4. 启动 API

终端一：

```powershell
cd E:\dj\student-management\apps\api
npm run dev
```

API 地址：`http://localhost:3001`

### 5. 启动 Web

终端二：

```powershell
cd E:\dj\student-management\apps\web
npm run dev
```

打开 Vite 输出的地址，通常是 `http://localhost:5173`。

## 演示账号

| 身份 | 邮箱 | 密码 |
| --- | --- | --- |
| Admin | `ava@austin.edu` | `demo123` |
| Admin | `noah@austin.edu` | `demo123` |
| Teacher | `luca@austin.edu` | `demo123` |
