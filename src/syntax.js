var OwlSyntax = (function() {
	'use strict';

	/**
	 * Class resposible for syntax highlighting
	 *
	 * @property {Object} options - Settings
	 * @property {string} options.id - The id of DOM element, the code is in
	 * @property {OwlSyntax.language} [options.language] - Grammar in use
	 * @property {boolean} [options.html] - If false, the code will not be parsed, or highlighted, it will be the resposibility of user
	 * @property {Element} source - The DOM element, the source code is in.
	 * @property {Element} container - The DOM element, the highlighted code is in. Valid after {@link OwlSyntax#render} has run
	 */
	class OwlSyntax {
		/**
		 * Creates the highlight
		 *
		 * @param {string} id - The id of DOM element, the code is in
		 * @param {Object} options - Settings
		 * @param {string|OwlSyntax.language} [options.language] - If string, then name of grammar (OwlSyntax[{name}]). If object, then it must be compatible with {@link OwlSyntax.language}. If undefined but the data-language property is set on the source element, then the language will be taken from that property.
		 * @param {boolean} [options.html] - If false, the code will not be parsed, or highlighted, it will be the resposibility of user
		 */
		constructor(id, options) {
			if(options == undefined) options = {};
			this.options = options;

			this.source = document.getElementById(id);
			this.source.id = '';
			this.options.id = id;

			if(typeof options.language == 'string') this.language = new OwlSyntax[options.language]();
			else if(typeof options.language == 'object') this.language = options.language;
			else if(options.language == undefined && this.source.dataset['language'] != undefined) this.language = new OwlSyntax[this.source.dataset['language']]();
			else throw new Error('OwlSyntax: Language not provided');

			if(options.html != true) {
				this.render(this.highlight());
			}
		}

		/**
		 * Renders the given html to dom, in place of source element.
		 *
		 * @param {string} html - The html to be rendered.
		 */
		render(html) {
			this.container = document.createElement('div');
			this.container.innerHTML = html;
			this.container.classList.add('highlighter');
			this.container.classList.add('container');
			this.container.classList.add('default');
			this.container.id = this.options.id;
			this.language.container(this.container);
			this.source.parentNode.insertBefore(this.container, this.source);
		}

		/**
		 * Highlightes the text in source element according to the selected grammar
		 *
		 * @returns {string} The html, containing the tags for highlighting.
		 */
		highlight() {
			let txt = this.source.innerText.split('\n');
			txt = this.preprocess(txt);

			for(let i = 0; i < txt.length; i++) {
				for(let handler in this.language.handlers) {
					txt[i] = this.language.handle(handler, txt[i]);
				}
			}

			txt = this.postprocess(txt);
			return txt.join('\n');
		}

		/**
		 * Preprocesses the text. Splits it to lines, removes empty lines from the beginning, alignes indents, escapes < and >. Calls the preprocess function of grammar (see {@link OwlSyntax.language#preprocess})
		 *
		 * @param {string} txt - The source code as plain text
		 *
		 * @return {string[]} The source code split to lines, void of empty lines, and indents are corrected, < and > are escaped
		 */
		preprocess(txt) {
			while(txt[0] == '') txt.shift();

			let charNum = 0;
			for(let i = 0; txt[0][i] == ' ' || txt[0][i] == '\t'; i++) {
				charNum++;
			}

			for(let i = 0; i < txt.length; i++) {
				txt[i] = txt[i].substring(charNum);
			}

			for(let i = 0; i < txt.length; i++) {
				txt[i] = this.language.preprocess(txt[i]);
				txt[i] = txt[i].replace(/\</g, '&lt;');
				txt[i].replace(/\>/g, '&gt;');
			}

			return txt;
		}

		/**
		 * Post processes the lines by wrapping them in a <span> element and executing the grammars postprocess function (see {@link OwlSyntax.language#postprocess})
		 *
		 * @param {string[]} txt - The highlighted source code in lines
		 *
		 * @returns {string[]} The postprocessed source code in lines
		 */
		postprocess(txt) {
			for(let i = 0; i < txt.length; i++) {
				txt[i] = '<span class="line">' + txt[i] + '</span>';
				txt[i] = this.language.postprocess(txt[i]);
			}
			return txt;
		}

		/**
		 * Marks a line (and segment) to be active. The css class active is appended to the class list. Removes previously activated lines, segments.
		 *
		 * @param {number|number[]} line - The index of line to be make it active (1, 2, 3, ...). If an array, then all of the lines will be made active.
		 * @param {number} [segment] - The index of segment inside of active line to make it active (1, 2, 3, ...)
		 */
		mark(line, segment) {
			this.unmark();
			if(typeof line == 'number') {
				this.line = this.container.children[line - 1];
				this.line.classList.add('active');
				if(segment != undefined) {
					this.segment = this.line.querySelectorAll('.segment')[segment - 1];
					this.segment.classList.add('active');
				}
			}
			else if(line instanceof Array) {
				this.line = [];
				for(let i = 0; i < line.length; i++) {
					this.container.children[line[i] - 1].classList.add('active');
					this.line.push(this.container.children[line[i] - 1]);
				}
			}
		}

		/**
		 * Removes previously activated lines, segments.
		 */
		unmark() {
			if(this.line != undefined && this.line instanceof Element) this.line.classList.remove('active');
			else if(this.line != undefined && this.line instanceof Array) {
				for(let i = 0; i < this.line.length; i++) {
					this.line[i].classList.remove('active');
				}
			}
			if(this.segment != undefined) this.segment.classList.remove('active');
			this.line = undefined;
			this.segment = undefined;
		}

	}

	/**
	 * Class representing the base grammars
	 * @memberof OwlSyntax
	 *
	 * @property {Function[]} handlers - Associative array of handler functions ((txt)=>{return txt;}). This array of handlers will be iterated through, and each element will be called for all of the lines of source code.
	 */
	OwlSyntax.language = class {
		/**
		 * Creates the grammars
		 */
		constructor() {
			this.handlers = [];
		}

		/**
		 * Runs a handler. A handler highlightes the proper parts of code, and returns the result in html.
		 *
		 * @param {string} handler - Name of handler
		 * @param {string} txt - The line of code, to be processed
		 *
		 * @returns {string} The highlighted code in html
		 */
		handle(handler, txt) {
			return this[this.handlers[handler]](txt);
		}

		/**
		 * This method makes it possible for the grammar to manipulate the container DOM element.
		 *
		 * @param {Element} container - The DOMELement of container
		 */
		container(container) {
			return;
		}

		/**
		 * Preprocesses the text. Runs before highlighting.
		 *
		 * @param {string} txt - Raw line of source code
		 * @returns {string} Preprocessed line of source code
		 */
		preprocess(txt) {
			return txt;
		}

		/**
		 * Postprocesses the text. Runs after highlighting.
		 *
		 * @param {string} txt - Raw line of source code
		 * @returns {string} Postprocessed line of source code
		 */
		postprocess(txt) {
			return txt;
		}
	}

	/**
	 * Grammar for c
	 * @memberof OwlSyntax
	 * @extends OwlSyntax.language
	 *
	 * @property {regex} preprocessor - Regex for identifying and selecting preprocessor directives
	 * @property {regex} block-comment - Regex for identifying and selecting block comments
	 * @property {regex} line-comment - Regex for identifying and selecting line comments
	 * @property {regex} string - Regex for identifying and selecting strings
	 * @property {regex} character - Regex for identifying and selecting characters
	 * @property {regex} keyword - Regex for identifying and selecting keywords
	 * @property {regex} boolean - Regex for identifying and selecting booleans
	 * @property {regex} function - Regex for identifying and selecting function names
	 * @property {regex} number - Regex for identifying and selecting numbers
	 * @property {regex} for - Regex for identifying and selecting for cycles
	 * @property {regex} segment-begin - Regex for identifying and selecting segment begins (/*#*\/)
	 * @property {regex} segment-begin - Regex for identifying and selecting segment ends (/*$*\/)
	 */
	OwlSyntax.c = class extends OwlSyntax.language {
		constructor() {
			super();
			this['preprocessor'] = /(^#.*$)/g;
			this['block-comment'] = /(\/\*.*\*\/)/g;
			this['line-comment'] = /(\/\/.*)/g;
			this['string'] = /"(.*?)"/g;
			this['character'] = /'(.*?)'/g;
			this['keyword'] =  /\b(asm|typeof|inline|auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while)(?=[^\w])/g;
			this['boolean'] = /\b(true|false)/g;
			this['function'] = /([a-z0-9_]+(?=\())/g;
			this['number'] = /\b(-?(?:0x[\da-f]+|\d*\.?\d+(?:e[+-]?\d+)?)[ful]*)\b/g;
			this['for'] = /for[\s]*\((.*);(.*);(.*)\)/g;
			this['segment-begin'] = /(\/\*#\*\/)/g;
			this['segment-end'] = /(\/\*\$\*\/)/g;

			this.handlers['string'] = 'stringHandler';
			this.handlers['character'] = 'characterHandler';
			this.handlers['preprocessor'] = 'preprocessorHandler';
			this.handlers['segment-begin'] = 'segmentBeginHandler';
			this.handlers['segment-end'] = 'segmentEndHandler';
			this.handlers['block-comment'] = 'blockCommentHandler';
			this.handlers['line-comment'] = 'lineCommentHandler';
			this.handlers['for'] = 'forHandler';
			this.handlers['keyword'] = 'keywordHandler';
			this.handlers['boolean'] = 'booleanHandler';
			this.handlers['function'] = 'functionHandler';
			this.handlers['number'] = 'numberHandler';
		}

		/**
		 * Handler for strings
		 *
		 * @param {string} txt - The unformatted line
		 * @returns {string} The line including a <span> to format the string
		 */
		stringHandler(txt) {
			return txt.replace(this['string'], '<span class="string">"$1"</span>');
		}

		/**
		 * Handler for characters
		 *
		 * @param {string} txt - The unformatted line
		 * @returns {string} The line including a <span> to format the character
		 */
		characterHandler(txt) {
			return txt.replace(this['character'], '<span class="character">\'$1\'</span>');
		}

		/**
		 * Handler for preprocessor directives
		 *
		 * @param {string} txt - The unformatted line
		 * @returns {string} The line including a <span> to format the directive
		 */
		preprocessorHandler(txt) {
			return txt.replace(this['preprocessor'], '<span class="preprocessor">$1</span>');
		}

		/**
		 * Handler for block comments
		 *
		 * @param {string} txt - The unformatted line
		 * @returns {string} The line including a <span> to format the block comment
		 */
		blockCommentHandler(txt) {
			if(txt == '/*#*/') return '<span class="segment">';
			else if(txt == '/*$*/') return '</span>';
			else return txt.replace(this['block-comment'], '<span class="block-comment">$1</span>');
		}

		/**
		 * Handler for line comments
		 *
		 * @param {string} txt - The unformatted line
		 * @returns {string} The line including a <span> to format the line comment
		 */
		lineCommentHandler(txt) {
			return txt.replace(this['line-comment'], '<span class="line-comment">$1</span>');
		}

		/**
		 * Handler for keywords
		 *
		 * @param {string} txt - The unformatted line
		 * @returns {string} The line including a <span> to format the keyword
		 */
		keywordHandler(txt) {
			return txt.replace(this['keyword'], '<span class="keyword">$1</span>');
		}

		/**
		 * Handler for booleans
		 *
		 * @param {string} txt - The unformatted line
		 * @returns {string} The line including a <span> to format the boolean
		 */
		booleanHandler(txt) {
			return txt.replace(this['boolean'], '<span class="boolean">$1</span>');
		}

		/**
		 * Handler for function names
		 *
		 * @param {string} txt - The unformatted line
		 * @returns {string} The line including a <span> to format the function name
		 */
		functionHandler(txt) {
			return txt.replace(this['function'], '<span class="function">$1</span>');
		}

		/**
		 * Handler for numbers
		 *
		 * @param {string} txt - The unformatted line
		 * @returns {string} The line including a <span> to format the number
		 */
		numberHandler(txt) {
			return txt.replace(this['number'], '<span class="number">$1</span>');
		}

		/**
		 * Handler for for cycles
		 *
		 * @param {string} txt - The unformatted line
		 * @returns {string} The line including a <span> to format the for cycle
		 */
		forHandler(txt) {
			txt = txt.replace(/&lt;/g, '|-|');
			txt = txt.replace(/&gt;/g, '|+|');
			txt = txt.replace(this['for'], '<span class="forcycle">for(<span class="segment">$1</span>;<span class="segment">$2</span>;<span class="segment">$3</span>)</span>');
			txt = txt.replace(/\|\-\|/g, '&lt;');
			txt = txt.replace(/\|\+\|/g, '&gt;');
			return txt;
		}

		/**
		 * Handler for segment begins
		 *
		 * @param {string} txt - The unformatted line
		 * @returns {string} The line including a <span> to format the segment begin
		 */
		segmentBeginHandler(txt) {
			return txt.replace(this['segment-begin'], '<span class="segment">');
		}

		/**
		 * Handler for segment ends
		 *
		 * @param {string} txt - The unformatted line
		 * @returns {string} The line including a <span> to format the segment end
		 */
		segmentEndHandler(txt) {
			return txt.replace(this['segment-end'], '</span>');
		}
	}

	return OwlSyntax;
})();
