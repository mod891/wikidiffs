var getVal = ""
init()

async function loadFragment(what) {
    what = what.replace('#','').replace(/\?.*/,'');
    console.log('what:',what)
    const fragments = [ 'menu','footer','index','alfabetrium','diffs','listby']
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
                for (let i=2; i<oldCssJs.length; i++) {
                    oldCssJs[i].remove()
                }
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
function init() {
    loadFragment('menu');
    loadFragment('footer');
    route()
}
function route() {
    getVal = ""
    url = new URL(window.location)
    if (url.hash.split('?').length > 1) 
        getVal = url.hash.split('?')[1].split('=')[1]
    loadFragment(url.hash)
}
window.addEventListener('hashchange', () => {
    route()
})