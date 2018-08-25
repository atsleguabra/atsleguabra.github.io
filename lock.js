
const def_regex = /[a-zA-Z0-9~`!@#$%^&*\(\)\-\_\=\+\{\}\[\]\|\:\;\<\,\>\.\?]/g;


const generatePassword = (length, regex = def_regex) => {
    let input = '';
    let output = '';
    let buffer = new Uint8Array(length * 2);
    while(output.length != length) {
        let char = regex.exec(input);
        if(char === null) {
            crypto.getRandomValues(buffer);
            input = new TextDecoder('ascii').decode(buffer);
        } else {
            output += char;
        }
    }

    return output;
}

const unlock = async (file, details, key) => {
    file = await file;
    details = await details;
    file = await blobToRaw(file);
    
    let alg = { name: 'AES-CBC', iv: base64js.toByteArray(details.iv) };

    let result = await crypto.subtle.decrypt(alg, key, file);
    return new Blob([result]);
}

const blobToRaw = (blob) => {
    let reader = new FileReader();
    return new Promise(f => {
        reader.onload = () => f(reader.result);
        reader.readAsArrayBuffer(blob);
    });
}

const lock = async (file, key) => {

    file = await blobToRaw(file);

    let iv = new Uint8Array(16);
    crypto.getRandomValues(iv);
    let alg = { name: 'AES-CBC', iv: iv }

    let result = await crypto.subtle.encrypt(alg, key, file);
    return { file: new Blob([result]), details: { iv: base64js.fromByteArray(iv) }};
}

const get_key = async(password) => {
    let hash = await crypto.subtle.digest('SHA-256', new TextEncoder('utf-8').encode(password));
    return await crypto.subtle.importKey('raw', hash, { name: 'AES-CBC'}, false, ['encrypt', 'decrypt']);
}

