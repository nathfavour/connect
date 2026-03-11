import { Client, Account, TablesDB } from 'appwrite';

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1') // Assuming typical endpoint, or we can check
    .setProject('YOUR_PROJECT'); // Need actual project ID. Let me fetch it from env

const _account = new Account(client);
// Let's print the actual methods of tablesDB
const tablesDB = new TablesDB(client);
console.log("TablesDB methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(tablesDB)));
