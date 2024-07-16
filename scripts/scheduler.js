require('dotenv').config();
//console.log(process.env); // Log all environment variables to check
const mongoose = require('mongoose');
const axios = require('axios');
const Bill = require('../models/Bill'); 
const dbURI=process.env.MONGO_URI;

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

        const response = await axios.get(`https://api.congress.gov/v3/bill?fromDateTime=${formatDate(fromDate)}&toDateTime=${formatDate(toDate)}&api_key=${process.env.c_API_KEY}`);
        const data = response.data;

        for (let bill of data.bills) {
            const subjectsResponse = await axios.get(`https://api.congress.gov/v3/bill/${bill.congress}/${bill.type.toLowerCase()}/${bill.number}/subjects?api_key=${process.env.c_API_KEY}`);
            const subjects = subjectsResponse.data.subjects.legislativeSubjects.map(subject => subject.name);

            await Bill.updateOne(
                { number: bill.number},
                {
                    title: bill.title,
                    congress:bill.congress,
                    updateDate: new Date(bill.updateDate),
                    summary: bill.summary,
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
