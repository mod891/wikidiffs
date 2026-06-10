import express from "express"
import { createClient } from "@libsql/client"
import cors from "cors"

const PORT = 3000;
const db = createClient({
	url: `http://127.0.0.1:8080`
});
/* Mock for turso dev --db-file file.sqlite */ 
const app = express();
app.use(cors())
app.use(express.json());

app.post('/api', async (req, res) => {
	try {
//	************************ UNTURSONIZE REQUEST ***************************
		var args = [];
		var sql = req.body.data.requests[0].stmt.sql;
		if (req.body.data.requests[0].stmt.hasOwnProperty('args'))
			args = [req.body.data.requests[0].stmt.args[0].value]; 
//	************************************************************************
	
		const result = await db.execute({sql: sql, args: args});
		console.log('\nrequest received',sql,args)
		
//	************************ TURSONIZE RESPONSE ***************************
		var keys = [];
		var tursoObj = {
		    baton:null,
    		base_url:null,
			results: [
				{
					cols: [],
					rows: [],
					affected_row_count:0,
                    last_insert_rowid:null,
                    replication_index:null,
                    rows_read:null,
                    rows_written:null,
                    query_duration_ms:null
				},
				{
					type:"ok",
		        	response: {
		            	type: "close"
		       		}
				}
			]	
		}
		if (result.rows.length > 0) {
			keys = Object.keys(result.rows[0]);
			for (let i=0; i<keys.length; i++) 
				tursoObj.results[0].cols.push({ name:keys[i], decltype:'TEXT'} )	
			for (let i=0; i<result.rows.length; i++) {
				let values = Object.values(result.rows[i]);
				let w = [];
				for (let j=0; j<values.length; j++) {
					w.push({type:'text',value:values[j]});
				}
				tursoObj.results[0].rows.push(w);
			}
		}
//	************************************************************************
		res.json(tursoObj);
		
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
})

app.listen(PORT, () => {
	console.log(`server running on port ${PORT}`);
});