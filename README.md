<div align="center">

<br/>

```
██████╗  █████╗ ███╗   ███╗███████╗██████╗
██╔══██╗██╔══██╗████╗ ████║██╔════╝██╔══██╗
██║  ██║███████║██╔████╔██║█████╗  ██║  ██║
██║  ██║██╔══██║██║╚██╔╝██║██╔══╝  ██║  ██║
██████╔╝██║  ██║██║ ╚═╝ ██║███████╗██████╔╝
╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚═════╝
```

### 🏥 Онлайн-медицина нового поколения для Казахстана

<br/>

[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/MIT-yellow?style=for-the-badge)](LICENSE)

<br/>

[🚀 Демо](#) · [📖 Документация](#) · [🐛 Сообщить об ошибке](issues) · [💡 Предложить идею](issues)

<br/>

</div>

---

## 📌 О проекте

**DaMed** — это fullstack веб-приложение для онлайн-записи к врачу, разработанное специально для рынка Казахстана. Проект создан с упором на **UX**, **безопасность** и **производительность**.

Пользователь может найти врача, записаться онлайн, пройти видеоконсультацию и получить AI-поддержку — всё в одном интерфейсе, без лишних шагов.

> 💼 Это портфолио-проект, демонстрирующий реальный продуктовый подход к разработке медицинского сервиса.

---

## ✨ Функциональность

<table>
<tr>
<td width="50%">

**👨‍⚕️ Каталог врачей**
Поиск, фильтрация по специализации, сортировка по рейтингу и цене.

**📅 Онлайн-запись**
Интерактивный выбор даты и временного слота прямо на странице врача.

**🎥 Видеоконсультация**
Полноценный UI для видеозвонка — без выхода из браузера.

**🤍 Избранные врачи**
Быстрый доступ к сохранённым специалистам через `localStorage`.

**🔔 Уведомления**
Система push-уведомлений о статусе записи и напоминаниях.

</td>
<td width="50%">

**🗂️ Медицинская карта**
Загрузка и хранение документов с drag & drop интерфейсом.

**🤖 AI-ассистент**
Встроенный чат на базе Claude Sonnet API для первичной консультации.

**🌙 Тёмная тема**
Полноценный dark mode с сохранением предпочтений пользователя.

**📱 PWA**
Устанавливается как нативное приложение на iOS и Android.

**⚙️ Панель администратора**
Управление врачами, расписанием и заявками пользователей.

</td>
</tr>
</table>

---

## 🛠 Технический стек

<table>
<thead>
<tr>
<th>Frontend</th>
<th>Backend</th>
<th>Инфраструктура</th>
</tr>
</thead>
<tbody>
<tr>
<td>

![React](https://img.shields.io/badge/-React_19-61DAFB?logo=react&logoColor=black&style=flat-square)  
![React Router](https://img.shields.io/badge/-React_Router_6-CA4245?logo=reactrouter&logoColor=white&style=flat-square)  
![Framer Motion](https://img.shields.io/badge/-Framer_Motion-0055FF?logo=framer&logoColor=white&style=flat-square)  
![Axios](https://img.shields.io/badge/-Axios-5A29E4?logo=axios&logoColor=white&style=flat-square)  
![Vite](https://img.shields.io/badge/-Vite-646CFF?logo=vite&logoColor=white&style=flat-square)

</td>
<td>

![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=nodedotjs&logoColor=white&style=flat-square)  
![Express](https://img.shields.io/badge/-Express-000000?logo=express&logoColor=white&style=flat-square)  
![MongoDB](https://img.shields.io/badge/-MongoDB-47A248?logo=mongodb&logoColor=white&style=flat-square)  
![Mongoose](https://img.shields.io/badge/-Mongoose-880000?style=flat-square)  
![JWT](https://img.shields.io/badge/-JWT_Auth-000000?logo=jsonwebtokens&logoColor=white&style=flat-square)

</td>
<td>

![Stripe](https://img.shields.io/badge/-Stripe-008CDD?logo=stripe&logoColor=white&style=flat-square)  
![Helmet](https://img.shields.io/badge/-Helmet.js-informational?style=flat-square)  
![Rate Limiting](https://img.shields.io/badge/-Rate_Limiting-FF6B6B?style=flat-square)  
![Claude API](https://img.shields.io/badge/-Claude_Sonnet_API-D97757?logo=anthropic&logoColor=white&style=flat-square)  
![PWA](https://img.shields.io/badge/-PWA-5A0FC8?logo=pwa&logoColor=white&style=flat-square)

</td>
</tr>
</tbody>
</table>

---

## 🏗 Архитектура

```
damed-health/
├── client/                  # React-приложение (Vite)
│   ├── public/
│   │   └── icons/           # PWA иконки
│   ├── src/
│   │   ├── assets/
│   │   ├── components/      # Переиспользуемые компоненты
│   │   ├── pages/           # Страницы (маршруты)
│   │   ├── hooks/           # Кастомные хуки
│   │   ├── store/           # Глобальное состояние
│   │   ├── services/        # API-слой (Axios)
│   │   └── utils/
│   └── vite.config.js
│
├── server/                  # Express API
│   ├── controllers/
│   ├── models/              # Mongoose-схемы
│   ├── routes/
│   ├── middleware/          # Auth, rate limit, error handling
│   ├── services/            # Бизнес-логика
│   └── index.js
│
├── package.json             # Root — запуск обоих серверов
└── README.md
```

---

## 🚀 Быстрый старт

### Требования

- **Node.js** ≥ 18.x
- **MongoDB** (локально или [Atlas](https://mongodb.com/atlas))
- **npm** ≥ 9.x

### 1. Клонировать репозиторий

```bash
git clone https://github.com/your-username/damed-health.git
cd damed-health
```

### 2. Настроить переменные окружения

```bash
# Скопировать шаблон
cp server/.env.example server/.env
```

Заполни `server/.env`:

```env
# Сервер
PORT=5000
NODE_ENV=development

# База данных
MONGODB_URI=mongodb://localhost:27017/damed

# Аутентификация
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# Оплата
STRIPE_SECRET_KEY=sk_test_...

# AI-ассистент
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Установить зависимости и запустить

```bash
# Установить все зависимости одной командой
npm run install:all

# Запустить клиент и сервер одновременно
npm run dev
```

| Сервис | URL |
|---|---|
| 🌐 Frontend | http://localhost:5173 |
| ⚙️ Backend API | http://localhost:5000 |
| 📊 Admin Panel | http://localhost:5173/admin |

---

## 🔐 Безопасность

- **JWT Access + Refresh** токены — короткоживущий access, безопасное обновление через refresh
- **Helmet.js** — HTTP-заголовки безопасности
- **Rate Limiting** — защита от brute-force атак
- **Валидация входных данных** на уровне сервера
- **CORS** с белым списком доменов

---

## 📡 API Endpoints (кратко)

```
POST   /api/auth/register       # Регистрация
POST   /api/auth/login          # Вход
POST   /api/auth/refresh        # Обновление токена

GET    /api/doctors             # Список врачей
GET    /api/doctors/:id         # Профиль врача
GET    /api/doctors/:id/slots   # Свободные слоты

POST   /api/appointments        # Создать запись
GET    /api/appointments/me     # Мои записи
PATCH  /api/appointments/:id    # Обновить статус

POST   /api/ai/chat             # AI-ассистент
```

---

## 🗺 Roadmap

- [x] Каталог врачей с поиском и фильтрацией
- [x] Онлайн-запись с выбором слота
- [x] JWT-аутентификация (access + refresh)
- [x] AI-ассистент на Claude API
- [x] PWA-поддержка
- [ ] Реальная WebRTC видеоконсультация
- [ ] Push-уведомления (Web Push API)
- [ ] Интеграция с ЭЦП Казахстана
- [ ] Многоязычность (KZ / RU / EN)
- [ ] Мобильное приложение (React Native)

---

## 🤝 Вклад в проект

Любые улучшения приветствуются!

1. Форкни репозиторий
2. Создай ветку: `git checkout -b feat/amazing-feature`
3. Закоммить изменения: `git commit -m 'feat: add amazing feature'`
4. Запушить: `git push origin feat/amazing-feature`
5. Открыть Pull Request

---

## 📄 Лицензия

Распространяется под лицензией **MIT**. Подробнее: [LICENSE](LICENSE)


