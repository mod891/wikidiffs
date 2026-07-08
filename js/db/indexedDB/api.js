async function queryIDB(option,...args) {
    var  pager = {};
    var IDBdata = {};
    if (args.length == 2)
        pager = args[1];

    switch (option) {

        case 'diffsFromUrl':
        case 'diffsFromUser':
        case 'diffsFromPreviousUser':
        case 'diffFromId':
            console.log(`IDBdata = diffsQueries(option,args[0],pager);`)
        break;
        case 'urlsStartsWith':
        case 'urlsByCategory':
            console.log(`IDBdata = urlsQueries(option,args[0],pager);`)
        break;
        case 'randUrl':
            IDBdata = await randUrlIDB();
            
        break;
        case 'descriptionUrl': 
            IDBdata = descriptionUrlIDB(args[0]);
        break;
        case 'prevUsers':
            IDBdata = await prevUsersIDB();
        break;
        case 'categories':
            IDBdata = await categoriesIDB();
        break;
        default:
            console.log('hoiga esto no furula',option)
    }
    return IDBdata;
}

/*
function categorias() {
    sql = `select distinct json_extract(obj, '$.category') as category
        from history_contribs`;
*/
function categoriesIDB() {
    var ts = db.transaction(['historycontribs'],'readonly');
    var store = ts.objectStore('historycontribs');
    var index = store.index('category');

    var categories = [];
    return new Promise((resolve, reject) => {
        var request = index.openKeyCursor(null, "nextunique");
        request.onsuccess = (evt) => {
            var cursor = evt.target.result;
            if (cursor) {
                categories.push(cursor.key);
                cursor.continue();
            } else {
                resolve(categories);
            }
        }
        request.onerror = () => reject(request.error);
    })
}

/*
function randUrl() {
    sql = `select json_extract(obj, '$.article_url') as articleUrl
        from history_contribs limit 1 offset (select abs(random()) % count(*) from diffs)`;

    return { sql:sql, args:[] };
}
*/
function randUrlIDB() {
    // let ini = performance.now();
    var ts = db.transaction(['historycontribs'],'readonly');
    var store = ts.objectStore('historycontribs'); // global no, se elimina cuando termina la transacción
    var index = store.index('articleUrl');
    var url = []; i=0;
    return new Promise((resolve, reject) => {
        
        var request = index.openKeyCursor(null, "nextunique");
        request.onsuccess = (evt) => {
            var cursor = evt.target.result;
            if (cursor) {
                url.push(cursor.key);
                cursor.continue();
            } else {
                i = Math.trunc(url.length*Math.random());
                url = url[i];
                // let end = performance.now();
                resolve(url);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

// function prevUsers() {
//     sql = `select json_extract(df.obj, '$.prev_username') as prevUser,
//         count(*) as nedits
//         from diffs df join history_contribs hc 
//         on df.id = hc.id 
//         where prevUser not like '90.167%'
//         group by prevUser
//         order by nedits desc `;

//     return { sql:sql, args:[] };
// }

async function prevUsersIDB() { // usuarios colaboradores con el usuario rango baneado
    var diffsStore = ts.objectStore('diffs');
    var index = diffsStore.index('prevUser');

    return new Promise((resolve, reject) => {
        // 
        var usersMap = new Map();
        var aux = null, wreturn = [];
        var request = index.openKeyCursor(null, "next");
        request.onsuccess = (evt) => {
            var cursor = evt.target.result;
            if (cursor) {
                if (!cursor.key.startsWith('90.167'))
                    usersMap.set(cursor.key,(usersMap.get(cursor.key) || 0) + 1);
                cursor.continue();
            } else {
                aux = new Map(
                    [...usersMap.entries()].sort((a,b) => b[1] - a[1])
                );
                aux.forEach((key,val) => {
                    wreturn.push({prevUser:key, nedits:val});
                })
                resolve(wreturn);
            }
        };
        request.onerror = () => reject(request.error);
    });
}
/*
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
*/
async function descriptionUrlIDB(url) {
    var ts = db.transaction(['historycontribs'],'readonly');
    var hcStore = ts.objectStore('historycontribs');
    var index = hcStore.index('articleUrl');
    return new Promise((resolve, reject) => {
        var request = index.get(url);
        request.onsuccess = () => {
            resolve(request.result.brief_description);
        };
        request.onerror = () => reject(request.error);
    });
}

/*
function diffsQueries(whereType, arg, pager={}) {
    var where = ` where df.id = ? `;
    if (whereType == 'diffsFromUrl')
        where = ` where articleUrl = ? `;
    else if (whereType == 'diffsFromUser')
         where = ` where json_extract(hc.obj, '$.user') = ? `;
    else if (whereType == 'diffsFromPreviousUser')
         where = ` where json_extract(df.obj, '$.prev_username') = ? `;

    var sql = `select df.id as id,
        sum(count(df.id)) over () as totalDiffs,
        json_extract(hc.obj, '$.article_url') as articleUrl,
        json_extract(hc.obj, '$.diff_url') as diffUrl,
        json_extract(hc.obj,'$.date_edition') as date,
        json_extract(hc.obj,'$.time_edition') as time,
        json_extract(hc.obj,'$.user') as user,

        json_extract(df.obj, '$.prev_username') as prevUser,
        json_extract(df.obj, '$.changes') as changes

        from diffs df join history_contribs hc 
        on df.id = hc.id` 

        + where + 
        `group by df.id`;
        
    if (Object.keys(pager).length != 0) 
        sql += ` limit ${pager.perPage} offset ${pager.perPage*pager.page}`

    return { sql:sql, args:[arg] };
}
*/

async function diffsQueriesIDB(filterBy, arg, pager={}) { // [TODO: pager]

    var ts = db.transaction(['historycontribs','diffs'],'readonly');
    var hcStore = ts.objectStore('historycontribs');
    var diffsStore = ts.objectStore('diffs');
    var index = null;
    var request1, request2;
    var ids = [], hcData, dfData;

    if (filterBy == 'diffsFromUrl')
        index = hcStore.index('articleUrl');
    else if (filterBy == 'diffsFromUser')
        index = hcStore.index('user');
    else if (filterBy == 'diffsFromPreviousUser')
        index = diffsStore.index('prevUser');

    return new Promise((resolve, reject) => {
        if (index == null) {
            request1 = hcStore.get(arg);
            request1.onsuccess = () => {
                request2 = diffsStore.get(request1.result.id);
                request2.onsuccess = () => resolve(join([request1.result],[request2.result]));
                request2.onerror = () => reject(request2.error);
            }
            request1.onerror = () => reject(request1.error);
        } else {
            var request1 = index.getAll(arg);
            request1.onsuccess = () => { 
                request2 = filterBy == 'diffsFromPreviousUser'? hcStore : diffsStore;
                
                ids = request1.result.map(obj => obj.id);
                var objs = [];
                if (ids.length > 0) {
                    Promise.all(
                        ids.map( key => new Promise(() => {
                            var getObj = request2.get(key);
                            getObj.onsuccess = () => {
                                objs.push(getObj.result);
                                if (objs.length == ids.length) {
                                    if (filterBy == 'diffsFromPreviousUser')
                                        hcData = objs, dfData = request1.result;
                                    else
                                        hcData = request1.result, dfData = objs;
                                    resolve(join(hcData, dfData));
                                }
                            }
                        }))
                    );
                } else {
                    resolve([]);
                }
            }
        }
   });
}

function join(hcData, dfData) {
    let totalDiffs = dfData.length;

    result = [];
    for (let i=0; i<dfData.length; i++) {
        result.push({
            id: Number.parseInt(hcData[i].id),
            totalDiffs: totalDiffs,
            articleUrl: hcData[i].article_url,
            diffUrl: hcData[i].diff_url,
            date: hcData[i].date_edition,
            time: hcData[i].time_edition,
            user: hcData[i].user,
            prevUser: dfData[i].prev_username,
            changes: JSON.stringify(dfData[i].changes)
        });
    }
    return result;
}


/*
function urlsQueries(whereType, arg, pager={}) {
    var args = [arg];
    var where = ` where json_extract(hc.obj, '$.category') = ? `;

    if (whereType == 'urlsStartsWith') {
        args = []
        if (arg.length == 1) {
            args = [`%wiki/${arg}%`] ;
            where = ` where articleUrl like ? and articleUrl not like '%wiki/Anexo:%' `;
        }
        else if (arg == 'discusion')
            where = ` where articleUrl like '%Discusi%C3%B3n:%' `;
        else if (arg == 'anexo')
            where = ` where articleUrl like '%wiki/Anexo:%' and articleUrl not like '%Discusi%C3%B3n%' `;
    }

    sql = `select distinct json_extract(hc.obj, '$.article_url') as articleUrl,
        json_extract(hc.obj, '$.category') as category,
        '[' || group_concat('"' || json_extract(hc.obj, '$.date_edition') || '"' ) || ']' as dates,
        count(json_extract(hc.obj, '$.date_edition')) as nedits,
        sum(count(distinct json_extract(hc.obj, '$.article_url'))) over () as totalUrls
        from history_contribs hc `
         + where +
        `group by articleUrl
        order by nedits desc `; 

    if (Object.keys(pager).length != 0)
        sql += `limit ${pager.perPage} offset ${pager.perPage*pager.page}`

    return { sql:sql, args:args };
}
*/

async function urlsQueriesIDB(filterBy, arg, pager={}) {
   
    var ts = db.transaction(['historycontribs'],'readonly');
    var hcStore = ts.objectStore('historycontribs');
    var index = null;
    var str = "", strNot = "";

    if (filterBy == 'urlsStartsWith') {
        if (arg.length == 1) {
            str = `wiki/${arg}`;
            strNot = 'wiki/Anexo:';
        }
        else if (arg == 'discusion') {
            str = 'Discusi%C3%B3n:';
        }
        else if (arg == 'anexo') {
            str = 'wiki/Anexo:';
            strNot = 'Discusi%C3%B3n';
        }
        index = hcStore.index('articleUrl');
    }
    else if (filterBy == 'urlsByCategory') {
        index = hcStore.index('category');
        str = arg;
    }

    return new Promise((resolve, reject) => {

        var vect1 = [], urlsMap = new Map();
        var request = index.openCursor(null, "next");

        request.onsuccess = (evt) => {
            var cursor = evt.target.result;
            if (cursor) {
                if ( ( cursor.key.includes(str) && strNot.length > 0 && !cursor.key.includes(strNot) )
                    || ( cursor.key.includes(str) && strNot.length ==  0 )  ) {
                    
                    vect1.push({
                        id: cursor.primaryKey,
                        articleUrl: cursor.value.article_url,
                        date: cursor.value.date_edition,
                        category: cursor.value.category
                    });
                }
                cursor.continue();

            } else {
                vect1.forEach( it => {
                    let obj = {
                        articleUrl: it.articleUrl,
                        category: it.category,
                        dates: [it.date],
                        nedits: 1,
                    }
                    if (!urlsMap.get(it.articleUrl)) 
                        urlsMap.set(it.articleUrl,obj);
                    else {
                        obj.dates.push(it.date);
                        obj.nedits = urlsMap.get(it.articleUrl).nedits+1;
                        urlsMap.set(it.articleUrl,obj);
                    }
                })
                vect1 = [];
                urlsMap.forEach((it) => {
                    vect1.push({
                        articleUrl: it.articleUrl,
                        category: it.category,
                        dates: it.dates,
                        nedits: it.nedits,
                        totalUrls:urlsMap.size
                    });
                });
                vect1 = vect1.sort( (a,b) => b.nedits - a.nedits)
                resolve(vect1);
            }
        }
        request.onerror = () => reject(request.error);
    });
}

// 
// await descriptionUrlIDB('https://es.wikipedia.org/wiki/Siglo_XXI')
// await queryIDB('categories')
// await queryIDB('randUrl')
// await queryIDB('prevUsers')

// await diffsQueriesIDB('diffFromId','159187369')
// await diffsQueriesIDB('diffsFromUrl','https://es.wikipedia.org/wiki/Miguel_%C3%81ngel_Blanco')
// await diffsQueriesIDB('diffsFromUser','90.167.202.153')
// await diffsQueriesIDB('diffsFromPreviousUser','SeroBOT')

// await urlsQueriesIDB('urlsStartsWith', 'L')
// await urlsQueriesIDB('urlsStartsWith', 'anexo')
// await urlsQueriesIDB('urlsStartsWith', 'discusion') ?no regs
// await urlsQueriesIDB('urlsByCategory','futbol')