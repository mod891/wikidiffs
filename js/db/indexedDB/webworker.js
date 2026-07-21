/* Web Worker */
var performanceMarks = [];

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
    console.time('initDB');
    var openDBrequest = indexedDB.open("wikidiffs",1);

    openDBrequest.onupgradeneeded = (e) => {

        performanceMarks.push({
            fn: 'freezeGUI',
            arg:'Creando la BD, cargado 3%',
        });

        postMessage({
            fn: 'info',
            log: 'openDBrequest.onupgradeneeded ',
            args: [
                null,
                3000,
                {
                    elem: 'loading',
                    text:'Cargandose la BD en el navegador...',
                    classes:['bg-cyan'] 
                }
            ],
        });

        const db = e.target.result;
        if (!db.objectStoreNames.contains("historycontribs")) {
            var hcStore = db.createObjectStore("historycontribs", { keyPath: "id" });
            hcStore.createIndex("articleUrl","article_url",{ unique: false });
            hcStore.createIndex("diffUrl","diff_url",{ unique: true });
            hcStore.createIndex("user","user",{ unique: false });
            hcStore.createIndex("date","date_edition",{ unique: false });
            hcStore.createIndex("category","category",{ unique: false }); 
        }
        if (!db.objectStoreNames.contains("diffs")) {
            var diffsStore = db.createObjectStore("diffs", { keyPath: "id" });
            diffsStore.createIndex("prevUser","prev_username",{ unique: false });
        }
    };

    openDBrequest.onsuccess = (e) => {
        var tsRead = null, tsWrite = null, store = null,
        jsonFetch = null, json = null, chunkSize = 0, 
        parts = 5, progress=0, hcSize = 0, diffsSize = 0;

        const db = e.target.result;
        tsRead = db.transaction("historycontribs", "readonly");
        store = tsRead.objectStore("historycontribs");

        hcSize = store.count();
        hcSize.onsuccess = async () => {
            if (hcSize.result > 0) {
                performanceMarks.push({
                    fn:'freezeGUI',
                    arg:'historyContribs en BD, 1/2 stores cargadas',
                });
            }
            else {
                jsonFetch = await fetch(`/public/resources/store/historycontribs.json`);
                if (jsonFetch.ok)
                    json = await jsonFetch.json();
                chunkSize = Math.trunc(json.length/parts);
                progress = 0;
                for ( let i = 0; i < json.length; i += chunkSize ) {
                    postMessage({
                        fn: 'freezeGUI',
                        arg: `Cargando historyContribs en BD: ${progress}% completado`,
                    });
                    progress += 100/parts;
                    tsWrite = db.transaction("historycontribs", "readwrite");
                    store = tsWrite.objectStore("historycontribs");

                    for (let j = i; j< Math.min(i+chunkSize, json.length); j++) {
                        try {
                            store.put(json[j]);
                        } catch (e) {
                            console.log(e)
                            postMessage({log})
                        }
                    }
                    await transactionOnComplete(tsWrite);
                }
                postMessage({
                    fn:'freezeGUI',
                    arg:'1/2 stores cargadas en BD',
                });

                tsRead = db.transaction("diffs", "readonly");
                store = tsRead.objectStore("diffs");
                       
                diffsSize = store.count();
                diffsSize.onsuccess = async () => {
                    if (diffsSize.result > 0) {
                        performanceMarks.push({
                            fn:'freezeGUI',
                            arg:'diffs en BD, 2/2 stores cargadas',
                        });
                    }
                    else {
                        jsonFetch = await fetch(`/public/resources/store/diffs.json`);
                        if (jsonFetch.ok)
                            json = await jsonFetch.json();

                        parts = 5;
                        chunkSize = Math.trunc(json.length/parts);
                        progress = 0;
                        for ( let i = 0; i < json.length; i += chunkSize ) {
                            postMessage({
                                fn: 'freezeGUI',
                                arg: `Cargando diffs en BD: ${progress}% completado`,
                            });
                            progress += 100/parts;

                            tsWrite = db.transaction("diffs", "readwrite");
                            store = tsWrite.objectStore("diffs");

                            for (let j = i; j< Math.min(i+chunkSize, json.length); j++) {
                                try {
                                    store.put(json[j]);
                                } catch (e) {
                                    console.log(e)
                                    postMessage({log})
                                }
                            }
                            await transactionOnComplete(tsWrite);
                        }
                        postMessage({
                            fn:'freezeGUI',
                            arg:'2/2 stores cargadas en BD',
                        });
                        postMessage({ fn: 'freezeGUI', arg: false });
                        postMessage({ fn: 'openDB', args:[] });
                        postMessage({
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
                        });
                        console.timeEnd('initDB');
                    }
                }
            }
        };
    };
}

async function transactionOnComplete(ts) {
    return new Promise((resolve, reject) => {
        ts.oncomplete = () => resolve();
        ts.onerror = () => reject(ts.error);
    });
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