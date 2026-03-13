import express from "express"
import { createClient } from "@libsql/client"
import cors from "cors"

const PORT = 3000;
const db = createClient({
	url: `http://127.0.0.1:8080`
});

const app = express();
app.use(cors())
app.use(express.json());

app.post('/api', async (req, res) => {
	try {
		const data = req.body;
		console.dir('request received',JSON.stringify(data))

		var query = data.data;
		console.log('data:',query.sql,query.args);
		const result = await db.execute({sql: query.sql, args: query.args});
		// SCHEMA QUERY: // select name from sqlite_master where type='table'
		res.json(result.rows);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
})

app.listen(PORT, () => {
	console.log(`server running on port ${PORT}`);
});


// import dotenv from "dotenv"
// dotenv.config();
//	authToken: NoYet
