const mongoose = require('mongoose');

module.exports = async () => {
    try {
        await mongoose.connect('mongodb+srv://patriot:eQNylqvl8qnrgIa3@patriotcluster.ook86v7.mongodb.net/patriot-site?retryWrites=true&w=majority');
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Database connection error:', err);
    }
};