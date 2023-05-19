

const http = require('http');
const fs = require('fs');

// Read the CSV file
const fileContent = fs.readFileSync('msdemo.csv', 'utf-8');

// Split the file content into lines
const lines = fileContent.trim().split('\n');

// Extract the column names
const keys2 = lines.shift().split(',');

// Process each row
const csv2 = lines.map(line => {
  const values = line.split(',');
  const row = {};

  // Combine keys with values
  for (let i = 0; i < keys2.length; i++) {
    row[keys2[i]] = values[i];
  }

  return row;
});

//This is an array for rejected products
let rejectedProducts = [];

//Count the total products
let totalProducts = 0;

//count the number of products which are saved
let savedProducts = 0;

//count the number of products which are not saved
let refusedProducts = 0;


//This function sends the requests to api to save it in mongo db
async function sendRequests() {
  for (const row of csv2) {

    totalProducts++;
    const arrayData = row; // Your array data here
    const postData = JSON.stringify(arrayData);

    const options = {
      hostname: '127.0.0.1',
      port: 8000,
      path: '/v3/addproducts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    try {
      const parsedData = await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let responseData = '';

          res.on('data', (chunk) => {
            responseData += chunk;
          });

          res.on('end', () => {
            const parsedData = JSON.parse(responseData);

            //check if the products are refused. Better to do it with code instead of message.
            const message = parsedData.message;
            if (message === 'Error saving product.') {
              rejectedProducts.push(row);
              refusedProducts++;
            }else{
                savedProducts++;
            }
            console.log(parsedData);
            resolve(parsedData);
          });
        });

        req.on('error', (error) => {
          console.error('Error:', error);
          reject(error);
        });

        req.write(postData);
        req.end();
      });

    } catch (error) {
      console.error('An error occurred:', error);
    }
  }
  console.log('Total Products: ', totalProducts)
  console.log('Saved Products: ', savedProducts)
  console.log('Refused Products: ', refusedProducts)
  console.log('Script Completed');

  const { writeFileSync } = require('fs');

  const headers = Object.keys(rejectedProducts[0]);

  // Convert `rejectedProducts` to a CSV string
  const csv = [
    headers.join(','),
    ...rejectedProducts.map(obj => headers.map(key => obj[key]).join(','))
  ].join('\n');
  
  // Write the CSV string to a file
  writeFileSync('rejected_products.csv', csv);
  
  console.log('CSV file created and saved successfully.');
}

sendRequests();
