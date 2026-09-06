
var db = null;

async function query(option,...args) {
    var  pager = null;
    var IDBdata = {};
    if (args.length == 2)
        pager = args[1];

    if (db == null)
        await openDB();
    
    switch (option) {
        case 'diffsFromUrl':
        case 'diffsFromUser':
        case 'diffsFromPreviousUser':
        case 'diffFromId':
            IDBdata = diffsQueriesIDB(option,args[0],pager);
        break;
        case 'urlsStartsWith':
        case 'urlsByCategory':
            IDBdata = urlsQueriesIDB(option,args[0],pager);

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

async function openDB() {
    var opendb = indexedDB.open("wikidiffs",1);
    opendb.onsuccess = () => {
        db = opendb.result;
        localStorage.setItem('indexedDB',true);
        wwFreeze = false;
    }
    opendb.onerror = () => {
        console.log(opendb.error);
        alert(opendb.error)
    }
}

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
                categories.push({category:cursor.key});
                cursor.continue();
            } else {
                resolve(categories);
            }
        }
        request.onerror = () => reject(request.error);
    });
}

function randUrlIDB() {
    var ts = db.transaction(['historycontribs'],'readonly');
    var store = ts.objectStore('historycontribs');
    var index = store.index('articleUrl');
    var UNIQUEURLS = 100; // :O
    let pos = Math.trunc(UNIQUEURLS*Math.random());
    return new Promise((resolve, reject) => {
        var request = index.openKeyCursor(null, "nextunique");
        let advanced = false;
        request.onsuccess = (evt) => {
            var cursor = evt.target.result;
            if (cursor) {
                if (!advanced) {
                    if (pos > 0)
                        cursor = cursor.advance(pos);
                    advanced = true;
                }
                else
                    resolve([{articleUrl:cursor.key}]);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

async function prevUsersIDB() {
    var ts = db.transaction(['diffs'],'readonly');
    var diffsStore = ts.objectStore('diffs');
    var index = diffsStore.index('prevUser');

    return new Promise((resolve, reject) => {
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
                    wreturn.push({prevUser:val, nedits:key});
                })
                resolve(wreturn);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

async function descriptionUrlIDB(url) {
    var ts = db.transaction(['historycontribs'],'readonly');
    var hcStore = ts.objectStore('historycontribs');
    var index = hcStore.index('articleUrl');
    return new Promise((resolve, reject) => {
        var request = index.get(url);
        request.onsuccess = () => {
            resolve([{description:request.result.brief_description}]);
        };
        request.onerror = () => reject(request.error);
    });
}

async function diffsQueriesIDB(filterBy, arg, pager=null) {
    var ts = db.transaction(['historycontribs','diffs'],'readonly');
    var hcStore = ts.objectStore('historycontribs');
    var diffsStore = ts.objectStore('diffs');
    var index = null;
    var request1Data, request2, hcData, dfData, ids = [], objs = [], totalDiffs = 0;

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
            };
            request1.onerror = () => reject(request1.error);
        } else {
            var request1 = index.getAll(arg);
            request1.onsuccess = () => { 
                request2 = filterBy == 'diffsFromPreviousUser'? hcStore : diffsStore;
                request1Data = request1.result;
                ids = request1Data.map(obj => obj.id);
                totalDiffs = ids.length;
                if (pager != null) {
                    ids = ids.slice(pager.page*pager.perPage,pager.perPage+(pager.perPage*pager.page));
                    request1Data = request1Data.slice(pager.page*pager.perPage,pager.perPage+(pager.perPage*pager.page));
                }
                if (ids.length > 0) {
                    Promise.all(
                        ids.map( key => new Promise(() => {
                            var getObj = request2.get(key);
                            getObj.onsuccess = () => {
                                objs.push({...getObj.result, totalDiffs:totalDiffs});
                                if (objs.length == ids.length) {
                                    if (filterBy == 'diffsFromPreviousUser')
                                        hcData = objs, dfData = request1Data;
                                    else
                                        hcData = request1Data, dfData = objs;
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
    var result = [];
    for (let i=0; i<dfData.length; i++) {
        result.push({
            id: Number.parseInt(hcData[i].id),
            totalDiffs: hcData[i].totalDiffs?? dfData[i].totalDiffs,
            articleUrl: hcData[i].article_url,
            diffUrl: hcData[i].diff_url,
            date: hcData[i].date_edition,
            time: hcData[i].time_edition,
            user: hcData[i].user,
            prevUser: dfData[i].prev_username,
            changes: JSON.stringify(dfData[i].changes),
        });
    }
    return result;
}

async function urlsQueriesIDB(filterBy, arg, pager=null) {
    const baseUrl = "https://es.wikipedia.org/wiki/";
    var ts = db.transaction(['historycontribs'],'readonly');
    var hcStore = ts.objectStore('historycontribs');
    var index = null;
    var str = "", strNot = "", requests = [];

    if (filterBy == 'urlsStartsWith') {
        if (arg.length == 1) {
            str = arg;
            strNot = 'wiki/Anexo:';
        }
        else if (arg == 'discusion') {
            str = 'Discusi%C3%B3n:';
        }
        else if (arg == 'anexo') {
            str = 'Anexo:';
            strNot = 'Discusi%C3%B3n';
        }
        index = hcStore.index('articleUrl');
    }
    else if (filterBy == 'urlsByCategory') {
        index = hcStore.index('category');
        str = arg;
    }

    return new Promise((resolve, reject) => {

        var vect1 = [], results = [], urlsMap = new Map();
        var range = null, request = null;
        
        if (filterBy == 'urlsStartsWith') {
            if (arg != '1-9') {
                range = IDBKeyRange.bound(
                    baseUrl+str,
                    baseUrl+str+"\uffff"
                );
                request = index.openCursor(range);
                requests.push(request);
            }
            else {
                for (let i=1; i<10; i++) {
                    range = IDBKeyRange.bound(
                        baseUrl+i,
                        baseUrl+i+"\uffff"
                    );
                    request = index.openCursor(range);
                    requests.push(request);
                }
            }
        }
        else {
            request = index.openCursor(IDBKeyRange.only(str));
            requests.push(request);
        }
        for (let i=0; i<requests.length; i++) {
            urlsMap = new Map();
            request = requests[i];
            request.onsuccess = (evt) => {
                var cursor = evt.target.result;
                if (cursor) {                   
                    vect1.push({
                        id: cursor.primaryKey,
                        articleUrl: cursor.value.article_url,
                        date: cursor.value.date_edition,
                        category: cursor.value.category
                    });
                    cursor.continue();
                }
                else {
                    if (strNot.length > 0) {
                        vect1 = vect1.filter(item => !item.articleUrl.includes(strNot));
                    }
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
                    });
                    vect1 = [];
                    urlsMap.forEach((it) => {
                        if (results.filter(obj => obj.articleUrl == it.articleUrl).length == 0) {
                            results.push({
                                articleUrl: it.articleUrl,
                                category: it.category,
                                dates: JSON.stringify(it.dates),
                                nedits: it.nedits,
                                totalUrls:urlsMap.size
                            });
                        }
                    });
                    results = results.sort( (a,b) => b.nedits - a.nedits)
                }
            }
            request.onerror = () => reject(request.error);
        }
        ts.oncomplete = () => {
            if (pager != null) {
                results = results.slice(
                    pager.page*pager.perPage,
                    pager.perPage+(pager.perPage*pager.page)
                );
            }
            resolve(results);
        }
    });
}