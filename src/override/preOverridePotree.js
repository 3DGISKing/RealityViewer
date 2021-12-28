import {overrideInputHandlerOfPotree1_8} from "./overrideInputHandlerOfPotree1_8.js";
import {overrideTransformationToolOfPotree1_8} from "./overrideTransformationToolOfPotree1_8.js";
import {overrideViewer} from "./overrideViewer.js";
import {overrideUpdatePointClouds} from "./overrideUpdatePointClouds.js";
import {overridePointCloudOctreeNode} from "./overridePointCloudOctreeNode.js";
import {overrideConfig} from "./config.js"
import {overrideMeasuringTool} from "./overrideMeasuringTool.js";

function preOverridePotree() {
    overrideViewer();
    overrideInputHandlerOfPotree1_8();
    overrideTransformationToolOfPotree1_8();
    overridePointCloudOctreeNode();

    if(overrideConfig.overrideLoaderLogic)
        overrideUpdatePointClouds();

    overrideMeasuringTool();
}

export {preOverridePotree}