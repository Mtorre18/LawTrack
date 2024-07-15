// models/Bill.js

const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    congress: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    number: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    updateDate: {
        type: Date,
        required: true
    },
    summary: {
        type: String,
        required: false
    },
    subjects: {
        type: [String],
        required: false
    }
}, {
    timestamps: true // Automatically creates `createdAt` and `updatedAt` fields
});

const Bill = mongoose.model('Bill', billSchema);

module.exports = Bill;
