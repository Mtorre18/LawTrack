const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
require('dotenv').config();
const mongoose = require('mongoose');
const Bill = require('./models/Bill');
const PORT = process.env.PORT || 3000;
const hf_API_KEY = process.env.hf_API_KEY;
const c_API_KEY = process.env.c_API_KEY;
const dbURI=process.env.MONGO_URI;
// Middleware to handle JSON requests
app.use(express.json());

// Serve static files from the public directory
app.use(express.static('public'));

// Connect to DB
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Route to fetch bills from Congress.gov API
app.get('/api/bills', async (req, res) => {

    try {
        const sampleBill = await Bill.findOne({});
    console.log('Sample Bill:', sampleBill);
    
        const { fromDateTime, toDateTime, limit = 5, skip = 0 } = req.query;
   
        const bills = await Bill.find({
          /*updatedAt: {
            $gte: new Date(parseInt(fromDateTime)),
            $lte: new Date(parseInt(toDateTime))
          }*/
        }).limit(parseInt(limit)).skip(parseInt(skip));
    
        res.json(bills);
      } catch (error) {
        console.error('Error fetching bills:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
      }
});

// Route to summarize bill using Hugging Face API
app.post('/api/summarize', async (req, res) => {
    


    try {
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/mrm8488/bert-small2bert-small-finetuned-cnn_daily_mail-summarization',
            { inputs: req.body.text },
            {
                headers: { Authorization: `Bearer ${hf_API_KEY}` },
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error('Error summarizing:', error.response ? error.response.data : error.message);
        res.status(500).send('Server Error');
    }
});

app.get('/bill/:congress/:billType/:billNumber/cosponsors', async (req, res) => {
    const { congress, billType, billNumber } = req.params;
    try {
        const response = await axios.get(`https://api.congress.gov/v3/bill/${congress}/${billType}/${billNumber}/cosponsors?api_key=${c_API_KEY}`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching cosponsors:', error.response ? error.response.data : error.message);
        res.status(500).send('Server Error');
    }
});

app.get('/api/member/:bioguideId', async (req, res) => {
    const bioguideId = req.params.bioguideId;
    try {
        const response = await axios.get(`https://api.congress.gov/v3/member/${bioguideId}?api_key=${c_API_KEY}`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching member:', error.response ? error.response.data : error.message);
        res.status(500).send('Server Error');
    }
});


// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
