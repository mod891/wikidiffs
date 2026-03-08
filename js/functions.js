async function loadFragment(what) {
    const fragments = [ 'menu','footer','diffs' ]
    if (fragments.includes(what)) { // coincidir con html id
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
            document.getElementById(`${what}-fragment`).innerHTML = fragment.innerHTML;
    
            if (css)
                document.head.appendChild(css);
            if (js) {
                script = document.createElement('script');
                script.textContent = js.innerHTML;
                script.defer = true;
                document.head.appendChild(script);
            }
        }
    } else {
        console.log('ERR: choose wisely')
    }
}

function mockDiffs() {
    
}

loadFragment('menu');
loadFragment('footer');

