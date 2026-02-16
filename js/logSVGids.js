
// this script will console.log() you a list that allows you to easily programmatically access all of your .svg elements

// just run LOGSVGIDS_logAllIds(pathname, obj_name = 'svg')
// I recommend:
/*

setTimeout(() => {
    LOGSVGIDS_logAllIds([pathname], [obj_name]);
}, 1);

*/



// Example printout:
/*
        const svg = {};
        svg['Desktop - closed'] = document.getElementById('Desktop - closed');
        svg['mainMenu'] = document.getElementById('mainMenu');
        svg['HOVER'] = document.getElementById('HOVER');
        svg['VIS-HOVER'] = document.getElementById('VIS-HOVER');
        svg['VIS-RECENTER'] = document.getElementById('VIS-RECENTER');
        svg['VIS-RECENTER-HOVERED'] = document.getElementById('VIS-RECENTER-HOVERED');
        svg['Rectangle-BG'] = document.getElementById('Rectangle-BG');
        ...
*/




// Returns a promise which resolves to a string of the entire svg specified by 'path'
async function LOGSVGIDS_loadSvg(path, onLoad = (s) => { }) {
    const startTime = Date.now();
    console.log("Loading svg from " + path)
    const response = await fetch(path);
    // console.log(response);
    // returns the promise of an svg that resolves into an svg
    return response.text().then((t) => {
        // console.log("Promise resolved");
        onLoad(t);
        const timeElapsed = Date.now() - startTime;
        console.log("Loaded svg from " + path + " in " + timeElapsed + " ms.");
        // pushToStack(t);

        return t;
    });

    /*
    .err((e) => {
        console.error("Error loading SVG from " + path);
        console.error(e);
        return e;
    });*/
}
// Laziness reigns supreme:
async function LOGSVGIDS_logAllIds(path = '/svgs/Desktop\ -\ closed.svg', obj_name = 'svg') {

    const s = await LOGSVGIDS_loadSvg(path);
    const ids = [...s.matchAll(/id="([^"]*)"/g)].map(m => m[1]);
    console.log(ids);
    let t = '';
    t += `const ${obj_name} = {};\n`
    console.log(`const ${obj_name} = {};`);
    ids.forEach((i) => {
        t += `svg['${i}'] = document.getElementById('${i}');\n`;
    });
    console.log(t);
    console.log(svg);
}