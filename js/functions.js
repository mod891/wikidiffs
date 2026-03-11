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
        html = await fragmentRequest.text();
        datahc = { // make propper db query retrieve hc data with diffs
            user:'dinosaurio',
            datetime:'31/12/1999 23:59',
            article_url:'https//www.kipedia.com/articulo-tope-molon',
        } 
        
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
            if (data.length > 1) 
                nextDiffBtn = true;
        
            for (let d=0; d<jsonObjects.length; d++) {
                // for o no for, guardar las otras diffs e ir cargando y actualizando el observer con nuevos datos
                skip=[0,1,2,3]
                if (d in skip)
                    console.log('iteration',d)
                currentDiff = jsonObjects[d];
                diffHeader =`
                <div class="diff">
                    <div class="wrap-diff-header">
                        <div class="diff-header">
                            <span id="datetime">
                                <label class="mr05">Fecha</label><b id="datetime-data">${datahc.datetime}</b></span>
                            <span id="user">
                                <label class="mr05">por</label><b id="user-data"><a href="#">${datahc.user}</a></b></span> 
                            <span id="article-url">
                                <a id="article-url-data" href="${datahc.article_url}">titulo del articulo</a></span>
                    </div></div></div>
                <div class="lines"></div>`
                var template = document.createElement('template');
                template.innerHTML = diffHeader;
                fragment.innerHTML = template.innerHTML

                for (let i=0; i<currentDiff.changes.length; i++) {
                    change = currentDiff.changes[i];
                    lineno = `<div class="lineno">
                                <div class="lineno-data">
                                    <label class="ml05r">linea <b>${change.lineno}</b></label>
                                </div><div class="addel-content"></div>`
                                

                    fragment.querySelectorAll('.lines')[fragment.querySelectorAll('.lines').length-1].innerHTML += lineno
                    var aux = [];
                    for (let j=0; j<change.change.length; j++) {
                        addels = change.change[j]
                        addelDiv = fragment.querySelectorAll('.addel-content')[fragment.querySelectorAll('.addel-content').length-1]
                        collapsableDiv().forEach(item => aux.push(item))
                    }
                }
                document.getElementById(`diffs-fragment`).innerHTML += fragment.innerHTML;
                console.log('append scriptx4!!!!!!!!!!') 
                document.head.appendChild(script);
                
                if (nextDiffBtn) {
                    diffsData = jsonObjects;
                    diffTexts.push(...aux)
                }
            }           
        } 
    }     
}
function collapsableDiv() {
    var objStruct = {
        id: '',
        shortText: '',
        fullText: '',
    };
    var objs = [];
    keys = Object.keys(addels)
    for (i in keys) {
        if (Object.keys(addels[keys[i]]).length > 0) {
            obj = { ...objStruct}
            idCont++;
            if (addels[keys[i]].hasOwnProperty('text')) 
                text = addels[keys[i]].text
            else 
                text = addels[keys[i]]
            
            obj.id = "text"+idCont 
            if (text.length > 300) {
                obj.shortText = text.substr(0,300)+"... <a href='#' onClick='changeText(this)'><b>{más}</b></a>";
                obj.fullText = text+" <a href='#' onClick='changeText(this)'><b>{menos}</b></a>";
            } else {
                obj.shortText = text;
                obj.fullText = null;
            }
            addelDiv.innerHTML += `<div id="text${idCont}" class="${keys[i]}"><p>${obj.shortText} </p></div>`
            objs.push(obj)
        }
    }
    return objs;
}
function changeText(obj) {
    div = obj.parentElement.parentElement
    if (obj.textContent == '{menos}') {
        diffTexts.map( (it) =>  {
            if (it.id == div.id) 
                div.children[0].innerHTML = it.shortText            
        })
    } else {
        diffTexts.map( (it) =>  {
            if (it.id == div.id) 
                div.children[0].innerHTML = it.fullText // ojo, que se puede hacer cross site scripting xss
        })         
    }
}

loadFragment('menu');
loadFragment('footer');
if (window.location.href.includes('diffs.html')) {
    var idCont = 0;
    mockDiffs()
}
