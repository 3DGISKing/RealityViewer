const defaultWheelSpeed = 1;
const defaultTranslationSpeed = 100;
const defaultPanSpeed = 1;
const defaultRotationSpeed = 10;

class NavigationConfig{
    constructor() {
        this._wheelSpeed = defaultWheelSpeed;
        this._movingSpeed = defaultTranslationSpeed;
        this._panSpeed = defaultPanSpeed;
        this._firstPersonRotaionSpeed = defaultRotationSpeed;
        this._thirdPersonRotaionSpeed = defaultRotationSpeed;
    }

    get wheelSpeed() {
        return this._wheelSpeed;
    }

    set wheelSpeed(speed) {
        this._wheelSpeed = speed;
    }

    get translationSpeed() {
        return this._movingSpeed;
    }

    set translationSpeed(speed) {
        this._movingSpeed = speed;
    }

    get panSpeed() {
        return this._panSpeed;
    }

    set panSpeed(speed) {
        this._panSpeed = speed;
    }

    get firstPersonRotationSpeed() {
        return this._firstPersonRotaionSpeed;
    }

    set firstPersonRotationSpeed(speed) {
        this._firstPersonRotaionSpeed = speed;
    }

    get thirdPersonRotationSpeed() {
        return this._thirdPersonRotaionSpeed;
    }

    set thirdPersonRotationSpeed(speed) {
        this._thirdPersonRotaionSpeed = speed;
    }
}

const navigationConfig = new NavigationConfig();

export {
    NavigationConfig,
    navigationConfig
}