const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female'] },
    birthdate: { type: Date },
    avatar: { type: String },
    bio: { type: String },
    registrationDate: { type: Date, default: Date.now },
    articlesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    status: { 
        type: String, 
        enum: ['user', 'writer', 'admin'], 
        default: 'user' 
    }
});

// Хеширование пароля перед сохранением
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});
userSchema.pre('save', function(next) {
    if (this.isModified('comments')) { // Если изменяются комментарии
        this.commentsCount = this.comments.length;
    }
    next();
});
userSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'writer') {
        this.articlesCount = 0; // Инициализация счетчика
    }
    next();
});
userSchema.pre('save', function(next) {
    if (this.isModified('articles')) { // Если у вас есть поле со статьями
        this.articlesCount = this.articles.length;
    }
    next();
});

module.exports = mongoose.model('User', userSchema);
