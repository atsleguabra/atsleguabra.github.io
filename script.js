
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

let add_input_listeners = (i) => {
    i.hadBlur = true;

    i.addEventListener('blur', function(e) {
        this.hadBlur = true;
        this.setSelectionRange(0,0);
    })

    i.addEventListener('click', function(e) {
        if(this.hadBlur) this.select();
        this.hadBlur = false;
    }, true);
}

let p;
{
    let openedbox_ui;
    let openedbox = null;
    let box_key = null;
    let counter = 0;

    let file;
    let details;

    let add_entry = (i) => {
        [id, i] = i;
        let box_contents = document.querySelector('.entries');
        let template = document.querySelector('#entry-template');
        let entry = template.content.cloneNode(true).querySelector('.entry');
        console.log(entry);
        entry['entry-name'].value = i.name;
        entry['entry-password'].value = i.password;
        entry['entry-id'].value = id;
        entry['entry-title'].value = i.title;
        entry['entry-password'].addEventListener('copy', function(e) {
            if(this.type === 'password') {
                e.preventDefault();
                e.clipboardData.setData('text/plain', this.value);
            }
        })

        entry.querySelectorAll('.entry-copy').forEach(it => {
            it.addEventListener('click', () => {
                let target = entry[it.dataset['copy']];
                console.log(it.dataset);
                target.select();
                document.execCommand('copy');
            })
        });

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
         if(val === true) {
            let db = openedbox.contents.get(parseInt(entry['entry-id'].value));
            db.name = entry['entry-name'].value;
            db.password = entry['entry-password'].value;
            db.title = entry['entry-title'].value;
         }
         entry.querySelector('.entry-passopt').classList.remove('active');
         entry['entry-name'].readOnly = val;
         entry['entry-password'].readOnly = val;
         entry['entry-title'].readOnly = val;
         entry.querySelector('.entry-toggle-passopt').classList.toggle('hidden', val);
         entry.querySelector('.entry-delete').classList.toggle('hidden', val);
         this.classList.toggle('fa-pen', val);
         this.classList.toggle('fa-check-circle', !val);
        });
        entry.querySelector('.entry-delete').addEventListener('click', () => {
            if(confirm('are you sure?')) {
                openedbox.contents.delete(parseInt(entry['entry-id'].value));
                entry.classList.add('del');
                entry.addEventListener('animationend', () => {
                    entry.remove();
                });
            }
        })
        entry['entry-passopt-gen'].addEventListener('click', () => {
             entry['entry-password'].value = generatePassword(entry['entry-passopt-length'].value, 
                         new RegExp(`[${escapeRegExp(entry['entry-passopt-symbols'].value)}]`, 'g'));
             //entry.querySelector('.entry-passopt').classList.remove('active');
        })
        box_contents.prepend(entry);
        return entry;
    }

    let open_ui = () => {
        p = openedbox;
        console.log(openedbox);
        let additem_form = document.querySelector('#additem');
        let box_contents = document.querySelector('.entries');
        let template = document.querySelector('#entry-template');
        openedbox_ui.style.visibility = 'visible';
        if(openedbox.contents === undefined) openedbox.contents = [];
        openedbox.contents = new Map(openedbox.contents.map(x => [counter++, x]));
        let entries = [];
        for(let i of openedbox.contents) {
           entries.push(add_entry(i));
        }
        setTimeout(() => {
            document.querySelector('#credentials').classList.add('float-out');
            document.querySelector('#credentials').addEventListener('animationend', () => {
                document.querySelector('.login-view').remove();
            })
            let delay = openedbox.contents.size * 0.2 + 0.3;

            console.log(delay);
            let actions = document.querySelector('.actions');
            actions.style['transition-delay'] = delay + 0.5 + 's';

            entries.forEach(e => {
                e.style['animation-delay'] = delay + 's';
                delay -= 0.2;
                e.classList.add('show')
            })
            actions.classList.add('show');
        }, 500);
        document.querySelector('.add-entry').addEventListener('click', () => {
            let i = [counter++, { name: '', password: '', title: ''}];
            openedbox.contents.set(i[0], i[1]);
            let entry = add_entry(i);
            entry.classList.add('show-imm');
            window.scroll({ top: 0, behavior: 'instant'});
            entry.querySelector('.entry-edit').click();
            //entry.querySelector('.entry-passopt').classList.add('active');
            entry['entry-name'].focus();
        })
        document.querySelector('#save').addEventListener('click',() => {
            let contents = openedbox.contents;
            openedbox.contents = [...openedbox.contents.values()];
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
                    alert('saved!');
                } catch(e) {
                    throw e;
                } finally {
                    openedbox.contents = contents;
                }
            })();
        })
        document.querySelector('#change-pass').addEventListener('click', () => {
            let pass = prompt('enter new password: ');
            let second = prompt('repeat password: ');
            if(pass !== second) {
                alert('Passwords dont match!');
                return;
            }
           get_key(pass).then(key => {
               box_key = key;
               alert('success!');
           });
        })
    }

    let auth = async(credentials) => {
        file = await load(file_url);
        details = await loadJSON(details_url);
        
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