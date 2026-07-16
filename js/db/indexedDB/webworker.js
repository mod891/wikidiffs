/* Web Worker */
var hcjson = null;
var diffsjson = null;
var performanceMarks = [];
var ini=0,end=0;

onmessage = async function(e) {
    const message = e.data;
    switch (message) {
        case 'initDB':
            await initDB();
        break;
        case 'DBupdates':
            DBupdates();     
        break;
    }
}

async function initDB() {

    performanceMarks.push(
        {
            debug:'db.onupgradeneeded',
            t:(end-ini)/1000,
            message:'abriendo la BD, cargado 1%',
        }
    );
    var db = indexedDB.open("wikidiffs",1);
    db.onupgradeneeded = (e) => {

        postMessage({
            fn: 'info',
            args: [
                null,
                4000,
                {
                    elem: 'loading',
                    text:'Cargandose la BD en el navegador...',
                    classes:['bg-cyan'] 
                }
            ],
        });

        ini = performance.now();
        const dbi = e.target.result;
        if (!dbi.objectStoreNames.contains("historycontribs")) {
            
            var hcStore = dbi.createObjectStore("historycontribs", { keyPath: "id" });
            hcStore.createIndex("articleUrl","article_url",{ unique: false });
            hcStore.createIndex("diffUrl","diff_url",{ unique: true });
            hcStore.createIndex("user","user",{ unique: false });
            hcStore.createIndex("date","date_edition",{ unique: false });
            hcStore.createIndex("category","category",{ unique: false }); 
        }
        if (!dbi.objectStoreNames.contains("diffs")) {
            var diffsStore = dbi.createObjectStore("diffs", { keyPath: "id" });
            diffsStore.createIndex("prevUser","prev_username",{ unique: false });
        }

        end = performance.now();
        performanceMarks.push(
            {
                debug:'db.onupgradeneeded',
                t:(end-ini)/1000,
                message:'creando stores en BD, cargado al 3%',
            }
        );
    };

    db.onsuccess = (e) => {
        const dbi = e.target.result;
        const ts1 = dbi.transaction("historycontribs", "readwrite");
        const ts2 = dbi.transaction("diffs","readwrite");
        const hcStore = ts1.objectStore("historycontribs");
        const diffsStore = ts2.objectStore("diffs");

        var hcSize = hcStore.count();
        var diffsSize = diffsStore.count();

        hcSize.onsuccess = async () => {
            ini = performance.now();

            if (hcSize.result > 0) {
                end = performance.now();
                performanceMarks.push(
                    {
                        debug:'hcSize.onsuccess::hcSize.result > 0',
                        t:(end-ini)/1000,
                        message:'historyContribs en BD, cargado al 40%'
                    }
                );
            }
            else {
                var hcReq = await fetch(`/public/resources/store/historycontribs.json`);
                if (hcReq.ok)
                    hcjson = await hcReq.json();

                var tsWrite = dbi.transaction("historycontribs", "readwrite");
                var storeWrite = tsWrite.objectStore("historycontribs");

                for (let i=0; i<hcjson.length; i++)
                            storeWrite.put(hcjson[i]);
                
                tsWrite.oncomplete = () => {
                    end = performance.now();
                    performanceMarks.push(
                        {
                            debug:'hcSize.onsuccess::hcSize.result > 0',
                            t:(end-ini)/1000,
                            message:'historyContribs en BD, cargado al 40%'
                        }
                    );
                };
            }
        };

        diffsSize.onsuccess = async () => {
            ini = performance.now();
            
            if (diffsSize.result > 0)   {
                end = performance.now();
                performanceMarks.push({
                    debug:'diffsSize.onsuccess::diffsSize.result > 0',
                    t:(end-ini)/1000,
                    message:'diffs en BD, cargado al 100%',
                    loaded: true,
                });
                postMessage({ fn: 'openDB', args:[] });
            } else {
                var diffsReq = await fetch(`/public/resources/store/diffs.json`);
                if (diffsReq.ok)
                    diffsjson = await diffsReq.json();

                var tsWrite = dbi.transaction("diffs", "readwrite");
                var storeWrite = tsWrite.objectStore("diffs");

                for (let i=0; i<diffsjson.length; i++)
                    storeWrite.put(diffsjson[i]);

                tsWrite.oncomplete = () => {
                    end = performance.now();
                    performanceMarks.push(
                        {
                            debug:'diffsSize.onsuccess::fetch && db.put',
                            t:(end-ini)/1000,
                            message:'diffs en BD, cargado al 100%',
                            loaded: true,
                        }
                    );
                    postMessage({ fn: 'openDB', args:[] });
                };
            }
        }
    };
}

function debug() {
    postMessage({log:'debug'});
    for (let i=0; i<performanceMarks.length; i++) {
        postMessage(performanceMarks[i]);
    }
}

async function DBupdates() {
    if (performanceMarks.length == 0)
        return;
    postMessage({ var: 'wwFreeze', value: true });
    while (!performanceMarks[performanceMarks.length-1].hasOwnProperty('loaded')) {
        postMessage({
            fn: 'freezeGUI',
            arg: performanceMarks[performanceMarks.length-1].message,
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    postMessage({
        fn: 'freezeGUI',
        arg: performanceMarks[performanceMarks.length-1].message
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    postMessage({ fn: 'freezeGUI', arg: false, var: 'wwFreeze', value: false });
    postMessage({ var: 'indexedDBloaded', value:true });

    postMessage(
        {
            fn: 'info',
            args: [
                null,
                4000,
                {
                    elem: 'loading',
                    text:'Se ha cargado la BD en el navegador',
                    classes:['bg-cyan'] 
                }
            ],
        }
    );

    postMessage({
        fn: 'fetchSharedData', // require data with category
        arg: []
    })
}