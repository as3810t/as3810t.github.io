var OwlDraw = (function() {
	'use strict';
	const DURATION = 0.5;
	const XMLNS = "http://www.w3.org/2000/svg";

	/**
	 * Class representing the logic of canvas
	 *
	 * @property {Object} options - Settings for the canvas
	 * @property {number} options.width - The width of the canvas in SVG pixels
	 * @property {number} options.height - The height of the canvas in SVG pixels
	 * @property {boolean} options.cast - True if the present DOM elements should be parsed to canvas
	 * @property {Element} container - DOM element of the canvas (SVGElement)
	 * @property {OwlDraw.element[]} elements - List of elements that are drawn to the canvas
	 */
	class OwlDraw {
		/**
		 * Initializes the canvas
		 * @param {string} id - id of SVG DOM element, that is the canvas
		 * @param {Object} options - Options
		 * @param {number} options.width - The width of the canvas in SVG pixels
		 * @param {number} options.height - The height of the canvas in SVG pixels
		 * @param {boolean} options.cast - True if the present DOM elements should be parsed to canvas elements
		 */
		constructor(id, options) {
			if(options == undefined) options = {};
			this.options = options;

			this.container = document.getElementById(id);
			this.container.classList.add('draw');
			this.container.setAttribute('viewBox', '0 0 ' + (options.width || 640) + ' ' + (options.height || 480));

			let defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
			defs.innerHTML = '\
				<marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"> \
					<path d="M0,0 L0,6 L9,3 z" stroke="context-stroke"/>\
				</marker>';
			this.container.appendChild(defs);

			this.elements = [];

			if(options.cast == true) {
				for(let i = 0; i < this.container.children.length; i++) {
					this.elements.push(new OwlDraw.element(this.container.children[0]));
				}
			}
		}

		/**
		 * Adds an elements or elements to the canvas
		 * @param {(OwlDraw.element)} element - An element, that will be added to the canvas
		 */
		add(element) {
			this.elements.push(element);
			for(let i = 0; i < element.container.length; i++) {
				this.container.appendChild(element.container[i]);
			}
		}

		/**
		 * Removes all the elements from canvas
		 */
		clear() {
			let e = this.container.querySelectorAll('g');
			for(let i = 0; i < e.length; i++) {
				this.container.removeChild(e[i]);
			}
		}
	}

	/**
	 * Base class representing an element on canvas
	 * @memberof OwlDraw
	 *
	 * @property {Element[]} container - Array of DOM elements (SVGElement) that are added to the svg DOM
 connected, if 2, then the ending part (the one with the arrowhead)
	 * @property {number} x - The x-coordinate of element
	 * @property {number} y - The y-coordinate of element
	 */
	OwlDraw.element = class {
		/**
		 * Creates an element on canvas
		 * @param {(string|Element)} mode - The base of element. Id string, that the DOM element with the same id will be parsed, if instanceof Element, than that element will be parsed
		 */
		constructor(mode) {
			this.container = [];
			this.connections = [];

			this.x = 0; this.y = 0;

			if(typeof mode == 'string') this.container[0] = this.container.getElementById(mode);
			else if(mode instanceof Element) this.container[0] = mode;
		}

		/**
		 * Highlightes an element, by addin a class with the name 'highlight-{id} to the class list. Removes all other highlightes on the element.
		 * @param {string} id - The name of highlight (part of class name)
		 */
		highlight(id) {
			this.unhighlight();
			for(let i = 0; i < this.container.length; i++) {
				this.container[i].classList.add('highlight-' + id);
			}
		}
		/**
		 * Removes all highlightes from element
		 */
		unhighlight() {
			for(let i = 0; i < this.container.length; i++) {
				let list = this.container[i].classList;
				for(let j = 0; j < list.length; j++) {
					if(list[j].search('highlight') != -1) this.container[i].classList.remove(list[j]);
				}
			}
		}

		/**
		 * Hides an element. (opacity = 0, not removed from DOM)
		 */
		hide() {
			for(let i = 0; i < this.container.length; i++) {
				this.container[i].style.opacity = 0;
			}
		}
		/**
		 * Shows an element. (opacity = 1, not added to DOM)
		 */
		show() {
			for(let i = 0; i < this.container.length; i++) {
				this.container[i].style.opacity = 1;
			}
		}

		/**
		 * Moves the element, and updates the position data. Also moves the connected lines, arrows.
		 * @param {Object} opt - Data describing the transition
		 * @param {number} [opt.x] - If defined, the x-coordinate of position will be this value
		 * @param {number} [opt.y] - If defined, the y-coordinate of position will be this value
		 * @param {number} [opt.dx] - If defined, the x-coordinate of position will be increased by this value
		 * @param {number} [opt.dy] - If defined, the y-coordinate of position will be increased by this value
		 */
		move(opt) {
			if(opt.x != undefined) {
				this.x = opt.x; this.y = opt.y;
			}
			else if(opt.dx != undefined) {
				this.x += opt.dx; this.y += opt.dy;
			}
			for(let i = 0; i < this.container.length; i++) {
				this.container[i].setAttributeNS(null, 'transform', 'translate(' + this.x + ', ' + this.y + ')');
			}
		}
	}

	/**
	 * Base class representing an element on canvas
	 * @memberof OwlDraw
	 * @extends OwlDraw.element
	 * @property {Element[]} container - Array of DOM elements (SVGElement) that are added to the svg DOM
	 * @property {Object[]} connections - List of lines, arrows, that are connected to the element and move with it.
	 * @property {OwlDraw.line} connections.object - The line or arrow, that will be connected
	 * @property {number} connections.type - If 1, than the beginning part of line or arrow will be connected, if 2, then the ending part (the one with the arrowhead)
	 * @property {number} x - The x-coordinate of element
	 * @property {number} y - The y-coordinate of element
	 */
	OwlDraw.connectable = class extends OwlDraw.element {
		/**
		 * Creates a connectable element on canvas. An element is connectable, if it can be the end or beginning of an arrow.
		 * @param {(string|Element)} mode - The base of element. Id string, that the DOM element with the same id will be parsed, if instanceof Element, than that element will be parsed
		 */
		constructor(mode) {
			super(mode);
			this.connections = [];
		}

		/**
		 * Connects a line, or arrow to the element. To apply, the element must be of type {OwlDraw.circle}, {OwlDraw.rect}, {OwlDraw.pointer}.
		 * @param {OwlDraw.line} object - The line or arrow, that will be connected
		 * @param {number} type - If 1, than the beginning part of line or arrow will be connected, if 2, then the ending part (the one with the arrowhead)
		 */
		connect(object, type) {
			this.connections.push({object: object, type: type});
		}

		/**
		 * Unconnects a line, or arrow from the element, that equals the parameters
		 * @param {OwlDraw.line} object - The line or arrow, that will be unconnected
		 * @param {number} type - If 1, than the beginning part of line or arrow will be unconnected, if 2, then the ending part (the one with the arrowhead)
		 */
		unconnect(object, type) {
			for(let i = 0; i < this.connections.length; i++) {
				if(this.connections[i].object == object && this.connections[i].type == type) {
					this.connections.splice(i, 1);
				}
			}
		}

		/**
		 * Returns the coordinates of connection point
		 * @param {string} fromp - The positionof connection ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 */
		getConnection(fromp) {
			throw new Error('Not implmented');
		}

		/**
		 * Moves the element, and updates the position data. Also moves the connected lines, arrows.
		 * @param {Object} opt - Data describing the transition
		 * @param {number} [opt.x] - If defined, the x-coordinate of position will be this value
		 * @param {number} [opt.y] - If defined, the y-coordinate of position will be this value
		 * @param {number} [opt.dx] - If defined, the x-coordinate of position will be increased by this value
		 * @param {number} [opt.dy] - If defined, the y-coordinate of position will be increased by this value
		 */
		move(opt) {
			super.move(opt);

			for(let i = 0; i < this.connections.length; i++) {
				if(this.connections[i].type == 1) {
					this.connections[i].object.move({dx1: opt.dx, dy1: opt.dy, x1: opt.x, y1: opt.y});
				}
				else if(this.connections[i].type == 2) {
					this.connections[i].object.move({dx2: opt.dx, dy2: opt.dy, x2: opt.x, y2: opt.y});
				}
			}
		}
	}

	/**
	 * Class representing a group of elements
	 * @memberof OwlDraw
	 *
	 * @property {Element[]} container - Array of DOM elements (SVGElement) that are added to the svg DOM
	 * @property {OwlDraw.element[]} elems - List of elements in the group
	 */
	OwlDraw.group = class extends OwlDraw.element {
		/**
		 * Creating the group
		 * @param {OwlDraw.element[]} elems - List of elements in the group
		 */
		constructor(elems) {
			super();
			this.elems = elems || [];
			for(let i = 0; i < this.elems.length; i++) {
				for(let j = 0; j < this.elems[i].container.length; j++) {
					this.container.push(this.elems[i].container[j]);
				}
			}
		}

		/**
		 * Adding element(s) to the group
		 * @param {OwlDraw.element|OwlDraw.elements[]} elements - An element or array of elements that will be added to the group
		 */
		add(elements) {
			if(elements instanceof OwlDraw.element) {
				this.elems.push(elements);
				for(let i = 0; i < elements.container.length; i++) {
					this.container.push(elements.container[i]);
				}
			}
			else if(elements instanceof Array) {
				this.elems = this.elems.concat(elements);
				for(let i = 0; i < elements.length; i++) {
					for(let j = 0; j < elements[i].container.length; j++) {
						this.container.push(elements[i].container[j]);
					}
				}
			}
		}

		/**
		 * Removes an element from the group
		 * @param {OwlDraw.element|number} element - If instance of OwlDraw.element, than the element equals to the parameter will be removed, if a number, the element with corresponding index will be removed.
		 */
		remove(element) {
			if(element instanceof OwlDraw.element && this.elements.indexOf(element) != -1) {
				this.elems.splice(this.elems.indexOf(element), 1);
				element.hide();
			}
			else if(typeof element == 'number') {
				this.elems[element].hide();
				this.elems.splice(element, 1);
			}
		}

		/**
		 * Highlightes all the elements in the group.
		 * @param {Object} opt - It will be passed to all of the elements (see {@link OwlDraw.element#highlight})
		 */
		highlight(opt) {
			for(let i = 0; i < this.elems.length; i++) {
				this.elems[i].highlight(opt);
			}
		}

		/**
		 * Unhighlightes all the elements in the group.
		 * @param {Object} opt - It will be passed to all of the elements (see {@link OwlDraw.element#unhighlight})
		 */
		unhighlight(opt) {
			for(let i = 0; i < this.elems.length; i++) {
				this.elems[i].unhighlight(opt);
			}
		}

		/**
		 * Hides all elements in group (see {@link OwlDraw.element#hide})
		 */
		hide() {
			for(let i = 0; i < this.elems.length; i++) {
				this.elems[i].hide();
			}
		}

		/**
		 * Shows all elements in group (see {@link OwlDraw.element#show})
		 */
		show() {
			for(let i = 0; i < this.elems.length; i++) {
				this.elems[i].show();
			}
		}

		/**
		 * Moves all the elements in the group.
		 * @param {Object} opt - It will be passed to all of the elements (see {@link OwlDraw.element#move})
		 */
		move(opt) {
			for(let i = 0; i < this.elems.length; i++) {
				this.elems[i].move(opt);
			}
		}
	}

	/********************************************
	* Primitives
	*******************************************/

	/**
	 * Class representing a circle
	 * @memberof OwlDraw
	 * @extends OwlDraw.connectable
	 *
	 * @property {Element[]} container - Array of DOM elements (SVGElement) that are added to the svg DOM
	 * @property {Object[]} connections - List of lines, arrows, that are connected to the element and move with it.
	 * @property {(OwlDraw.line|OwlDraw.arrow|OwlDraw.niceArrow)} connections.object - The line or arrow, that will be connected
	 * @property {number} connections.type - If 1, than the beginning part of line or arrow will be connected, if 2, then the ending part (the one with the arrowhead)
	 * @property {number} x - The x-coordinate of element
	 * @property {number} y - The y-coordinate of element
	 * @property {number} radius - The radius of the circle
	 */
	OwlDraw.circle = class extends OwlDraw.connectable {
		/**
		 * Creates a circle
		 * @param {(string|Element|Object)} mode - Data describing the circle (see {@link OwlDraw.element})
		 * @param {number} mode.x - x-coordinate of the center of circle
		 * @param {number} mode.y - y-coordinate of the center of circle
		 * @param {number} mode.radius - radius of circle
		 * @param {string} [mode.class] - list of class that will be added to the DOM element
		 * @param {string} [mode.stroke] - color of stroke, that applies to the circle
		 * @param {number} [mode.strokeWidth] - width of stroke, that applies to the circle
		 * @param {string} [mode.fill] - color of fill, that applies to the circle
		 * @param {string} [mode.txt] - text to be displayed in the center of circle
		 */
		constructor(mode) {
			super(mode);

			if(typeof mode == 'object') {
				let g = document.createElementNS(XMLNS, 'g');

				this.x = mode.x; this.y = mode.y; this.radius = mode.radius;
				g.setAttributeNS(null, 'transform', 'translate(' + mode.x + ', ' + mode.y + ')');
				if(mode.class) g.setAttributeNS(null, 'class', mode.class);
				g.classList.add('circle');

				let circle = document.createElementNS(XMLNS, 'circle');
				circle.setAttributeNS(null, 'r', mode.radius);
				circle.style.stroke = mode.stroke || '';
				circle.style.strokeWidth = mode.strokeWidth || '';
				circle.style.fill = mode.fill || '';
				g.appendChild(circle);

				this.text = document.createElementNS(XMLNS, 'text');
				if(mode.txt != undefined) this.text.innerHTML = mode.txt;
				g.appendChild(this.text);

				this.container.push(g);
			}
		}

		/**
		 * Returns the coordinates of connection point
		 * @param {string} fromp - The position of connection ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 * @returns {Object} data - The position of connection
		 * @returns {number} data.x - The x-coordinate of connection
		 * @returns {number} data.y - The y-coordinate of connection
		 */
		getConnection(fromp) {
			let x = (fromp == 'l' ? this.x-this.radius-2 : (fromp == 'r' ? this.x+this.radius+2 : this.x));
			let y = (fromp == 'u' ? this.y-this.radius-2 : (fromp == 'd' ? this.y+this.radius+2 : this.y));
			return {x:x, y:y};
		}

		/**
		 * Sets the text in the circle
		 * @param {string} txt - The text to set
		 */
		setText(txt) {
			this.text.innerHTML = txt;
		}
	}

	/**
	 * Class representing a rectangle
	 * @memberof OwlDraw
	 * @extends OwlDraw.connectable
	 *
	 * @property {Element[]} container - Array of DOM elements (SVGElement) that are added to the svg DOM
	 * @property {Object[]} connections - List of lines, arrows, that are connected to the element and move with it.
	 * @property {(OwlDraw.line|OwlDraw.arrow|OwlDraw.niceArrow)} connections.object - The line or arrow, that will be connected
	 * @property {number} connections.type - If 1, than the beginning part of line or arrow will be connected, if 2, then the ending part (the one with the arrowhead)
	 * @property {number} x - The top-left x-coordinate of element
	 * @property {number} y - The top-left y-coordinate of element
	 * @property {number} x2 - The bottom-right x-coordinate of element
	 * @property {number} y2 - The bottom-right y-coordinate of element
	 * @property {number} width - The width of the element
	 * @property {number} height - The height of the element
	 */
	OwlDraw.rect = class extends OwlDraw.connectable {
		/**
		 * Creates a rectangle
		 * @param {(string|Element|Object)} mode - Data describing the rectangle (see {@link OwlDraw.element})
		 * @param {number} mode.x - top-left x-coordinate of the rectangle
		 * @param {number} mode.y - top-left y-coordinate of the rectangle
		 * @param {number} [mode.width] - width of the rectangle
		 * @param {number} [mode.height] - height of the rectangle
		 * @param {number} [mode.x2] - bottom-right x-coordinate of the rectangle
		 * @param {number} [mode.y2] - bottom-right y-coordinate of the rectangle
		 * @param {string} [mode.class] - list of class that will be added to the DOM element
		 * @param {string} [mode.stroke] - color of stroke, that applies to the rectangle
		 * @param {number} [mode.strokeWidth] - width of stroke, that applies to the rectangle
		 * @param {string} [mode.fill] - color of fill, that applies to the rectangle
		 * @param {string} [mode.txt] - text to be displayed in the center of rectangle
		 * @param {string} [mode.borderRadius] - this borderRadius of the rectangle
		 */
		constructor(mode) {
			super(mode);

			if(typeof mode == 'object') {
				let g = document.createElementNS(XMLNS, 'g');

				this.x = mode.x; this.y = mode.y;
				this.width = mode.width || (mode.x2 - this.x); this.height = mode.height || (mode.y2 - this.y);
				this.x2 = this.x + this.width; this.y2 = this.y + this.height;
				g.setAttributeNS(null, 'transform', 'translate(' + mode.x + ', ' + mode.y + ')');
				if(mode.class) g.setAttributeNS(null, 'class', mode.class);
				g.classList.add('rect');

				let rect = document.createElementNS(XMLNS, 'rect');
				rect.setAttributeNS(null, 'width', this.width);
				rect.setAttributeNS(null, 'height', this.height);
				rect.setAttributeNS(null, 'rx', mode.borderRadius || 0);
				rect.setAttributeNS(null, 'ry', mode.borderRadius || 0);
				rect.style.stroke = mode.stroke || '';
				rect.style.strokeWidth = mode.strokeWidth || '';
				rect.style.fill = mode.fill || '';
				g.appendChild(rect);

				this.text = document.createElementNS(XMLNS, 'text');
				this.text.innerHTML = mode.txt || '';
				this.text.setAttributeNS(null, 'x', (this.width/2) + 'px');
				this.text.setAttributeNS(null, 'y', (this.height/2) + 'px');
				g.appendChild(this.text);

				this.container.push(g);
			}
		}

		/**
		 * Moves the element, and updates the position data. Also moves the connected lines, arrows. (see {@link OwlDraw.element#move})
		 * @param {Object} opt - Data describing the transition
		 * @param {number} [opt.x] - If defined, the x-coordinate of position will be this value
		 * @param {number} [opt.y] - If defined, the y-coordinate of position will be this value
		 * @param {number} [opt.dx] - If defined, the x-coordinate of position will be increased by this value
		 * @param {number} [opt.dy] - If defined, the y-coordinate of position will be increased by this
		 */
		move(opt) {
			super.move(opt);

			if(opt.x != undefined) {
				this.x2 = opt.x + this.width; this.y2 = opt.y + this.height;
			}
			else if(opt.dx != undefined) {
				this.x2 += opt.dx; this.y2 += opt.dy;
			}
		}

		/**
		 * Returns the coordinates of connection point
		 * @param {string} fromp - The position of connection ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 * @returns {Object} data - The position of connection
		 * @returns {number} data.x - The x-coordinate of connection
		 * @returns {number} data.y - The y-coordinate of connection
		 */
		getConnection(fromp) {
			let x = (fromp == 'l' ? this.x : (fromp == 'r' ? this.x2 : ((this.x + this.x2) / 2)));
			let y = (fromp == 'u' ? this.y : (fromp == 'd' ? this.y2 : ((this.y + this.y2) / 2)));
			return {x:x, y:y};
		}

		/**
		 * Sets the text in the circle
		 * @param {string} txt - The text to set
		 */
		setText(txt) {
			this.text.innerHTML = txt;
		}
	}

	/**
	 * Class representing a line
	 * @memberof OwlDraw
	 * @extends OwlDraw.element
	 *
	 * @property {Element[]} container - Array of DOM elements (SVGElement) that are added to the svg DOM
	 * @property {number} [x1] - The x-coordinate of beginning of line
	 * @property {number} [y1] - The y-coordinate of beginning of line
	 * @property {number} [x2] - The x-coordinate of end of line
	 * @property {number} [y2] - The y-coordinate of end of line
	 * @property {OwlDraw.connectable} [from] - The element, the line will be drawn from.
	 * @property {string} [fromp] - The position, the arrow will be line from ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
	 * @property {OwlDraw.connectable|null} [to] - The element, the line will be drawn to.
	 * @property {string} [top] - The position, the line will be drawn to ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
	 */
	OwlDraw.line = class extends OwlDraw.element {
		/**
		 * Creating an arrow
		 * @param {Object} mode - Data describing the line
		 * @param {number} [mode.x1] - The x-coordinate of beginning of line
		 * @param {number} [mode.y1] - The y-coordinate of beginning of line
		 * @param {number} [mode.x2] - The x-coordinate of end of line
		 * @param {number} [mode.y2] - The y-coordinate of end of line
		 * @param {OwlDraw.connectable} [mode.from] - The element, the line will be drawn from
		 * @param {string} [mode.fromp] - The position, the line will be drawn from ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 * @param {OwlDraw.connectable|null} [mode.to] - The element, the line will be drawn to. If null, than the arrow is invisible.
		 * @param {string} [mode.top] - The position, the line will be drawn to ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 * @param {string} [mode.class] - list of class that will be added to the DOM element
		 * @param {string} [mode.stroke] - color of stroke, that applies to the line
		 * @param {number} [mode.strokeWidth] - width of stroke, that applies to the line
		 */
		constructor(mode) {
			super(mode);

			if(typeof mode == 'object' && mode.x1 != undefined) {
				let g = document.createElementNS(XMLNS, 'g');

				this.x1 = mode.x1; this.y1 = mode.y1;
				this.x2 = mode.x2; this.y2 = mode.y2;
				if(mode.class) g.setAttributeNS(null, 'class', mode.class);
				g.classList.add('line');

				let line = document.createElementNS(XMLNS, 'line');
				line.setAttributeNS(null, 'x1', this.x1);
				line.setAttributeNS(null, 'y1', this.y1);
				line.setAttributeNS(null, 'x2', this.x2);
				line.setAttributeNS(null, 'y2', this.y2);
				line.style.stroke = mode.stroke || '';
				line.style.strokeWidth = mode.strokeWidth || '';
				g.appendChild(line);

				this.container.push(g);
			}

			if(typeof mode == 'object' && mode.from != undefined) {
				let g = document.createElementNS(XMLNS, 'g');

				this.x1 = mode.from.getConnection(mode.fromp).x;
				this.y1 = mode.from.getConnection(mode.fromp).y;
				if(mode.bind != false) mode.from.connect(this, 1);
				this.from = mode.from;

				if(mode.to) this.x2 = mode.to.getConnection(mode.top).x;
				if(mode.to) this.y2 = mode.to.getConnection(mode.top).y;
				if(mode.bind != false && mode.to != null) {
					mode.to.connect(this, 2);
					this.to = mode.to;
				}
				else if(mode.bind != false && mode.to == null) {
					mode.from.connect(this, 2);
					this.to = mode.from;
				}

				if(mode.class) g.setAttributeNS(null, 'class', mode.class);
				g.classList.add('arrow');
				if(mode.to == null) g.style.display = 'none';

				let line = document.createElementNS(XMLNS, 'line');
				line.setAttributeNS(null, 'x1', this.x1);
				line.setAttributeNS(null, 'y1', this.y1);
				line.setAttributeNS(null, 'x2', this.x2 || (this.x2 = this.x1));
				line.setAttributeNS(null, 'y2', this.y2 || (this.y2 = this.y1));
				line.style.stroke = mode.stroke || '';
				line.style.strokeWidth = mode.strokeWidth || '';
				g.appendChild(line);

				this.container.push(g);
			}
		}

		/**
		 * Moves the line. Each of the end points can be moved separately and simultaneously, or the whole line can be moved. Either x1 and y1, dx1 and dy1, x2 and y2, dx2 and dy2 or dx and dy must be defined.
		 * @param {DrawLineMoveOpt} opt - Data describing the transition
		 * @param {number} [opt.x1] - New x-coordinate of the point of beginning
		 * @param {number} [opt.y1] - New y-coordinate of the point of beginning
		 * @param {number} [opt.dx1] - The value will be added to the x-coordinate of the point of beginning
		 * @param {number} [opt.dy1] - The value will be added to the y-coordinate of the point of beginning
		 * @param {number} [opt.x2] - New x-coordinate of the point of ending
		 * @param {number} [opt.y2] - New y-coordinate of the point of ending
		 * @param {number} [opt.dx2] - The value will be added to the x-coordinate of the point of ending
		 * @param {number} [opt.dy2] - The value will be added to the y-coordinate of the point of ending
		 * @param {number} [opt.dx] - The value will be added to the x-coordinate of both the point of ending and beginning
		 * @param {number} [opt.dy] - The value will be added to the y-coordinate of both the point of ending and beginning
		 */
		move(opt) {
			let ox1 = this.x1, oy1 = this.y1, ox2 = this.x2, oy2 = this.y2;

			if(opt.x1 != undefined) {
				this.x1 = opt.x1;
				this.y1 = opt.y1;
			}
			else if(opt.dx1 != undefined) {
				this.x1 += opt.dx1;
				this.y1 += opt.dy1;
			}
			else if(opt.dx != undefined) {
				this.x1 += opt.dx;
				this.y1 += opt.dy;
			}

			if(opt.x2 != undefined) {
				this.x2 = opt.x2;
				this.y2 = opt.y2;
			}
			else if(opt.dx2 != undefined) {
				this.x2 += opt.dx2;
				this.y2 += opt.dy2;
			}
			else if(opt.dx != undefined) {
				this.x2 += opt.dx;
				this.y2 += opt.dy;
			}

			let animate0 = document.createElementNS(XMLNS, 'animate');
			animate0.setAttributeNS(null, 'attributeName', 'x1');
			animate0.setAttributeNS(null, 'from', ox1);
			animate0.setAttributeNS(null, 'to', this.x1);
			animate0.setAttributeNS(null, 'dur', DURATION + 's');
			animate0.setAttributeNS(null, 'begin', 'indefinite');
			animate0.setAttributeNS(null, 'fill', 'freeze');

			let animate1 = document.createElementNS(XMLNS, 'animate');
			animate1.setAttributeNS(null, 'attributeName', 'y1');
			animate1.setAttributeNS(null, 'from', oy1);
			animate1.setAttributeNS(null, 'to', this.y1);
			animate1.setAttributeNS(null, 'dur', DURATION + 's');
			animate1.setAttributeNS(null, 'begin', 'indefinite');
			animate1.setAttributeNS(null, 'fill', 'freeze');

			let animate2 = document.createElementNS(XMLNS, 'animate');
			animate2.setAttributeNS(null, 'attributeName', 'x2');
			animate2.setAttributeNS(null, 'from', ox2);
			animate2.setAttributeNS(null, 'to', this.x2);
			animate2.setAttributeNS(null, 'dur', DURATION + 's');
			animate2.setAttributeNS(null, 'begin', 'indefinite');
			animate2.setAttributeNS(null, 'fill', 'freeze');

			let animate3 = document.createElementNS(XMLNS, 'animate');
			animate3.setAttributeNS(null, 'attributeName', 'y2');
			animate3.setAttributeNS(null, 'from', oy2);
			animate3.setAttributeNS(null, 'to', this.y2);
			animate3.setAttributeNS(null, 'dur', DURATION + 's');
			animate3.setAttributeNS(null, 'begin', 'indefinite');
			animate3.setAttributeNS(null, 'fill', 'freeze');

			if(opt.x1 != undefined || opt.dx1 != undefined || opt.dy != undefined) {
				this.container[0].children[0].appendChild(animate0);
				this.container[0].children[0].appendChild(animate1);
				animate0.beginElement();
				animate1.beginElement();
			}
			if(opt.x2 != undefined || opt.dx2 != undefined || opt.dy != undefined) {
				this.container[0].children[0].appendChild(animate2);
				this.container[0].children[0].appendChild(animate3);
				animate2.beginElement();
				animate3.beginElement();
			}

			setTimeout(() => {
				if(opt.x1 != undefined || opt.dx1 != undefined || opt.dy != undefined) {
					this.container[0].children[0].removeChild(animate0);
					this.container[0].children[0].removeChild(animate1);
					this.container[0].children[0].setAttributeNS(null, 'x1', this.x1);
					this.container[0].children[0].setAttributeNS(null, 'y1', this.y1);
				}
				if(opt.x2 != undefined || opt.dx2 != undefined || opt.dy != undefined) {
					this.container[0].children[0].removeChild(animate2);
					this.container[0].children[0].removeChild(animate3);
					this.container[0].children[0].setAttributeNS(null, 'x2', this.x2);
					this.container[0].children[0].setAttributeNS(null, 'y2', this.y2);
				}
			}, DURATION * 1000);
		}

		/**
		 * Binds the arrow to a begginning element and ending element
		 *
		 * @param {Object} mode - The object describing the binding
		 * @param {OwlDraw.connectable} [mode.from] - The element, the arrow will be drawn from
		 * @param {string} [mode.fromp] - The position, the arrow will be drawn from ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 * @param {OwlDraw.connectable|null} [mode.to] - The element, the arrow will be drawn to. If null, than the arrow is invisible.
		 * @param {string} [mode.top] - The position, the arrow will be drawn to ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 */
		bind(mode) {
			this.container[0].style.display = 'inline';
			if(this.from instanceof OwlDraw.element) {
				this.from.unconnect(this, 1);
			}
			if(mode != undefined && mode.from != undefined) {
				let ox1 = this.x1, oy1 = this.y1, nx1, ny1;
				this.fromp = mode.fromp || this.fromp;
				nx1 = mode.from.getConnection(mode.fromp).x;
				ny1 = mode.from.getConnection(mode.fromp).y;
				this.move({dx1: nx1 - ox1, dy1: ny1 - oy1, fromp: this.fromp});
				this.from = mode.from;
			}
			else if(mode != undefined && mode.fromp != undefined) {
				let ox1 = this.x1, oy1 = this.y1, nx1, ny1;
				this.fromp = mode.fromp || this.fromp;
				nx1 = this.from.getConnection(mode.fromp).x;
				ny1 = this.from.getConnection(mode.fromp).y;
				this.move({dx1: nx1 - ox1, dy1: ny1 - oy1, fromp: this.fromp});
			}
			if(this.from instanceof OwlDraw.element) {
				this.from.connect(this, 1);
			}

			if(this.to instanceof OwlDraw.element) {
				this.to.unconnect(this, 2);
			}
			if(mode != undefined && mode.to != undefined && mode.to != null) {
				let ox2 = this.x2, oy2 = this.y2, nx2, ny2;
				this.top = mode.top || this.top;
				nx2 = mode.to.getConnection(mode.top).x;
				ny2 = mode.to.getConnection(mode.top).y;
				this.move({dx2: nx2 - ox2, dy2: ny2 - oy2, top: this.top});
				this.to = mode.to;
			}
			else if(mode != undefined && mode.to == null) {
				this.move({x2: this.x1, y2: this.y2});
				this.container[0].style.display = 'none';
			}
			if(this.to instanceof OwlDraw.element) {
				this.to.connect(this, 2);
			}
		}

		/**
		 * Removes the bind from the arrow. It follows, that the arrow will not move, when the element it is pointed to or pointed from is moved
		 */
		unbind() {
			if(this.from instanceof OwlDraw.element) {
				this.from.unconnect(this, 1);
			}
			if(this.to instanceof OwlDraw.element) {
				this.to.unconnect(this, 2);
			}
		}
	}

	/**
	 * Class representing an arrow
	 * @memberof OwlDraw
	 * @extends OwlDraw.line
	 *
	 * @property {Element[]} container - Array of DOM elements (SVGElement) that are added to the svg DOM
	 * @property {number} [x1] - The x-coordinate of beginning of arrow
	 * @property {number} [y1] - The y-coordinate of beginning of arrow
	 * @property {number} [x2] - The x-coordinate of end of arrow
	 * @property {number} [y2] - The y-coordinate of end of arrow
	 * @property {OwlDraw.connectable} [from] - The element, the arrow will be drawn from.
	 * @property {string} [fromp] - The position, the arrow will be drawn from ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
	 * @property {OwlDraw.connectable|null} [to] - The element, the arrow will be drawn to.
	 * @property {string} [top] - The position, the arrow will be drawn to ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
	 */
	OwlDraw.arrow = class extends OwlDraw.line {
		/**
		 * Creating an arrow
		 * @param {Object} mode - Data describing the arrow
		 * @param {number} [mode.x1] - The x-coordinate of beginning of arrow
		 * @param {number} [mode.y1] - The y-coordinate of beginning of arrow
		 * @param {number} [mode.x2] - The x-coordinate of end of arrow
		 * @param {number} [mode.y2] - The y-coordinate of end of arrow
		 * @param {OwlDraw.connectable} [mode.from] - The element, the arrow will be drawn from
		 * @param {string} [mode.fromp] - The position, the arrow will be drawn from ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 * @param {OwlDraw.connectable|null} [mode.to] - The element, the arrow will be drawn to. If null, than the arrow is invisible.
		 * @param {string} [mode.top] - The position, the arrow will be drawn to ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 * @param {string} [mode.class] - list of class that will be added to the DOM element
		 * @param {string} [mode.stroke] - color of stroke, that applies to the arrow
		 * @param {number} [mode.strokeWidth] - width of stroke, that applies to the arrow
		 */
		constructor(mode) {
			super(mode);

			this.container[0].setAttributeNS(null, 'marker-end', 'url(#arrow)');
			this.container[0].classList.remove('line');
			this.container[0].classList.add('arrow');
		}
	}

	/**
	 * Class representing a bezier arrow
	 * @memberof OwlDraw
	 * @extends OwlDraw.arrow
	 *
	 * @property {Element[]} container - Array of DOM elements (SVGElement) that are added to the svg DOM
	 * @property {number} x1 - The x-coordinate of beginning of line
	 * @property {number} y1 - The y-coordinate of beginning of line
	 * @property {number} x2 - The x-coordinate of end of line
	 * @property {number} y2 - The y-coordinate of end of line
	 * @property {OwlDraw.connectable} [from] - The element, the arrow will be drawn from.
	 * @property {string} [fromp] - The position, the arrow will be drawn from ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
	 * @property {OwlDraw.connectable|null} [to] - The element, the arrow will be drawn to.
	 * @property {string} [top] - The position, the arrow will be drawn to ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
	 */
	OwlDraw.niceArrow = class extends OwlDraw.arrow {
		/**
		 * Creating a bezier arrow
		 * @param {Object} mode - Data describing the line
		 * @param {number} [mode.x1] - The x-coordinate of beginning of arrow
		 * @param {number} [mode.y1] - The y-coordinate of beginning of arrow
		 * @param {number} [mode.x2] - The x-coordinate of end of arrow
		 * @param {number} [mode.y2] - The y-coordinate of end of arrow
		 * @param {OwlDraw.element} [mode.from] - The element, the arrow will be drawn from
		 * @param {string} [mode.fromp] - The position, the arrow will be drawn from ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 * @param {OwlDraw.element|null} [mode.to] - The element, the arrow will be drawn to. If null, than the arrow is invisible.
		 * @param {string} [mode.top] - The position, the arrow will be drawn to ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 * @param {string} [mode.class] - list of class that will be added to the DOM element
		 * @param {string} [mode.stroke] - color of stroke, that applies to the arrow
		 * @param {number} [mode.strokeWidth] - width of stroke, that applies to the arrow
		 */
		constructor(mode) {
			super(mode);

			let g = this.container[0];
			g.innerHTML = '';

			g.classList.remove('arrow');
			g.classList.add('niceArrow');
			if(mode.to == null) g.style.display = 'none';

			let path = document.createElementNS(XMLNS, 'path');

			let dx = Math.abs(this.x2 - this.x1);
			let dy = Math.abs(this.y2 - this.y1);
			let d = 'M' + this.x1 + ' ' + this.y1 + ' C ';
			this.fromp = mode.fromp; this.top = mode.top;

			if(mode.fromp == 'l') d += (this.x1 - dx/1.5) + ' ' + this.y1 + ', ';
			else if(mode.fromp == 'r') d += (this.x1 + dx/1.5) + ' ' + this.y1 + ', ';
			else if(mode.fromp == 'u') d += this.x1 + ' ' + (this.y1 - dy/1.5) + ', ';
			else d += this.x1 + ' ' + (this.y1 + dy/1.5) + ', ';

			if(mode.top == 'l') d += (this.x2 - dx/1.5) + ' ' + this.y2 + ', ';
			else if(mode.top == 'r') d += (this.x2 + dx/1.5) + ' ' + this.y2 + ', ';
			else if(mode.top == 'u') d += this.x2 + ' ' + (this.y2 - dy/1.5) + ', ';
			else d += this.x2 + ' ' + (this.y2 + dy/1.5) + ', ';

			d += this.x2 + ' ' + this.y2;
			path.setAttributeNS(null, 'd', d);

			path.style.stroke = mode.stroke || '';
			path.style.strokeWidth = mode.strokeWidth || '';
			path.style.fill = 'transparent';

			g.appendChild(path);
		}

		/**
		 * Moves the arrow. Each of the end points can be moved separately and simultaneously, or the whole line can be moved. Either x1 and y1, dx1 and dy1, x2 and y2, dx2 and dy2 or dx and dy must be defined.
		 * @param {DrawLineMoveOpt} opt - Data describing the transition
		 * @param {number} [opt.x1] - New x-coordinate of the point of beginning
		 * @param {number} [opt.y1] - New y-coordinate of the point of beginning
		 * @param {number} [opt.dx1] - The value will be added to the x-coordinate of the point of beginning
		 * @param {number} [opt.dy1] - The value will be added to the y-coordinate of the point of beginning
		 * @param {number} [opt.x2] - New x-coordinate of the point of ending
		 * @param {number} [opt.y2] - New y-coordinate of the point of ending
		 * @param {number} [opt.dx2] - The value will be added to the x-coordinate of the point of ending
		 * @param {number} [opt.dy2] - The value will be added to the y-coordinate of the point of ending
		 * @param {number} [opt.dx] - The value will be added to the x-coordinate of both the point of ending and beginning
		 * @param {number} [opt.dy] - The value will be added to the y-coordinate of both the point of ending and beginning
		 */
		move(opt) {
			let ox1 = this.x1, oy1 = this.y1, ox2 = this.x2, oy2 = this.y2;

			if(opt.x1 != undefined) {
				this.x1 = opt.x1;
				this.y1 = opt.y1;
			}
			else if(opt.dx1 != undefined) {
				this.x1 += opt.dx1;
				this.y1 += opt.dy1;
			}
			else if(opt.dx != undefined) {
				this.x1 += opt.dx;
				this.y1 += opt.dy;
			}

			if(opt.x2 != undefined) {
				this.x2 = opt.x2;
				this.y2 = opt.y2;
			}
			else if(opt.dx2 != undefined) {
				this.x2 += opt.dx2;
				this.y2 += opt.dy2;
			}
			else if(opt.dx != undefined) {
				this.x2 += opt.dx;
				this.y2 += opt.dy;
			}

			if(opt.fromp) this.fromp = opt.fromp;
			if(opt.top) this.top = opt.top;

			let dx = Math.abs(this.x2 - this.x1);
			let dy = Math.abs(this.y2 - this.y1);
			let d = 'M' + this.x1 + ' ' + this.y1 + ' C ';

			if(this.fromp == 'l') d += (this.x1 - dx/1.5) + ' ' + this.y1 + ', ';
			else if(this.fromp == 'r') d += (this.x1 + dx/1.5) + ' ' + this.y1 + ', ';
			else if(this.fromp == 'u') d += this.x1 + ' ' + (this.y1 - dy/1.5) + ', ';
			else d += this.x1 + ' ' + (this.y1 + dy/1.5) + ', ';

			if(this.top == 'l') d += (this.x2 - dx/1.5) + ' ' + this.y2 + ', ';
			else if(this.top == 'r') d += (this.x2 + dx/1.5) + ' ' + this.y2 + ', ';
			else if(this.top == 'u') d += this.x2 + ' ' + (this.y2 - dy/1.5) + ', ';
			else d += this.x2 + ' ' + (this.y2 + dy/1.5) + ', ';

			d += this.x2 + ' ' + this.y2;

			let animate = document.createElementNS(XMLNS, 'animate');
			animate.setAttributeNS(null, 'attributeName', 'd');
			animate.setAttributeNS(null, 'from', this.container[0].children[0].getAttribute('d'));
			animate.setAttributeNS(null, 'to', d);
			animate.setAttributeNS(null, 'dur', DURATION + 's');
			animate.setAttributeNS(null, 'begin', 'indefinite');
			animate.setAttributeNS(null, 'fill', 'freeze');

			this.container[0].children[0].appendChild(animate);
			animate.beginElement();
			setTimeout(() => {
				this.container[0].children[0].removeChild(animate);
				this.container[0].children[0].setAttributeNS(null, 'd', d);
			}, 1000 * DURATION);
		}
	}

	/**
	 * Class representing a text
	 * @memberof OwlDraw
	 * @extends OwlDraw.element
	 *
	 * @property {Element[]} container - Array of DOM elements (SVGElement) that are added to the svg DOM
	 * @property {number} x - The x-coordinate of text
	 * @property {number} y - The y-coordinate of text
	 */
	OwlDraw.text = class extends OwlDraw.element {
		/**
		 * Creates a text
		 * @param {(string|Element|Object)} mode - Data describing the text (see {@link OwlDraw.element})
		 * @param {number} mode.x - x-coordinate of the text
		 * @param {number} mode.y - y-coordinate of the text
		 * @param {string} [mode.class] - List of class that will be added to the DOM element
		 * @param {string} [mode.txt] - Text to be displayed. Line breaks (\n) are working.
		 */
		constructor(mode) {
			super(mode);

			if(typeof mode == 'object') {
				let g = document.createElementNS(XMLNS, 'g');

				this.x = mode.x; this.y = mode.y;
				g.setAttributeNS(null, 'transform', 'translate(' + mode.x + ', ' + mode.y + ')');
				if(mode.class) g.setAttributeNS(null, 'class', mode.class);
				g.classList.add('text');

				let text = document.createElementNS(XMLNS, 'text');

				let txt = mode.txt.split('\n');
				for(let i = 0; i < txt.length; i++) {
					let tspan = document.createElementNS(XMLNS, 'tspan');
					tspan.setAttributeNS(null, 'x', '0');
					tspan.setAttributeNS(null, 'dy', '1.1em');
					tspan.innerHTML = txt[i];
					text.appendChild(tspan);
				}

				g.appendChild(text);

				this.container.push(g);
			}
		}

		/**
		 * Alters the text.
		 *
		 * @param {string} txt - Text to be displayed. Line breaks (\n) are working.
		 */
		text(txt) {
			txt = txt.split('\n');
			this.container[0].children[0].innerHTML = '';
			for(let i = 0; i < txt.length; i++) {
				let tspan = document.createElementNS(XMLNS, 'tspan');
				tspan.setAttributeNS(null, 'x', '0');
				tspan.setAttributeNS(null, 'dy', '1.1em');
				tspan.innerHTML = txt[i];
				this.container[0].children[0].appendChild(tspan);
			}
		}
	}

	/**
	 * Class that represents a pointer
	 * @memberof OwlDraw
	 * @extends OwlDraw.element
	 *
	 * @property {Element[]} container - Array of DOM elements (SVGElement) that are added to the svg DOM
	 * @property {number} x - The top-left x-coordinate of the pointer
	 * @property {number} y - The top-left y-coordinate of the pointer
	 * @property {number} x2 - The bottom-right x-coordinate of the pointer
	 * @property {number} y2 - The bottom-right y-coordinate of the pointer
	 * @property {number} width - The width of the pointer
	 * @property {number} height - The height of the pointer
	 * @property {OwlDraw.rect} rect - The rectangle, that is the base of the pointer
	 * @property {OwlDraw.line} line1 - One of the lines, that crosses the rectangle in case of null pointer
	 * @property {OwlDraw.line} line2 - One of the lines, that crosses the rectangle in case of null pointer
	 * @property {OwlDraw.arrow|OwlDraw.niceArrow} arrow - The arrow, that points
	 */
	OwlDraw.pointer = class extends OwlDraw.connectable {
		/**
		 * Creates a pointer
		 *
		 * @param {Object} mode - Options
		 * @param {number} mode.x - The top-left x-coordinate of the pointer
		 * @param {number} mode.y - The top-left y-coordinate of the pointer
		 * @param {number} [mode.x2] - The bottom-right x-coordinate of the pointer
		 * @param {number} [mode.y2] - The bottom-right y-coordinate of the pointer
		 * @param {number} [mode.width] - The width of the pointer
		 * @param {number} [mode.height] - The height of the pointer
		 * @param {string} [options.class] - list of class that will be added to the DOM element
		 * @param {string} [mode.arrow] - Type of arrow. If 'nice' niceArrow (see {@link OwlDraw.niceArrow}), else simple arrow (see {@link OwlDraw.arrow})
		 * @param {string} mode.fromp - The position, the arrow will be drawn from ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 * @param {OwlDraw.connectable|null} mode.to - The element, the arrow will be drawn to.
		 * @param {string} mode.top - The position, the arrow will be drawn to ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 */
		constructor(mode) {
			super(mode);

			if(typeof mode == 'object') {
				this.x = mode.x; this.y = mode.y;
				this.width = mode.width || (mode.x2 - this.x); this.height = mode.height || (mode.y2 - this.y);
				this.x2 = this.x + this.width; this.y2 = this.y + this.height;

				this.rect = new OwlDraw.rect({x: this.x, y: this.y, width: this.width, height: this.height, class: (mode.class || '') + ' pointer'});
				this.rect.container[0].classList.remove('rect');
				for(let i = 0; i < this.rect.container.length; i++) {
					this.container.push(this.rect.container[i]);
				}

				this.line1 = new OwlDraw.line({x1: this.x, y1: this.y, x2: this.x+this.width, y2: this.y+this.height});
				for(let i = 0; i < this.line1.container.length; i++) {
					this.container.push(this.line1.container[i]);
					if(mode.to != null) this.line1.container[i].style.display = 'none';
				}

				this.line2 = new OwlDraw.line({x1: this.x+this.width, y1: this.y, x2: this.x, y2: this.y+this.height});
				for(let i = 0; i < this.line2.container.length; i++) {
					this.container.push(this.line2.container[i]);
					if(mode.to != null) this.line2.container[i].style.display = 'none';
				}

				if(mode.arrow == 'nice') {
					this.arrow = new OwlDraw.niceArrow({from: this.rect, fromp: mode.fromp, to: mode.to, top: mode.top});
				}
				else {
					this.arrow = new OwlDraw.arrow({from: this.rect, fromp: mode.fromp, to: mode.to, top: mode.top});
				}
				for(let i = 0; i < this.arrow.container.length; i++) {
					this.container.push(this.arrow.container[i]);
				}
			}
		}

		/**
		 * Moves the element, and updates the position data. Also moves the connected lines, arrows. (see {@link OwlDraw.element#move})
		 * @param {Object} opt - Data describing the transition
		 * @param {number} [opt.x] - If defined, the x-coordinate of position will be this value
		 * @param {number} [opt.y] - If defined, the y-coordinate of position will be this value
		 * @param {number} [opt.dx] - If defined, the x-coordinate of position will be increased by this value
		 * @param {number} [opt.dy] - If defined, the y-coordinate of position will be increased by this
		 */
		move(opt) {
			this.rect.move(opt);
			this.line1.move(opt);
			this.line2.move(opt);
		}

		/**
		 * Binds the arrow to a begginning element and ending element
		 *
		 * @param {Object} mode - The object describing the binding
		 * @param {OwlDraw.connectable} [mode.from] - The element, the arrow will be drawn from
		 * @param {string} [mode.fromp] - The position, the arrow will be drawn from ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 * @param {OwlDraw.connectable|null} [mode.to] - The element, the arrow will be drawn to. If null, than the arrow is invisible.
		 * @param {string} [mode.top] - The position, the arrow will be drawn to ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 */
		bind(mode) {
			if(mode.to == null) {
				this.line1.container[0].style.display = 'inline';
				this.line2.container[0].style.display = 'inline';
			}
			else {
				this.line1.container[0].style.display = 'none';
				this.line2.container[0].style.display = 'none';
			}
			this.arrow.bind(mode);
		}

		/**
		 * Removes the bind from the arrow. It follows, that the arrow will not move, when the element it is pointed to or pointed from is moved
		 */
		unbind() {
			this.arrow.unbind();
		}

		/**
		 * Returns the coordinates of connection point
		 * @param {string} fromp - The position of connection ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 * @returns {Object} data - The position of connection
		 * @returns {number} data.x - The x-coordinate of connection
		 * @returns {number} data.y - The y-coordinate of connection
		 */
		getConnection(fromp) {
			let x = (fromp == 'l' ? this.x : (fromp == 'r' ? this.x2 : ((this.x + this.x2) / 2)));
			let y = (fromp == 'u' ? this.y : (fromp == 'd' ? this.y2 : ((this.y + this.y2) / 2)));
			return {x:x, y:y};
		}
	}

	/********************************************
	* Combined elements
	*******************************************/

	/**
	 * Shuffles an array of numbers
	 * @memberof OwlDraw
	 * @private
	 *
	 * @param {number[]} arr - The array of numbers
	 * @returns {number[]} The array of numbers shuffled
	 */
	function shuffle(arr) {
		for (let i = arr.length - 1; i > 0; i--) {
			let j = Math.floor(Math.random() * (i + 1));
			let tmp = arr[i];
			arr[i] = arr[j];
			arr[j] = tmp;
		}
		return arr;
	}

	/**
	 * Generates an array of numbers with the given properties
	 * @memberof OwlDraw
	 * @private
	 *
	 * @param {Object} options - Options
 	 * @param {string} options.type - If 'param', the elements will be taken from the second parameter. If 'succeeding', the elements will be succeeding elements (e.g. 1, 2, 3, 4, ...). If 'random', the elements will be randomly generated. If 'empty', the elements will be all empty.
	 * @param {number} [options.num] - Number of elements to create
	 * @param {number} [options.min] - Minimum of numbers
	 * @param {number} [options.max] - Maximum of numbers
	 * @param {string|Function} [options.sort] - If 'shuffle', the elements will be randomly shuffled (see {@link shuffle}). If 'sorted', the elements will be sorted ascendingly. If a function ((a,b)=>true|false), the elements will be sorted according to the function.
	 * @param {number[]} elements - Elements to be a base
	 *
	 * @returns {number[]} An array of numbers
	 */
	function generateNums(options, elements) {
		let num = []; let len;
		if(options.type == 'param' || elements instanceof Array) {
			len = elements.length;
			num = elements;
		}
		else if(options.type == 'succeeding') {
			len = options.num || (options.max - options.min) || 9;
			let min = options.min || 0;
			let max = options.max || len;
			for(let i = 0; i < len; i++) {
				num.push(min + i);
			}
		}
		else if(options.type == 'random') {
			len = options.num || 9;
			let max = options.max || len
			let min = options.min || 0;
			for(let i = 0; i < len; i++) {
				num.push(min + Math.floor(Math.random() * (max - min)));
			}
		}
		else if(options.type == 'empty') {
			len = options.num || 9;
			for(let i = 0; i < len; i++) {
				num.push('');
			}
		}

		if(options.sort == 'shuffle') num = shuffle(num);
		else if(options.sort == 'sorted') num.sort((a, b) => {return parseInt(a) > parseInt(b)});
		else if(options.sort instanceof Function) num.sort(options.sort);

		return num;
	}

	/**
	 * Creates a binary tree from an array. The binary tree is searchable if and only if the array is sorted.
	 * @memberof OwlDraw
	 * @private
	 *
	 * @param {number[]} array - The array, the binary tree will be created from
	 * @param {number} from - The index, the values will be taken from the array beginning with (inclusive)
	 * @param {number} from - The index, the values will be taken from the array ending with (exclusive)
	 *
	 * @returns {Object} element - The binary tree
	 * @returns {number} element.val - The value of leaf
	 * @returns {Object} element.left - The left children
	 * @returns {Object} element.right - The right children
	 */
	function arrayToTree(array, from, to) {
		if(from == to) return null;
		let mid = parseInt((from + to) / 2);
		return {
			val: array[mid],
			left: arrayToTree(array, from, mid),
			right: arrayToTree(array, mid+1, to)
		}
	}

	/**
	 * Class that represents an array
	 * @memberof OwlDraw
	 * @extends OwlDraw.element
	 *
	 * @property {Element[]} container - Array of DOM elements (SVGElement) that are added to the svg DOM
	 * @property {OwlDraw.circle[]} elems - The elements of array
	 * @property {OwlDraw.circle[]} elements - The elements of array
	 * @property {number} elements.val - The value of the given element
	 */
	OwlDraw.array = class extends OwlDraw.group {
		/**
		 * Creates an array, with values
		 *
		 * @param {Object} options - Options
		 * @param {number} options.x - x-coordinate of the first of circle (other circles will have 2*radius distance between each other)
		 * @param {number} options.y - y-coordinate of the first of circle (other circles will have the same y-coordinate)
		 * @param {number} [options.radius] - radius of circles
		 * @param {number} [options.width] - width of elements
		 * @param {number} [options.height] - height of elements
		 * @param {string} [options.class] - list of class that will be added to the DOM element
		 * @param {string} [options.stroke] - color of stroke, that applies to the circle
		 * @param {number} [options.strokeWidth] - width of stroke, that applies to the circle
		 * @param {string} [options.fill] - color of fill, that applies to the circle
	 	 * @param {string} options.type - If 'param', the elements will be taken from the second parameter. If 'succeeding', the elements will be succeeding elements (e.g. 1, 2, 3, 4, ...). If 'random', the elements will be randomly generated. If 'empty', the elements will be all empty.
		 * @param {number} [options.num] - Number of elements to create
		 * @param {number} [options.min] - Minimum of numbers
		 * @param {number} [options.max] - Maximum of numbers
		 * @param {string|Function} [options.sort] - If 'shuffle', the elements will be randomly shuffled (see {@link shuffle}). If 'sorted', the elements will be sorted ascendingly. If a function ((a,b)=>true|false), the elements will be sorted according to the function.
		 * @param {number[]} [elements] - Elements to be a base
		 *
		 */
		constructor(options, elements) {
			super();
			let num = generateNums(options, elements);
			this.num = num.length;

			this.elements = [];

			for(let i = 0; i < this.num; i++) {
				let elem;
				if(options.radius !== undefined) {
					elem = new OwlDraw.circle({x: options.x + i*(2.5*options.radius), y: options.y, radius: options.radius, txt: num[i] !== undefined ? num[i].toString() : '', stroke: options.stroke, strokeWidth: options.strokeWidth, fill: options.fill, class: (options.class || '') + ' array'});
				}
				else {
					elem = new OwlDraw.rect({x: options.x + i*options.width, y: options.y, width: options.width, height: options.height, txt: num[i] !== undefined ? num[i].toString() : '', stroke: options.stroke, strokeWidth: options.strokeWidth, fill: options.fill, class: (options.class || '') + ' array'})
				}
				elem.val = num[i] !== undefined ? num[i] : '';

				this.elements.push(elem);
				this.add(elem);
			}
		}

		/**
		 * Highlightes an element, or all elements, by addin a class with the name 'highlight-{opt}' to the class list. Removes all other highlightes on the element.
		 * @param {number|undefined} id - If undefined, all elements will be highlighted, id a number, then the element with the given index will be highlighted
		 * @param {string} opt - The name of highlight (part of class name)
		 */
		highlight(id, opt) {
			if(id == undefined) {
				for(let i = 0; i < this.elements.length; i++) {
					this.elements[i].highlight(opt);
				}
			}
			else {
				this.elements[id].highlight(opt);
			}
		}

		/**
		 * Removes all highlightes from an element or all elements
		 * @param {number|undefined} id - If undefined, all elements will be unhighlighted, id a number, then the element with the given index will be unhighlighted
		 */
		unhighlight(id) {
			if(id == undefined) {
				for(let i = 0; i < this.elements.length; i++) {
					this.elements[i].unhighlight();
				}
			}
			else {
				this.elements[id].unhighlight();
			}
		}

		/**
		 * Swaps two elements with the given index in the array
		 *
		 * @param {number} i - The index of the first element
		 * @param {number} j - The index of the second element
		 */
		swap(i, j) {
			let ox = this.elements[i].x;
			let oy = this.elements[i].y;

			setTimeout(() => {
				this.elements[i].container[0].children[0].style.transform = 'translate(0,0)';
				this.elements[i].container[0].children[1].style.transform = 'translate(0,0)';
				this.elements[j].container[0].children[0].style.transform = 'translate(0,0)';
				this.elements[j].container[0].children[1].style.transform = 'translate(0,0)';
			}, 500*DURATION);

			setTimeout(() => {
				this.elements[i].container[0].style.zIndex = '';
				this.elements[j].container[0].style.zIndex = '';
			}, 1000*DURATION);

			this.elements[i].container[0].children[0].style.transform = 'translate(0, ' + 3*this.elements[i].radius + 'px)';
			this.elements[i].container[0].children[1].style.transform = 'translate(0, ' + 3*this.elements[i].radius + 'px)';
			this.elements[j].container[0].children[0].style.transform = 'translate(0, -' + 3*this.elements[i].radius + 'px)';
			this.elements[j].container[0].children[1].style.transform = 'translate(0, -' + 3*this.elements[i].radius + 'px)';
			this.elements[i].container[0].style.zIndex = 100;
			this.elements[j].container[0].style.zIndex = 100;

			this.elements[i].move({x: this.elements[j].x, y: this.elements[j].y});
			this.elements[j].move({x: ox, y: oy });

			let tmp = this.elements[i];
			this.elements[i] = this.elements[j];
			this.elements[j] = tmp;
		}
	}

	/**
	 * Class that represents a list element
	 * @memberof OwlDraw
	 * @extends OwlDraw.group
	 *
	 * @property {Element[]} container - Array of DOM elements (SVGElement) that are added to the svg DOM
	 * @property {OwlDraw.element[]} elems - List of elements in the group
	 * @property {OwlDraw.rect} data - The rectangle representing the data part of the list element
	 * @property {OwlDraw.pointer} pointer - The pointer representing the pointer part of the list element
	 */
	OwlDraw.listElem = class extends OwlDraw.group {
		/**
		 * Creates a list element
		 *
		 * @param {Object} options - Options
		 * @param {number} options.x - The top-left x-coordinate of the list element
		 * @param {number} options.y - The top-left y-coordinate of the list element
		 * @param {number} options.size - The width of the element. The height of the data area matches this value, while the height of the pointer is the third of this value.
		 * @param {string} [options.class] - list of class that will be added to the DOM element
		 * @param {OwlDraw.connectable|null} [options.next] - The element, the arrow will be drawn to.
		 * @param {string} [options.top] - The position, the arrow will be drawn to ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 */
		constructor(options) {
			super();

			this.container = [];

			this.data = new OwlDraw.rect({x: options.x, y: options.y, width: options.size, height: options.size, txt: options.txt, class: (options.class || '') + ' listElem'});
			this.pointer = new OwlDraw.pointer({x: options.x, y: options.y + options.size, width: options.size, height: options.size/3, fromp: 'r', to: options.next || null, top: options.top, arrow: 'nice', class: (options.class || '') + ' listElem'});

			this.add(this.data);
			this.add(this.pointer);
		}
	}

	/**
	 * Class that represents a linked list
	 * @memberof OwlDraw
	 * @extends OwlDraw.group
	 *
	 * @property {Element[]} container - Array of DOM elements (SVGElement) that are added to the svg DOM
	 * @property {OwlDraw.element[]} elems - List of elements in the group
	 * @property {number} num - The number of elements
	 * @property {OwlDraw.listElem[]} elements - The elements of the linked list
	 * @property {number} elements.val - The value of the given element
	 * @property {OwlDraw.listElem|null} elements.next - Reference to the next element in the list
	 */
	OwlDraw.list = class extends OwlDraw.group {
		/**
		 * Creates a linked list, with values
		 *
		 * @param {Object} options - Options
		 * @param {number} options.x - The top-left x-coordinate of the list
		 * @param {number} options.y - The top-left y-coordinate of the list
		 * @param {number} options.size - The width of the element. The height of the data area matches this value, while the height of the pointer is the third of this value.
		 * @param {string} [options.class] - list of class that will be added to the DOM element
	 	 * @param {string} options.type - If 'param', the elements will be taken from the second parameter. If 'succeeding', the elements will be succeeding elements (e.g. 1, 2, 3, 4, ...). If 'random', the elements will be randomly generated. If 'empty', the elements will be all empty.
		 * @param {number} [options.num] - Number of elements to create
		 * @param {number} [options.min] - Minimum of numbers
		 * @param {number} [options.max] - Maximum of numbers
		 * @param {string|Function} [options.sort] - If 'shuffle', the elements will be randomly shuffled (see {@link shuffle}). If 'sorted', the elements will be sorted ascendingly. If a function ((a,b)=>true|false), the elements will be sorted according to the function.
		 * @param {number[]} [elements] - Elements to be a base
		 *
		 */
		constructor(options, elements) {
			super();
			let num = generateNums(options, elements);
			this.num = num.length;

			this.container = [];
			this.elements = [];

			for(let i = this.num - 1; i >= 0; i--) {
				let elem = new OwlDraw.listElem({x: options.x + i*(2*options.size), y: options.y, size: options.size, txt: num[i].toString(), class: (options.class || '') + ' list', top: 'l', next: (i == this.num - 1 ? null : this.elements[0].data)});
				elem.val = num[i];
				elem.next = i == this.num - 1 ? null : this.elements[0];

				this.elements.unshift(elem);
				this.add(elem);
			}
		}

		/**
		 * Highlightes an element, or all elements, by addin a class with the name 'highlight-{opt}' to the class list. Removes all other highlightes on the element.
		 * @param {number|undefined} id - If undefined, all elements will be highlighted, id a number, then the element with the given index will be highlighted
		 * @param {string} opt - The name of highlight (part of class name)
		 */
		highlight(id, opt) {
			if(id == undefined) {
				for(let i = 0; i < this.elements.length; i++) {
					this.elements[i].highlight(opt);
				}
			}
			else {
				this.elements[id].highlight(opt);
			}
		}

		/**
		 * Removes all highlightes from an element or all elements
		 * @param {number|undefined} id - If undefined, all elements will be unhighlighted, id a number, then the element with the given index will be unhighlighted
		 */
		unhighlight(id) {
			if(id == undefined) {
				for(let i = 0; i < this.elements.length; i++) {
					this.elements[i].unhighlight();
				}
			}
			else {
				this.elements[id].unhighlight();
			}
		}
	}

	/**
	 * Class that represents an element of a double linked list
	 * @memberof OwlDraw
	 * @extends OwlDraw.group
	 *
	 * @property {Element[]} container - Array of DOM elements (SVGElement) that are added to the svg DOM
	 * @property {OwlDraw.element[]} elems - List of elements in the group
	 * @property {OwlDraw.rect} data - The rectangle representing the data part of the list element
	 * @property {OwlDraw.pointer} pointerPrev - The pointer representing the pointer to the previous element
	 * @property {OwlDraw.pointer} pointerNext - The pointer representing the pointer to the next element
	 */
	OwlDraw.dllElem = class extends OwlDraw.group {
		/**
		 * Creates an element of a double linked list
		 *
		 * @param {Object} options - Options
		 * @param {number} options.x - The top-left x-coordinate of the list element
		 * @param {number} options.y - The top-left y-coordinate of the list element
		 * @param {number} options.size - The width of the element. The height of the data area matches this value, while the height of the pointers is the third of this value.
		 * @param {string} [options.class] - list of class that will be added to the DOM element
		 * @param {OwlDraw.connectable|null} [options.next] - The element, the next arrow will be drawn to.
		 * @param {string} [options.top] - The position, the next arrow will be drawn to ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 * @param {OwlDraw.connectable|null} [options.prev] - The element, the previous arrow will be drawn to.
		 * @param {string} [options.topP] - The position, the previous arrow will be drawn to ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 */
		constructor(options) {
			super();

			this.container = [];

			this.pointerPrev = new OwlDraw.pointer({x: options.x, y: options.y, width: options.size, height: options.size/3, fromp: 'l', to: options.prev || null, top: options.topP, arrow: 'nice', class: (options.class || '') + ' dllElem'});
			this.data = new OwlDraw.rect({x: options.x, y: options.y + options.size/3, width: options.size, height: options.size, txt: options.txt, class: (options.class || '') + ' dllElem'});
			this.pointerNext = new OwlDraw.pointer({x: options.x, y: options.y + options.size*4/3, width: options.size, height: options.size/3, fromp: 'r', to: options.next || null, top: options.top, arrow: 'nice', class: (options.class || '') + ' dllElem'});

			this.add(this.data);
			this.add(this.pointerPrev);
			this.add(this.pointerNext);
		}
	}

	/**
	 * Class that represents a double linked list
	 * @memberof OwlDraw
	 * @extends OwlDraw.group
	 *
	 * @property {Element[]} container - Array of DOM elements (SVGElement) that are added to the svg DOM
	 * @property {OwlDraw.element[]} elems - List of elements in the group
	 * @property {number} num - The number of elements
	 * @property {OwlDraw.listElem[]} elements - The elements of the linked list
	 * @property {number} elements.val - The value of the given element
	 * @property {OwlDraw.listElem|null} elements.next - Reference to the next element in the list
	 * @property {OwlDraw.listElem|null} elements.next - Reference to the previous element in the list
	 */
	OwlDraw.dlList = class extends OwlDraw.group {
		/**
		 * Creates a double linked list, with values
		 *
		 * @param {Object} options - Options
		 * @param {number} options.x - The top-left x-coordinate of the list
		 * @param {number} options.y - The top-left y-coordinate of the list
		 * @param {number} options.size - The width of the element. The height of the data area matches this value, while the height of the pointer is the third of this value.
		 * @param {string} [options.class] - list of class that will be added to the DOM element
		 * @param {string} options.type - If 'param', the elements will be taken from the second parameter. If 'succeeding', the elements will be succeeding elements (e.g. 1, 2, 3, 4, ...). If 'random', the elements will be randomly generated. If 'empty', the elements will be all empty.
		 * @param {number} [options.num] - Number of elements to create
		 * @param {number} [options.min] - Minimum of numbers
		 * @param {number} [options.max] - Maximum of numbers
		 * @param {string|Function} [options.sort] - If 'shuffle', the elements will be randomly shuffled (see {@link shuffle}). If 'sorted', the elements will be sorted ascendingly. If a function ((a,b)=>true|false), the elements will be sorted according to the function.
		 * @param {number[]} [elements] - Elements to be a base
		 *
		 */
		constructor(options, elements) {
			super();
			let num = generateNums(options, elements);
			this.num = num.length;

			this.container = [];
			this.elements = [];

			for(let i = this.num - 1; i >= 0; i--) {
				let elem = new OwlDraw.dllElem({x: options.x + i*(2*options.size), y: options.y, size: options.size, txt: num[i].toString(), class: (options.class || '') + ' dlList', top: 'l', next: (i == this.num - 1 ? null : this.elements[0].data), prev: null});
				if(i != this.num - 1) this.elements[0].pointerPrev.bind({to: elem.data, top: 'r'});

				elem.val = num[i];
				elem.next = i == this.num - 1 ? null : this.elements[0];
				if(i != this.num - 1) this.elements[0].prev = elem;
				elem.prev = null;

				this.elements.unshift(elem);
				this.add(elem);
			}
		}

		/**
		 * Highlightes an element, or all elements, by addin a class with the name 'highlight-{opt}' to the class list. Removes all other highlightes on the element.
		 * @param {number|undefined} id - If undefined, all elements will be highlighted, id a number, then the element with the given index will be highlighted
		 * @param {string} opt - The name of highlight (part of class name)
		 */
		highlight(id, opt) {
			if(id == undefined) {
				for(let i = 0; i < this.elements.length; i++) {
					this.elements[i].highlight(opt);
				}
			}
			else {
				this.elements[id].highlight(opt);
			}
		}

		/**
		 * Removes all highlightes from an element or all elements
		 * @param {number|undefined} id - If undefined, all elements will be unhighlighted, id a number, then the element with the given index will be unhighlighted
		 */
		unhighlight(id) {
			if(id == undefined) {
				for(let i = 0; i < this.elements.length; i++) {
					this.elements[i].unhighlight();
				}
			}
			else {
				this.elements[id].unhighlight();
			}
		}
	}

	/**
	 * Class that represents an element of a double linked list
	 * @memberof OwlDraw
	 * @extends OwlDraw.group
	 *
	 * @property {Element[]} container - Array of DOM elements (SVGElement) that are added to the svg DOM
	 * @property {OwlDraw.element[]} elems - List of elements in the group
	 * @property {OwlDraw.rect} data - The rectangle representing the data part of the element element
	 * @property {OwlDraw.pointer} pointerLeft - The pointer representing the pointer to the left element
	 * @property {OwlDraw.pointer} pointerRight - The pointer representing the pointer to the right element
	 */
	OwlDraw.btElem = class extends OwlDraw.group {
		/**
		 * Creates an element of a double linked list
		 *
		 * @param {Object} options - Options
		 * @param {number} options.x - The top-left x-coordinate of the list element
		 * @param {number} options.y - The top-left y-coordinate of the list element
		 * @param {number} options.size - The width of the element. The height of the data area matches this value, while the height of the pointers is the third of this value.
		 * @param {string} [options.class] - list of class that will be added to the DOM element
		 * @param {OwlDraw.connectable|null} [options.left] - The element, the left arrow will be drawn to.
		 * @param {string} [options.topL] - The position, the left arrow will be drawn to ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 * @param {OwlDraw.connectable|null} [options.right] - The element, the right arrow will be drawn to.
		 * @param {string} [options.topR] - The position, the right arrow will be drawn to ('l' - left side, 'r' - right side, 'u' - up side, 'd' - down side)
		 */
		constructor(options) {
			super();

			this.container = [];

			this.data = new OwlDraw.rect({x: options.x, y: options.y, width: options.size, height: options.size, txt: options.txt, class: (options.class || '') + ' btElem'});
			this.pointerLeft = new OwlDraw.pointer({x: options.x, y: options.y + options.size, width: options.size/2, height: options.size/3, fromp: 'l', to: options.left || null, top: options.topL, arrow: 'nice', class: (options.class || '') + ' btElem'});
			this.pointerRight = new OwlDraw.pointer({x: options.x + options.size/2, y: options.y + options.size, width: options.size/2, height: options.size/3, fromp: 'r', to: options.right || null, top: options.topR, arrow: 'nice', class: (options.class || '') + ' btElem'});

			this.add(this.data);
			this.add(this.pointerLeft);
			this.add(this.pointerRight);
		}
	}

	/**
	 * Class that represents a binary tree
	 * @memberof OwlDraw
	 * @extends OwlDraw.group
	 *
	 * @property {Element[]} container - Array of DOM elements (SVGElement) that are added to the svg DOM
	 * @property {OwlDraw.element[]} elems - List of elements in the group
	 * @property {OwlDraw.btElem} elements - The binary tree of elements. Reference to the root.
	 * @property {number} elements.val - The value of the given element
	 * @property {OwlDraw.btElem|null} elements.left - Reference to the left element in the tree
	 * @property {OwlDraw.line|null} [elements.leftPointer] - The line or arrow, the left-child of element is connected with (valid if elements are based on {@link OwlDraw.circle})
	 * @property {OwlDraw.btElem|null} elements.right - Reference to the right element in the list
	 * @property {OwlDraw.line|null} [elements.rightPointer] - The line or arrow, the right-child of element is connected with (valid if elements are based on {@link OwlDraw.circle})
	 */
	OwlDraw.bTree = class extends OwlDraw.group {
		/**
		 * Creates a binary tree with values
		 *
		 * @param {Object} options - Options
		 * @param {string} options.tree - If 'nice' then the tree will be consisted of {@link OwlDraw.btElem}, otherwise of {@link OwlDraw.circle}
		 * @param {number} options.width - The width of the rectangle, the binary tree will be fit into
		 * @param {number} options.y - the y-coordinate of the root element
		 * @param {number} [options.radius] - The radius of elements if the tree is consisted of {@link OwlDraw.circle}.
		 * @param {number} [options.size] - The width of the element if the tree is consisted of {@link OwlDraw.btElem}. The height of the data area matches this value, while the height of the pointer is the third of this value.
		 * @param {string} [options.class] - list of class that will be added to the DOM element
		 * @param {string} options.type - If 'param', the elements will be taken from the second parameter. If 'succeeding', the elements will be succeeding elements (e.g. 1, 2, 3, 4, ...). If 'random', the elements will be randomly generated. If 'empty', the elements will be all empty.
		 * @param {number} [options.num] - Number of elements to create
		 * @param {number} [options.min] - Minimum of numbers
		 * @param {number} [options.max] - Maximum of numbers
		 * @param {string|Function} [options.sort] - If 'shuffle', the elements will be randomly shuffled (see {@link shuffle}). If 'sorted', the elements will be sorted ascendingly. If a function ((a,b)=>true|false), the elements will be sorted according to the function.
		 * @param {number[]|Object} [elements] - Elements to be a base
		 * @param {number} elements.val - The value of leaf
		 * @param {Object|null} elements.left - The left-side tree, with same structure as elements. If null, then no child.
		 * @param {Object|null} elements.right - The right-side tree, with same structure as elements. If null, then no child.
		 *
		 */
		constructor(options, elements) {
			super();

			this.container = [];
			this.elements = [];

			if(elements == undefined || elements instanceof Array) {
				let num = generateNums(options, elements);
				elements = arrayToTree(num, 0, num.length);
			}

			this.elements = this.buildTree(elements, 0, 0, options);
		}

		/**
		 * Builds a leaf
		 *
		 * @param {number[]|Object} elements - Binary tree
		 * @param {number} elements.val - The value of leaf
		 * @param {Object|null} elements.left - The left-side tree, with same structure as elements. If null, then no child.
		 * @param {Object|null} elements.right - The right-side tree, with same structure as elements. If null, then no child.
		 * @param {number} level - The level of the leaf
		 * @param {number} position - The position of the leaf inside of the level
		 * @param {Object} options - Options
		 * @param {string} options.tree - If 'nice' then the tree will be consisted of {@link OwlDraw.btElem}, otherwise of {@link OwlDraw.circle}
		 * @param {number} options.width - The width of the rectangle, the binary tree will be fit into
		 * @param {number} options.y - the y-coordinate of the root element
		 * @param {number} [options.radius] - The radius of elements if the tree is consisted of {@link OwlDraw.circle}.
		 * @param {number} [options.size] - The width of the element if the tree is consisted of {@link OwlDraw.btElem}. The height of the data area matches this value, while the height of the pointer is the third of this value.
		 * @param {string} [options.class] - list of class that will be added to the DOM element
		 *
		 */
		buildTree(element, level, position, options) {
			if(element == null) return null;

			let left = this.buildTree(element.left, level+1, 2*position, options);
			let right = this.buildTree(element.right, level+1, 2*position+1, options);

			if(options.tree == 'nice') {
				let e = new OwlDraw.btElem({x: (options.width / (Math.pow(2, level)+1)) * (position+1) - options.size/2, y: options.y + level*2*options.size, size: options.size, left: (left?left.data:null), topL: 'u', right: (right?right.data:null), topR: 'u', txt: element.val, class: (options.class || '') + ' bTree'});
				e.val = element.val;
				e.left = left;
				e.right = right;

				this.add(e);

				return e;
			}
			else {
				let e = new OwlDraw.circle({x: (options.width / (Math.pow(2, level)+1)) * (position+1), y: options.y + level*4*options.radius, radius: options.radius, txt: element.val, class: (options.class || '') + ' bTree'});
				e.val = element.val;
				e.left = left;
				e.right = right;

				this.add(e);

				if(left != null) {
					let p = new OwlDraw.arrow({from: e, fromp: 'd', to: left, top: 'u'});
					e.leftPointer = p;

					this.add(p);
				}

				if(right != null) {
					let p = new OwlDraw.arrow({from: e, fromp: 'd', to: right, top: 'u'});
					e.rightPointer = p;

					this.add(p);
				}

				return e;
			}
		}
	}

	return OwlDraw;
})();
