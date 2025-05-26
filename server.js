const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const connectDB = require('./db');
const User = require('./models/User');
const Article = require('./models/Article');
const Comment = require('./models/Comment');
const Request = require('./models/Request');
const GalleryImage = require('./models/GalleryImage');
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'alaxnotcool'; 
const upload = multer({ dest: 'upload/' });
// Подключение к БД
connectDB();

// ==============================================
// Middleware
// ==============================================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://patriot-site.onrender.com');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});
// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));
app.use('/upload', express.static(path.join(__dirname, 'upload')));
// Логирование запросов
app.use((req, res, next) => {
  console.log(`Запрос: ${req.method} ${req.url}`);
  next();
});
// ==============================================
// Вспомогательные функции
// ==============================================
const authenticateJWT = (req, res, next) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Токен отсутствует' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      res.clearCookie('token');
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    req.user = decoded;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.status === 'admin') return next();
  res.status(403).json({ error: 'Доступ запрещен' });
};

const isWriter = (req, res, next) => {
  if (['writer', 'admin'].includes(req.user.status)) return next();
  res.status(403).json({ error: 'Доступ запрещен' });
};
// ==============================================
// Маршруты
// ==============================================

// ---------------------------
// Статьи
// ---------------------------
app.get('/api/articles', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  try {
    const articles = await Article.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', 'username');
    
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки статей' });
  }
});

app.post('/api/articles', authenticateJWT, isWriter, upload.single('image'), async (req, res) => {
  try {
    const { title, summary, content } = req.body;
    const newArticle = new Article({
      title,
      summary,
      content,
      image: req.file ? `/upload/${req.file.filename}` : '/images/default-article-image.jpg',
      author: req.user.id
    });
    
    await newArticle.save();
    await User.findByIdAndUpdate(req.user.id, { $inc: { articlesCount: 1 } });
    res.status(201).json(newArticle);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка создания статьи: ' + err.message });
  }
});
app.get('/api/articles/count', async (req, res) => {
    console.log('Запрос /api/articles/count получен');
    try {
        const count = await Article.countDocuments();
        res.json(count); // Отправляем только число
    } catch(err) {
        console.error('Ошибка в /api/articles/count:', err);
        res.status(500).json({ error: 'Ошибка подсчета статей' });
    }
});
app.get('/api/articles/search', async (req, res) => {
  try {
    const searchTerm = req.query.q;
    const articles = await Article.find({
      title: { $regex: searchTerm, $options: 'i' }
    }).limit(5);
    
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка поиска' });
  }
});
app.get('/api/articles/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Неверный формат ID' });
        }
        
        const article = await Article.findById(req.params.id)
            .populate('author', 'username avatar')
            .populate({
                path: 'comments',
                populate: { path: 'author', select: 'username' }
            });

        if (!article) {
            return res.status(404).json({ error: 'Статья не найдена' });
        }

        const responseArticle = article.toObject();

        res.json(responseArticle);
    } catch (err) {
        console.error('Ошибка получения статьи:', err);
        
        if (err instanceof mongoose.Error.CastError) {
            return res.status(400).json({ error: 'Неверный формат ID статьи' });
        }
        
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});
// Удаление статьи
app.delete('/api/articles/:id', authenticateJWT, isAdmin, async (req, res) => {
    try {
        // Удаляем статью и связанные комментарии
        await Article.findByIdAndDelete(req.params.id);
        await Comment.deleteMany({ article: req.params.id });
        res.json({ message: 'Статья и комментарии удалены' });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка удаления статьи' });
    }
});


// ---------------------------
// Комментарии
// ---------------------------
app.post('/api/comments', authenticateJWT, async (req, res) => {
  try {
    const { text, articleId } = req.body;
    const newComment = new Comment({
      text,
      article: articleId,
      author: req.user.id
    });

    await newComment.save();
    await User.findByIdAndUpdate(req.user.id, { $inc: { commentsCount: 1 } });
    res.status(201).json(newComment);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка добавления комментария' });
  }
});
app.get('/api/comments', async (req, res) => {
    try {
        const comments = await Comment.find({ article: req.query.articleId })
            .populate('author', 'username avatar') 
            .populate('deletedBy', 'username');
        res.json(comments);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка загрузки комментариев' });
    }
});
// Удаление комментария
app.delete('/api/comments/:id', authenticateJWT, isAdmin, async (req, res) => {
    try {
        const comment = await Comment.findByIdAndUpdate(
            req.params.id,
            { deleted: true, deletedBy: req.user.id },
            { new: true }
        );
        res.json({ message: 'Комментарий помечен как удаленный' });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка удаления комментария' });
    }
});
// ---------------------------
// Пользователи
// ---------------------------
app.get('/api/user', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .lean();

    if (!user) {
      res.clearCookie('token');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      ...user,
      birthdate: user.birthdate?.toISOString().split('T')[0],
      registrationDate: user.registrationDate?.toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
app.put('/api/user', authenticateJWT, upload.single('avatar'), async (req, res) => {
    try {
        const updates = {}; // Создаем пустой объект

        // Добавляем только переданные поля
        if (req.body.username !== undefined) {
            updates.username = req.body.username;
        }
        if (req.body.bio !== undefined) {
            updates.bio = req.body.bio;
        }
        if (req.file) {
            updates.avatar = `/upload/${req.file.filename}`;
        }

        // Если updates пуст, возвращаем ошибку
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        res.json(updatedUser);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'Это имя пользователя уже занято' });
        }
        res.status(500).json({ error: 'Ошибка обновления профиля' });
    }
});
// Маршрут для получения запросов (для админов)
app.get('/api/requests', authenticateJWT, isAdmin, async (req, res) => {
    try {
        const requests = await Request.find({ status: 'pending' })
            .populate('user', 'username');
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка загрузки запросов' });
    }
});
// Маршрут для создания запроса
app.post('/api/requests', authenticateJWT, async (req, res) => {
    try {
        const existingRequest = await Request.findOne({ user: req.user.id });
        if (existingRequest) {
            return res.status(400).json({ error: 'Запрос уже отправлен' });
        }
        
        const newRequest = new Request({ user: req.user.id });
        await newRequest.save();
        res.status(201).json(newRequest);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка создания запроса' });
    }
});

// Маршрут для обработки запроса
app.put('/api/requests/:id', authenticateJWT, isAdmin, async (req, res) => {
    try {
        const request = await Request.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );

        if (req.body.status === 'approved') {
            await User.findByIdAndUpdate(
                request.user,
                { status: 'writer' }
            );
        }

        res.json({ message: 'Статус запроса обновлен' });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка обновления запроса' });
    }
});
app.post('/api/gallery', authenticateJWT, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const newImage = new GalleryImage({
      imagePath: `/upload/${req.file.filename}`,
      caption: req.body.caption,
      uploadedBy: req.user.id
    });
    await newImage.save();
    res.status(201).json(newImage);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки изображения' });
  }
});

app.get('/api/gallery', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    
    const total = await GalleryImage.countDocuments();
    const images = await GalleryImage.find()
      .sort({ uploadDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('uploadedBy', 'username');

    res.json({
      images,
      total
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки галереи' });
  }
});
app.get('/api/gallery/search', async (req, res) => {
  try {
    const searchTerm = req.query.q;
    const images = await GalleryImage.find({
      caption: { $regex: searchTerm, $options: 'i' }
    }).limit(5);
    
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка поиска' });
  }
});
app.delete('/api/gallery/:id', authenticateJWT, isAdmin, async (req, res) => {
    try {
        await GalleryImage.findByIdAndDelete(req.params.id);
        res.json({ message: 'Изображение удалено' });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка удаления изображения' });
    }
});

// Главная страница - /
app.get('/main', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'main.html'));
});
app.get('/', (req, res) => {
  res.redirect('/main');
});

// Страница профиля
app.get('/profile', authenticateJWT, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});
// Авторизация
app.post('/login', async (req, res) => {
    try {
        const { email, pass } = req.body;
        console.log('Попытка входа для email:', email);
        const user = await User.findOne({ email });
        if (!user) {
            console.log('Пользователь не найден');
            return res.status(401).send('Неверные данные');
        }
        const isPasswordValid = await bcrypt.compare(pass, user.password);
        if (!isPasswordValid) {
            console.log('Неверный пароль для пользователя:', user.email);
            return res.status(401).send('Неверные данные');
        }
        if (!user || !(await bcrypt.compare(pass, user.password))) {
            return res.status(401).send('Неверные данные');
        }

        // Генерация JWT
        const token = jwt.sign({ 
            id: user._id.toString(),
            status: user.status // Добавляем статус в токен
        }, JWT_SECRET, { expiresIn: '1h' });
        res.cookie('token', token, {
          httpOnly: true,
          maxAge: 3600000,
          sameSite: 'none', // Обязательно для кросс-доменных запросов
          secure: true,     // Render использует HTTPS
          domain: 'patriot-site.onrender.com' // Замените на ваш домен
        });
        res.redirect('/profile');
    } catch (err) {
        res.status(500).send('Ошибка сервера');
    }
});
// Выход
app.get('/logout', (req, res) => {
    res.clearCookie('token', {
        domain: 'patriot-site.onrender.com', 
        secure: true,    // Для HTTPS
        sameSite: 'none' // Для кросс-доменных запросов
    });
    res.redirect('/');
});
// Регистрация
app.post('/registration', upload.single('avatar'), async (req, res) => {
    try {
        const { username, email, pass, day, month, year, pol, bio } = req.body;
        
        // Хеширование пароля (убедитесь, что в модели User есть pre-save хук!)
        const hashedPass = await bcrypt.hash(pass, 10);
        
        const user = new User({
            username,
            email,
            password: hashedPass,
            gender: pol,
            birthdate: new Date(Date.UTC(year, month - 1, day)),
            avatar: req.file ? `/upload/${req.file.filename}` : null,
            bio
        });

        await user.save();
        
        // Генерация JWT
        const token = jwt.sign({ 
            id: user._id.toString(),
            status: user.status // Добавляем статус в токен
        }, JWT_SECRET, { expiresIn: '1h' });
        
        // Установка токена в cookie
        res.cookie('token', token, {
          httpOnly: true,
          maxAge: 3600000,
          sameSite: 'none', // Обязательно для кросс-доменных запросов
          secure: true,     // Render использует HTTPS
          domain: 'patriot-site.onrender.com' // Замените на ваш домен
        });
        
        res.redirect('/profile');
    } catch (err) {
        res.status(500).send('Ошибка: ' + err.message);
    }
});

app.get('/registration', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'registration.html'));
});
// Страница статей
app.get('/articles', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'articles.html'));
});
app.get('/article', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'article.html'));
});
app.get('/article.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'article.html'));
});
// Страница "О сайте"
app.get('/aboutsite', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'aboutsite.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Галерея сайта
app.get('/sitegallery', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'sitegallery.html'));
});
app.get('/newimage', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'newimage.html'));
});
// Страница писателя
app.get('/writer', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'writer.html'));
});
// Обработка 404 ошибки - страница не найдена
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

app.options('/*', (req, res) => { // Добавлен слэш
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.send();
});
// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
