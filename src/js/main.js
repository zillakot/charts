// main.jsx
import d3 from 'd3';
import dc from 'dc';
import nvd3 from 'nvd3';
import google from 'google-maps';
import overlayStyle from '../css/overlay.css';
import dcStyle from '../css/dc.css';
import veneet from '../data/veneet.csv';
import layout from '../css/layout.css';

veneet.forEach(x => {
    x.mmsi = parseInt(x.mmsi);
    x.kuljettu = parseInt(x.kuljettu);
    x.huolto = parseInt(x.huolto);
    return x;
});

var testData;
var stations = [{key: "1", name: "Harmaja", lat: 60.104794, lon: 24.9747871 }];

google.LIBRARIES = ['geometry', 'drawing'];

d3.select("#example").append("input")

google.load(google => {
    var map = new google.maps.Map(d3.select("#map").node(), {
        center: {lat: 60.192, lng: 24.946},
        scrollwheel: true,
        zoom: 10,
        sensor: true
    });

    var pdata = require('../data/0_0_0.json');
    var data = parseAis(pdata.slice(0,100));

    var overlay = new google.maps.OverlayView();

    // Add the container when the overlay is added to the map.
    overlay.onAdd = function () {
        var layer = d3.select(this.getPanes().overlayMouseTarget)
            .append("div")
            .attr("class", "stations");

        // Draw each marker as a separate SVG element.
        // We could use a single SVG, but what size would it have?
        overlay.draw = function () {
            var projection = this.getProjection();

            var station = layer.selectAll("svg")
                .data(d3.entries(stations))
                .each(transform)
                .enter().append("svg:svg")
                .each(transform)
                .attr("class", "station");

            station.append("svg:rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 20)
                .attr("height", 20)
                .on("click", d => {
                    asemaDim.filter(d.value.name);
                    dc.redrawAll();
                    console.log(d.value.name);
                    return d;
                }).on("dblclick", d => {
                    asemaDim.filterAll();
                    dc.redrawAll();
                    console.log(d.value.name);
                    return d;
                });

            station.append("svg:text")
                .attr("x", 25)
                .attr("dy", 12)
                .text(function (d) {
                    return d.value.name;
                });

            var marker = layer.selectAll("svg")
                .filter(x => x.value.name != "Harmaja")
                .data(d3.entries(data))
                .each(transform) // update existing markers
                .enter().append("svg:svg")
                .each(transform)
                .attr("class", "marker");

            // Add a circle.
            marker.append("svg:circle")
                .attr("r", 8)
                .attr("cx", 10)
                .attr("cy", 10)
                .on("mouseover", expand)
                .on("mouseout", collapse)
                .on("click", d => console.log(d.value.lat + " " + d.value.lon));

            // Add a label.
            marker.append("svg:text")
                .attr("x", 25)
                .attr("dy", 20)
                .text(function (d) {
                    return d.value.name;
                });

            function transform(d) {
                console.log(d.value.lat + " " + d.value.lon);
                d = new google.maps.LatLng(d.value.lat, d.value.lon);
                d = projection.fromLatLngToDivPixel(d);
                return d3.select(this)
                    .style("left", (d.x - 25) + "px")
                    .style("top", (d.y - 25) + "px");
            }

            function expand() {
                d3.select(this).transition()
                    .duration(100)
                    .attr("r",10)
            }

            function collapse() {
                d3.select(this).transition()
                    .duration(100)
                    .attr("r",8)
            }
        };
    };
    // Bind our overlay to the map…
    overlay.setMap(map);

});

function parseAis(data){
    data.forEach(d => {
        d.lat = parseFloat(d.lat);
        d.lon = parseFloat(d.lon);
        var time = d.nmea.split(" ");
        d.dateTime = new Date(time[2] + " " + time[3] + " " + time[5] + " " + time[4]);
        delete d.nmea;
        d.name = veneet.filter(x => d.mmsi == x.mmsi)[0].name;
        console.log(JSON.stringify(d));
        return d;
    });
    return data;
}

/*var goo  = google.maps,
    map_in = new goo.Map(document.getElementById('map_in'),
        { zoom: 12,
            center: new goo.LatLng(32.344, 51.048)
        });
*/
var pdata = require('../data/comap.csv');
pdata.forEach(function(d){
    d.rpm = parseFloat(d.rpm);
    d.kulutus = parseFloat(d.kulutus);
    d.kayttoaste = parseFloat(d.kayttoaste);
    d.nopeus = parseFloat(d.nopeus);
    d.luotsaukset = parseInt(d.luotsaukset);
    d.mailiaLitra = parseFloat(d.kml)*0.62137;
    return d;
});

var cf = dc.crossfilter(pdata);
var all = cf.groupAll();

var asemaDim = cf.dimension(d => d.asema);

var rpmDim = cf.dimension(d =>d.rpm);
var rpmGroup = rpmDim.group().reduce(...avgReducer('kulutus'));

var defaultChartMargins = {top: 10, right: 50, bottom: 30, left: 50};

var boatTripDim = cf.dimension(d => d.laiva);
var boatTripGroup = boatTripDim.group().reduceSum(d => d.luotsaukset);

//Chart 1: trips or distance per boat, barchart
var chart1 = dc.barChart('#chart1')
    .width(400)
    .height(300)
    .margins(defaultChartMargins)
    .x(d3.scale.ordinal())
    .xUnits(dc.units.ordinal)
    .yAxisLabel("Trips")
    .xAxisLabel("Boat")
    .dimension(boatTripDim)
    .group(boatTripGroup);


var boatEffDim = cf.dimension(d => d.laiva);
var boatEffGroup = boatEffDim.group().reduce(...avgReducer('mailiaLitra'));


//chart2: efficiency per boat, barchart
var chart2 = dc.barChart('#chart2')
    .width(400)
    .height(300)
    .margins(defaultChartMargins)
    .x(d3.scale.ordinal())
    .xUnits(dc.units.ordinal)
    .yAxisLabel("Efficiency [mi/l]")
    .xAxisLabel("Boat")
    .dimension(boatEffDim)
    .group(boatEffGroup)
    .valueAccessor(p => p.value.avg);

var veneData = dc.crossfilter(veneet);
var vall = veneData.groupAll();

var huoltoDim = veneData.dimension(x => x.id);
var huoltoGroup = huoltoDim.group().reduceSum(d => d.kuljettu);

huoltoDim.filter('L139');
var chart3 = dc.barChart('#chart3')
    .width(400)
    .height(300)
    .margins(defaultChartMargins)
    .x(d3.scale.ordinal())
    .xUnits(dc.units.ordinal)
    .yAxisLabel("Overhaul")
    .xAxisLabel("Boat")
    .dimension(huoltoDim)
    .group(huoltoGroup);

var filters = [];

chart2.onClick = (d => {
    return function() {
        var a = arguments[0];
        if (filters.filter(x => x == a.x).length > 0) {filters = filters.filter(x => x != a.x);}
        else {filters = filters.concat(a.x);}
        huoltoDim.filter(filters);
        dc.redrawAll();
        return  d.apply(this, arguments);
    }
})(chart2.onClick);

chart3.onClick = (d => {
    return function() {
        log(arguments);
        return  d.apply(this, arguments);
    }
})(chart3.onClick);

//chart4: fault per boat
//chart5: driving style
//chart6: efficiency per rpm

var rpmEffDim = cf.dimension(d =>d.rpm);
var rpmEffGroup = rpmEffDim.group().reduce(...avgReducer('mailiaLitra'));

var chart6 = dc.lineChart('#chart6')
    .width(1200)
    .height(300)
    .margins(defaultChartMargins)
    .x(d3.scale.linear().domain([600,1900]))
    .yAxisLabel("Efficiency[mi/l]")
    .xAxisLabel("RPM")
    .dimension(rpmEffDim)
    .group(rpmEffGroup)
    .valueAccessor(x => x.value.avg);

/*
dc.pieChart("#chart1")
    .width(400)
    .height(200)
    .dimension(asemaDim)
    .group(asemaGroup)
    .innerRadius(50);
*/

dc.dataCount('#data-count')
    .dimension(cf)
    .group(all)
    .html({
        some: '<strong>%filter-count</strong> selected out of <strong>%total-count</strong> records',
        all: 'All records selected. Please click on the graph to apply filters.'
    });

dc.renderAll();

function appendLog(data){
    return d3.select('#example')
        .data(data)
        .enter()
        .append('p')
        .text(function(d){return JSON.stringify(d);});
}

function barChart(dim, group, id, xlabel, ylabel, valueAccessor){
    var c = dc.barChart(id)
        .width(400)
        .height(200)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .yAxisLabel(ylabel)
        .xAxisLabel(xlabel)
        .dimension(dim)
        .group(group);

    return c;
}

function avgReducer(key){
    return [reduceAvgAdd(key), reduceAvgRemove(key), reduceAvgInit()];
}

function reduceAvgAdd(key){
    return function(p,v){
        ++p.count;
        p.sum += v[key];
        p.avg = p.sum / p.count;
        return p;
    }
}

function reduceAvgRemove(key){
    return function(p,v){
        --p.count;
        p.sum -= v[key];
        p.avg = p.count ? p.sum / p.count : 0;
        return p;
    }
}

function reduceAvgInit(){
    return function(){
        return {count: 0, sum: 0, avg: 0};
    }
}

function log(x){
    console.log(JSON.stringify(x));
}