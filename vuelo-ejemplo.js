const request = require('request-promise');
const moment = require('moment');
//require('request-debug')(request);

const flights = {
    findFlightsUrl: 'https://www.flightradar24.com/v1/search/web/find', 
    countriesUrl: 'https://restcountries.eu/rest/v2/alpha/',
    detailsFlightUrl: 'https://data-live.flightradar24.com/clickhandler/?version=1.5&flight={fr24id}',

    find: function(idFlight){
        return request.get({
            url: flights.findFlightsUrl,
            qs: {
                query: idFlight,
                limit: 1
            }
        });
    },

    detail: function(response){
        var body = JSON.parse(response);
        const id = body.results[0].id;
        const detailUrl = flights.detailsFlightUrl.replace('{fr24id}', id);
        return request.get({url: detailUrl});
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
        // console.log("start: "+start);
        // console.log("total: "+total);
        // console.log("current: "+ current);
        const progress =  (current-start)*100/total;
        // console.log("progress: "+progress);
        return progress;
    }

    
};

function main(codeFlight){
    return flights
        .find(codeFlight)
        .then(flights.detail)
        .then(flights.magicMirrorDetail);

};

main('AF179').then(function(flightDetail){
    console.log(flightDetail);
});
