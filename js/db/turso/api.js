
const local = {
    endpoint: 'http://127.0.0.1:3000/api',
    token: null
}

async function query(option,...args) {
    var limit = 0; 
    var stmt = {};
    if (args.length == 2)
        limit = args[1]
    
    switch (option) {
        case 'diffsFromUrl':
            stmt = diffsFromUrl(args[0],limit);
        break;
        case 'diffsFromUser':
            stmt = diffsFromUser(args[0],limit);
        break;
        case 'diffsFromPreviousUser':
            stmt = diffsFromPreviousUser(args[0],limit);
        break;
        case 'urlsStartsWith':
            stmt = urlsStartsWith(args[0],limit);   
        break;
        case 'anexo':
            stmt = anexoUrls(limit);
        break;
        case 'discusion':
            stmt = discusionUrls(limit);
        break;
        case 'urlsByCategory':
            stmt = categoryUrls(args[0],limit);
        break;
        
        case 'randUrl':
            stmt = randUrl();
        break;
        case 'urlFromId':
            stmt = urlFromId(args[0]);
        break;
        case 'descriptionUrl': // pointer: loading -> hasta que response.text OK
            stmt = descriptionUrl(args[0]);
        break;
        case 'prevUsers':
            stmt = prevUsers();
        break;
        case 'categories':
            stmt = categorias();
        break;
        default:
            console.log('hoiga esto no furula',option)
    }
    var request = await fetch(local.endpoint,{
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
    sql = `select df.id as id,
        json_extract(hc.obj, '$.article_url') as articleUrl,
        json_extract(hc.obj, '$.diff_url') as diffUrl,
        json_extract(hc.obj,'$.date_edition') as date,
        json_extract(hc.obj,'$.time_edition') as time,
        json_extract(hc.obj,'$.user') as user,
        json_extract(df.obj, '$.prev_username') as prevUser,
        json_extract(df.obj, '$.changes') as changes
        from diffs df join history_contribs hc 
        on df.id = hc.id
        where articleUrl=?`
    if (limit != 0 ) 
        sql += `limit ${limit}`
    return { sql:sql, args:[url] };
}
function diffsFromUser(user, limit=0) {
    sql = `select df.id as id,
        json_extract(hc.obj, '$.article_url') as articleUrl,
        json_extract(hc.obj, '$.diff_url') as diffUrl,
        json_extract(hc.obj,'$.date_edition') as date,
        json_extract(hc.obj,'$.time_edition') as time,
        json_extract(hc.obj,'$.user') as user,
        json_extract(df.obj, '$.prev_username') as prevUser,
        json_extract(df.obj, '$.changes') as changes
        from diffs df join history_contribs hc 
        on df.id = hc.id
        where json_extract(hc.obj, '$.user')=? `;
    if (limit != 0 ) 
        sql += `limit ${limit}`
    return { sql:sql, args:[user] };
}
function diffsFromPreviousUser(prevUser, limit=0) {
    sql = `select df.id as id,
        json_extract(hc.obj, '$.article_url') as articleUrl,
        json_extract(hc.obj, '$.diff_url') as diffUrl,
        json_extract(hc.obj,'$.date_edition') as date,
        json_extract(hc.obj,'$.time_edition') as time,
        json_extract(hc.obj,'$.user') as user,
        json_extract(df.obj, '$.prev_username') as prevUser,
        json_extract(df.obj, '$.changes') as changes
        from diffs df join history_contribs hc 
        on df.id = hc.id
        where json_extract(df.obj, '$.prev_username')=? `;
    if (limit != 0 ) 
        sql += `limit ${limit}`
    return { sql:sql, args:[prevUser] };
}
function urlFromId(id) {
    sql = `select json_extract(hc.obj, '$.article_url') as articleUrl
        from history_contribs hc
        where hc.id = ? `;
    return { sql:sql, args:[id] };
}
function urlsStartsWith(char, limit=10) {
    sql = `select distinct json_extract(hc.obj, '$.article_url') as articleUrl,
        json_extract(hc.obj, '$.category') as category,
        '[' || group_concat('"' || json_extract(hc.obj, '$.date_edition') || '"' ) || ']' as dates,
        count(json_extract(hc.obj, '$.date_edition')) as nedits
        from history_contribs hc 
        where articleUrl like ? and articleUrl not like '%wiki/Anexo:%'
        group by articleUrl
    	order by nedits desc `;
    if (limit != 0 ) 
        sql += `limit ${limit}`   
    return { sql:sql, args:[`%wiki/${char}%`] };
}
function anexoUrls(limit=10) {
    sql = `select distinct json_extract(hc.obj, '$.article_url') as articleUrl,
        json_extract(hc.obj, '$.category') as category,
        '[' || group_concat('"' || json_extract(hc.obj, '$.date_edition') || '"' ) || ']' as dates,
        count(json_extract(hc.obj, '$.date_edition')) as nedits
        from history_contribs hc 
        where articleUrl like '%wiki/Anexo:%' and articleUrl not like '%Discusi%C3%B3n%'
        group by articleUrl
    	order by nedits desc `;
    if (limit != 0 ) 
        sql += `limit ${limit}`   
    return { sql:sql, args:[] };
}
function descriptionUrl(url) {
    sql = `select json_extract(hc.obj, '$.brief_description') as description 
        from history_contribs hc
        where json_extract(hc.obj, '$.article_url') = ? 
        limit 1`;
        return { sql:sql, args:[url] };
}
function discusionUrls(limit=10) {
    sql = `select distinct json_extract(hc.obj, '$.article_url') as articleUrl,
        '[' || group_concat('"' || json_extract(hc.obj, '$.date_edition') || '"' ) || ']' as dates,
        count(json_extract(hc.obj, '$.date_edition')) as nedits
        from history_contribs hc 
        where articleUrl like '%Discusi%C3%B3n:%' 
        group by articleUrl
    	order by nedits desc `;
    if (limit != 0 ) 
        sql += `limit ${limit}`   
    return { sql:sql, args:[] };
}
function categoryUrls(category, limit=10) {
    sql = `select distinct json_extract(hc.obj, '$.article_url') as articleUrl,
        '[' || group_concat('"' || json_extract(hc.obj, '$.date_edition') || '"' ) || ']' as dates,
        count(json_extract(hc.obj, '$.date_edition')) as nedits
        from history_contribs hc 
        where json_extract(hc.obj, '$.category') = ?
        group by articleUrl
        order by nedits desc `;
    if (limit != 0 ) 
        sql += `limit ${limit}` 
    return { sql:sql, args:[category] };
}
function randUrl() {
    sql = `select json_extract(obj, '$.article_url') as articleUrl
        from history_contribs limit 1 offset (select abs(random()) % count(*) from diffs)`;
    return { sql:sql, args:[] };
}
function prevUsers() {
    sql = `select json_extract(df.obj, '$.prev_username') as prevUser,
        count(*) as nedits
        from diffs df join history_contribs hc 
        on df.id = hc.id 
        where prevUser not like '90.167%'
        group by prevUser
        order by nedits desc `;
    return { sql:sql, args:[] };
}
function categorias() {
    sql = `select distinct json_extract(obj, '$.category') as category
        from history_contribs`;
    return { sql:sql, args:[] };
}

