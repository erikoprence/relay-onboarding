import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const web=new URL('../web/',import.meta.url);
const read=name=>readFileSync(new URL(name,web),'utf8');
let html=read('index.html').replace('<html lang="en">','<html lang="en" data-portable>');
html=html.replace('<link rel="stylesheet" href="ui.css">',()=>'<style>'+read('ui.css')+'</style>');
html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,file)=>'<script>'+read(file)+'</script>');
const target=new URL('../Relay-Demo.html',import.meta.url);writeFileSync(target,html);console.log(fileURLToPath(target));
