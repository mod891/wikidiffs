async function loadFragment(what) {
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
            var js = template.content.querySelector('script');
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

loadFragment('menu');
loadFragment('footer');
route('index')

var diffUrl = ""

function route(url) {
    if (url instanceof URL) {
        if (url.href.includes('?diff=')) {
            diffUrl = url.href.split('?diff=')[1]
            url.hash = '#diffs'
        }
        loadFragment(url.hash.replace('#',''))
        history.replaceState(null,'',location.pathname)
    }
    else
        loadFragment(url)
}

window.addEventListener('hashchange', () => {
    route(new URL(window.location))
})
// window.addEventListener('popstate', (event) => {
//     console.log('← → desactivado')
// })