OwlSyntax.infoc = class extends OwlSyntax.c {
	constructor() {
		super();
		this['line-comment'] = /\/\/(.*)/g;
		this['specfunction'] = /\b(printf|scanf|fprintf|fscanf|sprintf|sscanf|malloc|free|rand|time|srand|realloc|memcpy|strlen|strcat|strcpy|strcmp|strstr|strtok)(?=[^\w])/g;

		this.handlers['specfunction'] = 'specfunctionHandler';
	}

	container(container) {
		container.classList.remove('default');
		container.classList.add('infoc');
	}

	lineCommentHandler(txt) {
		return txt.replace(this['line-comment'], '<span class="line-comment"><span class="hidden">/* </span>$1<span class="hidden"> */</span></span>');
	}

	specfunctionHandler(txt) {
		return txt.replace(this['specfunction'], '<span class="specfunction">$1</span>');
	}
}
