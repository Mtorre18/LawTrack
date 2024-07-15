document.addEventListener('DOMContentLoaded', function() {

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    const toDate = new Date();

    let offset = 0;
    const limit = 5;

    function formatDate(date) {
        return date.toISOString();
    }
    async function fetchBills() {
        const response = await fetch(`/api/bills?fromDateTime=${formatDate(fromDate)}&toDateTime=${formatDate(toDate)}&limit=${limit}&offset=${offset}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
    

        const billsContainer = document.getElementById('bills-list');
        for (const bill of data.summaries) {

            const summary = await summarizeBill(bill.text);
            const billElement = document.createElement('div');
            billElement.classList.add('bill-item');
            const buttonId = `view-details-${bill.bill.number}`;
            const cosponsorContainerId = `cosponsors-${bill.bill.number}`;
            

            billElement.innerHTML = `
                <h2>${bill.bill.title}</h2>
                <p>Introduced Date: ${bill.actionDate}</p>
                <p>${summary}</p>
                <button id="${buttonId}" class="view-details-button">View Sponsors</button>
                <div id="${cosponsorContainerId}" class="cosponsor-container"></div>
            `;
            billsContainer.appendChild(billElement);

            const buttonElement = document.getElementById(buttonId);
            buttonElement.addEventListener('click', function() {
                if (buttonElement.classList.contains('active')) {
                    document.getElementById(cosponsorContainerId).innerHTML = '';
                    buttonElement.classList.remove('active');
                    buttonElement.textContent = 'View Sponsors';
                } else {
                    showBillDetails(bill.bill.congress, bill.bill.type, bill.bill.number);
                    buttonElement.classList.add('active');
                    buttonElement.textContent = 'Hide Sponsors';
                }
            });

        }

        offset+=limit;
    }


    async function showBillDetails(congress, billType, billNumber) {
        try {
            const response = await fetch(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/cosponsors`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
  
            displayBillDetails(data.cosponsors,billNumber);
        } catch (error) {
            console.error('Error fetching bill details:', error);
        }

        
    }
    
    
    
    
    async function displayBillDetails(cosponsors,billNumber) {
        const detailsContainer = document.getElementById(`cosponsors-${billNumber}`);
        detailsContainer.innerHTML = '';
    
        for (const cosponsor of cosponsors) {
            try {
                const bioguideId = cosponsor.bioguideId; 
                const memberResponse = await fetch(`/api/member/${bioguideId}`);
                const responseText = await memberResponse.text(); // Get response text
    
                
                if (!memberResponse.ok) {
                    throw new Error('Network response was not ok');
                }
    
                const memberData = JSON.parse(responseText); // Parse the response text as JSON

                const detail = document.createElement('div');
                detail.className = 'cosponsor-detail';
                detail.innerHTML = `
                    <h3>${cosponsor.firstName} ${cosponsor.lastName} State:${cosponsor.state} Party: ${cosponsor.party} </h3>
                    <p>Sponsorship Date: ${cosponsor.sponsorshipDate}</p>
                    <img src="${memberData.member.depiction.imageUrl}" alt="${cosponsor.fullName}" class="cosponsor-image">
                `;
                detailsContainer.appendChild(detail);
            } catch (error) {
                console.error('Error fetching member details:', sanitizeHTML(error));
            }
        }
        detailsContainer.style.display = 'block';
    }

    async function summarizeBill(text) {
        const maxLength = 1024; // Set the maximum length to 1024 characters
        if (text.length > maxLength) {
            text = text.substring(0, maxLength); // Truncate text to the first 1024 characters
        }

        const response = await fetch('/api/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });
        const result = await response.json();
        return sanitizeHTML(result[0].summary_text);
    }

    function sanitizeHTML(html) {
        // Create a temporary DOM element
        const tempDiv = document.createElement('div');
        // Set the innerHTML to the provided HTML
        tempDiv.innerHTML = html;
    
        // Remove any script or unwanted tags if necessary
        const scripts = tempDiv.getElementsByTagName('script');
        for (let i = scripts.length - 1; i >= 0; i--) {
            scripts[i].parentNode.removeChild(scripts[i]);
        }
    
        // Optionally remove comments (if needed)
        const comments = tempDiv.innerHTML.match(/<!--[\s\S]*?-->/g);
        if (comments) {
            comments.forEach(comment => {
                tempDiv.innerHTML = tempDiv.innerHTML.replace(comment, '');
            });
        }
    
        // Return sanitized HTML
        return tempDiv.innerHTML;
    }

    document.getElementById('load-more').addEventListener('click', fetchBills);

    fetchBills();
});
