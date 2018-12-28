const NodeHelper = require('node_helper');
const request = require('request-promise');
const moment = require('moment');
//require('request-debug')(request);



const flights = {
    findFlightsUrl: 'https://www.flightradar24.com/v1/search/web/find', 
    detailsFlightUrl: 'https://data-live.flightradar24.com/clickhandler/?version=1.5&flight={fr24id}',
    helper: {},

    find: function(idFlight){
        return request.get({
            url: this.findFlightsUrl,
            qs: {
                query: idFlight,
                limit: 10
            }
        });
    },

    detail: function(response){
        var body = JSON.parse(response);
        const flightsFounded = body.results.filter( f => f.type === 'live');
        if(flightsFounded.length === 1){
            const detailUrl = flights.detailsFlightUrl.replace('{fr24id}', flightsFounded[0].id);
            return request.get({url: detailUrl});
        }else{
            return Promise.reject("flight not found");
        }
    },

    magicMirrorDetail: function(response){
        const detail = JSON.parse(response);

        const total = flights.getTotalTime(detail.time);
        const start = flights.getTime(detail.time.scheduled.departure, detail.time.estimated.departure, detail.time.real.departure);
        const durationFlight = moment.duration(total, 'seconds');

        return {
            flight: detail.identification.number.default+'/'+detail.identification.callsign,
            departure: {
                airport: detail.airport.origin.code.iata,
                name: detail.airport.origin.name,
                city: detail.airport.origin.position.region.city,
                country: detail.airport.origin.position.country.name,                
                timezone: {
                    abbr: detail.airport.origin.timezone.abbr,
                    hours: detail.airport.origin.timezone.offsetHours,
                    name: detail.airport.origin.timezone.name,
                },
                time: {
                    scheduled: detail.time.scheduled.departure,
                    estimated: detail.time.estimated.departure,
                    real: detail.time.real.departure,
                },
            },
            arrival: {
                airport: detail.airport.destination.code.iata,
                name: detail.airport.destination.name,
                city: detail.airport.destination.position.region.city,
                country: detail.airport.destination.position.country.name,
                timezone: {
                    abbr: detail.airport.destination.timezone.abbr,
                    hours: detail.airport.destination.timezone.offsetHours,
                    name: detail.airport.destination.timezone.name,
                },
                time: {
                    scheduled: detail.time.scheduled.arrival,
                    estimated: detail.time.estimated.arrival,
                    real: detail.time.real.arrival,
                },
            },
            duration: {
                total: [
                    durationFlight.get('hours').toString().padStart(2, '0'), 
                    durationFlight.get('minutes').toString().padStart(2, '0'),
                ].join(':'),
                progress: flights.getProgress(start, total, detail.trail[0].ts),
            }
        }
    },

    getTime: function(scheduled, estimated, real, tz){
        let time = 0;
        if(real !== null){
            time = real;
        } else if (estimated !== null ){
            time = estimated;
        } else {
            time = scheduled;
        }
        return time;
    },

    getTotalTime: function(time){
        const start = flights.getTime(
            time.scheduled.departure, 
            time.estimated.departure, 
            time.real.departure
            );
    
        const end = flights.getTime(
            time.scheduled.arrival, 
            time.estimated.arrival, 
            time.real.arrival,
            );
        return end-start;
    },

    getProgress: function(start, total, current){
        let progress =  (current-start)*100/total;
        if ( progress > 100) progress = 100;
        return progress;
    },

    render: function(model){
        return model;
    },

    notFound: function(){
        console.log("not found breaker");
       // flights.helper.sendSocketNotification('JIR_FLIGHTS_NOT_FOUND', JSON.stringify({msg: "flight not found"}, null, 2));
    },

    chain: function(codeFlight, flights_node_helper){
        this.helper = flights_node_helper;
        return flights
            .find(codeFlight)
            .then(this.detail)
            .then(this.magicMirrorDetail)
            .then(this.render);
    }

    
};
module.exports = NodeHelper.create({

    start: function() {
        console.log(this.name + ' node_helper is started!');
    },

    updateFlightData: function(flight_config, node_helper){
        console.log('JIR-FLIGHTS updated: '+new Date());
        flights.chain(flight_config.flightCode, node_helper)
            .then(function(response){
                node_helper.sendSocketNotification('JIR_FLIGHTS_WAKE_UP', JSON.stringify(response, null, 2));
                setInterval(function update(){  
                    console.log('JIR-FLIGHTS updated: '+new Date());
                    flights.chain(flight_config.flightCode, node_helper)
                    .then(function(response){
                        node_helper.sendSocketNotification('JIR_FLIGHTS_WAKE_UP', JSON.stringify(response, null, 2));
                    });
                }, flight_config.updateInterval);
            });
    },

    socketNotificationReceived: function(notification, payload) {
        const flight_nodehelper = this;
        if ( notification === 'JIR-FLIGHTS_STARTED' ){

            setTimeout(this.updateFlightData, 
                payload.initialLoadDelay, 
                payload,
                flight_nodehelper);     
        }
    }
});