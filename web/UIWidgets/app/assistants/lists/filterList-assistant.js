function FilterListAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
 }


FilterListAssistant.prototype.setup = function() {
		this.setupData();	
		console.log("setting up filterfield");
		var attributes =
		{
			itemTemplate: 'lists/filterList/entry',
			swipeToDelete: false,
			reorderable: false,
			filterFunction: this.list.bind(this),
			formatters:{name:this.formatName.bind(this),number:this.formatNumber.bind(this)},
			delay: 1000, //1 second delay before filter string is used
			disabledProperty: 'disabled'
		};
		this.model = {
			disabled: false
		};

		this.controller.setupWidget('filterlist', attributes, this.model);
		this.tapped = this.tapped.bind(this);
		this.gotFilter = this.gotFilter.bind(this);
		Mojo.Event.listen(this.controller.get('filterlist'), Mojo.Event.listTap, this.tapped);
		Mojo.Event.listen(this.controller.get('filterlist'), Mojo.Event.filter, this.gotFilter, true);
}


	
FilterListAssistant.prototype.gotFilter = function(event) {
		console.log("GOT FILTER EVENT IN CLIENT, str=" + event.filterString);
}

	
FilterListAssistant.prototype.tapped = function(event) {
		console.info("TAPPED ELEMENT " + event.item.name);
	
}

FilterListAssistant.prototype.formatNumber = function(n, model){
		//Adding the first letter of name to the associated number
		return n + String(model.name)[0];
}

FilterListAssistant.prototype.formatName = function(n, model){
		//Capitalizing the first letter of the name
		return String(n).capitalize();
}

FilterListAssistant.prototype.list = function(filterString, listWidget, offset, count){
		var subset = [];
		var totalSubsetSize = 0;
		
		//loop through the original data set & get the subset of items that have the filterstring 
		var i = 0;
		while (i <  this.data.length) {
			
	        if (this.data[i].name.indexOf(filterString)!=-1 ||
	            this.data[i].number.indexOf(filterString)!=-1) {
				if (subset.length < count && totalSubsetSize >= offset) {
					subset.push(this.data[i]);
				}
				totalSubsetSize++;
			}
			i++;
		}
		
		//update the items in the list with the subset
		listWidget.mojo.noticeUpdatedItems(offset, subset);
		
		//set the list's lenght & count if we're not repeating the same filter string from an earlier pass
		if (this.filter !== filterString) {
			listWidget.mojo.setLength(totalSubsetSize);
			listWidget.mojo.setCount(totalSubsetSize);
		}
		this.filter = filterString;
	}
	
FilterListAssistant.prototype.setupData = function() {
	this.data = [];
		//Set up a list of names & numbers
			this.data =
					[{'name': 'adam', 'number':'1'},
					{'name': 'andrew', 'number':'2'},
					{'name': 'ben', 'number':'3'},
					{'name': 'betsy', 'number':'4'},
					{'name': 'betty', 'number':'5'},
					{'name': 'bob', 'number':'6'},
					{'name': 'bobby', 'number':'7'},
					{'name': 'elvis', 'number':'8'},
					{'name': 'enda', 'number':'9'},
					{'name': 'eric', 'number':'10'},
					{'name': 'dak', 'number':'11'},
					{'name': 'drew', 'number':'12'},
					{'name': 'graham', 'number':'13'},
					{'name': 'gus', 'number':'14'},
					{'name': 'ingram', 'number':'15'},
					{'name': 'jack', 'number':'16'},
					{'name': 'jill', 'number':'17'},
					{'name': 'joe', 'number':'18'},
					{'name': 'john', 'number':'19'},
					{'name': 'johnson', 'number':'20'},
					{'name': 'jules', 'number':'21'},
					{'name': 'katie', 'number':'22'},
					{'name': 'katrina', 'number':'23'},
					{'name': 'kelly', 'number':'24'},
					{'name': 'mark', 'number':'25'},
					{'name': 'marky', 'number':'26'},
					{'name': 'matt', 'number':'27'},
					{'name': 'nadar', 'number':'28'},
					{'name': 'nate', 'number':'29'},
					{'name': 'nathan', 'number':'30'},
					{'name': 'noah', 'number':'31'},
					{'name': 'patti', 'number':'32'},
					{'name': 'phil', 'number':'33'},
					{'name': 'phillip', 'number':'34'},
					{'name': 'phillis', 'number':'35'},
					{'name': 'robert', 'number':'36'},
					{'name': 'rose', 'number':'37'},
					{'name': 'sadie', 'number':'38'},
					{'name': 'sally', 'number':'39'},
					{'name': 'sean', 'number':'40'},
					{'name': 'stan', 'number':'41'},
					{'name': 'stephen', 'number':'42'},
					{'name': 'steve', 'number':'43'},
					{'name': 'steven', 'number':'44'},
					{'name': 'tao', 'number':'45'},
					{'name': 'willard', 'number':'46'},
					{'name': 'willy', 'number':'47'},
					{'name': 'yip', 'number':'48'},
					{'name': 'yvonne', 'number':'49'},
					{'name': 'xaomao', 'number':'50'},
					{'name': 'zevin', 'number':'51'}]; 
}

FilterListAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


FilterListAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

FilterListAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	Mojo.Event.stopListening(this.controller.get('filterlist'), Mojo.Event.listTap, this.tapped);
    Mojo.Event.stopListening(this.controller.get('filterlist'), Mojo.Event.filter, this.gotFilter, true);  
}
String.prototype.capitalize = function(){
   return this.replace( /(^|\s)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } );
  };