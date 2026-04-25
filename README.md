# 🏥 DaMed-Health-WebApp — Онлайн медицина Казахстан

> Полноценное веб-приложение для онлайн-записи к врачу

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎯 О проекте

DamuMed — медицинский сервис для записи к врачу онлайн.
Разработан как fullstack портфолио-проект с упором на UX и безопасность.

## ✨ Функциональность

- 👨‍⚕️ Каталог врачей с поиском, фильтрацией и сортировкой
- 📅 Онлайн-запись с выбором даты и времени
- 🎥 Страница онлайн-консультации (видеозвонок UI)
- 🤍 Избранные врачи (localStorage)
- 🔔 Система уведомлений
- 🗂️ Медицинская карта (drag & drop загрузка файлов)
- 🤖 AI-ассистент (Claude Sonnet API)
- 🌙 Тёмная тема
- 📱 PWA — устанавливается как приложение
- ⚙️ Панель администратора

## 🛠 Стек

| Frontend | Backend |
|---|---|
| React 19 | Node.js + Express |
| React Router 6 | MongoDB + Mongoose |
| Framer Motion | JWT Access + Refresh |
| Axios | Helmet + Rate Limiting |
| Vite | Stripe Payments |

## 🚀 Запуск

```bash
# Сервер
cd server && npm install
cp .env.example .env
npm run dev

# Клиент
cd client && npm install
npm run dev
```

Открой http://localhost:5173
