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

google.load(google => {
    var map = new google.maps.Map(d3.select("#map").node(), {
        center: {lat: 60.192, lng: 24.946},
        scrollwheel: true,
        zoom: 10,
        sensor: true
    });

    var pdata = require('../data/0_0_0.json');
    var data = parseAis(pdata);
    var cfdata = crossfilter(data);
    var a = cfdata.groupAll();

    var timeDim = cfdata.dimension(x => new Date(x.dateTime).getHours());
    var nameDim = cfdata.dimension(x => x.name);
    var nameGroup = nameDim.group().reduce(
        (p, v) => {
            ++p.count;
            p.lonLatSum.lon += v.lon;
            p.lonLatSum.lat += v.lat;
            p.lonLatAvg.lon = p.lonLatSum.lon / p.count;
            p.lonLatAvg.lat = p.lonLatSum.lat / p.count;
            p.name = v.Name;
            return p;
        },
        (p, v) => {
            --p.count;
            p.lonLatSum.lon = p.lonLatSum.lon - v.lon;
            p.lonLatSum.lat = p.lonLatSum.lat - v.lat;
            p.lonLatAvg.lon = p.count ? p.lonLatSum.lon / p.count : 0;
            p.lonLatAvg.lat = p.count ? p.lonLatSum.lat / p.count : 0;
            p.name = v.Name;
            return p;
        },
        function() {
            return {count:0, avg: 0, lonLatSum: {lon: 0, lat: 0}, lonLatAvg: {lon:0, lat:0}, name: ""}
        }
    );


    var overlay = new google.maps.OverlayView();

    d3.select("#nRadius").on("input", function() {
        timeDim.filterExact(this.value);
        log(nameGroup.top(Infinity).map(x => x.value));
        overlay.draw();
    });

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
                .each(transformStation)
                .enter().append("svg:svg")
                .each(transformStation)
                .attr("class", "station");

            station.append("svg:rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 20)
                .attr("height", 20)
                .on("click", d => {
                    asemaDim.filter(d.value.name);
                    dc.redrawAll();
                    return d;
                }).on("dblclick", d => {
                    asemaDim.filterAll();
                    dc.redrawAll();
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
                .data(d3.entries(nameGroup.top(10)))//data))
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
                .on("click", d => {
                    log(d);
                    boatEffDim.filter(d.value.key.substr(d.value.name.length - 4));
                    dc.redrawAll();
                    return d;
                }).on("dblclick", d => {
                    boatEffDim.filterAll();
                    dc.redrawAll();
                    return d;
                });

            // Add a label.
            marker.append("svg:text")
                .attr("x", 25)
                .attr("dy", 20)
                .text(function (d) {
                    return d.value.key;
                });

            function transform(d) {
                log(d);
                d = new google.maps.LatLng(d.value.value.lonLatAvg.lat, d.value.value.lonLatAvg.lon);
                d = projection.fromLatLngToDivPixel(d);
                return d3.select(this)
                    .style("left", (d.x - 25) + "px")
                    .style("top", (d.y - 25) + "px");
            }

            function transformStation(d) {
                log(d);
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
        d.hour = new Date(d.dateTime).getHours();
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
    d.luotsaukset = parseInt(d.luotsaukset);
    d.mailiaLitra = parseFloat(d.kml)*0.62137;
    d.kuljettu = veneet.filter(x => d.laiva == x.id)[0].kuljettu;
    d.huolto = veneet.filter(x => d.laiva == x.id)[0].huolto;
    d.mlh = parseFloat(d.mlh);
    return d;
});

var cf = dc.crossfilter(pdata);
var all = cf.groupAll();

var asemaDim = cf.dimension(d => d.asema);

var rpmDim = cf.dimension(d =>d.rpm);
var rpmGroup = rpmDim.group().reduce(...avgReducer('kulutus'));

var defaultChartMargins = {top: 20, right: 50, bottom: 0, left: 0};

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
    .y(d3.scale.linear().domain([0,1.2]))
    .xUnits(dc.units.ordinal)
    .yAxisLabel("Efficiency [mi/l]")
    .xAxisLabel("Boat")
    .dimension(boatEffDim)
    .group(boatEffGroup)
    .valueAccessor(p => p.value.avg);

var huoltoDim = cf.dimension(x => x.laiva);
var huoltoGroup = huoltoDim.group().reduce(...avgReducer('kuljettu'));

var chart3 = dc.barChart('#chart3')
    .width(400)
    .height(300)
    .margins(defaultChartMargins)
    .x(d3.scale.ordinal())
    .xUnits(dc.units.ordinal)
    .yAxisLabel("Overhaul")
    .xAxisLabel("Boat")
    .dimension(huoltoDim)
    .group(huoltoGroup)
    .valueAccessor(x => x.value.avg);

var filters = [];
/*
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
*/
//chart4: fault per boat
//chart5: driving style
//chart6: efficiency per rpm

var rpmEffDim = cf.dimension(d =>d.rpm);
var rpmEffGroup = rpmEffDim.group().reduce(...avgReducer('mailiaLitra'));

var chart6 = dc.lineChart('#chart6')
    .width(600)
    .height(300)
    .margins(defaultChartMargins)
    .x(d3.scale.linear().domain([600,1900]))
    .yAxisLabel("Efficiency[mi/l]")
    .xAxisLabel("RPM")
    .dimension(rpmEffDim)
    .group(rpmEffGroup)
    .valueAccessor(x => x.value.avg);

var rpmNmDim = cf.dimension(d =>d.rpm);
var rpmNmGroup = rpmNmDim.group().reduce(...avgReducer('mlh'));

var chart7 = dc.lineChart('#chart7')
    .width(600)
    .height(300)
    .margins(defaultChartMargins)
    .x(d3.scale.linear().domain([600,1900]))
    .yAxisLabel("m_l/h <- mikä on")
    .xAxisLabel("RPM")
    .dimension(rpmNmDim)
    .group(rpmNmGroup)
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