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
        updateInterval: 3*60*1000, //every 3m 

        flightRegex: /\[(.*)\]/s,

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
        this.loaded = false;
    },

    processFlightInformation: function(flightData){
        this.flight = JSON.parse(flightData);
        this.show(this.config.animationSpeed, {lockString:this.identifier});
        this.loaded=true;
        this.updateDom(this.config.animationSpeed);
    },

    getDom: function() {

        var wrapper = document.createElement('div');
        if (!this.loaded) {
			return this.flightsNotLoaded(wrapper);
        }

        if(this.error){
            wrapper.innerHTML = this.name + ': '+this.error;
            wrapper.className = 'dimmed light small';
            this.error = undefined;
		    return wrapper;
        }

        let flightTable = document.createElement('table');

        let fligthRow = document.createElement('tr');
        let flightCode = document.createElement('td');
        flightCode.className='align-center medium';
        flightCode.colSpan=2;
        flightCode.innerHTML=`${this.flight.flight}`;
        fligthRow.appendChild(flightCode);


        let airportsRow = document.createElement('tr');
        let airportDeparture = document.createElement('td');
        airportDeparture.className='bright large strong align-left';
        airportDeparture.innerHTML=`${this.flight.departure.airport}`;

        let airportArrival = document.createElement('td');
        airportArrival.className='bright large strong align-right';
        airportArrival.innerHTML=`${this.flight.arrival.airport}`;
        
        airportsRow.appendChild(airportDeparture);
        airportsRow.appendChild(airportArrival);

        let citiesRow = document.createElement('tr');
        let cityDeparture = document.createElement('td');
        cityDeparture.className='small align-left';
        cityDeparture.innerHTML=`${this.flight.departure.city}`;

        let cityArrival = document.createElement('td');
        cityArrival.className='small align-right';
        cityArrival.innerHTML=`${this.flight.arrival.city}`;    

        citiesRow.appendChild(cityDeparture);
        citiesRow.appendChild(cityArrival);

        let timesRow = document.createElement('tr');
        let timeDeparture = document.createElement('td');
        let departureIcon = document.createElement('i');
        departureIcon.className='fas fa-plane-departure';
        timeDeparture.className='align-left';
        timeDeparture.appendChild(departureIcon);
        timeDeparture.append(` ${this.flight.departure.time}`);
        
        
        let timeArrival = document.createElement('td');
        let arrivalIcon = document.createElement('i');
        arrivalIcon.className='fas fa-plane-arrival';
        timeArrival.className='align-right';
        timeArrival.append(`${this.flight.arrival.time} `);
        timeArrival.appendChild(arrivalIcon);

        timesRow.appendChild(timeDeparture);
        timesRow.appendChild(timeArrival);

        let progressRow = document.createElement('tr');
        let progressCell = document.createElement('td');
        progressCell.className='align-center';
        progressCell.colSpan=2;
        let progress = document.createElement('progress');
        let plane = document.createElement('div');
        plane.className='plane';
        plane.style=`width:${this.flight.duration.progress*2}%`;
        let planeIcon = document.createElement('i');
        planeIcon.className='fas fa-plane plane';
        plane.appendChild(planeIcon);

        progress.setAttribute('max', '100');
        progress.setAttribute('value', `${this.flight.duration.progress}`);
        progressCell.appendChild(plane);
        progressCell.appendChild(progress);
        progressRow.appendChild(progressCell);

        let etaRow = document.createElement('tr');
        let eta = document.createElement('td');
        eta.className='small align-center duration';
        eta.colSpan = 2;
        eta.innerHTML=`tiempo total de vuelo: ${this.flight.duration.total}`;
        etaRow.appendChild(eta);

        flightTable.appendChild(fligthRow);
        flightTable.appendChild(airportsRow);
        flightTable.appendChild(citiesRow);
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

    extractFlighCode: function(payload){
        const self = this;
        const now = moment();
        payload.forEach((event, id) => {
            let match = this.config.flightRegex.exec(event.title);
            const start = moment(parseInt(event.startDate));
            const end = moment(parseInt(event.endDate));
            if(now.isBetween(start, end) && (match != null)){
                //Log.info(`${self.name}: ${match[1]}`);
                self.config.flightCode=match[1];
            }
        });
    },

    scheduleUpdate: function(delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== 'undefined' && delay >= 0) {
			nextLoad = delay;
		}
		var self = this;
		setTimeout(function() {
            self.sendSocketNotification('JIR-FLIGHTS_STARTED', self.config);
			self.scheduleUpdate();
		}, nextLoad);
	},

    showError: function(errorDescription){
        this.error = errorDescription;
    },

    notificationReceived: function(notification, payload, sender){
        if (notification === 'CALENDAR_EVENTS'){
            this.extractFlighCode(payload);
        }
    },

    socketNotificationReceived: function (notification, payload) {
        //Log.info('notification recived '+notification);
        if (notification === 'JIR_FLIGHTS_STARTED'){
            this.sendSocketNotification(notification, payload);
        } else if (notification === 'JIR_FLIGHTS_WAKE_UP') {
            this.processFlightInformation(payload);
        }else if (notification === 'JIR_FLIGHTS_NOT_FOUND'){
            Log.info("not found, must hide module");
        }
    },
});