/* Magic Mirror
 * Module: JIR-flights
 *
 * By Iñaki Reta Sabarrós https://github.com/jirsis
 * MIT Licensed.
 */

Module.register('JIR-flights', {
    defaults: {
        animationSpeed: 2000,

        initialLoadDelay: 2500,
        updateInterval: 60 * 60 * 1000, //every 1h 

    },

    requiresVersion: '2.1.0',

    getStyles: function() {
		return [
            'flight.css'
        ];
    },

    getScripts: function () {
		return [
		    'https://use.fontawesome.com/releases/v5.6.3/js/all.js'
		];
    },

    start: function(){
        Log.log('Starting module: ' + this.name);
        this.socketNotificationReceived('JIR-FLIGHTS_STARTED', this.config);
        this.scheduleUpdate(this.config.initialLoadDelay);
        this.loaded = true;
    },

    processFlightInformation: function(flightData){
        this.flight = flightData;
        this.show(this.config.animationSpeed, {lockString:this.identifier});
        this.loaded=true;
        this.updateDom(this.config.animationSpeed);
    },

    getDom: function() {

        this.flight = {
            "flight": "AF1100/AFR110K",
            "departure": {
              "airport": "CDG",
              "name": "Paris Charles de Gaulle Airport",
              "city": "Paris",
              "country": "France",
              "timezone": {
                "abbr": "CET",
                "hours": "+1:00",
                "name": "Europe/Paris"
              },
              "time": {
                "scheduled": 1545927000,
                "estimated": null,
                "real": 1545927782
              }
            },
            "arrival": {
              "airport": "MAD",
              "name": "Madrid Barajas Airport",
              "city": "Madrid",
              "country": "Spain",
              "timezone": {
                "abbr": "CET",
                "hours": "+1:00",
                "name": "Europe/Madrid"
              },
              "time": {
                "scheduled": 1545934500,
                "estimated": 1545934058,
                "real": null
              }
            },
            "duration": {
              "total": "01:44",
              "progress": 15.296367112810707
            }
        };

        var wrapper = document.createElement('div');
        if (!this.loaded) {
			return this.flightNotLoaded(wrapper);
        }

        if(this.error){
            wrapper.innerHTML = this.name + ': '+this.error;
            wrapper.className = 'dimmed light small';
            this.error = undefined;
		    return wrapper;
        }

        let flightTable = document.createElement('table');

        let airportsRow = document.createElement('tr');
        let airportDeparture = document.createElement('td');
        airportDeparture.innerHTML='CDG';
        let airportArrival = document.createElement('td');
        airportArrival.innerHTML='MAD';
        airportsRow.appendChild(airportDeparture);
        airportsRow.appendChild(airportArrival);

        let timesRow = document.createElement('tr');
        let timeDeparture = document.createElement('td');
        timeDeparture.innerHTML = 'hh:mm';
        let timeArrival = document.createElement('td');
        timeArrival.innerHTML = 'hh:mm';
        timeRow.appendChild(timeDeparture);
        timeRow.appendChild(timeArrival);

        let progressRow = document.createElement('tr');
        let progress = document.createElement('td');
        progress.innerHTML='20%';
        progressRow.appendChild(progress);

        let etaRow = document.createElement('tr');
        let eta = document.createElement('td');
        eta.innerHTML='duración estimada hh:mm'
        etaRow.appendChild(eta);

        flightTable.appendChild(airportRow);
        flightTable.appendChild(timesRow);
        flightTable.appendChild(progressRow);
        flightTable.appendChild(etaRow);
        return flightTable;
    },
    
    flightsNotLoaded: function(wrapper){
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
            self.sendSocketNotification('JIR-FLIGHTS_STARTED', self.config);
			self.updateFlight();
		}, nextLoad);
	},

    showError: function(errorDescription){
        this.error = errorDescription;
       // Log.info(errorDescription);
    },

    socketNotificationReceived: function (notification, payload) {
        //Log.info('notification recived '+notification);
        if (notification === 'JIR_FLIGHTS_STARTED'){
            this.sendSocketNotification(notification, payload);
        } else if (notification === 'JIR_FLIGHTS_WAKE_UP') {
            Log.info("flight found it, must show module");
            Log.info(payload);
            this.processFlightInformation(payload);
        }else if (notification === 'JIR_FLIGHTS_NOT_FOUND'){
            Log.info("not found, must hide module");
        } 
    },
});