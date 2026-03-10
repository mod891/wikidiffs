async function loadFragment(what) {
    const fragments = [ 'menu','footer']
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

async function mockDiffs() {
    try {
        var dataRequest = await fetch(`/public/js/db/data-diff-prettyfier-arr.json`); // remote db query
    } catch (err) {
        console.log(`mockDiffs::data retrieving Error:`,err);
    }
    try {
        var fragmentRequest = await fetch(`/public/components/diffs.html`);
    } catch (err) {
        console.log(`mockDiffs::fragmentRequest Error:`,err);
    }
     // simulate loading...
    if (fragmentRequest.ok && dataRequest.ok) {
        
        data = await dataRequest.text();
        datahc = { // make propper db query retrieve hc data with diffs
            user:'dinosaurio',
            datetime:'31/12/1999 23:59',
            article_url:'https//www.kipedia.com/articulo-tope-molon',
        } 
        html = await fragmentRequest.text();
        
        var template = document.createElement('template');
        template.innerHTML = html;
        var fragment = template.content.querySelector(`#diffs`)  
        

        var css = template.content.querySelector('style');
        document.head.appendChild(css);

        var js = template.content.querySelector('script');
        script = document.createElement('script');
        script.textContent = js.innerHTML;
        script.defer = true;

        jsonObjects = JSON.parse(data);
        var nextDiffBtn = false;
        if (data.length > 0) {
            if (data.length > 1) {
                console.log('store next diffs')
                nextDiffBtn = true;
            }

            // for o no for, guardar las otras diffs e ir cargando y actualizando el observer con nuevos datos
            currentDiff = jsonObjects[1];
            
            diffHeader =`
            <div class="diff">
                <div class="wrap-diff-header">
                    <div class="diff-header">
                        <span id="datetime">
                            <label class="mr05">Fecha</label><b id="datetime-data">${datahc.datetime}</b>
                        </span>
                        <span id="user">
                            <label class="mr05">por</label><b id="user-data"><a href="#">${datahc.user}</a></b> 
                        </span>
                        <span id="article-url">
                            <a id="article-url-data" href="${datahc.article_url}">titulo del articulo</a>
                        </span>
                    </div>            
                </div>
            </div>
            <div class="lines"></div>`
            var template = document.createElement('template');
            template.innerHTML = diffHeader;
            fragment.innerHTML = template.innerHTML

            for (let i=0; i<currentDiff.changes.length; i++) {
                change = currentDiff.changes[i];
                lineno = `<div class="lineno">
                            <label class="ml05r">linea <b>${change.lineno}</b></label>
                            <div class="addel-content"></div>`

                fragment.querySelectorAll('.lines')[fragment.querySelectorAll('.lines').length-1].innerHTML += lineno
                for (let j=0; j<change.change.length; j++) {
                    addels = change.change[j]
                    addelDiv = fragment.querySelectorAll('.addel-content')[fragment.querySelectorAll('.addel-content').length-1]
                    var text = '';
                    if (Object.keys(addels.del).length > 0) {
                        if (addels.del.hasOwnProperty('text')) { 
                            text = addels.del.text
                        } else 
                            text = addels.del
                        del = `<div class="del"><p>${text}</p></div>`
                        addelDiv.innerHTML += del
                    }
                    if (Object.keys(addels.add).length > 0) {
                        if (addels.add.hasOwnProperty('text')) {      
                            text = addels.add.text
                        } else 
                            text = addels.add
                        add = `<div class="add"><p>${text}</p></div>`
                        addelDiv.innerHTML += add
                    }
                }
            }
            document.getElementById(`diffs-fragment`).innerHTML = fragment.innerHTML;
            document.head.appendChild(script);           
        } 
    }     
}

loadFragment('menu');
loadFragment('footer');
if (window.location.href.includes('diffs.html'))
    mockDiffs()

