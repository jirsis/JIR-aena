/* Magic Mirror
 * Module: JIR-aena
 *
 * By Iñaki Reta Sabarrós https://github.com/jirsis
 * MIT Licensed.
 */

Module.register('JIR-aena', {
    defaults: {

        apiBase: 'xxxx',
        
        animationSpeed: 2000,

        initialLoadDelay: 2500,
        updateInterval: 10 * 1000 * 1000, //every 10 secs

    },

    requiresVersion: '2.1.0',

    getStyles: function() {
		return [
            'aena.css'
        ];
    },

    getScripts: function () {
		return [
		    'https://use.fontawesome.com/releases/v5.6.3/js/all.js'
		];
    },

    start: function(){
        Log.log('Starting module: ' + this.name);
        this.socketNotificationReceived('AENA_STARTED', this.config);
        this.scheduleUpdate(this.config.initialLoadDelay);
        this.loaded = true;
    },

    updateAena: function(){
        var self = this;
        
        this.flightInfo = [];
        
        // var kmgLoginRequest = new XMLHttpRequest();
        // var kmgQuery = new FormData();
        // kmgQuery.append('guest_code', this.config.guest_token);
            
        // kmgLoginRequest.open('GET', urlLogin, true);
        // kmgLoginRequest.onreadystatechange = function() {
        //     if (this.readyState === 4) {
        //         var kmgResponse = JSON.parse(this.response);
        //         self.processKmgAgendaInformation(kmgResponse);
        //         self.scheduleUpdate(self.config.updateInterval);
        //     }
        // };
        // kmgLoginRequest.send();
    },

    processKmgAgendaInformation: function(agendaData){
        this.agendaInfo = agendaData;
        this.show(this.config.animationSpeed, {lockString:this.identifier});
        this.loaded=true;
        this.updateDom(this.config.animationSpeed);
    },

    getDom: function() {
        console.log("...");
        var wrapper = document.createElement('div');
        if (!this.loaded) {
			return this.aenaNotLoaded(wrapper);
        }

        if(this.error){
            wrapper.innerHTML = this.name + ': '+this.error;
            wrapper.className = 'dimmed light small';
            this.error = undefined;
		    return wrapper;
        }
        var table = document.createElement('table');
        table.className = 'small';
    
        var tbody = document.createElement('tbody');
        var row = document.createElement('tr');
        var fromCell = document.createElement('td');
        fromCell.innerHTML='from';
        var progressCell = document.createElement('td');
        progressCell.innerHTML='progress bar';
        var toCell = document.createElement('td');
        toCell.innerHTML='to';


        row.appendChild(fromCell);
        row.appendChild(progressCell);
        row.appendChild(toCell);

        tbody.appendChild(row);

        table.appendChild(tbody);

        return table;
    },
    
    aenaNotLoaded: function(wrapper){
        wrapper.innerHTML = this.name + ' '+this.translate('LOADING');
        wrapper.className = 'dimmed light small';
		return wrapper;
    },

    scheduleUpdate: function(delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== 'undefined' && delay >= 0) {
			nextLoad = delay;
		}
		var self = this;
		setTimeout(function() {
            self.sendSocketNotification('AENA_SET_CONFIG', self.config);
			self.updateAena();
		}, nextLoad);
	},

    showError: function(errorDescription){
        this.error = errorDescription;
        Log.info(errorDescription);
    },

    // socketNotificationReceived: function (notification, payload) {
    //     Log.info('notification recived '+notifiaction);
    //     if (notification === 'KMG_UPDATE_CONFIG') {
    //         Log.info(payload);
    //         this.updateDom(this.config.animationSpeed);
    //     }    
    // },
});