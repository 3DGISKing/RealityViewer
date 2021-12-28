import {Scene} from "Potree";

function overrideScene() {
    Scene.prototype.addImage = function (image) {
        this.images.push(image);
        this.dispatchEvent({
            'type': 'image_added',
            'scene': this,
            'image': image
        });
    };

    Scene.prototype.removeAllImages = function () {
        while (this.images.length > 0) {
            this.removeImage(this.images[0]);
        }
    };

    Scene.prototype.removeImage = function (image) {
        let index = this.images.indexOf(image);

        if (index > -1) {
            this.images.splice(index, 1);

            this.dispatchEvent({
                'type': 'image_removed',
                'scene': this,
                'image': image
            });
        }
    }
}

export {overrideScene}