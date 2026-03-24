
const local = {
    endpoint: 'http://127.0.0.1:3000/api',
    token: null
}
// definir un orden de importancia para el front, ej: articulos con + ediciones
// letras paginacion offset

async function query(option,...args) {
    var limit = 10; 
    var stmt = {};
    if (args.length == 2)
        limit = args[1]

    switch (option) {
        case 'urlsStartsWith':
            stmt = urlsStartsWith(args[0],limit);   
        break;
        case 'diffsFromUrl':
            stmt = diffsFromUrl(args[0],limit);
        break;
        case 'anexo':
            stmt = anexoUrls(limit);
        break;
        case 'randUrl':
            stmt = randUrl();
        break;   
        default:
            console.log('hoigan no furula',option)
    }
    var request = await fetch(`http://127.0.0.1:3000/api`,{
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({data:stmt})
    })
    if (request.ok) {
        data = await request.json()
        return data;
    }
}
function diffsFromUrl(url, limit=0) {
    sql = `select 
        json_extract(hc.obj, '$.article_url') as articleUrl,
        json_extract(hc.obj, '$.diff_url') as diffUrl,
        json_extract(hc.obj,'$.date_edition') || ' ' || json_extract(hc.obj,'$.time_edition') as datetime,
        json_extract(hc.obj,'$.user') as user,
        json_extract(df.obj, '$.changes') as changes
        from diffs df join history_contribs hc 
        on df.id = hc.id
        where articleUrl=?`
    if (limit != 0 ) 
        sql += `limit ${limit}`
    return { sql:sql, args:[url] };
}
function urlsStartsWith(char, limit=0) {
    sql = `select distinct json_extract(hc.obj, '$.article_url') as articleUrl,
        '[' || group_concat('"' || json_extract(hc.obj, '$.date_edition') || '"' ) || ']' as dates
        from history_contribs hc 
        where articleUrl like ? and articleUrl not like '%wiki/Anexo:%'
        group by json_extract(hc.obj, '$.article_url')`
    if (limit != 0 ) 
        sql += `limit ${limit}`   
    return { sql:sql, args:[`%wiki/${char}%`] };
}
function anexoUrls(limit=0) {
    sql = `select distinct json_extract(hc.obj, '$.article_url') as articleUrl
        from history_contribs hc 
        where articleUrl like '%wiki/Anexo:%'`
    if (limit != 0 ) 
        sql += `limit ${limit}`   
    return { sql:sql, args:[] };
}
function urlsByCategory(category, limit=0) {
    sql = `select distinct json_extract(hc.obj, '$.article_url') as articleUrl
        from history_contribs hc 
        where articleUrl     
        where articleUrl in (category)`
    return { sql:sql, args:[] };
}
function randUrl() {
    sql = `select json_extract(obj, '$.article_url') as articleUrl
        from history_contribs limit 1 offset (select abs(random()) % count(*) from diffs)`
    return { sql:sql, args:[] };
}
