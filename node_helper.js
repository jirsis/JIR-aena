const NodeHelper = require('node_helper');
const request = require('request-promise');
const moment = require('moment');
const timezone = require('moment-timezone');
//require('request-debug')(request);

const flights = {
    findFlightsUrl: 'https://www.flightradar24.com/v1/search/web/find', 
    detailsFlightUrl: 'https://data-live.flightradar24.com/clickhandler/?version=1.5&flight={fr24id}',
    helper: {},
    interval: {},

    departure: false,

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
        const end = flights.getTime(detail.time.scheduled.arrival, detail.time.estimated.arrival, detail.time.real.arrival);
        const durationFlight = moment.duration(total, 'seconds');
        const localOffset = moment().tz(moment.tz.guess()).utcOffset();
        let departedTime = moment(start*1000).add(detail.airport.origin.timezone.offset, 's').subtract(localOffset, 'm').format('HH:mm');
        let arrivalTime = moment(end*1000).add(detail.airport.destination.timezone.offset, 's').subtract(localOffset, 'm').format('HH:mm');
        
        const detailJson = {
            flight: flights.defineFlightName(detail.identification.number.default, detail.identification.callsign),
            departure: {
                airport: detail.airport.origin.code.iata,
                city: detail.airport.origin.position.region.city,
                time: departedTime,
            },
            arrival: {
                airport: detail.airport.destination.code.iata,
                city: detail.airport.destination.position.region.city,
                time: arrivalTime,
            },
            duration: {
                total: `${durationFlight.get('hours').toString().padStart(2, '0')}h ${durationFlight.get('minutes').toString().padStart(2, '0')}m`,
                progress: flights.getProgress(start, total, detail.trail[0].ts),
            },
            updated: moment(),
        }
        return detailJson;
    },

    defineFlightName: function(number, callsign){
        let name = [];
        if(number != null){
            name.push(number);
        }
        if(callsign != null){
            name.push(callsign);
        }
        return name.join('/');
    },

    getTime: function(scheduled, estimated, real){
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

    notFound: function(){
        console.log("not found breaker");
    },

    flightArrived: function(helper){
        flights.departure=false;
        clearInterval(flights.interval);
        helper.sendSocketNotification('JIR-FLIGHTS_ARRIVED');
    },
      
    chain: function(codeFlight, flights_node_helper){
        this.helper = flights_node_helper;
        return flights
            .find(codeFlight)
            .then(this.detail)
            .then(this.magicMirrorDetail);
    }
};

module.exports = NodeHelper.create({

    start: function() {
        console.log(`${this.name} node_helper is started!`);
    },

    updateFlightData: (flight_config, node_helper) => {
        console.log(`JIR-FLIGHTS updated flight: ${flight_config.flightCode}`);
        flights
            .chain(flight_config.flightCode, node_helper)
            .then((response) => {
                const json = JSON.stringify(response, null, 2);
                node_helper.sendSocketNotification('JIR-FLIGHTS_UPDATED', json);
                console.log(`JIR-FLIGHTS updated flight: ${flight_config.flightCode}`);
                flights.interval = setInterval( () => {  
                    flights
                        .chain(flight_config.flightCode, node_helper)
                        .then((response) => {
                            console.log(`progress: ${response.duration.progress}`);
                            if(response.duration.progress < 100){
                                console.log(`keep fliying normal ${flight_config.flightCode}`);
                                node_helper.sendSocketNotification('JIR-FLIGHTS_UPDATED', JSON.stringify(response, null, 2));
                            }else{
                                console.log(`landing...`);
                                flights.flightArrived(node_helper);
                            }
                        });
                }, flight_config.updateInterval);
            });
    },

    socketNotificationReceived: function(notification, payload) {
        const flight_nodehelper = this;
        console.log(`notification received: ${notification}`);
        if ( notification === 'JIR-FLIGHTS_START' ){
            console.log(`flight departed? ${flights.departure}`);
            if(!flights.departure){
                console.log(`notification processed ${notification}`);
                flights.departure=true;
                setTimeout(this.updateFlightData, 
                    payload.initialLoadDelay, 
                    payload,
                    flight_nodehelper);     
            }else{
                console.log(`ignored notification ${notification}`);
            }
        }
    },
});