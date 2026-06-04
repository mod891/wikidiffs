var getVal = "";
var idTimeout = "";
var categories = "";

init()

async function loadFragment(what) {
    what = what.replace('#','').replace(/\?.*/,'');
    // console.log('what:',what)
    const fragments = [ 'menu','footer','index','alfabetrium','diffs','listby','users','categories','notes'];
    if (fragments.includes(what)) {
        try {
            var request = await fetch(`/public/components/${what}.html`);
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
    await loadFragment('menu');
    await loadFragment('footer');
    await fetchSharedData();
    const scrollTopBtn = document.getElementById('scrollBtn');

    scrollTopBtn.addEventListener('click', ()=> {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        })
    })
    window.addEventListener('scroll', () => {
    if (window.scrollY > 200) 
        scrollTopBtn.classList.add('show');
     else 
        scrollTopBtn.classList.remove('show');
    })
    route()
}

function route() {
    getVal = ""
    url = new URL(window.location);
    if (url.hash.length == 0)
        url.hash = "#index"
    if (url.hash.split('?').length > 1) 
        getVal = url.hash.split('?')[1].split('=')[1];
    loadFragment(url.hash);
}
window.addEventListener('hashchange', () => {
    route();
})

function info(event,ms=5000,...args) {
    var toast = document.getElementById('toast');
    let left = 0, top = 0,x=0, y=0, defaultBg='bg-yellow';
    var text = "brief_description of some link selected in the article_url";
    let elem = 'li';
    clearTimeout(idTimeout);
    // await query('urlInfo',url)
    if (args.length == 0) {
        if (Array.from(event.target.classList).includes('fixed-corner'))
            elem = 'span.bg-reddiff';
        left = event.target.closest(elem).getBoundingClientRect().left;
        top = event.target.closest(elem).getBoundingClientRect().top;
    } else {
        elem = args[0].elem;
        if (args[0].hasOwnProperty('x'))
            x = args[0].x
        if (args[0].hasOwnProperty('y'))
            y = args[0].y
        left = elem.getBoundingClientRect().left + y;
        top = elem.getBoundingClientRect().top + x;
        text = args[0].text;
        if (args[0].hasOwnProperty('classes')) {
            if (args[0].classes.length > 0) 
                defaultBg = args[0].classes[0];
        }
    }
    if (toast.classList.contains(defaultBg))
        toast.classList.remove(defaultBg);
    toast.classList.add(defaultBg);
    toast.innerText = text;
    toast.style.opacity = 1
    toast.style.top = (top + window.scrollY)+'px';
    toast.style.left = (left + window.scrollX)+'px';
    idTimeout = setTimeout(() => {
        toast.style.opacity = 0
        toast.style.top = 0;
        toast.style.left = 0;
        toast.innerText = "";
        toast.classList.remove(defaultBg);
    },ms);
}

