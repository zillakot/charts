// main.jsx
import d3 from 'd3';
import dc from 'dc';
import nvd3 from 'nvd3';
import google from 'google-maps';
import overlayStyle from '../css/overlay.css';
import dcStyle from '../css/dc.css';
import veneet from '../data/veneet.csv';

veneet.forEach(x => {
    x.mmsi = parseInt(x.mmsi);
    console.log(JSON.stringify(x))
    return x;
});
//var filename = '../data/0_0_0.json';
//var csvfile = '../data/comap.csv';

var testData;
var stations = [{key: "1", name: "Harmaja", lat: 60.104794, lon: 24.9747871 }];

google.LIBRARIES = ['geometry', 'drawing'];

google.load(google => {
    var map = new google.maps.Map(d3.select("#map_in").node(), {
        center: {lat: 60.192, lng: 24.946},
        scrollwheel: true,
        zoom: 10
    });

    var pdata = require('../data/0_0_0.json');
    var data = parseAis(pdata.slice(0,10));

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
                .attr("cx", 15)
                .attr("cy", 15)
                .on("mouseover", expand)
                .on("mouseout", collapse)
                .on("click", d => console.log(d.value.lat + " " + d.value.lon));

            // Add a label.
            marker.append("svg:text")
                .attr("x", 25)
                .attr("dy", 20)
                .text(function (d) {
                    return d.value.mmsi;
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

    return d;
});

var cf = dc.crossfilter(pdata);
var all = cf.groupAll();

var asemaDim = cf.dimension(d => d.asema);
var nimiDim = cf.dimension(d => d.laiva);
var laivaDim = cf.dimension(d => d.laiva);
var rpmDim = cf.dimension(d =>d.rpm);

var asemaGroup = asemaDim.group().reduceSum(d => d.luotsaukset);

var rpmGroup = rpmDim.group().reduce(
    reduceAvgAdd('kulutus'),
    reduceAvgRemove('kulutus'),
    reduceAvgInit()
);

var laivaNopeusGroup = laivaDim.group().reduce(
    reduceAvgAdd('nopeus'),
    reduceAvgRemove('nopeus'),
    reduceAvgInit()
);

var laivaLuotsauksetGroup = nimiDim.group().reduce(
    reduceAvgAdd('luotsaukset'),
    reduceAvgRemove('luotsaukset'),
    reduceAvgInit()
);

dc.pieChart("#la")
    .width(400)
    .height(200)
    .dimension(asemaDim)
    .group(asemaGroup)
    .innerRadius(50);

barChart(nimiDim, laivaLuotsauksetGroup, '#lv', 'Laiva', 'Luotsaukset')
    .valueAccessor(p => p.value.avg);
barChart(laivaDim, laivaNopeusGroup, '#ln', 'Laiva', 'Keskinopeus')
    .valueAccessor(p => p.value.avg);

barChart(rpmDim, rpmGroup, '#rpm', 'RPM', 'Kulutus')
    .valueAccessor(p => p.value.sum)
    .width(1200)
    .height(200);

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