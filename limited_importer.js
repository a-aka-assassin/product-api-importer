

const http = require('http');
const fs = require('fs');

//Create an associative array to change the fields
const fieldNames = {
  'GTIN': 'gtin',
  'ERP Item ID (SERVO)': 'client_identifier',
  'Information provider (Name - GLN).Name': 'name',
  'Information provider (Name - GLN).GLN': 'infromation_provider_gln',
  'PIM Group': 'category',
  'Structure assignments (M/S RH Category tree)': 'sub_category',
  'Brand name': 'brand_name',
  'External name (Swedish, SERVO)': 'external_name',
  'Functional name (Swedish)': 'functional_name',
  'Packaging marked label accreditation code': 'packaging_label',
  'Country of origin': 'country_of_origin',
  'Provenance statement (Swedish)': 'provenance_statement',
  'Raw material origin': 'raw_material_origin',
  'Packaging type code (Base Unit or Each, GTIN/ID(BASE))': 'packaging_type',
  'Packaging material type code(s)': 'packaging_material',
  'Packaging material composition quantity(s)': 'packaging_material_quantity',
  'Packaging material composition quantity UOM(s)': 'packaging_material_unit',
  'Ingredient statement (Swedish)': 'ingredients',
  'Descriptive size (Base Unit or Each, GTIN/ID(BASE), Swedish)': 'size', 
  'Percentage of alcohol by volume': 'alcohol_percentage',
  'Preparation state code': 'preparation_state',
  'Nutrient basis quantity': 'nutrient_basis_quantity',
  'Nutrient basis quantity UOM': 'nutrient_basis_unit',
  'Quantity contained - Energy kJ': 'quantity_enegry_kj',
  'Quantity contained - Energy kCal': 'quantity_energy_kcal',
  'Quantity contained - Fat': 'quantity_fat',
  'Quantity contained - Of which saturated fat': 'quantity_part_saturated_fat',
  'Quantity contained - Of which monounsaturated fat': 'quantity_part_monounsaturated_fat',
  'Quantity contained - Of which polyunsaturated fat': 'quantity_part_polyunsaturated_fat',
  'Quantity contained - Carbohydrate': 'quantity_carbohydrate',
  'Quantity contained - Of which sugars': 'quantity_part_sugars',
  'Quantity contained - Of which polyols': 'quantity_part_polyols',
  'Quantity contained - Of which starch': 'quantity_part_starch',
  'Quantity contained - Fibre': 'quantity_fibre',
  'Quantity contained - Protein': 'quantity_protein',
  'Quantity contained - Salt equivalent': 'quantity_salt',
  'Preparation state code_1': 'secondary_preparation_state',
  'Nutrient basis quantity_2': 'secondary_nutrient_basis_quantity',
  'Nutrient basis quantity UOM_3': 'secondary_nutrient_basis_unit',
  'Quantity contained - Energy kJ_4': 'secondary_quantity_energy_kj',
  'Quantity contained - Energy kCal_5':'secondary_quantity_energy_kcal',
  'Quantity contained - Fat_6': 'secondary_quantity_fat',
  'Quantity contained - Of which saturated fat_7': 'secondary_quantity_part_saturated_fat',
  'Quantity contained - Of which monounsaturated fat_8': 'secondary_quantity_part_monounsaturated_fat',
  'Quantity contained - Of which polyunsaturated fat_9': 'secondary_quantity_part_polyunsaturated_fat',
  'Quantity contained - Carbohydrate_10': 'secondary_quantity_carbohydrate',
  'Quantity contained - Of which sugars_11': 'secondary_quantity_part_sugars',
  'Quantity contained - Of which polyols_12': 'secondary_quantity_part_polyols',
  'Quantity contained - Of which starch_13': 'secondary_quantity_part_starch',
  'Quantity contained - Fibre_14': 'secondary_quantity_fibre',
  'Quantity contained - Protein_15': 'secondary_quantity_protein',
  'Quantity contained - Salt equivalent_16': 'secondary_quantity_salt',
  'Trade item marketing message': 'marketing_message',
  'Link to the product image - Original': 'image_original',
  'Link to the product image - DV02': 'image_hi_res',
  'Link to the product image - DV01': 'image_low_res'
};


// Read the TSV file
const fileContent = fs.readFileSync('mstab.tsv', 'utf-8');

// Split the file content into lines
const lines = fileContent.trim().split('\n');

// Extract the column names
const keys = lines.shift().split('\t');

const tsvData = lines.map(line => {
  const values = line.split('\t');
  const row = {};

  // Combine keys with values
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = values[i];

    // Check if the key exists in the fieldNames array
    if (fieldNames.hasOwnProperty(key)) {
      // Update the key text with the value from fieldNames
      row[fieldNames[key]] = value;
    } else {
      // Use the original key
      row[key] = value;
    }
  }

  
  return row;
});

// Print the extracted data
console.log(tsvData);


//This is an array for rejected products
let rejectedProducts = [];

//This is an array for accepted products
let processedProducts = [];

//Count the total products
let totalProducts = 0;

//count the number of products which are saved
let savedProducts = 0;

//count the number of products which are not saved
let refusedProducts = 0;


//This function sends the requests to api to save it in mongo db
async function sendRequests() {
  for (const row of tsvData) {

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
                processedProducts.push(row);
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

    //if total products reach 25 then stop the loop
    if(totalProducts === 25){ break; }
  }

  console.log('Total Products: ', totalProducts);
console.log('Saved Products: ', savedProducts);
console.log('Refused Products: ', refusedProducts);
console.log('Script Completed');

const { writeFileSync } = require('fs');

const headers = Object.keys(rejectedProducts[0]);

// Convert `rejectedProducts` to a TSV string
const tsv = [
  headers.join('\t'),
  ...rejectedProducts.map(obj => headers.map(key => obj[key]).join('\t'))
].join('\n');

const processedHeaders = Object.keys(processedProducts[0]);

// Convert `Accepted Products` to a TSV string
const psv = [
    processedHeaders.join('\t'),
  ...processedProducts.map(obj => headers.map(key => obj[key]).join('\t'))
].join('\n');

// Write the TSV string to a file
writeFileSync('rejected_products.tsv', tsv);

console.log('TSV file For Rejected Products created and saved successfully.');

// Write the TSV string to a file
writeFileSync('processed_products.tsv', psv);

console.log('TSV file For Processed Products created and saved successfully.');
}

sendRequests();