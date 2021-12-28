import {matchedRealityVersion} from "Potree";
import {version} from  "./version.js"

console.log('Reality', version);

if(matchedRealityVersion !== version) {
    console.error('detected unmatched potree!');
}
else {
    console.info('found matched potree version!');
}

let scriptPath = "";

if (document.currentScript && document.currentScript.src) {
    scriptPath = new URL(document.currentScript.src + '/..').href;
    if (scriptPath.slice(-1) === '/') {
        scriptPath = scriptPath.slice(0, -1);
    }
} else if(import.meta){
    scriptPath = new URL(import.meta.url + "/..").href;
    if (scriptPath.slice(-1) === '/') {
        scriptPath = scriptPath.slice(0, -1);
    }
}else {
    console.error('Reality was unable to find its script path using document.currentScript. Is Potree included with a script tag? Does your browser support this function?');
}

let resourcePath = scriptPath + '/resources';

export {scriptPath, resourcePath};

export * from "./Export.js"
export * from "./Image.js"
export * from "./Video.js"
export * from "./initialize"
export * from "./animation/editor/Timeliner.js"
export * from "./override/preOverridePotree.js"
export * from "./override/postOverridePotree.js"
export * from "./2d_dfx_export/TwoDDxfExport.js"
export * from "./2d_dfx_export/debugShowProjectPlaneForBoxVolume.js"
export * from "./navigation/NavigationConfig.js"