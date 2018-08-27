
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
    return string.replace(/[.*+?^${}()|[\]]/g, '\\$&'); // $& means the whole matched string
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
        let box_contents = document.querySelector('.entries');
        let template = document.querySelector('#entry-template');
        openedbox_ui.style.visibility = 'visible';
        if(openedbox.contents === undefined) openedbox.contents = [];
        for(let i of openedbox.contents) {
           let entry = template.content.cloneNode(true).querySelector('.entry');
           console.log(entry);
           entry['entry-name'].value = i.name;
           entry['entry-password'].value = i.password;
           entry.querySelector('.entry-toggle-passopt').addEventListener('click', () => {
               entry.querySelector('.entry-passopt').classList.toggle('active');
           })
           entry.querySelector('.entry-view-password').addEventListener('click', function() {
               if(entry['entry-password'].type == 'text') {
                    entry['entry-password'].type = 'password';
                    this.classList.add('fa-eye');
                    this.classList.remove('fa-eye-slash');
               } else {
                    entry['entry-password'].type = 'text';
                    this.classList.remove('fa-eye');
                    this.classList.add('fa-eye-slash');
               }
           });
           entry.querySelector('.entry-edit').addEventListener('click', function() {
            let val = true;
            if(this.classList.contains('fa-pen')) val = !val;
            entry.querySelector('.entry-passopt').classList.remove('active');
            entry['entry-name'].readOnly = val;
            entry['entry-password'].readOnly = val;
            entry['entry-title'].readOnly = val;
            entry.querySelector('.entry-toggle-passopt').classList.toggle('hidden', val);
            entry.querySelector('.entry-delete').classList.toggle('hidden', val);
            this.classList.toggle('fa-pen', val);
            this.classList.toggle('fa-check-circle', !val);
           });
           entry['entry-passopt-gen'].addEventListener('click', () => {
                entry['entry-password'].value = generatePassword(entry['entry-passopt-length'].value, 
                            new RegExp(`[${escapeRegExp(entry['entry-passopt-symbols'].value)}]`, 'g'));
                //entry.querySelector('.entry-passopt').classList.remove('active');
           })
           box_contents.append(entry);
           console.log('hello');
        }
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