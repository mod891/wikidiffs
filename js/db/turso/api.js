
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
        case 'diffsFromUser':
        case 'diffsFromPreviousUser':
        case 'diffFromId':
            stmt = diffsQueries(option,args[0],limit);
        break;

        case 'urlsStartsWith':
        case 'urlsByCategory':
        case 'anexo':
        case 'discusion':
            stmt = urlsQueries(option,args[0],limit);
        break;
        case 'randUrl':
            stmt = randUrl();
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
function diffsQueries(whereType, arg, limit=0) {
    var where = ` where df.id = ? `;
    if (whereType == 'diffsFromUrl')
        where = ` where articleUrl = ? `;
    else if (whereType == 'diffsFromUser')
         where = ` where json_extract(hc.obj, '$.user') = ? `;
    else if (whereType == 'diffsFromPreviousUser')
         where = ` where json_extract(df.obj, '$.prev_username') = ? `;

    var sql = `select df.id as id,
        json_extract(hc.obj, '$.article_url') as articleUrl,
        json_extract(hc.obj, '$.diff_url') as diffUrl,
        json_extract(hc.obj,'$.date_edition') as date,
        json_extract(hc.obj,'$.time_edition') as time,
        json_extract(hc.obj,'$.user') as user,
        json_extract(df.obj, '$.prev_username') as prevUser,
        json_extract(df.obj, '$.changes') as changes
        from diffs df join history_contribs hc 
        on df.id = hc.id` + where;
        
    if (limit != 0 )
        sql += `limit ${limit}`

    return { sql:sql, args:[arg] };
}
function urlsQueries(whereType, arg, limit=10) {
    var where = ` where json_extract(hc.obj, '$.category') = ? `;
    var args = [arg];
    if (whereType == 'discusion') { 
        where = ` where articleUrl like '%Discusi%C3%B3n:%' `;
        args = [];
    }
    if (whereType == 'anexo') { 
        where = ` where articleUrl like '%wiki/Anexo:%' and articleUrl not like '%Discusi%C3%B3n%' `;
        args =  [] ;
    } 
    if (whereType == 'urlsStartsWith') {
        args = [`%wiki/${arg}%`] ;
        where = ` where articleUrl like ? and articleUrl not like '%wiki/Anexo:%' `;
    }
     sql = `select distinct json_extract(hc.obj, '$.article_url') as articleUrl,
        json_extract(hc.obj, '$.category') as category,
        '[' || group_concat('"' || json_extract(hc.obj, '$.date_edition') || '"' ) || ']' as dates,
        count(json_extract(hc.obj, '$.date_edition')) as nedits
        from history_contribs hc `
         + where +
        `group by articleUrl
        order by nedits desc `;

    if (limit != 0 )
        sql += `limit ${limit}`

    return { sql:sql, args:args };
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
function descriptionUrl(idurl) {
    var where = ` where articleUrl = ? `;
    if (idurl.match(/[0-9]{9}/) != null)
        where = ` where id = ? `;
    sql = `select json_extract(hc.obj, '$.brief_description') as description,
        json_extract(obj, '$.article_url') as articleUrl
        from history_contribs hc
        ${where} limit 1`;

    return { sql:sql, args:[idurl] };
}