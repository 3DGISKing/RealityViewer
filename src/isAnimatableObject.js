import {Measure} from "Potree";
import {Image} from "./Image.js";

function isAnimatableObject(object) {
    if (object instanceof Image) {
        if (!object.transformationEnabled)
            return false;
    }

    if (object instanceof Measure) {
        return false;
    }

    if(object.transformationEnabled === false)
        return false;

    return true;
}

export {isAnimatableObject}