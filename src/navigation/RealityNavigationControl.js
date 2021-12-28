function defined(value) {
    return value !== undefined && value !== null;
}

const ControlModes = {
    Unknown: 'Unknown',
    EarthControl: 'EarthControl',
    OrbitControl: 'OrbitControl',
    FirstPersonControl: 'FirstPersonControl',
};

export {
    defined,
    ControlModes,
}