let OwlAnim = (function() {
	'use strict';

	let STEP = 0.5;
	let SMALLSTEP = 0.2;

	/**
	 * Class responsible for animation handling
	 *
	 * @property {Function} animation - The generator function that implements the animation, It accepts an Object parameter. The object has two properties. The .draw which holds the {@link OwlDraw} instance if it is part of the animation, and .syntax which holds the {@link OwlSyntax} instance if it is part of the animation.
	 * @property {Generator} generator - The currently active generator instance
	 * @property {Object} timer - The currently active setTimeout identifier
	 * @property {OwlDraw} [draw] - The instance of drawing object. Parameter of animation generator.
	 * @property {OwlDraw} [syntax] - The instance of drawing object. Parameter of animation generator.
	 */
	class OwlAnim {
		/**
		 * Creates an animation
		 *
		 * @param {Object} options - options
		 * @param {string|Element} type - If 'inSyntax' then the buttons will be displayed in the top-right corner of the atatched {@link OwlSyntax} element. If 'afterSyntax' then the buttons will be displayed after the atatched {@link OwlSyntax} element. If 'afterDraw' then the buttons will be displayed after the atatched {@link OwlDraw} element. Otherwise if string, the buttons will be the children of the DOM element with id matching this parameter. If instance of Element then the buttons will be children of this element.
		 * @param {string|OwlDraw} [options.draw] - If string, then an empty {@link OwlDraw} instance will be created in the element with id matching this parameter, if {@link OwlDraw} instance then this instance will be used.
		 * @param {number} [options.width] - Width of the svg canvas, if it needs to be created
		 * @param {number} [options.height] - Height of the svg canvas, if it needs to be created
		 * @param {string|OwlSyntax} [options.syntax] - If string, then an empty {@link OwlSyntax} instance will be created in the element with id matching this parameter, if {@link OwlSyntax} instance then this instance will be used.
		 * @param {string|OwlSyntax.language} [options.language] - If string, then name of grammar (OwlSyntax[{name}]). If object, then it must be compatible with {@link OwlSyntax.language}. If undefined but the data-language property is set on the source element, then the language will be taken from that property.
		 * @param {Object} [options.buttons] - Object describing the buttons. By default, start, next, continuous buttons are shown, continuousQuick is hidden.
		 * @param {Object|boolean} [options.buttons.start] - Object describing the start button. By default, it is shown. If false the button willbe hidden.
		 * @param {Object} [options.buttons.start.text] - Text to be displayed in start button. Default: Start
		 * @param {Object|boolean} [options.buttons.next] - Object describing the next button. By default, it is shown. If false the button willbe hidden.
		 * @param {Object} [options.buttons.next.text] - Text to be displayed in next button. Default: Következő
		 * @param {Object|boolean} [options.buttons.continuous] - Object describing the continuous button. By default, it is shown. If false the button willbe hidden.
		 * @param {Object} [options.buttons.continuous.text] - Text to be displayed in continuous button. Default: Folyamatos
		 * @param {Object} [options.buttons.continuousQuick] - Object describing the continuous quick button. By default, it is hidden. If defined, the button will be shown.
		 * @param {Object} [options.buttons.continuousQuick.text] - Text to be displayed in continuous quick button. Default: Folyamatos gyors
		 * @param {Object} [options.buttons.buttonName] - Custom button can be defined by defining custom named (buttonName) properties on this object.
		 * @param {Object} [options.buttons.buttonName.text] - Text to be displayed in customButton button.
		 * @param {Function} [options.buttons.buttonName.click] - The event handler that will be executed on button click. Note, that this function will be bounded to this {@link OwlAnim} instance (arrow functions can not be bounded, so use old style functions).
		 * @param {Function} animation - The generator function that implements the animation, It accepts an Object parameter. The object has two properties. The .draw which holds the {@link OwlDraw} instance if it is part of the animation, and .syntax which holds the {@link OwlSyntax} instance if it is part of the animation.
		 */
		constructor(options, animation) {
			this.animation = animation;
			this.generator = null;
			this.timer = null;

			if(options.draw && options.draw instanceof OwlDraw) this.draw = options.draw;
			else if(options.draw && typeof options.draw == 'string') {
				this.draw = new OwlDraw(options.draw, {width: options.width, height: options.height});
			}

			if(options.syntax && options.syntax instanceof OwlSyntax) this.syntax = options.syntax;
			else if(options.syntax && typeof options.syntax == 'string') {
				this.syntax = new OwlSyntax(options.syntax, {language: options.language});
			}

			let div = document.createElement('div');
			div.classList.add('animate');

			if(options.buttons == undefined || options.buttons.start != false) {
				let start = document.createElement('button');
				if(options.buttons && options.buttons.start && options.buttons.start.text) start.innerText = options.buttons.start.text;
				else start.innerText = 'Start';
				start.addEventListener('click', this.start.bind(this));
				div.appendChild(start);
			}

			if(options.buttons == undefined || options.buttons.next != false) {
				let next = document.createElement('button');
				if(options.buttons && options.buttons.next && options.buttons.next.text) next.innerText = options.buttons.next.text;
				else next.innerText = 'Következő';
				next.addEventListener('click', this.next.bind(this));
				div.appendChild(next);
			}

			if(options.buttons == undefined || options.buttons.continuous != false) {
				let continuous = document.createElement('button');
				if(options.buttons && options.buttons.continuous && options.buttons.continuous.text) continuous.innerText = options.buttons.continuous.text;
				else continuous.innerText = 'Folyamatos';
				continuous.addEventListener('click', this.continuous.bind(this));
				div.appendChild(continuous);
			}

			if(options.buttons && options.buttons.continuousQuick) {
				let continuousQuick = document.createElement('button');
				if(options.buttons.continuousQuick.text) continuousQuick.innerText = options.buttons.continuousQuick.text;
				else continuousQuick.innerText = 'Folyamatos gyors';
				continuousQuick.addEventListener('click', this.continuousQuick.bind(this));
				div.appendChild(continuousQuick);
			}

			if(options.buttons) {
				for(let button in options.buttons) {
					if(button == 'start' || button == 'next' || button == 'continuous' || button == 'continuousQuick') continue;

					let b = document.createElement('button');
					b.innerText = options.buttons[button].text;
					b.addEventListener('click', options.buttons[button].click.bind(this));
					div.appendChild(b);
				}
			}

			if(options.type == 'inSyntax') {
				this.syntax.container.appendChild(div);
			}
			else if(options.type == 'afterSyntax') {
				this.syntax.container.parentNode.insertBefore(div, this.syntax.container.nextSibling);
			}
			else if(options.type == 'afterDraw') {
				this.draw.container.parentNode.insertBefore(div, this.draw.container.nextSibling);
			}
			else if(typeof options.type == 'string') {
				document.getElementById(options.type).appendChild(div);
			}
			else if(options.type instanceof Element) {
				options.type.appendChild(div);
			}

			this.start();
		}

		/**
		 * Prepares the animation. Creates the generator instance, and executes it until the first yield, resets the timer, {@link OwlDraw} and {@link OwlSyntax} instance.
		 */
		start() {
			if(this.draw) this.draw.clear();
			if(this.syntax) this.syntax.unmark();
			clearTimeout(this.timer); this.timer = null;
			this.generator = this.animation({draw: this.draw, syntax: this.syntax});
			this.generator.next();
		}

		/**
		 * Executes the animation until the next yield
		 */
		next() {
			this.generator.next();
		}

		/**
		 * Executes the animation until the end (if no return, then endlessly)
		 */
		continuous() {
			let val = this.generator.next();
			if(val.done == false) this.timer = setTimeout(() => { this.continuous(); }, STEP*1000);
		}

		/**
		 * Executes the animation until the end with quicker speed (if no return, then endlessly)
		 */
		continuousQuick() {
			let val = this.generator.next();
			if(val.done == false) this.timer = setTimeout(() => { this.continuousQuick(); }, SMALLSTEP*1000);
		}
	}

	return OwlAnim;
})();
