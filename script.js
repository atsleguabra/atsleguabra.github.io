
const load = async (url) => {
    let response = await fetch(url);
    return await response.blob();
}

const loadJSON = async(url) => {
    let r = await fetch(url);
    return await r.json();
}

const blobToText = (blob) => {
    return new Promise(f => {
        let r = new FileReader;
        r.onload = () => {
            f(r.result);
        }
        r.readAsText(blob);
    });
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

const file_url = 'https://dl.dropboxusercontent.com/s/be8m60vnacny8lv/lockbox.json';
const details_url = 'https://dl.dropboxusercontent.com/s/jacsnse9epvpip4/details.json';

{
    let openedbox_ui;
    let openedbox = null;
    let box_key = null;

    let open_ui = () => {
        console.log(openedbox);
        let additem_form = document.querySelector('#additem');
        let box_contents = document.querySelector('#boxcontents');
        openedbox_ui.style.visibility = 'visible';
        if(openedbox.contents === undefined) openedbox.contents = [];
        for(let i of openedbox.contents) {
            let row = document.createElement('tr');
            {
                let name = document.createElement('td');
                name.innerText = i.name;
                let pass = document.createElement('td');
                pass.innerText = i.password;
                let select = document.createElement('td');
                let btn = document.createElement('button');
                row.append(name);
                row.append(pass);
                btn.innerText = 'Izvēlēties';
                btn.addEventListener('click', () => {
                    let range = document.createRange();
                    console.log(pass);
                    range.selectNodeContents(pass);
                    let selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                })
                select.append(btn);
                row.append(select);
            }
            box_contents.append(row);
        }
        additem_form.addEventListener('submit', e => {
            e.preventDefault();
            openedbox.contents.push({ name: additem_form.name.value, password: additem_form.password.value });
            let row = document.createElement('tr');
            {
                let name = document.createElement('td');
                name.innerText = additem_form.name.value;
                let pass = document.createElement('td');
                pass.innerText = additem_form.password.value;
                row.append(name);
                row.append(pass);
                let select = document.createElement('td');
                let btn = document.createElement('button');
                btn.innerText = 'Izvēlēties';
                btn.addEventListener('click', () => {
                    let range = document.createRange();
                    console.log(pass);
                    range.selectNodeContents(pass);
                    let selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                })
                select.append(btn);
                row.append(select);
            }
            box_contents.append(row);
        })
        document.querySelector('#makepass').addEventListener('click', () => {
            console.log('ya');
            additem_form.password.value = 
            generatePassword(additem_form.len.value, new RegExp(`[${escapeRegExp(additem_form.regex.value)}]`, 'g'));
        })
        document.querySelector('#save').addEventListener('click',() => {
            (async () => {
                try {
                    let lockedbox = await lock(new Blob([ JSON.stringify(openedbox)]), box_key);
                    let dropbox = new Dropbox.Dropbox({ accessToken: openedbox.access.oauth });
                    await dropbox.filesUpload({
                        contents: lockedbox.file,
                        path: '/lockbox.json',
                        mode: {
                            '.tag': 'overwrite'
                        },
                        autorename: false,
                        mute: true
                    });
                    await dropbox.filesUpload({
                        contents: new Blob([ JSON.stringify(lockedbox.details)]),
                        path: '/details.json',
                        mode: {
                            '.tag': 'overwrite'
                        },
                        autorename: false,
                        mute: true
                    })
                    console.log('saved');
                } catch(e) {
                    throw e;
                }
            })();
        })
    }

    let auth = async(credentials) => {
        let file = await load(file_url);
        let details = await loadJSON(details_url);
        
        let key = await get_key(credentials.password.value);
        try {
            let contents = await blobToText(await unlock(file, details, key));
            openedbox = JSON.parse(contents);
            box_key = key; 
            open_ui();
        } catch(e) {
            credentials.password.classList.add('incorrect');
        }
    }

    window.onload = () => {
        openedbox_ui = document.querySelector('.openedbox');
        document.querySelector('#credentials').addEventListener('submit', function(e) {
            this.password.classList.remove('incorrect');
            e.preventDefault();
            if(openedbox !== null) return;
            auth(this);
        })
}

}