import * as THREE from "three"
import {Image} from "./Image.js"

const defaultMinDistance = 1;
const defaultMaxDistance = 1000;
const defaultRolloffMode = "linear";

export class Video extends Image {
    /**
     * @param {object} options
     * @param {boolean} options.webCamera default value is false
     * @param {string|undefined} options.videoUrl  if options.webCamera is true, this will be ignored
     * @param {string} options.rolloffMode acceptable value are "linear", "easeInExpo"... default value is "linear"
     * @param {number} options.minDistance Within the MinDistance, the sound will stay at loudest possible. Outside MinDistance it will begin to attenuate. Increase the MinDistance of a sound to make it ‘louder’ in a 3d world, and decrease it to make it ‘quieter’ in a 3d world.
     *                 default 1 m
     * @param {number} options.maxDistance The distance where the sound stops attenuating at. Beyond this point it will stay at the volume it would be at MaxDistance units from the listener and will not attenuate any more.
     *                 default 1000 m
     */
    constructor(options) {
        super(null);

        this._isWebCamera = options.webCamera || false;

        if (!this._isWebCamera)
            this._videoUrl = options.videoUrl;

        this._easingFunctions = {
            // no easing, no acceleration
            linear: t => t,
            easeInExpo: function (pos) {
                return (pos === 0) ? 0 : Math.pow(2, 10 * (pos - 1));
            },
            // accelerating from zero velocity
            easeInQuad: t => t * t,
            // decelerating to zero velocity
            easeOutQuad: t => t * (2 - t),
            // acceleration until halfway, then deceleration
            easeInOutQuad: t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            // accelerating from zero velocity
            easeInCubic: t => t * t * t,
            // decelerating to zero velocity
            easeOutCubic: t => (--t) * t * t + 1,
            // acceleration until halfway, then deceleration
            easeInOutCubic: t => t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
            // accelerating from zero velocity
            easeInQuart: t => t * t * t * t,
            // decelerating to zero velocity
            easeOutQuart: t => 1 - (--t) * t * t * t,
            // acceleration until halfway, then deceleration
            easeInOutQuart: t => t < .5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
            // accelerating from zero velocity
            easeInQuint: t => t * t * t * t * t,
            // decelerating to zero velocity
            easeOutQuint: t => 1 + (--t) * t * t * t * t,
            // acceleration until halfway, then deceleration
            easeInOutQuint: t => t < .5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t
        };

        this._minDistance = options.minDistance || defaultMinDistance;
        this._maxDistance = options.maxDistance || defaultMaxDistance;
        this._rolloffMode = options.rolloffMode || defaultRolloffMode;

        if (!this._easingFunctions[this._rolloffMode]) {
            throw new Error(`failed to find easing function : ${this._rolloffMode}`);
        }

        this.isVideo = true;
        this._initFirstFrame = false;

        this.setVideoTexture(options.videoUrl);

        this._transformationEnabled = true;
        this.video.muted = true;
        this.video.play();

        const onMouseDown = () => {
            if (this.isPlaying()) {
                this.pause();
            } else {
                this.play();
            }
        };

        this.addEventListener('mousedown', onMouseDown);
    }

    setVideoTexture(url) {
        let video = document.createElement('video');

        if (url) {
            video.src = url;
            video.load();
            video.loop = true;
        } else {
            // web camera

            if (navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({video: true})
                    .then(function (stream) {
                        video.srcObject = stream;
                    })
                    .catch(function (err) {
                        console.log(err.message);
                    });
            }
        }

        let videoCanvas = document.createElement('canvas');

        videoCanvas.width = 480;
        videoCanvas.height = 204;

        let videoContext = videoCanvas.getContext('2d');

        videoContext.fillStyle = '#000000';
        videoContext.fillRect(0, 0, videoCanvas.width, videoCanvas.height);

        let videoTexture = new THREE.Texture(videoCanvas);

        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;

        this.video = video;
        this.videoContext = videoContext;
        this.videoTexture = videoTexture;

        this.material.map = videoTexture;
    }

    /**
     * this will be invoked from imageTool 's update
     * @param {object} viewer
     */
    update(viewer) {
        if (!this.video)
            return;

        if (this.video.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
            this.videoContext.drawImage(this.video, 0, 0);

            if (this.videoTexture)
                this.videoTexture.needsUpdate = true;

            if (!this._initFirstFrame) {
                this._initFirstFrame = true;
                this.video.muted = false;
                this.video.pause();
            }
        }

        if (!viewer)
            return;

        this._updateAudioVolume(viewer);
    }

    _updateAudioVolume(viewer) {
        let distance = viewer.scene.cameraP.position.distanceTo(this.position);

        if (this._videoUrl && this._videoUrl.includes('mp4'))
            console.log(distance);

        let t;

        if (distance <= this._minDistance) {
            t = 0;
        } else if (distance >= this._maxDistance) {
            t = 1;
        } else {
            t = (distance - this._minDistance) / (this._maxDistance - this._minDistance);
        }

        this.video.volume = 1 - (this._easingFunctions[this._rolloffMode](t));
    }

    /*
        should be invoked from GUL event
     */
    play() {
        if (this.isPlaying()) {
            console.warn('already playing');
            return;
        }

        this.video.play();
    }

    pause() {
        if (!this.isPlaying()) {
            console.warn('not playing');
            return;
        }

        this.video.pause();
    }

    isPlaying() {
        return !!(this.video.currentTime > 0 && !this.video.paused && !this.video.ended && this.video.readyState > HTMLMediaElement.HAVE_CURRENT_DATA);
    }

    get transformationEnabled() {
        return this._transformationEnabled;
    }

    set transformationEnabled(value) {
        this._transformationEnabled = value;
    }

    get url() {
        return this._videoUrl
    }

    get minDistance() {
        return this._minDistance;
    }

    get maxDistance() {
        return this._maxDistance;
    }

    get rollOffMode() {
        return this._rolloffMode;
    }

    get isWebCamera() {
        return this._isWebCamera;
    }
}