/* Web Worker */
const DEBUG = false;

onmessage = async function(e) {
    const message = e.data;
    if (typeof(message) == "object") {
        if (Object.keys(message).includes('initDB'))
            await initDB(Object.values(message)[0])
    }
    else {
        postMessage({ log: message });
    }
}

async function initDB(version) {
    console.time('initDB');

    if (DEBUG)
        postMessage({log:`webworker.js::initDB ${version}`});

    var openDBrequest = indexedDB.open(`wikidiffs_${version}`,1);

    openDBrequest.onupgradeneeded = (e) => {
        postMessage({
            fn: 'info',
            args: [
                null,
                6000,
                {
                    elem: 'scrollBtn',
                    text:'Cargandose la BD en el navegador...',
                    classes:['bg-cyan']
                }
            ],
        });

        const db = e.target.result;
        if (!db.objectStoreNames.contains("historycontribs")) {
            var hcStore = db.createObjectStore("historycontribs", { keyPath: "id" });
            hcStore.createIndex("id","id",{ unique: true });
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
                postMessage({log:'hcSize > 0'});
            }
            else {
                jsonFetch = await fetch(`../../../resources/store/${version}/historycontribs.json?nocache=${Date.now()}`);
                if (jsonFetch.ok)
                    json = await jsonFetch.json();
                chunkSize = Math.trunc(json.length/parts);
                progress = 0;
                for ( let i = 0; i < json.length; i += chunkSize ) {
                    progress += 100/parts;
                    tsWrite = db.transaction("historycontribs", "readwrite");
                    store = tsWrite.objectStore("historycontribs");

                    for (let j = i; j< Math.min(i+chunkSize, json.length); j++) {
                        try {
                            store.put(json[j]);
                        } catch (e) {
                            postMessage({log:e})
                        }
                    }
                    await transactionOnComplete(tsWrite);
                    postMessage({
                        fn:'info',
                        args: [
                            null,
                            20000,
                            {
                                elem:"scrollBtn",
                                text: `Cargando stores 1 de 2: ${progress}% completado`,
                                classes:['bg-cyan']  
                            } 
                        ]
                    });
                    if (DEBUG)
                        postMessage({log:`historycontribs.json::transactionOnComplete ${i}, progreso: ${progress}%`});

                }
                tsRead = db.transaction("diffs", "readonly");
                store = tsRead.objectStore("diffs");
                       
                diffsSize = store.count();
                diffsSize.onsuccess = async () => {
                    if (diffsSize.result > 0) {
                        postMessage({log:'diffsSize > 0'});
                    }
                    else {
                        jsonFetch = await fetch(`../../../resources/store/${version}/diffs.json?nocache=${Date.now()}`);
                        if (jsonFetch.ok)
                            json = await jsonFetch.json();

                        parts = 5;
                        chunkSize = Math.trunc(json.length/parts);
                        progress = 0;
                        for ( let i = 0; i < json.length; i += chunkSize ) {
                            progress += 100/parts;
                            tsWrite = db.transaction("diffs", "readwrite");
                            store = tsWrite.objectStore("diffs");

                            for (let j = i; j< Math.min(i+chunkSize, json.length); j++) {
                                try {
                                    store.put(json[j]);
                                } catch (e) {
                                     postMessage({log:e})
                                }
                            }
                            await transactionOnComplete(tsWrite);
                            postMessage({
                                fn:'info',
                                args: [
                                    null,
                                    20000,
                                    {
                                        elem:"scrollBtn",
                                        text: `Cargando stores 2 de 2: ${progress}% completado`,
                                        classes:['bg-cyan']  
                                    } 
                                ]
                            });
                            if (DEBUG)
                                postMessage({log:`diffs.json::transactionOnComplete ${i}`});
                        }

                        postMessage({ fn: 'openDB', arg:[] });
                        if (DEBUG)
                            postMessage({log:`openDB: ${version}`});
                        postMessage({
                            fn:'info',
                            args: [
                                null,
                                6000,
                                {
                                    elem:"scrollBtn",
                                    text: `Se ha cargado la base de datos en el navegador`,
                                    classes:['bg-cyan']  
                                } 
                            ]
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