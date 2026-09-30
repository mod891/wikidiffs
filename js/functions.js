var getVal = "";
var idTimeout = null;
var categories = null;
var DBTYPE = "";
var ww = null;
var idbs = [];
init()

async function loadFragment(what) {
    what = what.replace('#','').replace(/\?.*/,'');
    const fragments = [ 'menu','footer','index','alfabetrium','diffs','listby','users','categories','notes'];
    if (fragments.includes(what)) {
        try {
            var request = await fetch(`components/${what}.html`);
        } catch (err) {
            console.log(`loadFragment::${what} Error:`,err);
        }
        if (request.ok) {
            html = await request.text();
            var template = document.createElement('template');
            template.innerHTML = html;
            var css = template.content.querySelector('style');
            var js = template.content.querySelectorAll('script');
            js = js.length > 1? js[1] : js[0]; // issue live server svg support
            var fragment = template.content.querySelector(`#${what}`)
            if (['menu','footer'].includes(what))
                document.getElementById(`${what}-fragment`).innerHTML = fragment.outerHTML;
            else
                document.getElementById(`app`).innerHTML = fragment.outerHTML;
            
            oldCssJs = document.querySelectorAll('[id$="-css"],[id$="-js"]')
            if (oldCssJs.length > 2) {
                for (let i=2; i<oldCssJs.length; i++)
                    oldCssJs[i].remove()
            }
            if (css) {
                css.id = `${what}-css`
                document.head.appendChild(css);
            }
            if (js) {
                script = document.createElement('script');
                script.id = `${what}-js`
                script.textContent = js.innerHTML;
                document.head.appendChild(script);
            }
        }
    } else {
        console.log('ERR: choose wisely')
    }
}

async function fetchSharedData() {
    categories = JSON.parse(sessionStorage.getItem('categories'));
    if (categories == null) {
        let querydata = await query('categories');
        categories = querydata.map(i => i.category);                
        sessionStorage.setItem('categories',JSON.stringify(categories));
    }
}

async function init() {
    document.querySelectorAll('script[src]').forEach(e => {
        if (e.src.includes('indexedDB')) 
            DBTYPE = "indexedDB";
    });
    DBTYPE = DBTYPE == ""? "sqlite" : DBTYPE;
    if (DBTYPE == "indexedDB") {
        ww = new Worker('js/db/indexedDB/webworker.js');
        ww.onmessage = (e) => {
            let wwdata = e.data;
            if (wwdata.hasOwnProperty('fn')) {
                if (wwdata.hasOwnProperty('arg')) 
                    window[wwdata.fn](wwdata.arg);               
                else if (wwdata.hasOwnProperty('args'))
                    window[wwdata.fn](wwdata.args[0],wwdata.args[1],wwdata.args[2]); 
            }
            if (wwdata.hasOwnProperty('var'))
                window[wwdata.var] = wwdata.value;           
            if (wwdata.hasOwnProperty('log'))
                console.log(wwdata.log);            
        };
        idbs = await indexedDB.databases();
        if (idbs.length == 0)
            ww.postMessage({initDB:'lite'});
    }
    await loadFragment('menu');
    await loadFragment('footer');
    const scrollTopBtn = document.getElementById('scrollBtn');

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });
    window.addEventListener('scroll', () => {
        if (window.scrollY > 200)
            scrollTopBtn.classList.add('show');
        else
            scrollTopBtn.classList.remove('show');
    });
    route();
}

async function route() {
    getVal = ""
    if (window.location.hash.length == 0)
        window.location.hash = "#index";
    if ( idbs.length > 0 && db == null)
        await openDB();
    if (window.location.hash.split('?').length > 1)
        getVal = window.location.hash.split('?')[1].split('=')[1];
    
    loadFragment(window.location.hash);
}

window.addEventListener('hashchange', () => {
    route();
});

async function info(event,ms=5000,...args) { //  refactorizar
    var toast = document.getElementById('toast');
    let left = 0, top = 0, defaultBg = 'bg-yellow';
    elem = '', url = '', page=window.location.hash, data=null;

    if (event != null) {
        if (page.startsWith('#diffs')) 
            url = event.target.parentElement.parentElement
                .querySelector('#article-url-data').href.split('diff=')[1];
        else if (page.startsWith('#notes'))
            url = document.querySelector('a.ml3').href.split('diff=')[1];
        else if (page.startsWith('#listby') || page.startsWith('#alfabetrium')) 
            url = event.target.parentNode.children[0].href.split('diff=')[1];
        data = await query('descriptionUrl',url);
        toast.innerText = data[0].description;

        left = event.target.getBoundingClientRect().left-300 < 0?
            0: event.target.getBoundingClientRect().left-300;
        if (window.screen.availWidth<=1400 && 
            !(page.startsWith('#listby') || page.startsWith('#alfabetrium')) )
            left = window.screen.availWidth/2 - toast.offsetWidth/2;
        top = event.target.getBoundingClientRect().top+10;

    } else {
        elem = typeof args[0].elem == "string"? document.getElementById(args[0].elem) : args[0].elem;
        toast.innerText = args[0].text;
        
        left = elem.getBoundingClientRect().left + toast.offsetWidth/2;
        top = elem.getBoundingClientRect().top+elem.offsetHeight/4;
        
        if (page.startsWith('#index')) {
            left = window.screen.width/2 - 150; 
            top = window.screen.height/4;   
        }
        if (args[0].elem == 'scrollBtn') {
                let delta = {x:250,y:50};
                if (screen.width > 999)
                    delta.x = 500;
                left =  elem.getBoundingClientRect().left - delta.x;
                top = elem.getBoundingClientRect().top -  delta.y;
        }
        if (args[0].hasOwnProperty('classes')) 
            if (args[0].classes.length > 0) 
                defaultBg = args[0].classes[0];
    }
    if (toast.classList.contains(defaultBg))
        toast.classList.remove(defaultBg);
    toast.classList.add(defaultBg);
    toast.style.opacity = 1
    toast.style.top = (top + window.scrollY)+'px';
    toast.style.left = (left + window.scrollX)+'px';
    clearTimeout(idTimeout);
    idTimeout = setTimeout(() => {
        toast.style.opacity = 0;
        toast.style.top = 0;
        toast.style.left = 0;
        toast.innerText = "";
        toast.classList.remove(defaultBg);
        idTimeout = null;
    },ms);
}

function freezeGUI(msg) {
    if (typeof msg === "string") {
        document.getElementById('overlay').hidden = false;
        document.getElementById('overlay-msg').innerText = msg;
    } else
        overlay.hidden = true;
}

async function deleteData(local = true, session = true) {
    info(null,6000,{elem:"scrollBtn",text: `Borrando datos...`,classes:['bg-red'] } );
    var dbs = null, ndbs = 0, cont = 0;
    if (local)
        localStorage.clear();
    if (session)
        sessionStorage.clear();
    if (db != null)
        await db.close();
    dbs = await indexedDB.databases();
    ndbs = dbs.length;
    if (dbs.filter(idb => idb.name.includes('lite')) ) {
        var req1 = indexedDB.deleteDatabase('wikidiffs_lite');
        req1.onsuccess = () => {
            console.log('indexedDB::wikidiffs_lite borrada');
            cont++;
            if (cont == ndbs) {
                alert('Datos borrados')
                window.location.href = 'about:blank'
            }
        }
        req1.onerror = () => console.log('error al borrar indexedDB::wikidiffs_lite');
    }
    if (dbs.filter(idb => idb.name.includes('full')) ) {
        var req2 = indexedDB.deleteDatabase('wikidiffs_full');
        req2.onsuccess = () => {
            console.log('indexedDB::wikidiffs_full borrada');
            cont++;
            if (cont == ndbs) {
                alert('Datos borrados')
                window.location.href = 'about:blank'
            }
        }
        req2.onerror = () => console.log('error al borrar indexedDB::wikidiffs_full');
    }
}
