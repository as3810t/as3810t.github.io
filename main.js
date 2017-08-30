const path = require('path');
const fs = require('fs');

let jsSource = [
	'./draw.js',
	'./syntax.js',
	'./infoc/infoc.js',
	'./anim.js'
];

let cssSource = [
	'./draw.css',
	'./syntax.css',
	'./infoc/infoc.css',
	'./anim.css'
];

if(fs.existsSync(path.join(__dirname, './src')) == false) {
	try {
		fs.mkdirSync(path.join(__dirname, './build'));
	}
	catch(e) {
		console.error('A célmappa létrehozására nincs jogosultság', e);
		process.exit(-1);
	}
}

console.info('CSS fájlok egyesítése\n');
let cssFile = '';
for(let i = 0; i < cssSource.length; i++) {
	try {
		console.info(cssSource[i] + ' - ' + (parseInt(((i+1) / cssSource.length) * 10000) / 100))
		cssFile += '/*' + cssSource[i] + '*/\n\n' + fs.readFileSync(path.join(__dirname, './src', cssSource[i])).toString() + '\n\n\n';
	}
	catch(e) {
		console.error('A forrásfájl nem megnyitható: ' + cssSource[i], e);
		process.exit(-1);
	}
}

try {
	fs.writeFileSync(path.join(__dirname, './build', 'default.css'), cssFile);
}
catch(e) {
	console.error('A célmappában nincs írási jogosultság', e);
	process.exit(-1);
}

console.info('\nJavaScript fájlok egyesítése\n');
let jsFile = '';
for(let i = 0; i < jsSource.length; i++) {
	try {
		console.info(jsSource[i] + ' - ' + (parseInt(((i+1) / jsSource.length) * 10000) / 100))
		jsFile += '/*' + jsSource[i] + '*/\n\n' + fs.readFileSync(path.join(__dirname, './src', jsSource[i])).toString() + '\n\n\n';
	}
	catch(e) {
		console.error('A forrásfájl nem megnyitható: ' + jsSource[i], e);
		process.exit(-1);
	}
}

try {
	jsFile = require('btoa')(encodeURIComponent(jsFile).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}
catch(e) {
	console.error('A forrásfájl nem kódolható', e);
	process.exit(-1);
}

let outFile = `
	var featureDetect = 'atob(btoa(1)); let A = class {constructor(){} F(){}}; let B = class extends A {constructor(){super();} F(){super.F();} *G() {yield 0;}}; let C = function*() {yield;};';

	try {
		eval(featureDetect);
		window.eval(decodeURIComponent(Array.prototype.map.call(atob('${jsFile}'), function(c) {
        	return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    	}).join('')));
	}
	catch(e) {
		console.log(e);
		alert('A böngésző sajnos már nem támogatott. Frissítsen újabbra.');
	}
`;

try {
	fs.writeFileSync(path.join(__dirname, './build', 'index.js'), outFile);
}
catch(e) {
	console.error('A célmappában nincs írási jogosultság', e);
	process.exit(-1);
}

console.info('\nSikeres fordítás\n\n')
