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

    var db = indexedDB.open("wikidiffs",1);

    db.onupgradeneeded = (e) => {

        performanceMarks.push({
            fn: 'freezeGUI',
            debug:'db.onupgradeneeded',
            t:(end-ini)/1000,
            arg:'Creando la BD, cargado 3%',
        });

        postMessage({
            fn: 'info',
            log: 'db.onupgradeneeded ',
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
                message:'creando stores en BD (stores,indices), cargado al 3%',
            }
        );
    };

    db.onsuccess = (e) => {
        const dbi = e.target.result;
        const ts1 = dbi.transaction("historycontribs", "readwrite");
        const ts2 = dbi.transaction("diffs","readwrite");
        const hcStore = ts1.objectStore("historycontribs");
        const diffsStore = ts2.objectStore("diffs");

        var chunkSize = 0, percent=0, tsWrite = null, storeWrite = null;

        var hcSize = hcStore.count();
        var diffsSize = diffsStore.count();

        hcSize.onsuccess = async () => {

            ini = performance.now();

            if (hcSize.result > 0) {
                end = performance.now();
                performanceMarks.push({
                    fn:'freezeGUI',
                    arg:'historyContribs en BD, 1/2 stores cargadas',
                    debug:'hcSize.onsuccess::hcSize.result > 0',
                    t:(end-ini)/1000,
                });
            }
            else {
                
                var hcReq = await fetch(`/public/resources/store/historycontribs.json`);
                if (hcReq.ok)
                    hcjson = await hcReq.json();

                chunkSize = Math.trunc(hcjson.length/100);
                percent = 0;

                for ( let i = 0; i < hcjson.length; i += chunkSize ) {

                    postMessage({
                        fn: 'freezeGUI',
                        arg: `Cargando history contribs en BD: ${percent}% completado`,
                        log:`percent: ${percent}`
                    });
                    percent += 1;

                    tsWrite = dbi.transaction("historycontribs", "readwrite");
                    storeWrite = tsWrite.objectStore("historycontribs");


                    for (let j = i; j< Math.min(i+chunkSize, hcjson.length); j++) {
                        try {
                            storeWrite.put(hcjson[j]);

                        } catch (e) {
                            console.log(e)
                            postMessage({log})
                        }
                    }
    
                    await transactionOnComplete(tsWrite);

                }
                postMessage({
                        fn: 'freezeGUI',
                        arg: false
                });
            }
        };

        diffsSize.onsuccess = async () => {
            ini = performance.now();
            
            if (diffsSize.result > 0)   {
                end = performance.now();
                performanceMarks.push({
                    fn: 'freezeGUI',
                    arg:'diffs en BD, cargado al 100%',
                    loaded: true,
                    t:(end-ini)/1000,
                });
                postMessage({ fn: 'openDB', args:[] });

            } else {

                chunkSize = 0, tsWrite = null, storeWrite = null, diffsReq = null, diffsjson = [];

                diffsReq = await fetch(`/public/resources/store/diffs.json`);
                if (diffsReq.ok)
                    diffsjson = await diffsReq.json();


                chunkSize = Math.trunc(diffsjson.length/100);
                percent = 0;

                for ( let i = 0; i < diffsjson.length; i += chunkSize ) {

                    postMessage({
                        fn: 'freezeGUI',
                        arg: `Cargando diffs en BD: ${percent}% completado`,
                        log:`percent: ${percent}`
                    });
                    percent += 1;

                    tsWrite = dbi.transaction("diffs", "readwrite");
                    storeWrite = tsWrite.objectStore("diffs");


                    for (let j = i; j< Math.min(i+chunkSize, diffsjson.length); j++) {
                        try {
                            storeWrite.put(diffsjson[j]);

                        } catch (e) {
                            console.log(e)
                            postMessage({log})
                        }
                    }
    
                    await transactionOnComplete(tsWrite);

                }
                postMessage({
                        fn: 'freezeGUI',
                        arg: false
                });
                postMessage({ fn: 'openDB', args:[] });
            }
        };
    }
}

async function transactionOnComplete(ts) {
    return new Promise((resolve, reject) => {
        ts.oncomplete = () => {
            postMessage({log:'transactionOnComplete'});
            resolve();
        };
        ts.onerror = () => reject(ts.error);
    });
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
    while (!performanceMarks[performanceMarks.length-1].hasOwnProperty('loaded')) {
        postMessage(performanceMarks[performanceMarks.length-1]);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    postMessage(performanceMarks[performanceMarks.length-1]);
    await new Promise(resolve => setTimeout(resolve, 1000));
    postMessage({ fn: 'freezeGUI', arg: false });

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
    postMessage({ fn: 'fetchSharedData', arg: [] });
}