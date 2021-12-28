
import {InputHandler, BoxVolume} from "Potree";

function overrideInputHandlerOfPotree1_8() {
    /**
     * @param e {MouseEvent}
     */
    InputHandler.prototype.onMouseDown = function (e) {
        if (this.logMessages) console.log(this.constructor.name + ': onMouseDown');

        e.preventDefault();

        let consumed = false;
        let consume = () => { return consumed = true; };
        if (this.hoveredElements.length === 0) {
            for (let inputListener of this.getSortedListeners()) {
                inputListener.dispatchEvent({
                    type: 'mousedown',
                    viewer: this.viewer,
                    mouse: this.mouse
                    // start reality logic
                    ,button: e.button,
                    ctrlKey: e.ctrlKey
                    // end reality logic
                });
            }
        }
        else if (this.hoveredElements.length === 1) {
            const hoveredObject = this.hoveredElements[0].object;

            if(hoveredObject instanceof BoxVolume) {
                if (hoveredObject.clip) {
                    for (let inputListener of this.getSortedListeners()) {
                        inputListener.dispatchEvent({
                            type: 'mousedown',
                            viewer: this.viewer,
                            mouse: this.mouse
                            // start reality logic
                            ,button: e.button,
                            ctrlKey: e.ctrlKey
                            // end reality logic
                        });
                    }
                }
            }
        }
        else{
            for(let hovered of this.hoveredElements){
                let object = hovered.object;
                object.dispatchEvent({
                    type: 'mousedown',
                    viewer: this.viewer,
                    consume: consume
                });

                if(consumed){
                    break;
                }
            }
        }

        if (!this.drag) {
            let target = this.hoveredElements
                .find(el => (
                    el.object._listeners &&
                    el.object._listeners['drag'] &&
                    el.object._listeners['drag'].length > 0));

            if (target) {
                this.startDragging(target.object, {location: target.point});
            } else {
                this.startDragging(null);
            }
        }

        if (this.scene) {
            this.viewStart = this.scene.view.clone();
        }
    };

    /**
     * @param e {MouseEvent}
     */
    InputHandler.prototype.onMouseMove = function(e) {
        e.preventDefault();

        let rect = this.domElement.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        this.mouse.set(x, y);

        let hoveredElements = this.getHoveredElements();
        if(hoveredElements.length > 0){
            let names = hoveredElements.map(h => h.object.name).join(", ");
            if (this.logMessages) console.log(`${this.constructor.name}: onMouseMove; hovered: '${names}'`);
        }

        if (this.drag) {
            this.drag.mouse = e.buttons;

            this.drag.lastDrag.x = x - this.drag.end.x;
            this.drag.lastDrag.y = y - this.drag.end.y;

            this.drag.end.set(x, y);

            if (this.drag.object) {
                if (this.logMessages) console.log(this.constructor.name + ': drag: ' + this.drag.object.name);
                this.drag.object.dispatchEvent({
                    type: 'drag',
                    drag: this.drag,
                    viewer: this.viewer
                    // start reality logic
                    , ctrlKey: e.ctrlKey
                    // end
                });
            } else {
                if (this.logMessages) console.log(this.constructor.name + ': drag: ');

                let dragConsumed = false;
                for (let inputListener of this.getSortedListeners()) {
                    inputListener.dispatchEvent({
                        type: 'drag',
                        drag: this.drag,
                        viewer: this.viewer,
                        consume: () => {dragConsumed = true;}
                        // start reality logic
                        , ctrlKey: e.ctrlKey
                        // end
                    });

                    if(dragConsumed){
                        break;
                    }
                }
            }
        }else{
            let curr = hoveredElements.map(a => a.object).find(a => true);
            let prev = this.hoveredElements.map(a => a.object).find(a => true);

            if(curr !== prev){
                if(curr){
                    if (this.logMessages) console.log(`${this.constructor.name}: mouseover: ${curr.name}`);
                    curr.dispatchEvent({
                        type: 'mouseover',
                        object: curr,
                    });
                }
                if(prev){
                    if (this.logMessages) console.log(`${this.constructor.name}: mouseleave: ${prev.name}`);
                    prev.dispatchEvent({
                        type: 'mouseleave',
                        object: prev,
                    });
                }
            }

            if(hoveredElements.length > 0){
                let object = hoveredElements
                    .map(e => e.object)
                    .find(e => (e._listeners && e._listeners['mousemove']));

                if(object){
                    object.dispatchEvent({
                        type: 'mousemove',
                        object: object
                    });
                }
            }

        }

        // for (let inputListener of this.getSortedListeners()) {
        // 	inputListener.dispatchEvent({
        // 		type: 'mousemove',
        // 		object: null
        // 	});
        // }


        this.hoveredElements = hoveredElements;
    }
}

export {overrideInputHandlerOfPotree1_8}