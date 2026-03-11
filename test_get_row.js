import { Client, TablesDB } from 'appwrite';
const client = new Client().setEndpoint('https://fra.cloud.appwrite.io/v1').setProject('67fe9627001d97e37ef3');
const tablesDB = new TablesDB(client);

async function run() {
    try {
        console.log("Testing TablesDB.listRows...");
        const res = await tablesDB.listRows('chat', 'users', []);
        console.log("Success! Found:", res.total);
        if (res.total > 0) {
            console.log("Testing getRow with id:", res.rows[0].$id);
            const row = await tablesDB.getRow('chat', 'users', res.rows[0].$id);
            console.log("Get Row Success!", row.$id);
        }
    } catch(e) {
        console.log("Error:", e.message);
    }
}
run();
