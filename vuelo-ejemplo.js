const request = require('request-promise');
const flightRadar = require('flightradar24-client/lib/flight');
const moment = require('moment');
//require('request-debug')(request);

const flights = {
    findFlightsUrl: 'https://www.flightradar24.com/v1/search/web/find', 
    countriesUrl: 'https://restcountries.eu/rest/v2/alpha/',
    detailsFlightUrl: 'https://www.flightradar24.com/{flightCode}/{fr24id}',

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
        return flightRadar(body.results[0].id.toString());
    },

    magicMirrorDetail: function(flightDetail){
        const start = moment(flightDetail.departure);
        const end = moment(flightDetail.arrival);
        const total = moment.duration(end.diff(start));
        console.log(flightDetail);
        return {
            flight: flightDetail.callsign,
            departure: {
                airport: flightDetail.origin.id,
                name: flightDetail.origin.name,
                city: '',
                country: flightDetail.origin.country,
                timezone: flightDetail.origin.timezone,
                scheduledTime: flightDetail.scheduledDeparture,
                realTime: flightDetail.departure,
            },
            arrival: {
                airport: flightDetail.destination.id,
                name: flightDetail.destination.name,
                city: '',
                country: flightDetail.destination.country,
                timezone: flightDetail.destination.timezone,
                scheduledTime: flightDetail.scheduledArrival,
                realTime: flightDetail.arrival,
            },
            duration: [total.get('hours').toString().padStart(2, '0'), total.get('minutes')].join(':'),
        }
    },

    fillDeparture: function(detail){
        return request.get({
            url: flights.countriesUrl+detail.departure.country
        }).then(function(countryResponse){
            const country = JSON.parse(countryResponse);
            detail.departure.country = country.translations.es;            
            return detail;
        })
    },

    fillArrival: function(detail){
        return request.get({
            url: flights.countriesUrl+detail.arrival.country
        }).then(function(countryResponse){
            const country = JSON.parse(countryResponse);
            detail.arrival.country = country.translations.es;            
            return detail;
        })
    },

};

function main(codeFlight){
    return flights
        .find(codeFlight)
        .then(flights.detail)
        .then(flights.magicMirrorDetail)
        .then(flights.fillDeparture)
        .then(flights.fillArrival);

};

main('TAP029').then(function(flightDetail){
    console.log(flightDetail);
});