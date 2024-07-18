require('dotenv').config();
//console.log(process.env); // Log all environment variables to check
const mongoose = require('mongoose');
const axios = require('axios');
const Bill = require('../models/Bill'); 
const dbURI=process.env.MONGO_URI;
const hf_API_KEY = process.env.hf_API_KEY;
const c_API_KEY = process.env.c_API_KEY;

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

async function fetchAndUpdateBills() {
    try {

    
        //const lastUpdate = await Bill.findOne().sort({ updateDate: -1 }).select('updateDate');
        //const fromDate = lastUpdate ? new Date(lastUpdate.updateDate).toISOString() : new Date(0).toISOString();
        const toDate = new Date();
        toDate.setDate(toDate.getDate() - 1);
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 7);

        const response = await axios.get(`https://api.congress.gov/v3/summaries?fromDateTime=${formatDate(fromDate)}&toDateTime=${formatDate(toDate)}&api_key=${process.env.c_API_KEY}`);
        const data = response.data;

        for (let bill of data.summaries) {
            //console.log(bill);
            //console.log(`https://api.congress.gov/v3/bill/${bill.bill.congress}/${bill.bill.type.toLowerCase()}/${bill.bill.number}/subjects?api_key=${process.env.c_API_KEY}`);
            const subjectsResponse = await axios.get(`https://api.congress.gov/v3/bill/${bill.bill.congress}/${bill.bill.type.toLowerCase()}/${bill.bill.number}/subjects?api_key=${process.env.c_API_KEY}`);
            const subjects = subjectsResponse.data.subjects.legislativeSubjects.map(subject => subject.name);

            const sum_response = await axios.post('https://api-inference.huggingface.co/models/mrm8488/bert-small2bert-small-finetuned-cnn_daily_mail-summarization',
                { inputs: bill.text },{ headers: { Authorization: `Bearer ${hf_API_KEY}` },});

            const summary=sum_response.data[0].summary_text;

            await Bill.updateOne(
                { number: bill.bill.number},
                {
                    title: bill.bill.title,
                    congress:bill.bill.congress,
                    type:bill.bill.type,
                    updateDate: new Date(bill.updateDate),
                    summary: summary,
                    subjects
                },
                { upsert: true }
            );
        }

        console.log('Bills and subjects updated in the database');
    } catch (error) {
        console.error('Error fetching or updating bills:', error);
    }
}
function formatDate(date) {
    return date.toISOString().split('.')[0] + 'Z';
}

// Schedule the job to run daily at midnight
//cron.schedule('0 0 * * *', fetchAndUpdateBills);

// Start the job immediately on server start
fetchAndUpdateBills();
