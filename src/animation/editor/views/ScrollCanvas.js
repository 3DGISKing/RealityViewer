import {Theme} from '../theme.js'

/* This is the top bar where it shows a horizontal scrolls as well as a custom view port */

function Rect() {

}

Rect.prototype.set = function (x, y, w, h, color, outline) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.color = color;
    this.outline = outline;
};

Rect.prototype.paint = function (ctx) {
    ctx.fillStyle = Theme.b;
    ctx.strokeStyle = Theme.c;

    this.shape(ctx);

    ctx.stroke();
    ctx.fill();
};

Rect.prototype.shape = function (ctx) {
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.w, this.h);
};

Rect.prototype.contains = function (x, y) {
    return x >= this.x && y >= this.y && x <= this.x + this.w && y <= this.y + this.h;
};

function ScrollCanvas(dispatcher, dataStore) {
    let width, height;

    this.setSize = function (w, h) {
        width = w;
        height = h;
    };

    const MARGINS = 0;

    let scroller = {
        left: 0,
        grip_length: 0,
        k: 1
    };

    let scrollRect = new Rect();

    this.paint = function (ctx) {
        let totalTime = dataStore.get('ui:totalTime').value;
        let scrollTime = dataStore.get('ui:scrollTime').value;
        let currentTime = dataStore.get('ui:currentTime').value;

        let pixels_per_second = dataStore.get('ui:timeScale').value;

        ctx.save();
        let dpr = window.devicePixelRatio;
        ctx.scale(dpr, dpr);

        let w = width - 2 * MARGINS;
        let h = 16; // TOP_SCROLL_TRACK;

        ctx.clearRect(0, 0, width, height);
        ctx.translate(MARGINS, 0);

        // outline scroller
        ctx.beginPath();
        ctx.strokeStyle = Theme.b;
        ctx.rect(0, 0, w, h);
        ctx.stroke();

        let totalTimePixels = totalTime * pixels_per_second;
        let k = w / totalTimePixels;
        scroller.k = k;

        let gripLength = w * k;

        scroller.grip_length = gripLength;

        scroller.left = scrollTime / totalTime * w;

        scrollRect.set(scroller.left, 0, scroller.grip_length, h);
        scrollRect.paint(ctx);

        let r = currentTime / totalTime * w;

        ctx.fillStyle = Theme.c;
        ctx.lineWidth = 2;

        ctx.beginPath();

        // line
        ctx.rect(r, 0, 2, h + 5);
        ctx.fill();

        ctx.fillText(currentTime && currentTime.toFixed(2), r, h + 14);
        ctx.fillText(totalTime, 300, 14);

        ctx.restore();
    };

    /** Handles dragging for scroll bar **/

    let draggingx = null;

    this.onDown = function (e) {
        if (scrollRect.contains(e.offsetx - MARGINS, e.offsety - 5)) {
            draggingx = scroller.left;
            return;
        }

        let totalTime = dataStore.get('ui:totalTime').value;
        let w = width - 2 * MARGINS;

        let t = (e.offsetx - MARGINS) / w * totalTime;

        dispatcher.fire('time.update', t);

        if (e.preventDefault)
            e.preventDefault();
    };

    this.onMove = function move(e) {
        if (draggingx != null) {
            let totalTime = dataStore.get('ui:totalTime').value;
            let w = width - 2 * MARGINS;
            let scrollTime = (draggingx + e.dx) / w * totalTime;

            console.log(scrollTime, draggingx, e.dx, scroller.grip_length, w);

            if (draggingx + e.dx + scroller.grip_length > w)
                return;

            dispatcher.fire('update.scrollTime', scrollTime);

        } else {
            this.onDown(e);
        }
    };

    this.onUp = function (e) {
        draggingx = null;
    };

    /*** End handling for scrollbar ***/
}

export {ScrollCanvas}