import {Do} from '../utils/do.js'
import {utils} from '../utils/utils.js'

// ********** class: ScrollBar ****************** //
/*
	Simple UI widget that displays a scrolltrack
	and slider, that fires some scroll events
*/
// ***********************************************

let scrollTrackStyle = {
    position: 'absolute',
    textAlign: 'center',
    cursor: 'pointer'
};

let scrollbar_style = {
    background: '-webkit-gradient(linear, left top, right top, color-stop(0.2, rgb(88,88,88)), color-stop(0.6, rgb(64,64,64)) )',
    border: '1px solid rgb(25,25,25)',
    position: 'relative',
    borderRadius: '6px'
};

function VerticalScrollbar(h, w, dispatcher) {
    let SCROLLBAR_WIDTH = w ? w : 12;
    let SCROLLBAR_MARGIN = 3;
    let SCROLL_WIDTH = SCROLLBAR_WIDTH + SCROLLBAR_MARGIN * 2;
    let MIN_BAR_LENGTH = 25;

    let root = document.createElement('div');

    root.id = "animation-editor-vertical-scrollbar";

    utils.style(root, scrollTrackStyle);

    let scrollTrackHeight = h - 2;
    root.style.height = scrollTrackHeight + 'px';
    root.style.width = SCROLL_WIDTH + 'px';

    // let scrollTop = 0;
    let scrollbar = document.createElement('div');
    // scrollbar.className = 'scrollbar';
    utils.style(scrollbar, scrollbar_style);
    scrollbar.style.width = SCROLLBAR_WIDTH + 'px';
    scrollbar.style.height = h / 2;
    scrollbar.style.top = 0;
    scrollbar.style.left = SCROLLBAR_MARGIN + 'px'; // 0; //S

    root.appendChild(scrollbar);

    let me = this;

    let bar_length, bar_y;

    // Sets lengths of scrollbar by percentage
    this.setLength = function (l) {
        // limit 0..1
        l = Math.max(Math.min(1, l), 0);
        l *= scrollTrackHeight;
        bar_length = Math.max(l, MIN_BAR_LENGTH);
        scrollbar.style.height = bar_length + 'px';
    };

    this.setHeight = function (height) {
        h = height;

        scrollTrackHeight = h - 2;
        root.style.height = scrollTrackHeight + 'px';
    };

    // Moves scrollbar to position by Percentage
    this.setPosition = function (p) {
        p = Math.max(Math.min(1, p), 0);
        let emptyTrack = scrollTrackHeight - bar_length;
        bar_y = p * emptyTrack;
        scrollbar.style.top = bar_y + 'px';
    };

    this.setLength(1);
    this.setPosition(0);
    this.onScroll = new Do();

    let mouse_down_grip;

    function onDown(event) {
        event.preventDefault();

        if (event.target == scrollbar) {
            mouse_down_grip = event.clientY;
            document.addEventListener('mousemove', onMove, false);
            document.addEventListener('mouseup', onUp, false);
        } else {
            if (event.clientY < bar_y) {
                me.onScroll.fire('pageup');
            } else if (event.clientY > (bar_y + bar_length)) {
                me.onScroll.fire('pagedown');
            }
            // if want to drag scroller to empty track instead
            // me.setPosition(event.clientY / (scrolltrackHeight - 1));
        }
    }

    function onMove(event) {
        event.preventDefault();

        // event.target == scrollbar
        let emptyTrack = scrollTrackHeight - bar_length;
        let scrollto = (event.clientY - mouse_down_grip) / emptyTrack;

        // clamp limits to 0..1
        if (scrollto > 1) scrollto = 1;
        if (scrollto < 0) scrollto = 0;
        me.setPosition(scrollto);
        me.onScroll.fire('scrollto', scrollto);
    }

    function onUp(event) {
        onMove(event);
        document.removeEventListener('mousemove', onMove, false);
        document.removeEventListener('mouseup', onUp, false);
    }

    root.addEventListener('mousedown', onDown, false);
    this.dom = root;
}

export {VerticalScrollbar}