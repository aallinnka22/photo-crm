Що це:
- Готовий "MVP" для твого дизайну сайту фотографа (статичний фронт) + Node/Express/Mongo бекенд:
  1) Онлайн-запис (бронювання) -> запис у MongoDB + перевірка зайнятого слота
  2) Приватна галерея (slug + код доступу) -> перегляд фото + вибір на ретуш
  3) Чат-віджет (поки демо відповіді; під OpenAI підключиш пізніше)

Як запустити:
1) Встанови MongoDB (локально або Atlas) і отримай MONGO_URI
2) В папці server:
   - npm i
   - створи файл .env (приклад нижче)
   - npm run dev
3) Вкажи куди сервер має віддавати статичний сайт:
   - за замовчуванням сервер віддає папку ../site (вже включено у цей пакет)
   - відкрий: http://localhost:5000

.env приклад:
MONGO_URI=mongodb://127.0.0.1:27017/photo_site
JWT_SECRET=дууууже_довгий_секрет
ADMIN_KEY=твій_адмін_ключ

Адмін ендпоінти (через Postman/Insomnia):
- створити галерею:
  POST http://localhost:5000/api/admin/galleries
  Header: X-ADMIN-KEY: <ADMIN_KEY>
  Body: {"title":"Anna session","clientName":"Anna","clientContact":"+380..."}
  -> поверне slug і accessCode

- додати фото в галерею (тимчасово URL, щоб швидко запрацювало):
  POST http://localhost:5000/api/admin/galleries/<galleryId>/photos
  Header: X-ADMIN-KEY: <ADMIN_KEY>
  Body: {"photos":[{"url":"https://.../1.jpg","filename":"1.jpg","order":1}]}

- створити галерею з бронювання:
  POST http://localhost:5000/api/admin/bookings/<bookingId>/create-gallery
  Header: X-ADMIN-KEY: <ADMIN_KEY>

Клієнту:
- Онлайн-запис працює в секції "Онлайн-запис" (кнопка "Підтвердити бронювання").
- Галерея: в секції "Кабінет клієнта" вводить Slug + Код доступу, далі вибирає фото і надсилає вибір.

Що лишилось на потім (але вже просто):
- upload фото в Cloudinary/S3 замість ручних URL
- реальний OpenAI чат у /api/chat (без ключа у фронті)
- адмін-сторінка (UI) замість Postman
