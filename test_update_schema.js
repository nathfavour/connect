import { Client, TablesDB, Databases, ID } from 'appwrite';
const client = new Client().setEndpoint('https://fra.cloud.appwrite.io/v1').setProject('67fe9627001d97e37ef3');
const tablesDB = new TablesDB(client);
const _db = new Databases(client);

async function run() {
    try {
        console.log("Creating document...");
        const res = await tablesDB.createRow('chat', 'users', ID.unique(), {
            userId: 'test_user_' + Date.now(),
            username: 'test_user_' + Date.now(),
            displayName: 'Test User',
            bio: '',
            appsActive: ['connect']
        });
        console.log("Success:", res);
    } catch(e) {
        console.log("Error:", e.message);
    }
}
run();
